import 'dotenv/config';
import { db } from '../lib/db';
import { sql } from 'drizzle-orm';

async function main() {
  console.log('Altering attendance table to add topic_taught...');
  try {
    await db.execute(sql`ALTER TABLE attendance ADD COLUMN topic_taught VARCHAR(255) NULL`);
    console.log('Successfully added topic_taught column to attendance table!');
  } catch (err: any) {
    if (err.message && err.message.includes('Duplicate column name')) {
      console.log('topic_taught column already exists in attendance table.');
    } else {
      console.error('Error altering table:', err);
    }
  }
  process.exit(0);
}

main();
