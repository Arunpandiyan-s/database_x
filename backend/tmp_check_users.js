require('dotenv').config();
const { pool } = require('./utils/transaction.util');

async function checkSchema() {
    try {
        const res = await pool.query(`
            SELECT column_name, data_type, is_nullable 
            FROM information_schema.columns 
            WHERE table_name = 'parent_student_mapping'
        `);
        console.log("parent_student_mapping:", res.rows);

        const res2 = await pool.query(`
            SELECT column_name, data_type, is_nullable 
            FROM information_schema.columns 
            WHERE table_name = 'users'
        `);
        console.log("users:", res2.rows);
    } catch (e) {
        console.error(e);
    } finally {
        process.exit();
    }
}
checkSchema();
