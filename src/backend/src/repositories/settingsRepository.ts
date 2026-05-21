import pool from '../db/connection';
import { Settings } from '../types';

export async function getAllSettings(): Promise<Settings> {
  const [rows] = await pool.query('SELECT `key`, `value` FROM rs_settings') as any;
  const map: Record<string, string> = {};
  for (const row of rows) map[row.key] = row.value;
  return map as unknown as Settings;
}

export async function updateSettings(data: Partial<Settings>): Promise<void> {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    for (const [key, value] of Object.entries(data)) {
      await conn.query(
        'INSERT INTO rs_settings (`key`, `value`) VALUES (?, ?) ON DUPLICATE KEY UPDATE `value` = ?, updated_at = CURRENT_TIMESTAMP',
        [key, value, value]
      );
    }
    await conn.commit();
  } catch (e) {
    await conn.rollback();
    throw e;
  } finally {
    conn.release();
  }
}

export async function getSetting(key: string): Promise<string | null> {
  const [rows] = await pool.query('SELECT `value` FROM rs_settings WHERE `key` = ?', [key]) as any;
  return rows[0]?.value ?? null;
}
