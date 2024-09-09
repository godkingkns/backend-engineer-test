import type { Block } from '../types';
import { pool } from '../db/connection';
import {
  insertBlockQuery, insertTransactionQuery, insertInputQuery, insertOutputQuery,
  updateBalanceQuery
} from '../db/queries';

export async function processBlock(block: Block) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Insert the block
    await client.query(insertBlockQuery, [block.id, block.height]);

    // Insert transactions and update balances
    for (const tx of block.transactions) {
      await client.query(insertTransactionQuery, [tx.id, block.id]);

      // Insert inputs and outputs
      for (const input of tx.inputs) {
        // Get the address of the original output being spent
        const { rows: inputOutput } = await client.query(`
          SELECT address, value FROM outputs WHERE tx_id = $1 AND index = $2
        `, [input.txId, input.index]);

        if (inputOutput.length === 0) {
          throw new Error('Referenced input does not exist');
        }

        const { address, value } = inputOutput[0];

        // Deduct the value from the address' balance
        const { rows: balanceRows } = await client.query(`
          SELECT balance FROM balances WHERE address = $1
        `, [address]);

        let newBalance = balanceRows.length ? balanceRows[0].balance - value : 0;

        await client.query(updateBalanceQuery, [address, newBalance]);

        // Insert input record
        await client.query(insertInputQuery, [tx.id, input.index, input.txId]);
      }

      let index = 0;
      for (const output of tx.outputs) {
        await client.query(insertOutputQuery, [tx.id, output.address, output.value, index]);
        index++;

        const { rows: balanceRows } = await client.query(`SELECT balance FROM balances WHERE address = $1`, [output.address]);
        let newBalance = balanceRows.length ? balanceRows[0].balance + output.value : output.value;

        await client.query(updateBalanceQuery, [output.address, newBalance]);
      }
    }
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}
