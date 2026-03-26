const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://postgres:arun%40pandi123@localhost:5432/erp_database'
});

async function verifyAndFixDB() {
  const client = await pool.connect();
  try {
    console.log('[1/2] Deduplicating admission_prospects...');
    await client.query(`
      DELETE FROM admission_prospects 
      WHERE id IN (
        SELECT id FROM (
          SELECT id, ROW_NUMBER() OVER(PARTITION BY email ORDER BY created_at DESC) as row_num 
          FROM admission_prospects
        ) t WHERE t.row_num > 1
      );
    `);
    console.log('      -> Deduplication successful.');

    console.log('[2/2] Adding UNIQUE constraint to email...');
    try {
      await client.query(`
        ALTER TABLE admission_prospects 
        ADD CONSTRAINT admission_prospects_email_unique UNIQUE (email);
      `);
      console.log('      -> Constraint added successfully.');
    } catch (e) {
      if (e.code === '42710') {
        console.log('      -> Constraint already exists, skipping.');
      } else {
        throw e;
      }
    }
    console.log('Database successfully prepared!');
  } catch (err) {
    console.error('Migration failed:', err.message);
  } finally {
    client.release();
    pool.end();
  }
}

verifyAndFixDB();
