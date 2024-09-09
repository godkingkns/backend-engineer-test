import { describe, it, expect, beforeEach, beforeAll, afterAll } from "bun:test";
import Fastify from "fastify";
import type { Agent } from "supertest";
import supertest from "supertest";
import blockRoutes from "../src/routes/blockRoutes";
import balanceRoutes from "../src/routes/balanceRoutes";
import rollbackRoutes from "../src/routes/rollbackRoutes";
import { pool } from "../src/db/connection"; // Ensure this points to your actual DB connection

// Fastify instance
let fastify: ReturnType<typeof Fastify>;
let request: Agent; // Initialize supertest

// Helper function to reset the database between tests
async function resetDatabase() {
  await pool.query("TRUNCATE blocks, transactions, inputs, outputs, balances RESTART IDENTITY CASCADE");
}

async function createDatabase() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS blocks (
      id TEXT PRIMARY KEY,
      height INT NOT NULL
    );
    
    CREATE TABLE IF NOT EXISTS transactions (
      id TEXT PRIMARY KEY,
      block_id TEXT REFERENCES blocks(id) ON DELETE CASCADE
    );
    
    CREATE TABLE IF NOT EXISTS inputs (
      tx_id TEXT REFERENCES transactions(id) ON DELETE CASCADE,
      index INT,
      ref_tx_id TEXT,
      PRIMARY KEY (tx_id, index)
    );
    
    CREATE TABLE IF NOT EXISTS outputs (
      tx_id TEXT REFERENCES transactions(id) ON DELETE CASCADE,
      address TEXT,
      value INT,
      index INT,
      PRIMARY KEY (tx_id, index)
    );
    
    CREATE TABLE IF NOT EXISTS balances (
      address TEXT PRIMARY KEY,
      balance INT
    );
  `);
}

beforeAll(async () => {
  fastify = Fastify();
  
  // Register routes
  fastify.register(blockRoutes);
  fastify.register(balanceRoutes);
  fastify.register(rollbackRoutes);

  // Wait for Fastify to be fully initialized before tests
  await fastify.ready();
  request = supertest(fastify.server); // Use supertest with Fastify's HTTP server

  await createDatabase();
})

// Tear down Fastify after each test
afterAll(async () => {
  await fastify.close();
});

// Setup Fastify before each test
beforeEach(async () => {
  // Reset database to clean state
  await resetDatabase();
});

// Test case: POST /blocks - valid block submission
describe("POST /blocks - valid block submission", () => {
  it("should submit a valid block and update balance", async () => {
    const validBlock = {
      id: "valid_block_id",
      height: 1,
      transactions: [
        {
          id: "tx1",
          inputs: [],
          outputs: [{ address: "addr1", value: 10 }],
        },
      ],
    };

    // Simulate a POST request to /blocks
    const response = await request.post("/blocks").send(validBlock);

    // Assert that the status code is 200 (success)
    expect(response.statusCode).toBe(200);

    // Assert that the response body contains the expected success message
    expect(response.body).toEqual({ success: true });

    // Check if the balance is correctly updated for addr1
    const balanceResponse = await request.get("/balance/addr1");

    // Assert that addr1 has a balance of 10
    expect(balanceResponse.body).toEqual({ balance: 10 });
  });
});

// Test case: POST /blocks - invalid block height
describe("POST /blocks - invalid block height", () => {
  it("should return 400 when block height is invalid", async () => {
    const invalidBlock = {
      id: "invalid_block_id",
      height: 2, // Invalid height: first block should have height 1
      transactions: [
        {
          id: "tx1",
          inputs: [],
          outputs: [{ address: "addr1", value: 10 }],
        },
      ],
    };

    const response = await request.post("/blocks").send(invalidBlock);

    // Assert that the status code is 400 (bad request)
    expect(response.statusCode).toBe(400);

    // Assert that the response body contains the expected error message
    expect(response.body).toEqual({ error: "Invalid block height" });
  });
});

// Test case: POST /blocks - input/output value mismatch
describe("POST /blocks - input/output value mismatch", () => {
  it("should return 400 when input and output values do not match", async () => {
    const validBlock1 = {
      id: "block1",
      height: 1,
      transactions: [
        {
          id: "tx1",
          inputs: [],
          outputs: [{ address: "addr1", value: 10 }],
        },
      ],
    };

    const invalidBlock2 = {
      id: "block2",
      height: 2,
      transactions: [
        {
          id: "tx2",
          inputs: [{ txId: "tx1", index: 0 }],
          outputs: [{ address: "addr2", value: 8 }], // Mismatch: input = 10, output = 8
        },
      ],
    };

    // Submit the first valid block
    await request.post("/blocks").send(validBlock1);

    // Simulate POST request to /blocks with value mismatch
    const response = await request.post("/blocks").send(invalidBlock2);

    // Assert that the status code is 400 (bad request)
    expect(response.statusCode).toBe(400);

    // Assert that the response body contains the expected error message
    expect(response.body).toEqual({ error: "Input and output values do not match" });
  });
});

// Test case: POST /rollback - rollback a block
describe("POST /rollback - rollback a block", () => {
  it("should rollback the blockchain to a given height", async () => {
    const validBlock1 = {
      id: "block1",
      height: 1,
      transactions: [
        {
          id: "tx1",
          inputs: [],
          outputs: [{ address: "addr1", value: 10 }],
        },
      ],
    };

    const validBlock2 = {
      id: "block2",
      height: 2,
      transactions: [
        {
          id: "tx2",
          inputs: [{ txId: "tx1", index: 0 }],
          outputs: [{ address: "addr2", value: 10 }],
        },
      ],
    };

    // Submit both valid blocks
    await request.post("/blocks").send(validBlock1);

    await request.post("/blocks").send(validBlock2);

    // Perform rollback to height 1
    const rollbackResponse = await request.post("/rollback?height=1");

    // Assert rollback success
    expect(rollbackResponse.statusCode).toBe(200);
    expect(rollbackResponse.body).toEqual({ success: true });

    // Verify that addr1 balance is restored and addr2 balance is reset
    const balanceResponseAddr1 = await request.get("/balance/addr1");
    expect(balanceResponseAddr1.body).toEqual({ balance: 10 });

    const balanceResponseAddr2 = await request.get("/balance/addr2");
    expect(balanceResponseAddr2.body).toEqual({ balance: 0 });
  });
});

// Test case: GET /balance/:address - unknown address should return balance 0
describe("GET /balance/:address - unknown address should return balance 0", () => {
  it("should return a balance of 0 for unknown address", async () => {
    const response = await request.get("/balance/unknownAddress");

    // Assert that the balance is 0 for an unknown address
    expect(response.statusCode).toBe(200);
    expect(response.body).toEqual({ balance: 0 });
  });
});
