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

  console.log('Connected to DB');

  try {
    const [totalRows] = await connection.query('SELECT COUNT(*) as count FROM attendance');
    console.log('Total attendance rows:', totalRows);

    const [nonNullSubjectRows] = await connection.query('SELECT COUNT(*) as count FROM attendance WHERE subject_id IS NOT NULL');
    console.log('Attendance rows with subject_id:', nonNullSubjectRows);

    const [nonNullTopicRows] = await connection.query('SELECT COUNT(*) as count FROM attendance WHERE topic_taught IS NOT NULL');
    console.log('Attendance rows with topic_taught:', nonNullTopicRows);
  } catch (error) {
    console.error('attendance query error:', (error as Error).message);
  }

  await connection.end();
}

main().catch(console.error);
