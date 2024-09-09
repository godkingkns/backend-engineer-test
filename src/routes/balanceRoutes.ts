import type { FastifyInstance } from 'fastify';
import type { BalanceRouteParams } from '../types';
import { getBalance } from '../services/balanceService';

export default async function balanceRoutes(fastify: FastifyInstance) {
  fastify.get('/balance/:address', async (request, reply) => {
    const { address } = request.params as BalanceRouteParams;
    const balance = await getBalance(address);
    return reply.send({ balance });
  });
}
