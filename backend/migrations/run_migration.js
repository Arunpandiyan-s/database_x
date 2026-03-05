/**
 * Run a specific database migration.
 * Usage: node migrations/run_migration.js <filename.sql>
 * Example: node migrations/run_migration.js 003_new_modules_schema.sql
 */
require('dotenv/config');
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function runMigration(file) {
    const filePath = path.resolve(__dirname, file);
    if (!fs.existsSync(filePath)) {
        console.error(`❌  File not found: ${filePath}`);
        process.exit(1);
    }
    const sql = fs.readFileSync(filePath, 'utf8');
    const client = await pool.connect();
    try {
        console.log(`▶  Running migration: ${file}`);
        await client.query(sql);
        console.log(`✅  Migration "${file}" applied successfully.`);
    } catch (err) {
        console.error(`❌  Migration "${file}" failed:`, err.message);
        process.exit(1);
    } finally {
        client.release();
        await pool.end();
    }
}

// Accept filename as CLI argument or fall back to the original default
const target = process.argv[2] || '001_create_event_outbox.sql';
runMigration(target);
