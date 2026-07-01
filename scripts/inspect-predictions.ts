import 'dotenv/config';
import { db } from '../lib/db';
import { predictions } from '../lib/schema';

async function main() {
  console.log('--- Inspecting Predictions ---');
  const allPreds = await db.select().from(predictions).limit(10);
  console.log('All Predictions:', allPreds);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
