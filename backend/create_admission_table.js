require('dotenv').config();
const { pool } = require('./utils/transaction.util');

async function createTable() {
    try {
        console.log('Ensuring admission_prospects table exists...');
        await pool.query(`
            CREATE TABLE IF NOT EXISTS admission_prospects (
                id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                name VARCHAR(255) NOT NULL,
                email VARCHAR(255) UNIQUE NOT NULL,
                temp_password VARCHAR(255) NOT NULL,
                department VARCHAR(255),
                status VARCHAR(50) NOT NULL DEFAULT 'pending_admin_approval',
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            );
        `);
        console.log('Table admission_prospects verified/created successfully.');
    } catch (err) {
        console.error('Error creating table:', err);
    } finally {
        await pool.end();
    }
}

createTable();
