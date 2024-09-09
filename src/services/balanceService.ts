import { pool } from '../db/connection';
import { getBalanceQuery } from '../db/queries';

export async function getBalance(address: string) {
  const { rows } = await pool.query(getBalanceQuery, [address]);
  return rows.length ? rows[0].balance : 0;
}
