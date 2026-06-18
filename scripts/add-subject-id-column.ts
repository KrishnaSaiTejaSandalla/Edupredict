import 'dotenv/config';
import { db, closeDB } from '../lib/db';
import { sql } from 'drizzle-orm';

async function main() {
  console.log('Altering attendance table to add subject_id...');
  try {
    // Check if column exists, or just try to alter and handle error
    await db.execute(sql`
      ALTER TABLE attendance 
      ADD COLUMN subject_id INT NULL, 
      ADD CONSTRAINT fk_attendance_subject FOREIGN KEY (subject_id) REFERENCES subjects(id)
    `);
    console.log('Successfully added subject_id column and foreign key to attendance table!');
  } catch (err: any) {
    if (err.message && (err.message.includes('Duplicate column name') || err.message.includes('already exists') || err.message.includes('Duplicate key name'))) {
      console.log('subject_id column or constraint already exists in attendance table.');
    } else {
      console.error('Error altering table:', err);
    }
  } finally {
    await closeDB();
  }
  process.exit(0);
}

main();
