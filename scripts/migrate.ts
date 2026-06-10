import 'dotenv/config';
import { migrate } from 'drizzle-orm/mysql2/migrator';
import { db, closeDB } from '@/lib/db';

async function main() {
  console.log('Running migrations...');

  try {
    await migrate(db, { migrationsFolder: './drizzle' });
    console.log('✓ Migrations completed successfully');
    await closeDB();
    process.exit(0);
  } catch (error) {
    console.error('✗ Migration failed:', error);
    await closeDB();
    process.exit(1);
  }
}

main();
