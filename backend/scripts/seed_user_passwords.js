/**
 * seed_user_passwords.js
 * ─────────────────────────────────────────────────────────────────────────────
 * One-time script to:
 *   1) Backfill the `role` column on every user (from the joined roles table).
 *   2) Set `password_hash` = bcrypt("123456789") for every user that currently
 *      has no password set.
 *
 * Usage:
 *   node scripts/seed_user_passwords.js
 *
 * Safe to run multiple times — only users WITHOUT a password_hash are updated.
 * ─────────────────────────────────────────────────────────────────────────────
 */

require('dotenv/config');
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

const DEFAULT_PASSWORD = '123456789';
const SALT_ROUNDS = 10;

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function main() {
    const client = await pool.connect();
    try {
        console.log('🔄  Starting user seed...\n');

        // ── Step 1: Backfill role column ──────────────────────────────────────
        const roleUpdate = await client.query(`
            UPDATE users u
            SET    role = r.name
            FROM   roles r
            WHERE  r.id = u.role_id
              AND  (u.role IS NULL OR u.role <> r.name)
            RETURNING u.id, u.email, r.name AS role
        `);
        console.log(`✅  Role backfill: ${roleUpdate.rowCount} user(s) updated.`);
        if (roleUpdate.rows.length > 0) {
            console.log('    Updated users:');
            roleUpdate.rows.forEach(r => console.log(`    • ${r.email}  →  ${r.role}`));
        }
        console.log();

        // ── Step 2: Fetch all users without a password ────────────────────────
        const { rows: usersWithoutPwd } = await client.query(`
            SELECT u.id, u.email, u.active_email, r.name AS role
            FROM   users u
            JOIN   roles r ON r.id = u.role_id
            WHERE  u.password_hash IS NULL
            ORDER BY r.level, u.email
        `);

        if (usersWithoutPwd.length === 0) {
            console.log('ℹ️   All users already have a password_hash. Nothing to do.');
            return;
        }

        console.log(`🔑  Setting default password for ${usersWithoutPwd.length} user(s)...\n`);

        // Hash once — reuse for all rows (same cost as per-row but faster)
        const hash = await bcrypt.hash(DEFAULT_PASSWORD, SALT_ROUNDS);

        let successCount = 0;
        for (const user of usersWithoutPwd) {
            await client.query(
                `UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2`,
                [hash, user.id]
            );
            console.log(`   ✔  ${(user.active_email || user.email).padEnd(40)}  [${user.role}]`);
            successCount++;
        }

        console.log(`\n✅  Done. ${successCount} user(s) now have password_hash set.`);
        console.log(`   Default password: "${DEFAULT_PASSWORD}"`);
        console.log('\n⚠️   IMPORTANT: Users must change this password on first login!');

    } catch (err) {
        console.error('❌  Seed failed:', err.message);
        process.exit(1);
    } finally {
        client.release();
        await pool.end();
    }
}

main();
