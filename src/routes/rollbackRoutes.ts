import type { FastifyInstance } from 'fastify';
import type { RollbackRouteParams } from '../types';
import { rollbackToHeight } from '../services/rollbackService';

export default async function rollbackRoutes(fastify: FastifyInstance) {
  fastify.post('/rollback', async (request, reply) => {
    const { height } = request.query as RollbackRouteParams;
    const blockHeight = parseInt(height, 10);
    try {
      await rollbackToHeight(blockHeight);
      return reply.send({ success: true });
    } catch (error) {
      return reply.status(500).send({ error: 'Internal server error' });
    }
  });
}
