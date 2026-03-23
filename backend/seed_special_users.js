require('dotenv').config();
const { pool } = require('./utils/transaction.util');
const admin = require('./config/firebase');
const bcrypt = require('bcryptjs');

async function seedSpecialUsers() {
    const users = [
        {
            email: "erp.admin.notifications@gmail.com",
            password: "123456789",
            role: "admission_officer",
            name: "System Admission Officer"
        },
        {
            email: "aenokantony1313@gmail.com",
            password: "123456789",
            role: "admin",
            name: "Master Admin"
        }
    ];

    for (const u of users) {
        try {
            console.log(`Processing ${u.email}...`);
            let firebaseUid;
            try {
                const userRecord = await admin.auth().getUserByEmail(u.email);
                firebaseUid = userRecord.uid;
                // Update password for existing user
                await admin.auth().updateUser(firebaseUid, { password: u.password });
                console.log(`Firebase user updated: ${firebaseUid}`);
            } catch (e) {
                if (e.code === 'auth/user-not-found') {
                    const newUser = await admin.auth().createUser({
                        email: u.email,
                        password: u.password,
                        displayName: u.name,
                    });
                    firebaseUid = newUser.uid;
                    console.log(`Created Firebase User: ${firebaseUid}`);
                } else {
                    console.error(`Error for ${u.email}:`, e.message);
                    continue;
                }
            }

            const resRole = await pool.query(`SELECT id FROM roles WHERE name = $1 LIMIT 1`, [u.role]);
            if (resRole.rows.length === 0) {
                console.error(`Role ${u.role} not found!`);
                continue;
            }
            const roleId = resRole.rows[0].id;

            const passwordHash = await bcrypt.hash(u.password, 10);

            const resUser = await pool.query(`SELECT id FROM users WHERE email = $1 OR active_email = $1`, [u.email]);
            if (resUser.rows.length > 0) {
                console.log(`User ${u.email} exists in DB, updating...`);
                await pool.query(
                    `UPDATE users SET firebase_uid = $1, role_id = $2, password_hash = $3, status = 'ACTIVE' WHERE id = $4`,
                    [firebaseUid, roleId, passwordHash, resUser.rows[0].id]
                );
            } else {
                console.log(`Inserting ${u.email} into DB...`);
                await pool.query(`
                    INSERT INTO users (id, email, active_email, role_id, status, firebase_uid, password_hash)
                    VALUES (gen_random_uuid(), $1, $1, $2, 'ACTIVE', $3, $4)
                `, [u.email, roleId, firebaseUid, passwordHash]);
            }
            console.log(`User ${u.email} successfully processed!`);
        } catch (err) {
            console.error(`Fatal error for ${u.email}:`, err.message);
        }
    }
    console.log('Special users seeding completed.');
    process.exit(0);
}

seedSpecialUsers();
