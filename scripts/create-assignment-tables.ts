import 'dotenv/config';
import { db, closeDB } from '../lib/db';

import { sql } from 'drizzle-orm';


const queries = [
  `CREATE TABLE IF NOT EXISTS teacher_subject_assignments (
    id INT AUTO_INCREMENT NOT NULL,
    teacher_id INT NOT NULL,
    subject_id INT NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT pk_teacher_subject_assignments PRIMARY KEY(id),
    CONSTRAINT fk_tsa_teacher FOREIGN KEY(teacher_id) REFERENCES teachers(id) ON DELETE CASCADE,
    CONSTRAINT fk_tsa_subject FOREIGN KEY(subject_id) REFERENCES subjects(id) ON DELETE CASCADE
  )`,

  `CREATE TABLE IF NOT EXISTS teacher_class_assignments (
    id INT AUTO_INCREMENT NOT NULL,
    teacher_id INT NOT NULL,
    class_id INT NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT pk_teacher_class_assignments PRIMARY KEY(id),
    CONSTRAINT fk_tca_teacher FOREIGN KEY(teacher_id) REFERENCES teachers(id) ON DELETE CASCADE,
    CONSTRAINT fk_tca_class FOREIGN KEY(class_id) REFERENCES classes(id) ON DELETE CASCADE
  )`,

  `CREATE TABLE IF NOT EXISTS class_teacher_assignments (
    id INT AUTO_INCREMENT NOT NULL,
    teacher_id INT NOT NULL,
    class_id INT NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT pk_class_teacher_assignments PRIMARY KEY(id),
    CONSTRAINT uq_class_teacher_assignments UNIQUE(class_id),
    CONSTRAINT fk_cta_teacher FOREIGN KEY(teacher_id) REFERENCES teachers(id) ON DELETE CASCADE,
    CONSTRAINT fk_cta_class FOREIGN KEY(class_id) REFERENCES classes(id) ON DELETE CASCADE
  )`
];

async function run() {
  console.log('Creating teacher assignment tables...');
  for (const q of queries) {
    try {
      await db.execute(sql.raw(q));
      console.log('✓ Executed query successfully');
    } catch (e: any) {
      if (e.message.includes('already exists') || e.message.includes('Duplicate key name')) {
        console.log('- Index or table already exists, skipping');
      } else {
        throw e;
      }
    }
  }
  console.log('✓ All teacher assignment tables and indices created.');
  await closeDB();
}

run().catch(async (e) => {
  console.error('✗ DB Table Creation failed:', e.message);
  await closeDB();
  process.exit(1);
});
