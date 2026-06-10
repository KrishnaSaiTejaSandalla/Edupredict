import { db, closeDB } from '../lib/db';
import { users } from '../lib/schema';

async function main() {
  try {
    const list = await db.select().from(users);
    console.log('Seeded users in DB:', list.map(u => ({ id: u.id, name: u.name, email: u.email, role: u.role, password: u.password })));
  } catch (e) {
    console.error('Error fetching users:', e);
  } finally {
    await closeDB();
  }
}

main();
