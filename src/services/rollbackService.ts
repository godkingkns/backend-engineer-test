import { pool } from '../db/connection';
import { rollbackBlocksQuery, recalculateBalanceQuery, getSpentSumQuery, updateBalanceQuery } from '../db/queries';

export async function rollbackToHeight(height: number) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Delete blocks above given height
    await client.query(rollbackBlocksQuery, [height]);

    // Recalculate balances
    const { rows: addresses } = await client.query('SELECT DISTINCT address FROM outputs;');

    for (const { address } of addresses) {
      const { rows: balanceSum } = await client.query(recalculateBalanceQuery, [address]);
      const { rows: spentSum } = await client.query(getSpentSumQuery, [address]);

      const newBalance = (balanceSum[0]?.total_received || 0) - (spentSum[0]?.total_spent || 0);

      await client.query(updateBalanceQuery, [address, newBalance]);
    }

    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}
