import { pool } from '../db/connection';
import type { Block } from '../types';
import { createHash } from 'crypto';

export async function validateBlock(block: Block) {
  // Validate block height
  const { rows: lastBlock } = await pool.query('SELECT MAX(height) FROM blocks;');
  const expectedHeight = lastBlock[0]?.max ? lastBlock[0].max + 1 : 1;

  if (block.height !== expectedHeight) {
    return 'Invalid block height';
  }

  // Validate block ID
  // const expectedBlockId = createBlockId(block);
  // if (block.id !== expectedBlockId) {
  //   return 'Invalid block ID';
  // }
  block.id = createBlockId(block);

  // Validate input/output value sums
  let inputSum = 0, outputSum = 0;

  for (const tx of block.transactions) {
    for (const input of tx.inputs) {
      const { rows: inputTx } = await pool.query('SELECT value FROM outputs WHERE tx_id = $1 AND index = $2', [input.txId, input.index]);
      if (inputTx.length === 0) return 'Invalid input transaction';
      inputSum += inputTx[0].value;
    }

    tx.outputs.forEach(output => outputSum += output.value);
  }

  if (inputSum !== outputSum && expectedHeight > 1) {
    return 'Input and output values do not match';
  }

  return null;
}

function createBlockId(block: Block) {
  const transactionsConcat = block.transactions.map(tx => tx.id).join('');
  return createHash('sha256').update(block.height + transactionsConcat).digest('hex');
}
