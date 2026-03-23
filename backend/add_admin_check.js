const { pool } = require('./utils/transaction.util');
pool.query("SELECT id, name FROM roles").then(res => {
    console.log('Roles:', res.rows);
    return pool.query("SELECT * FROM users WHERE active_email = 'erp.admin.notifications@gmail.com'");
}).then(res => {
    console.log('User:', res.rows);
    process.exit(0);
}).catch(console.error);
