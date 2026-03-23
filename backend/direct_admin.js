require('dotenv').config();
const { pool } = require('./utils/transaction.util');

async function directAdmin() {
    try {
        const resRole = await pool.query("SELECT id FROM roles WHERE name='admin' LIMIT 1");
        if (resRole.rows.length === 0) {
            console.log('No admin role found!');
            return;
        }
        const roleId = resRole.rows[0].id;

        // Using simple fixed string queries to avoid escaping issues
        const query = `
      INSERT INTO users (id, email, active_email, role_id, status, firebase_uid) 
      VALUES (
        gen_random_uuid(), 
        'erp.admin.notifications@gmail.com', 
        'erp.admin.notifications@gmail.com', 
        $1, 
        'ACTIVE', 
        'N0xndyebRzUjC4vT5o1eQf7LgZ53'
      ) RETURNING id
    `;
        const res = await pool.query(query, [roleId]);
        console.log("Admin injected successfully. ID:", res.rows[0].id);
    } catch (err) {
        if (err.code === '23505') {
            console.log("Admin email already mapped!");
        } else {
            console.error("Error inserting:", err);
        }
    } finally {
        process.exit(0);
    }
}

directAdmin();
