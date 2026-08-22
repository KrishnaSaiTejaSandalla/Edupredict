import 'dotenv/config';
import mysql from 'mysql2/promise';

async function main() {
  const connection = await mysql.createConnection({
    host: process.env.MYSQL_HOST || 'localhost',
    port: Number(process.env.MYSQL_PORT || 3306),
    user: process.env.MYSQL_USER || 'root',
    password: process.env.MYSQL_PASSWORD || '',
    database: process.env.MYSQL_DATABASE || 'edupredict',
  });

  console.log('Connected to MySQL. Ensuring attendance_holidays table exists...');

  await connection.query(`
    CREATE TABLE IF NOT EXISTS \`attendance_holidays\` (
      \`id\` int AUTO_INCREMENT NOT NULL,
      \`school_id\` int,
      \`holiday_date\` date NOT NULL,
      \`reason\` varchar(256) NOT NULL,
      \`created_by\` int,
      \`created_at\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
      \`updated_at\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (\`id\`),
      UNIQUE KEY \`attendance_holidays_date_unique\` (\`school_id\`, \`holiday_date\`),
      KEY \`attendance_holidays_created_by_idx\` (\`created_by\`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);

  console.log('✓ attendance_holidays table is ready.');
  await connection.end();
}

main().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
