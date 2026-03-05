/**
 * End-to-end test: simulate what the browser does.
 * 1. Sign in to Firebase with email+password (REST API)
 * 2. Hit GET /api/v1/students/me with the token
 */
require('dotenv/config');
const https = require('https');
const http = require('http');

const FIREBASE_API_KEY = process.env.VITE_FIREBASE_API_KEY;

// Read the .env from frontend to get the API key
const fs = require('fs');
const path = require('path');
const frontendEnv = fs.readFileSync(path.join(__dirname, '..', 'edulink-the-core-main', '.env'), 'utf8');
const apiKeyMatch = frontendEnv.match(/VITE_FIREBASE_API_KEY=(.+)/);
const firebaseApiKey = apiKeyMatch ? apiKeyMatch[1].trim() : null;

// Use the test user created earlier
const EMAIL = 'testuser@college.edu';
const PASSWORD = 'testpass123';

async function post(url, body) {
    return new Promise((resolve, reject) => {
        const data = JSON.stringify(body);
        const u = new URL(url);
        const lib = u.protocol === 'https:' ? https : http;
        const req = lib.request({
            hostname: u.hostname,
            port: u.port || (u.protocol === 'https:' ? 443 : 80),
            path: u.pathname + u.search,
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) }
        }, res => {
            let body = '';
            res.on('data', c => body += c);
            res.on('end', () => resolve({ status: res.statusCode, body: JSON.parse(body) }));
        });
        req.on('error', reject);
        req.write(data);
        req.end();
    });
}

async function get(url, token) {
    return new Promise((resolve, reject) => {
        const u = new URL(url);
        const req = http.request({
            hostname: u.hostname, port: u.port || 80, path: u.pathname,
            method: 'GET',
            headers: { Authorization: `Bearer ${token}`, Origin: 'http://localhost:8080' }
        }, res => {
            let body = '';
            res.on('data', c => body += c);
            res.on('end', () => resolve({ status: res.statusCode, body }));
        });
        req.on('error', reject);
        req.end();
    });
}

async function main() {
    if (!firebaseApiKey || firebaseApiKey.includes('YOUR_')) {
        console.log('⚠️  Firebase API key not set in .env — skipping live Firebase test');
        console.log('   Test the endpoint manually in the browser instead.');
        return;
    }

    console.log('1. Signing in to Firebase...');
    const signIn = await post(
        `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${firebaseApiKey}`,
        { email: EMAIL, password: PASSWORD, returnSecureToken: true }
    );
    if (!signIn.body.idToken) {
        console.error('Firebase sign-in failed:', signIn.body);
        return;
    }
    const token = signIn.body.idToken;
    console.log('   Got token ✅');

    console.log('2. GET /api/v1/students/me...');
    const me = await get('http://localhost:3000/api/v1/students/me', token);
    console.log('   Status:', me.status);
    if (me.status === 200) {
        const profile = JSON.parse(me.body);
        console.log('   ✅ SUCCESS — profileStatus:', profile.profileStatus, '| id:', profile.id);
    } else {
        console.log('   ❌ FAILED body:', me.body);
    }
}

main().catch(e => console.error('Test error:', e.message));
