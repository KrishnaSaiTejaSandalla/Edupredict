import mysql from 'mysql2/promise';
import { drizzle } from 'drizzle-orm/mysql2';
import { validateEnv } from './env';

validateEnv();

const poolConfig = {
  host: process.env.MYSQL_HOST || 'localhost',
  port: Number(process.env.MYSQL_PORT || 3306),
  user: process.env.MYSQL_USER || 'root',
  password: process.env.MYSQL_PASSWORD || '',
  database: process.env.MYSQL_DATABASE || 'edupredict',

  waitForConnections: true,
  connectionLimit: 10,
  maxIdle: 10,
  idleTimeout: 60000,
  queueLimit: 0,
};

declare global {
  // eslint-disable-next-line no-var
  var mysqlPool: mysql.Pool | undefined;
}

const pool =
  global.mysqlPool ??
  mysql.createPool(poolConfig);

if (process.env.NODE_ENV !== 'production') {
  global.mysqlPool = pool;
}

export const db = drizzle(pool);

export async function closeDB() {
  await pool.end();
}