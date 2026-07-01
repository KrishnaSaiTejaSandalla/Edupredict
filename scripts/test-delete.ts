import 'dotenv/config';
import { db } from '../lib/db';
import { notifications } from '../lib/schema';
import { eq } from 'drizzle-orm';
import { deleteAnnouncement } from '../lib/announcement-actions';

async function main() {
  console.log('--- Inspecting Announcements ---');
  const list = await db.select().from(notifications).where(eq(notifications.type, 'announcement')).limit(10);
  console.log('Announcements in DB:', list);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
