require('dotenv').config();
const { pool } = require('./utils/transaction.util');
const admin = require('./config/firebase');

async function seedAdmin() {
    const email = "erp.admin.notifications@gmail.com";
    const password = "admin@123";

    try {
        let firebaseUid;
        try {
            const userRecord = await admin.auth().getUserByEmail(email);
            firebaseUid = userRecord.uid;
            console.log('Firebase user already exists:', firebaseUid);
        } catch (e) {
            if (e.code === 'auth/user-not-found') {
                const newUser = await admin.auth().createUser({
                    email,
                    password,
                    displayName: 'System Admin',
                });
                firebaseUid = newUser.uid;
                console.log('Created Firebase User:', firebaseUid);
            } else {
                throw e;
            }
        }

        const resRole = await pool.query(`SELECT id FROM roles WHERE name = 'admin' LIMIT 1`);
        if (resRole.rows.length === 0) {
            console.log('Admin role not found!');
            return;
        }
        const roleId = resRole.rows[0].id;

        const resUser = await pool.query(`SELECT id FROM users WHERE email = $1 OR active_email = $1`, [email]);
        if (resUser.rows.length > 0) {
            console.log('User already exists in PostgreSQL, updating firebase_uid');
            await pool.query(`UPDATE users SET firebase_uid = $1 WHERE id = $2`, [firebaseUid, resUser.rows[0].id]);
        } else {
            console.log('Inserting into PostgreSQL');
            await pool.query(`
         INSERT INTO users (email, active_email, role_id, status, firebase_uid)
         VALUES ($1, $1, $2, 'ACTIVE', $3)
       `, [email, email, roleId, firebaseUid]);
        }
        console.log('Admin user successfully seeded!');
    } catch (e) {
        console.error('Error:', e);
    } finally {
        process.exit(0);
    }
}

seedAdmin();
