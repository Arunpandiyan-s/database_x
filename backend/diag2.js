require('dotenv/config');
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// Simulate exactly what the auth middleware does
async function test() {
    // Get a real firebase_uid from users table
    const users = await pool.query("SELECT id, firebase_uid, status FROM users LIMIT 3");
    console.log('Users in DB:', users.rows);

    if (users.rows.length === 0) {
        console.log('NO USERS - register one first');
        return pool.end();
    }

    const uid = users.rows[0].firebase_uid;
    const result = await pool.query(
        `SELECT u.id, u.college_id, u.department_id, u.cluster_id, r.level
     FROM users u
     JOIN roles r ON r.id = u.role_id
     WHERE u.firebase_uid = $1 AND u.status = 'ACTIVE'`,
        [uid]
    );
    console.log('Auth middleware query result:', result.rows);

    // Now test the students/me query
    const userId = result.rows[0]?.id;
    console.log('Using userId:', userId);

    const profile = await pool.query('SELECT * FROM student_profiles WHERE student_id = $1', [userId]);
    console.log('Profile rows found:', profile.rows.length);
    console.log('Profile columns:', profile.rows[0] ? Object.keys(profile.rows[0]) : 'no row - will INSERT');

    // Test INSERT too
    const ins = await pool.query(
        `INSERT INTO student_profiles (student_id, status, profile_submitted, edit_request_pending)
     VALUES ($1, 'DRAFT', false, false)
     ON CONFLICT (student_id) DO NOTHING RETURNING id`,
        [userId]
    );
    console.log('INSERT result rows:', ins.rows);

    pool.end();
}

test().catch(e => { console.error('ERROR:', e.message, '\nCode:', e.code, '\nDetail:', e.detail); pool.end(); });
