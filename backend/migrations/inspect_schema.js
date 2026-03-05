require('dotenv').config();
const { Pool } = require('pg');
const p = new Pool({ connectionString: process.env.DATABASE_URL });

async function main() {
    for (const tbl of ['mentor_mappings', 'audit_logs', 'roles']) {
        const r = await p.query(
            `SELECT column_name FROM information_schema.columns WHERE table_name=$1 ORDER BY ordinal_position`,
            [tbl]
        );
        console.log(tbl.toUpperCase() + ':', r.rows.map(x => x.column_name).join(', '));
    }
    await p.end();
}
main().catch(e => { console.error(e.message); process.exit(1); });
