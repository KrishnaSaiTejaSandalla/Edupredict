import 'dotenv/config';
import { db, closeDB } from '../lib/db';
import { sql } from 'drizzle-orm';
import crypto from 'crypto';

async function main() {
  try {
    console.log('Checking if qr_token column exists on students...');
    const [cols]: any = await db.execute(sql`SHOW COLUMNS FROM students LIKE 'qr_token'`);
    if (cols.length === 0) {
      console.log('Adding qr_token column...');
      await db.execute(sql`ALTER TABLE students ADD COLUMN qr_token VARCHAR(128) UNIQUE`);
      console.log('qr_token column added.');
    } else {
      console.log('qr_token column already exists.');
    }

    // Now populate any students that have null qr_token
    const [studentsWithoutQr]: any = await db.execute(sql`SELECT id FROM students WHERE qr_token IS NULL`);
    console.log(`Found ${studentsWithoutQr.length} students without qr_token.`);
    for (const st of studentsWithoutQr) {
      const token = 'STU-QR-' + crypto.randomBytes(16).toString('hex').toUpperCase();
      await db.execute(sql`UPDATE students SET qr_token = ${token} WHERE id = ${st.id}`);
    }
    console.log('All students now have unique qr_token.');
  } catch (err) {
    console.error('Error ensuring qr column:', err);
  } finally {
    await closeDB();
  }
}

main();
