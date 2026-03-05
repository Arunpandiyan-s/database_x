const { Pool } = require('pg');
const { v4: uuidv4 } = require('uuid');

// Global pool configuration
const pool = new Pool({
    connectionString: process.env.DATABASE_URL || 'postgresql://localhost:5432/erp_db',
    max: 20, // max connection pool size
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
});

/**
 * Error classes to classify business logic and transient transaction failures
 */
class TransientTransactionError extends Error {
    constructor(message) {
        super(message);
        this.name = 'TransientTransactionError';
    }
}

class DeterministicConflictError extends Error {
    constructor(message) {
        super(message);
        this.name = 'DeterministicConflictError';
    }
}

/**
 * Executes a callback within a managed transaction featuring auto-retry and timeout policies
 * @param {Function} callback - Function that receives (client, addEvent)
 * @param {Object} options - Retry & timeout options
 */
async function withTransactionRetry(callback, options = {}) {
    const maxRetries = options.maxRetries || 3;
    let attempt = 0;

    while (attempt <= maxRetries) {
        const client = await pool.connect();
        // Accumulate events within the transaction
        const events = [];
        const addEvent = (type, actorId, entityType, entityId, metadata = {}) => {
            events.push({
                event_id: uuidv4(),
                type,
                actor_id: actorId,
                entity_type: entityType,
                entity_id: entityId,
                metadata
            });
        };

        try {
            // SET lock_timeout immediately limits how long queries will wait for a lock
            await client.query("SET lock_timeout = '5s'");
            await client.query('BEGIN');
            await client.query(`SET SESSION CHARACTERISTICS AS TRANSACTION ISOLATION LEVEL READ COMMITTED`);

            const result = await callback(client, addEvent);

            // Write accumulated events strictly prior to commit via Outbox
            if (events.length > 0) {
                const outboxQuery = `
          INSERT INTO event_outbox (event_id, type, actor_id, entity_type, entity_id, metadata)
          VALUES ($1, $2, $3, $4, $5, $6)
        `;
                for (const e of events) {
                    await client.query(outboxQuery, [e.event_id, e.type, e.actor_id, e.entity_type, e.entity_id, JSON.stringify(e.metadata)]);
                }
            }

            await client.query('COMMIT');
            return result;

        } catch (error) {
            await client.query('ROLLBACK');

            // Postgres Error 40P01 is deadlock detected, 55P03 is lock_not_available (triggered by lock_timeout)
            if (error.code === '40P01' || error.code === '55P03' || error.code === '40001') {
                if (attempt < maxRetries) {
                    attempt++;
                    // Exponential backoff
                    await new Promise(res => setTimeout(res, Math.pow(2, attempt) * 100));
                    continue; // Retry Loop
                }
                throw new TransientTransactionError('Database is currently busy, transaction aborted after max retries.');
            }

            // If business rules define 409 conflict manually
            if (error instanceof DeterministicConflictError) {
                throw error;
            }

            // Otherwise it's an unexpected DB error, re-throw
            throw error;
        } finally {
            client.release();
        }
    }
}

module.exports = {
    pool,
    withTransactionRetry,
    TransientTransactionError,
    DeterministicConflictError
};
