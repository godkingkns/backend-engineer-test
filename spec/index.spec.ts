import { test, expect } from 'bun:test';
import Fastify from 'fastify';
import { pool } from '../db/connection';
import blockRoutes from '../routes/blockRoutes';
import balanceRoutes from '../routes/balanceRoutes';
import rollbackRoutes from '../routes/rollbackRoutes';

const fastify = Fastify();
fastify.register(blockRoutes);
fastify.register(balanceRoutes);
fastify.register(rollbackRoutes);

test('POST /blocks - valid block', async () => {
  const validBlock = {
    id: 'block1',
    height: 1,
    transactions: [
      {
        id: 'tx1',
        inputs: [],
        outputs: [{ address: 'addr1', value: 10 }]
      }
    ]
  };

  const response = await fastify.inject({
    method: 'POST',
    url: '/blocks',
    payload: validBlock
  });

  expect(response.statusCode).toBe(200);
  expect(JSON.parse(response.body)).toEqual({ success: true });

  const { rows } = await pool.query(`SELECT balance FROM balances WHERE address = 'addr1';`);
  expect(rows[0].balance).toBe(10);
});

test('GET /balance/:address - address with balance', async () => {
  const response = await fastify.inject({
    method: 'GET',
    url: '/balance/addr1',
  });

  expect(response.statusCode).toBe(200);
  expect(JSON.parse(response.body)).toEqual({ balance: 10 });
});

test('POST /rollback - rollback to previous block', async () => {
  const rollbackResponse = await fastify.inject({
    method: 'POST',
    url: '/rollback?height=0'
  });

  expect(rollbackResponse.statusCode).toBe(200);
  expect(JSON.parse(rollbackResponse.body)).toEqual({ success: true });

  const { rows } = await pool.query(`SELECT balance FROM balances WHERE address = 'addr1';`);
  expect(rows[0].balance).toBe(0);
});
