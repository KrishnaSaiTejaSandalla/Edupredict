require('dotenv').config();
const mysql = require('mysql2/promise');

(async () => {
  const conn = await mysql.createConnection({
    host: process.env.MYSQL_HOST,
    user: process.env.MYSQL_USER,
    password: process.env.MYSQL_PASSWORD,
    database: process.env.MYSQL_DATABASE,
  });

  console.log('Backfilling parents.parent_email from users.email...');

  // Set parent_email = users.email for all parents where parent_email is NULL
  const [result] = await conn.query(`
    UPDATE parents p
    JOIN users u ON p.user_id = u.id
    SET p.parent_email = u.email
    WHERE p.parent_email IS NULL
  `);

  console.log('✓ Updated rows:', result.affectedRows);

  const [check] = await conn.query(`
    SELECT COUNT(*) as missing FROM parents WHERE parent_email IS NULL
  `);
  console.log('Parents still missing email:', check[0].missing);

  // Show a sample to confirm
  const [sample] = await conn.query(`
    SELECT p.id, u.name, u.email, p.parent_email
    FROM parents p
    JOIN users u ON p.user_id = u.id
    LIMIT 5
  `);
  console.log('\nSample verification:');
  sample.forEach(r => console.log(`  Parent #${r.id}: ${r.name} | users.email=${r.email} | parents.parent_email=${r.parent_email}`));

  await conn.end();
  console.log('\n✅ Done!');
})().catch(e => { console.error('❌ Error:', e.message); process.exit(1); });
