import Fastify from 'fastify';
import blockRoutes from './routes/blockRoutes';
import balanceRoutes from './routes/balanceRoutes';
import rollbackRoutes from './routes/rollbackRoutes';
import { createTablesQuery } from './db/queries';
import { pool } from './db/connection';

// Define Fastify instance
const fastify = Fastify({ logger: true });

// Register routes
fastify.register(blockRoutes);
fastify.register(balanceRoutes);
fastify.register(rollbackRoutes);

// Bootstrap the application and start the server
(async function bootstrap() {
  try {
    await pool.query(createTablesQuery); // Create tables
    await fastify.listen({ port: 3000, host: '0.0.0.0' });
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
})();
