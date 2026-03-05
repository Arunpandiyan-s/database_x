/**
 * Targeted test: what exact value does the auth middleware set as userId?
 */
require('dotenv/config');
const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');

const frontendEnv = fs.readFileSync(path.join(__dirname, '..', 'edulink-the-core-main', '.env'), 'utf8');
const apiKeyMatch = frontendEnv.match(/VITE_FIREBASE_API_KEY=(.+)/);
const firebaseApiKey = apiKeyMatch ? apiKeyMatch[1].trim() : null;
const EMAIL = 'testuser@college.edu';
const PASSWORD = 'testpass123';

function post(url, body) {
    return new Promise((resolve, reject) => {
        const data = JSON.stringify(body);
        const u = new URL(url);
        const req = https.request({
            hostname: u.hostname, port: 443, path: u.pathname + u.search, method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) }
        }, res => { let b = ''; res.on('data', c => b += c); res.on('end', () => resolve(JSON.parse(b))); });
        req.on('error', reject); req.write(data); req.end();
    });
}

async function main() {
    const signIn = await post(
        `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${firebaseApiKey}`,
        { email: EMAIL, password: PASSWORD, returnSecureToken: true }
    );
    const token = signIn.idToken;
    const uid = signIn.localId;
    console.log('Firebase UID (localId):', uid);

    // Decode JWT payload to see claims
    const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
    console.log('Token claims:', {
        uid: payload.user_id,
        sub: payload.sub,
        user_id_claim: payload.user_id,
        level: payload.level,
        email: payload.email,
    });

    // Now test what the DB query returns for this firebase_uid
    const { Pool } = require('pg');
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    const r = await pool.query(
        `SELECT u.id, u.firebase_uid, r.level FROM users u JOIN roles r ON r.id = u.role_id WHERE u.firebase_uid = $1`,
        [uid]
    );
    console.log('DB lookup by firebase_uid:', r.rows);
    pool.end();
}

main().catch(e => console.error(e.message));
