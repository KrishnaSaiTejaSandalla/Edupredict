import 'dotenv/config';
import fs from 'fs';
import crypto from 'crypto';

async function main() {
  const migrationsFolder = './drizzle';
  const journalPath = `${migrationsFolder}/meta/_journal.json`;
  const journal = JSON.parse(fs.readFileSync(journalPath, 'utf8'));

  for (const entry of journal.entries) {
    const filename = `${entry.tag}.sql`;
    const filepath = `${migrationsFolder}/${filename}`;
    const query = fs.readFileSync(filepath, 'utf8').replace(/\r\n/g, '\n');
    const hash = crypto.createHash('sha256').update(query).digest('hex');
    console.log(`Tag: ${entry.tag}, When: ${entry.when}, Hash: ${hash}`);
  }
}

main().catch(console.error);
