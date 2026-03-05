const { pool } = require('../utils/transaction.util');

const BATCH_SIZE = 50;
const MAX_EVENT_RETRIES = 5;

/**
 * Executes a single batch of PENDING events
 */
async function processOutboxBatch() {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // 1. SKIP LOCKED ensures safe horizontal scaling
        const result = await client.query(`
      SELECT *
      FROM event_outbox
      WHERE status = 'PENDING'
      ORDER BY created_at ASC
      LIMIT $1
      FOR UPDATE SKIP LOCKED;
    `, [BATCH_SIZE]);

        const events = result.rows;
        if (events.length === 0) {
            await client.query('COMMIT');
            return 0;
        }

        for (const event of events) {
            try {
                // Idempotent delivery to audit_logs (and potentially notifications)
                await client.query(`
          INSERT INTO audit_logs (actor_id, college_id, role, action, entity_type, entity_id, metadata, created_at)
          VALUES ($1, (SELECT college_id FROM users WHERE id = $1), (SELECT name FROM roles WHERE id = (SELECT role_id FROM users WHERE id = $1)), $2, $3, $4, $5, $6)
        `, [
                    event.actor_id,
                    event.type,
                    event.entity_type,
                    event.entity_id,
                    event.metadata,
                    event.created_at
                ]);

                // Mark as PROCESSED
                await client.query(`
          UPDATE event_outbox
          SET status = 'PROCESSED', processed_at = NOW()
          WHERE id = $1
        `, [event.id]);

            } catch (err) {
                // Escalation strategy
                const newRetryCount = event.retry_count + 1;
                if (newRetryCount >= MAX_EVENT_RETRIES) {
                    // FAILED terminal state, insert alert
                    await client.query(`
            UPDATE event_outbox
            SET status = 'FAILED', retry_count = $1, last_error = $2
            WHERE id = $3
          `, [newRetryCount, err.message, event.id]);

                    await client.query(`
            INSERT INTO system_alerts (type, message, metadata)
            VALUES ('EVENT_OUTBOX_FAILURE', 'Event permanently failed', $1)
          `, [JSON.stringify({ event_id: event.id, original_error: err.message })]);
                } else {
                    // Exponential backoff logic would delay it picking it up again via a 'next_retry_at' column in a real setting,
                    // for now just increment retries
                    await client.query(`
            UPDATE event_outbox
            SET retry_count = $1, last_error = $2
            WHERE id = $3
          `, [newRetryCount, err.message, event.id]);
                }
            }
        }

        await client.query('COMMIT');
        return events.length;

    } catch (globalError) {
        await client.query('ROLLBACK');
        console.error('Outbox generic failure:', globalError);
        return 0;
    } finally {
        client.release();
    }
}

/**
 * Worker polling interval loop
 */
function startWorker() {
    console.log('Started Event Outbox Worker...');
    setInterval(async () => {
        try {
            const processedCount = await processOutboxBatch();
            if (processedCount > 0) {
                console.log(`[Worker] Processed ${processedCount} events.`);
            }
        } catch (err) {
            console.error('Worker loop crash:', err);
        }
    }, 5000); // Pull every 5 seconds
}

module.exports = { startWorker, processOutboxBatch };
