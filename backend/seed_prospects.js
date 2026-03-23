require('dotenv').config();
const { pool } = require('./utils/transaction.util');

async function seedData() {
    try {
        console.log('Seeding demo data into admission_prospects...');
        const demoProspects = [
            ['Arjun Krishnaswamy', 'arjun.k@gmail.com', 'PK-9A4B-2V1'],
            ['Divya Subramaniam', 'divya.s@gmail.com', 'PK-X7Y2-L9M'],
            ['Srinivasan R', 'srini.r@gmail.com', 'PK-8H3K-0P2'],
            ['Meera Nair', 'meera.nair@gmail.com', 'PK-L5M9-W1Q']
        ];

        for (const [name, email, passkey] of demoProspects) {
            await pool.query(
                `INSERT INTO admission_prospects (name, email, temp_password, status)
                 VALUES ($1, $2, $3, 'pending_admin_approval')
                 ON CONFLICT (email) DO NOTHING`,
                [name, email, passkey]
            );
        }
        console.log('Demo data seeded successfully.');
    } catch (err) {
        console.error('Error seeding data:', err);
    } finally {
        await pool.end();
    }
}

seedData();
