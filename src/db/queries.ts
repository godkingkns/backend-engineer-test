// Query to create tables
export const createTablesQuery = `
  CREATE TABLE IF NOT EXISTS blocks (id TEXT PRIMARY KEY, height INT NOT NULL);
  CREATE TABLE IF NOT EXISTS transactions (id TEXT PRIMARY KEY, block_id TEXT REFERENCES blocks(id) ON DELETE CASCADE);
  CREATE TABLE IF NOT EXISTS inputs (tx_id TEXT REFERENCES transactions(id) ON DELETE CASCADE, index INT, ref_tx_id TEXT, PRIMARY KEY (tx_id, index));
  CREATE TABLE IF NOT EXISTS outputs (tx_id TEXT REFERENCES transactions(id) ON DELETE CASCADE, address TEXT, value INT, index INT, PRIMARY KEY (tx_id, index));
  CREATE TABLE IF NOT EXISTS balances (address TEXT PRIMARY KEY, balance INT);
`;

// Fetch balance by address
export const getBalanceQuery = `SELECT balance FROM balances WHERE address = $1;`;

// Insert block
export const insertBlockQuery = `INSERT INTO blocks (id, height) VALUES ($1, $2);`;

// Insert transaction
export const insertTransactionQuery = `INSERT INTO transactions (id, block_id) VALUES ($1, $2);`;

// Insert inputs
export const insertInputQuery = `INSERT INTO inputs (tx_id, index, ref_tx_id) VALUES ($1, $2, $3);`;

// Insert outputs
export const insertOutputQuery = `INSERT INTO outputs (tx_id, address, value, index) VALUES ($1, $2, $3, $4);`;

// Update balance
export const updateBalanceQuery = `
  INSERT INTO balances (address, balance) VALUES ($1, $2)
  ON CONFLICT (address) DO UPDATE SET balance = $2;
`;

// Rollback
export const rollbackBlocksQuery = `DELETE FROM blocks WHERE height > $1;`;

// Recalculate balance
export const recalculateBalanceQuery = `
  SELECT SUM(value) as total_received
  FROM outputs WHERE address = $1;
`;

export const getSpentSumQuery = `
  SELECT SUM(value) as total_spent
  FROM inputs WHERE ref_tx_id IN (SELECT tx_id FROM outputs WHERE address = $1);
`;
