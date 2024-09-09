import { pool } from '../db/connection';
import {
  rollbackBlocksQuery,
  recalculateBalanceQuery,
  getSpentSumQuery,
  updateBalanceQuery,
  getImpactAddressQuery
} from '../db/queries';

export async function rollbackToHeight(height: number) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Identify all impacted addresses from both inputs and outputs in the transactions to be removed
    const { rows: impactedAddresses } = await client.query(getImpactAddressQuery, [height]);

    // Delete all blocks and transactions above the given height
    await client.query(rollbackBlocksQuery, [height]);

    // Recalculate balances for all impacted addresses
    for (const { address } of impactedAddresses) {
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
