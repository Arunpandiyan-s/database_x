require('dotenv').config();
const app = require('./app');
const { startWorker } = require('./workers/event.outbox.worker');

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`ERP Backend Server running tightly locked on port ${PORT}`);

    // Ignite the background outbox worker for idempotent event delivery
    startWorker();
});

// Graceful shutdown handling to safely roll back pending PG connections
process.on('SIGINT', async () => {
    console.log('Shutting down gracefully...');
    const { pool } = require('./utils/transaction.util');
    await pool.end();
    process.exit(0);
});
