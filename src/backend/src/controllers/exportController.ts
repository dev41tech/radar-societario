import { Request, Response } from 'express';
import pool from '../db/connection';
import * as XLSX from 'xlsx';
import { LICENSE_TYPES } from '../types';

function getLicenseLabel(type: string): string {
  return LICENSE_TYPES.find(l => l.key === type)?.label ?? type;
}

function situacao(
  daysUntil: number | null,
  applicable: boolean,
  hasDate: boolean,
  hasText: boolean
): string {
  if (!applicable)  return 'Não aplicável';
  if (hasText)      return 'Texto livre';
  if (!hasDate)     return 'Data não definida';
  if (daysUntil === null) return '—';
  if (daysUntil < 0)      return 'Vencida';
  if (daysUntil <= 30)    return 'Crítico (≤30d)';
  if (daysUntil <= 60)    return 'Atenção (31–60d)';
  if (daysUntil <= 90)    return 'Em breve (61–90d)';
  return 'OK';
}

export async function exportCompanies(req: Request, res: Response): Promise<void> {
  try {
    // Uma linha por combinação empresa+licença (LEFT JOIN para incluir empresas sem licenças)
    const [rows] = await pool.query(
      `SELECT c.razao_social, c.cnpj, c.cidade, c.uf,
              IF(c.active, 'Ativa', 'Inativa') AS status_empresa,
              IF(c.source = 'manual', 'Manual', 'Importada') AS origem,
              l.license_type,
              DATE_FORMAT(l.expiration_date, '%Y-%m-%d') AS expiration_date,
              l.expiration_date_text,
              COALESCE(l.applicable, 1) AS applicable,
              DATEDIFF(l.expiration_date, CURDATE()) AS days_until
       FROM rs_companies c
       LEFT JOIN rs_company_licenses l ON l.company_id = c.id
       ORDER BY c.razao_social ASC, l.license_type ASC`
    ) as any;

    const headers = [
      'Razão Social', 'CNPJ', 'Cidade', 'UF', 'Status', 'Origem',
      'Licença', 'Vencimento', 'Vencimento (texto)', 'Dias Restantes', 'Situação',
    ];

    const dataRows = rows.map((r: any) => [
      r.razao_social,
      r.cnpj          ?? '',
      r.cidade         ?? '',
      r.uf             ?? '',
      r.status_empresa,
      r.origem,
      r.license_type   ? getLicenseLabel(r.license_type) : '',
      r.expiration_date ?? '',
      r.expiration_date_text ?? '',
      r.days_until !== null && r.days_until !== undefined ? Number(r.days_until) : '',
      r.license_type
        ? situacao(
            r.days_until !== null ? Number(r.days_until) : null,
            Boolean(r.applicable),
            !!r.expiration_date,
            !!r.expiration_date_text
          )
        : '',
    ]);

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet([headers, ...dataRows]);

    ws['!cols'] = [
      { wch: 42 }, { wch: 20 }, { wch: 20 }, { wch: 5 }, { wch: 10 }, { wch: 12 },
      { wch: 26 }, { wch: 14 }, { wch: 22 }, { wch: 14 }, { wch: 18 },
    ];

    XLSX.utils.book_append_sheet(wb, ws, 'Licenciamentos');

    const buf  = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    const date = new Date().toISOString().split('T')[0];
    res.setHeader('Content-Disposition', `attachment; filename="radar-societario-${date}.xlsx"`);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.send(buf);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
}
