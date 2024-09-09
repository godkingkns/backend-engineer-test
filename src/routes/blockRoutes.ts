import type { FastifyInstance } from 'fastify';
import type { Block } from '../types';
import { processBlock } from '../services/blockService';
import { validateBlock } from '../utils/validation';

export default async function blockRoutes(fastify: FastifyInstance) {
  fastify.post('/blocks', async (request, reply) => {
    const block: Block = request.body as Block;
    const validationError = await validateBlock(block);

    if (validationError) {
      return reply.status(400).send({ error: validationError });
    }

    try {
      await processBlock(block);
      return reply.send({ success: true });
    } catch (error) {
      return reply.status(500).send({ error: 'Internal server error' });
    }
  });
}
