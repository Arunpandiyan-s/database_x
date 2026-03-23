require('dotenv').config();
const { pool } = require('./utils/transaction.util');

async function check() {
    try {
        const roles = await pool.query("SELECT * FROM roles");
        console.log("Roles:", roles.rows);
        const users = await pool.query("SELECT email, active_email, role_id, status, firebase_uid FROM users WHERE active_email = 'erp.admin.notifications@gmail.com'");
        console.log("Admin Users:", users.rows);
    } catch (err) {
        console.error(err);
    } finally {
        process.exit(0);
    }
}
check();
