import 'dotenv/config';
import { db } from '../lib/db';
import { studentDiaries } from '../lib/schema';
import { eq } from 'drizzle-orm';

async function main() {
  console.log('--- Inspecting Diaries ---');
  const diaries = await db.select().from(studentDiaries).limit(5);
  console.log('Diaries in DB:', diaries);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
