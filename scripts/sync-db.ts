import 'dotenv/config';
import mysql from 'mysql2/promise';

async function main() {
  const connection = await mysql.createConnection({
    host: process.env.MYSQL_HOST || 'localhost',
    port: Number(process.env.MYSQL_PORT || 3306),
    user: process.env.MYSQL_USER || 'root',
    password: process.env.MYSQL_PASSWORD || '',
    database: process.env.MYSQL_DATABASE || 'edupredict',
    multipleStatements: true,
  });

  console.log('Connected to DB');

  // 1. Create teacher_feedback table if not exists
  console.log('Creating teacher_feedback table...');
  await connection.query(`
    CREATE TABLE IF NOT EXISTS \`teacher_feedback\` (
      \`id\` int AUTO_INCREMENT NOT NULL,
      \`teacher_id\` int NOT NULL,
      \`student_id\` int NOT NULL,
      \`class_id\` int NOT NULL,
      \`rating\` int NOT NULL,
      \`comment\` text,
      \`category\` varchar(64) NOT NULL,
      \`academic_year\` varchar(64),
      \`created_at\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT \`teacher_feedback_id\` PRIMARY KEY(\`id\`)
    );
  `);

  // 2. Create teacher_resources table if not exists
  console.log('Creating teacher_resources table...');
  await connection.query(`
    CREATE TABLE IF NOT EXISTS \`teacher_resources\` (
      \`id\` int AUTO_INCREMENT NOT NULL,
      \`teacher_id\` int NOT NULL,
      \`school_id\` int NOT NULL,
      \`title\` varchar(256) NOT NULL,
      \`description\` text,
      \`subject\` varchar(128),
      \`class_level\` varchar(64),
      \`resource_type\` varchar(64) NOT NULL,
      \`file_url\` varchar(512),
      \`is_ai_generated\` boolean NOT NULL DEFAULT false,
      \`ai_prompt\` text,
      \`ai_content\` text,
      \`download_count\` int NOT NULL DEFAULT 0,
      \`created_at\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
      \`updated_at\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      CONSTRAINT \`teacher_resources_id\` PRIMARY KEY(\`id\`)
    );
  `);

  // Helper to add foreign key if not exists
  const addFK = async (table: string, fkName: string, fkSQL: string) => {
    try {
      await connection.query(`ALTER TABLE \`${table}\` ADD CONSTRAINT \`${fkName}\` ${fkSQL}`);
      console.log(`Added constraint ${fkName} to ${table}`);
    } catch (err) {
      if ((err as Error).message.includes('Duplicate key name') || (err as Error).message.includes('already exists') || (err as Error).message.includes('Duplicate foreign key')) {
        console.log(`Constraint ${fkName} already exists on ${table}`);
      } else {
        console.error(`Error adding constraint ${fkName} to ${table}:`, err);
      }
    }
  };

  // Helper to add index if not exists
  const addIdx = async (table: string, idxName: string, idxSQL: string) => {
    try {
      await connection.query(`CREATE INDEX \`${idxName}\` ON \`${table}\` ${idxSQL}`);
      console.log(`Added index ${idxName} on ${table}`);
    } catch (err) {
      if ((err as Error).message.includes('Duplicate key name') || (err as Error).message.includes('already exists')) {
        console.log(`Index ${idxName} already exists on ${table}`);
      } else {
        console.error(`Error adding index ${idxName} on ${table}:`, err);
      }
    }
  };

  // 3. Add foreign keys
  console.log('Adding foreign key constraints...');
  await addFK('teacher_feedback', 'teacher_feedback_teacher_id_teachers_id_fk', 'FOREIGN KEY (`teacher_id`) REFERENCES `teachers`(`id`) ON DELETE no action ON UPDATE no action');
  await addFK('teacher_feedback', 'teacher_feedback_student_id_students_id_fk', 'FOREIGN KEY (`student_id`) REFERENCES `students`(`id`) ON DELETE no action ON UPDATE no action');
  await addFK('teacher_feedback', 'teacher_feedback_class_id_classes_id_fk', 'FOREIGN KEY (`class_id`) REFERENCES `classes`(`id`) ON DELETE no action ON UPDATE no action');
  await addFK('teacher_resources', 'teacher_resources_teacher_id_teachers_id_fk', 'FOREIGN KEY (`teacher_id`) REFERENCES `teachers`(`id`) ON DELETE no action ON UPDATE no action');
  await addFK('teacher_resources', 'teacher_resources_school_id_schools_id_fk', 'FOREIGN KEY (`school_id`) REFERENCES `schools`(`id`) ON DELETE no action ON UPDATE no action');

  // 4. Add indexes
  console.log('Adding indexes...');
  await addIdx('teacher_feedback', 'teacher_feedback_teacher_id_idx', '(`teacher_id`)');
  await addIdx('teacher_feedback', 'teacher_feedback_student_id_idx', '(`student_id`)');
  await addIdx('teacher_feedback', 'teacher_feedback_class_id_idx', '(`class_id`)');
  await addIdx('teacher_resources', 'teacher_resources_teacher_id_idx', '(`teacher_id`)');
  await addIdx('teacher_resources', 'teacher_resources_school_id_idx', '(`school_id`)');
  await addIdx('teacher_resources', 'subject_idx', '(`subject`)');
  await addIdx('teacher_resources', 'resource_type_idx', '(`resource_type`)');

  // 5. Register migrations
  console.log('Registering migrations in __drizzle_migrations...');
  const migrationsToRegister = [
    {
      id: 7, // 0006 (1-based index 7 in __drizzle_migrations because DB already had 6 entries)
      hash: '0ff9bcbdae7c580dece723e93878a4d93c04ba920a8bd1fdae9a58387b144681',
      created_at: 1781519690607,
    },
    {
      id: 8, // 0007
      hash: 'ef84e053a08c389938a556f62e4b2d8939ceeb3250bc38578e13a0c9fa860570',
      created_at: 1781594907841,
    },
    {
      id: 9, // 0008
      hash: '36954057f0005bb94975aada2ec57ae876ed4288a634fe702834d09af5f1bcf7',
      created_at: 1781614554017,
    },
  ];

  for (const m of migrationsToRegister) {
    try {
      await connection.query(
        'INSERT INTO __drizzle_migrations (id, hash, created_at) VALUES (?, ?, ?)',
        [m.id, m.hash, m.created_at]
      );
      console.log(`Registered migration ID ${m.id} (hash: ${m.hash})`);
    } catch (err) {
      if ((err as Error).message.includes('Duplicate entry')) {
        console.log(`Migration ID ${m.id} already registered`);
      } else {
        console.error(`Error registering migration ID ${m.id}:`, err);
      }
    }
  }

  await connection.end();
  console.log('Done!');
}

main().catch(console.error);
