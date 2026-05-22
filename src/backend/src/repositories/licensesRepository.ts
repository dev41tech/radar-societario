import pool from '../db/connection';
import { CompanyLicense, LicenseType } from '../types';
import { getLicenseStatus } from '../utils/licenseStatus';

export async function getLicensesForCompany(companyId: string): Promise<CompanyLicense[]> {
  const [rows] = await pool.query(
    'SELECT * FROM rs_company_licenses WHERE company_id = ? ORDER BY created_at ASC',
    [companyId]
  ) as any;

  return rows.map((row: any) => {
    const { status, daysUntil } = getLicenseStatus(row.expiration_date, row.applicable);
    return { ...row, status, days_until_expiration: daysUntil };
  });
}

export async function upsertAllLicenses(
  companyId: string,
  licenses: Array<{
    license_type: LicenseType;
    license_label?: string | null;
    expiration_date: string | null;
    expiration_date_text: string | null;
    notes: string | null;
    applicable: boolean;
  }>
): Promise<void> {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    // Replace all licenses for this company
    await conn.query('DELETE FROM rs_company_licenses WHERE company_id = ?', [companyId]);
    for (const l of licenses) {
      await conn.query(
        `INSERT INTO rs_company_licenses
         (company_id, license_type, license_label, expiration_date, expiration_date_text, notes, applicable)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [companyId, l.license_type, l.license_label || null, l.expiration_date || null, l.expiration_date_text || null, l.notes || null, l.applicable]
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

export async function getExpiringLicenses(daysBefore: number): Promise<Array<{
  company_id: string;
  razao_social: string;
  cnpj: string | null;
  license_type: LicenseType;
  expiration_date: string;
  days_until: number;
}>> {
  // Usa apenas aritmética do MySQL para evitar qualquer divergência de timezone
  // entre o processo Node.js (que usa toISOString → UTC) e o MySQL (timezone -03:00).
  // DATEDIFF retorna negativo para datas vencidas, mas incluímos >= 0 para cobrir
  // somente licenças ainda não vencidas (ou vencendo hoje = 0 dias).
  const [rows] = await pool.query(
    `SELECT l.company_id, c.razao_social, c.cnpj, l.license_type,
            DATE_FORMAT(l.expiration_date, '%Y-%m-%d') AS expiration_date,
            DATEDIFF(l.expiration_date, CURDATE()) AS days_until
     FROM rs_company_licenses l
     JOIN rs_companies c ON c.id = l.company_id
     WHERE c.active = TRUE AND l.applicable = TRUE
       AND l.expiration_date IS NOT NULL
       AND DATEDIFF(l.expiration_date, CURDATE()) BETWEEN 0 AND ?
     ORDER BY l.expiration_date ASC`,
    [daysBefore]
  ) as any;
  return rows;
}

export async function checkNotificationSent(
  companyId: string, licenseType: string, daysBefore: number, expirationDate: string
): Promise<boolean> {
  const [rows] = await pool.query(
    'SELECT id FROM rs_notification_log WHERE company_id=? AND license_type=? AND days_before=? AND expiration_date=?',
    [companyId, licenseType, daysBefore, expirationDate]
  ) as any;
  return rows.length > 0;
}

export async function logNotification(
  companyId: string, licenseType: string, daysBefore: number, expirationDate: string
): Promise<void> {
  await pool.query(
    'INSERT IGNORE INTO rs_notification_log (company_id, license_type, days_before, expiration_date) VALUES (?,?,?,?)',
    [companyId, licenseType, daysBefore, expirationDate]
  );
}

export async function checkTrelloCardExists(
  companyId: string, licenseType: string, expirationDate: string
): Promise<boolean> {
  const [rows] = await pool.query(
    'SELECT id FROM rs_trello_cards WHERE company_id=? AND license_type=? AND expiration_date=?',
    [companyId, licenseType, expirationDate]
  ) as any;
  return rows.length > 0;
}

export async function logTrelloCard(
  companyId: string, licenseType: string, expirationDate: string, cardId: string
): Promise<void> {
  await pool.query(
    'INSERT IGNORE INTO rs_trello_cards (company_id, license_type, expiration_date, card_id) VALUES (?,?,?,?)',
    [companyId, licenseType, expirationDate, cardId]
  );
}

export async function getDiagnosticLicenses(maxDays: number): Promise<Array<{
  company_id: string;
  razao_social: string;
  cnpj: string | null;
  license_type: LicenseType;
  license_label: string | null;
  expiration_date: string;
  days_until: number;
  notification_count: number;
  notification_days_before: number | null;
  notification_sent_at: string | null;
  trello_count: number;
}>> {
  // Inclui licenças em até maxDays dias futuros E vencidas há até 365 dias
  // Correlated subqueries para evitar duplicatas por múltiplas entradas no log
  const [rows] = await pool.query(
    `SELECT
       l.company_id, c.razao_social, c.cnpj, l.license_type, l.license_label,
       DATE_FORMAT(l.expiration_date, '%Y-%m-%d') AS expiration_date,
       DATEDIFF(l.expiration_date, CURDATE()) AS days_until,
       (SELECT COUNT(*) FROM rs_notification_log nl
        WHERE nl.company_id = l.company_id
          AND nl.license_type = l.license_type
          AND nl.expiration_date = l.expiration_date) AS notification_count,
       (SELECT nl.days_before FROM rs_notification_log nl
        WHERE nl.company_id = l.company_id
          AND nl.license_type = l.license_type
          AND nl.expiration_date = l.expiration_date
        ORDER BY nl.sent_at DESC LIMIT 1) AS notification_days_before,
       (SELECT DATE_FORMAT(nl.sent_at, '%Y-%m-%d %H:%i') FROM rs_notification_log nl
        WHERE nl.company_id = l.company_id
          AND nl.license_type = l.license_type
          AND nl.expiration_date = l.expiration_date
        ORDER BY nl.sent_at DESC LIMIT 1) AS notification_sent_at,
       (SELECT COUNT(*) FROM rs_trello_cards tc
        WHERE tc.company_id = l.company_id
          AND tc.license_type = l.license_type
          AND tc.expiration_date = l.expiration_date) AS trello_count
     FROM rs_company_licenses l
     JOIN rs_companies c ON c.id = l.company_id
     WHERE c.active = TRUE AND l.applicable = TRUE AND l.expiration_date IS NOT NULL
       AND DATEDIFF(l.expiration_date, CURDATE()) BETWEEN -365 AND ?
     ORDER BY l.expiration_date ASC`,
    [maxDays]
  ) as any;
  return rows;
}

export async function getUpcomingExpirations(limit = 10): Promise<Array<{
  company_id: string;
  razao_social: string;
  license_type: LicenseType;
  license_label: string | null;
  expiration_date: string;
  days_until: number;
}>> {
  const today = new Date().toISOString().split('T')[0];
  const [rows] = await pool.query(
    `SELECT l.company_id, c.razao_social, l.license_type, l.license_label,
            l.expiration_date, DATEDIFF(l.expiration_date, CURDATE()) as days_until
     FROM rs_company_licenses l
     JOIN rs_companies c ON c.id = l.company_id
     WHERE c.active = TRUE AND l.applicable = TRUE
       AND l.expiration_date IS NOT NULL AND l.expiration_date >= ?
     ORDER BY l.expiration_date ASC LIMIT ?`,
    [today, limit]
  ) as any;
  return rows;
}
