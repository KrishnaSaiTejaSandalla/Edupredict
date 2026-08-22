import 'dotenv/config';
import { db, closeDB } from '../lib/db';
import { sql } from 'drizzle-orm';

async function initHolidaysTable() {
  try {
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS \`attendance_holidays\` (
        \`id\` int AUTO_INCREMENT PRIMARY KEY,
        \`school_id\` int NULL,
        \`holiday_date\` date NOT NULL,
        \`reason\` varchar(256) NOT NULL,
        \`created_by\` int NULL,
        \`created_at\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
        \`updated_at\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY \`attendance_holidays_date_unique\` (\`school_id\`, \`holiday_date\`),
        KEY \`attendance_holidays_created_by_idx\` (\`created_by\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);
    console.log('attendance_holidays table initialized successfully');
  } catch (error) {
    console.error('Error creating attendance_holidays table:', error);
  } finally {
    await closeDB();
  }
}

initHolidaysTable();
