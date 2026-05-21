import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT) || 3306,
  database: process.env.DB_NAME || 'aditiva_pronto',
  user: process.env.DB_USER || 'aditiva',
  password: process.env.DB_PASS || '',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  timezone: '-03:00',
});

export default pool;
