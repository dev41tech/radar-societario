import pool from '../db/connection';
import { Company } from '../types';
import { v4 as uuidv4 } from 'uuid';

// Ranges SQL para filtro por vencimento de licença (consistentes com getDashboardStats)
const LICENSE_FILTER_SQL: Record<string, string> = {
  expired: 'DATEDIFF(l.expiration_date, CURDATE()) < 0',
  '30':    'DATEDIFF(l.expiration_date, CURDATE()) BETWEEN 0 AND 30',
  '60':    'DATEDIFF(l.expiration_date, CURDATE()) BETWEEN 31 AND 60',
  '90':    'DATEDIFF(l.expiration_date, CURDATE()) BETWEEN 61 AND 90',
};

export async function listCompanies(params: {
  page: number;
  limit: number;
  search: string;
  status: 'all' | 'active' | 'inactive';
  licenseFilter?: 'expired' | '30' | '60' | '90';
}): Promise<{ data: Company[]; total: number }> {
  const { page, limit, search, status, licenseFilter } = params;
  const offset = (page - 1) * limit;

  const hasLicenseFilter = !!licenseFilter && licenseFilter in LICENSE_FILTER_SQL;
  // Quando há filtro de licença, usamos alias 'c' para rs_companies
  const p = hasLicenseFilter ? 'c.' : '';

  const conditions: string[] = [];
  const values: any[] = [];

  if (search) {
    conditions.push(`(${p}razao_social LIKE ? OR ${p}cnpj LIKE ? OR ${p}cidade LIKE ?)`);
    values.push(`%${search}%`, `%${search}%`, `%${search}%`);
  }
  if (status === 'active')   conditions.push(`${p}active = TRUE`);
  if (status === 'inactive') conditions.push(`${p}active = FALSE`);

  if (hasLicenseFilter) {
    conditions.push('l.applicable = TRUE');
    conditions.push('l.expiration_date IS NOT NULL');
    conditions.push(LICENSE_FILTER_SQL[licenseFilter!]);
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  let countSql: string;
  let dataSql: string;

  if (hasLicenseFilter) {
    const join = 'JOIN rs_company_licenses l ON l.company_id = c.id';
    // DISTINCT evita duplicar empresas com múltiplas licenças no mesmo range
    countSql = `SELECT COUNT(DISTINCT c.id) as total FROM rs_companies c ${join} ${where}`;
    dataSql  = `SELECT DISTINCT c.* FROM rs_companies c ${join} ${where} ORDER BY c.razao_social ASC LIMIT ? OFFSET ?`;
  } else {
    countSql = `SELECT COUNT(*) as total FROM rs_companies ${where}`;
    dataSql  = `SELECT * FROM rs_companies ${where} ORDER BY razao_social ASC LIMIT ? OFFSET ?`;
  }

  const [countRows] = await pool.query(countSql, values) as any;
  const total = countRows[0].total;

  const [rows] = await pool.query(dataSql, [...values, limit, offset]) as any;

  return { data: rows, total };
}

export async function getCompanyById(id: string): Promise<Company | null> {
  const [rows] = await pool.query('SELECT * FROM rs_companies WHERE id = ?', [id]) as any;
  return rows[0] ?? null;
}

export async function createCompany(data: {
  razao_social: string;
  cnpj?: string;
  cidade?: string;
  uf?: string;
}): Promise<Company> {
  const id = uuidv4();
  await pool.query(
    'INSERT INTO rs_companies (id, razao_social, cnpj, cidade, uf, source) VALUES (?, ?, ?, ?, ?, ?)',
    [id, data.razao_social, data.cnpj || null, data.cidade || null, data.uf || null, 'manual']
  );
  return (await getCompanyById(id))!;
}

export async function updateCompany(id: string, data: {
  razao_social?: string;
  cidade?: string;
  uf?: string;
}): Promise<void> {
  const fields: string[] = [];
  const values: any[] = [];
  if (data.razao_social !== undefined) { fields.push('razao_social = ?'); values.push(data.razao_social); }
  if (data.cidade !== undefined)       { fields.push('cidade = ?');       values.push(data.cidade || null); }
  if (data.uf !== undefined)           { fields.push('uf = ?');           values.push(data.uf || null); }
  if (!fields.length) return;
  values.push(id);
  await pool.query(`UPDATE rs_companies SET ${fields.join(', ')} WHERE id = ?`, values);
}

export async function updateCompanyStatus(id: string, active: boolean): Promise<void> {
  await pool.query('UPDATE rs_companies SET active = ? WHERE id = ?', [active, id]);
}

export async function bulkUpdateCompanyStatus(ids: string[], active: boolean): Promise<void> {
  if (!ids.length) return;
  const placeholders = ids.map(() => '?').join(', ');
  await pool.query(
    `UPDATE rs_companies SET active = ? WHERE id IN (${placeholders})`,
    [active, ...ids]
  );
}

export async function upsertCompanyFromAditiva(data: {
  aditiva_id: string;
  razao_social: string;
  cnpj: string;
  cidade?: string | null;
  uf?: string | null;
}): Promise<void> {
  const [existing] = await pool.query(
    'SELECT id FROM rs_companies WHERE aditiva_id = ? OR cnpj = ?',
    [data.aditiva_id, data.cnpj]
  ) as any;

  if (existing.length > 0) {
    await pool.query(
      `UPDATE rs_companies
       SET razao_social = ?, aditiva_id = ?,
           cidade = COALESCE(?, cidade),
           uf     = COALESCE(?, uf)
       WHERE id = ?`,
      [data.razao_social, data.aditiva_id, data.cidade ?? null, data.uf ?? null, existing[0].id]
    );
  } else {
    const id = uuidv4();
    await pool.query(
      'INSERT INTO rs_companies (id, aditiva_id, razao_social, cnpj, cidade, uf, source) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [id, data.aditiva_id, data.razao_social, data.cnpj, data.cidade ?? null, data.uf ?? null, 'imported']
    );
  }
}

export async function getDashboardStats(): Promise<{
  total: number;
  active: number;
  expiring_30: number;
  expiring_60: number;
  expiring_90: number;
  expired: number;
}> {
  const [total]  = await pool.query('SELECT COUNT(*) as n FROM rs_companies') as any;
  const [active] = await pool.query('SELECT COUNT(*) as n FROM rs_companies WHERE active = TRUE') as any;

  // Usa DATEDIFF no MySQL para evitar divergência de timezone com JS (toISOString → UTC).
  // Ranges EXCLUSIVOS: uma licença em 15 dias conta APENAS em expiring_30, não em 60 ou 90.
  const baseFilter = `
    FROM rs_company_licenses l
    JOIN rs_companies c ON c.id = l.company_id
    WHERE c.active = TRUE AND l.applicable = TRUE AND l.expiration_date IS NOT NULL`;

  const [e30]     = await pool.query(`SELECT COUNT(DISTINCT l.company_id) as n ${baseFilter} AND DATEDIFF(l.expiration_date, CURDATE()) BETWEEN 0  AND 30`) as any;
  const [e60]     = await pool.query(`SELECT COUNT(DISTINCT l.company_id) as n ${baseFilter} AND DATEDIFF(l.expiration_date, CURDATE()) BETWEEN 31 AND 60`) as any;
  const [e90]     = await pool.query(`SELECT COUNT(DISTINCT l.company_id) as n ${baseFilter} AND DATEDIFF(l.expiration_date, CURDATE()) BETWEEN 61 AND 90`) as any;
  const [expired] = await pool.query(`SELECT COUNT(DISTINCT l.company_id) as n ${baseFilter} AND DATEDIFF(l.expiration_date, CURDATE()) < 0`) as any;

  return {
    total:       total[0].n,
    active:      active[0].n,
    expiring_30: e30[0].n,
    expiring_60: e60[0].n,
    expiring_90: e90[0].n,
    expired:     expired[0].n,
  };
}
