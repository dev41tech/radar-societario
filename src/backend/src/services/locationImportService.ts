import * as XLSX from 'xlsx';
import * as fs from 'fs';
import * as path from 'path';
import pool from '../db/connection';
import logger from '../utils/logger';

// ── Column name candidates ────────────────────────────────────────────────────
const CNPJ_HEADERS     = ['CNPJ/CPF/CEI/CAEPF', 'CNPJ / CPF / CEI / CAEPF', 'CNPJ/CPF/CEI', 'CNPJ', 'cnpj'];
const MUNICIPIO_HEADERS = ['Município', 'Municipio', 'MUNICIPIO', 'MUNICÍPIO'];
const UF_HEADERS        = ['UF', 'uf', 'Estado', 'ESTADO'];

function findIdx(headers: string[], candidates: string[]): number {
  for (const c of candidates) {
    const i = headers.findIndex(h => h?.toString().trim().toLowerCase() === c.toLowerCase());
    if (i !== -1) return i;
  }
  return -1;
}

function normalizeCNPJ(raw: string): string {
  const digits = raw.replace(/\D/g, '');
  if (digits.length === 14) {
    return digits.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5');
  }
  return raw.trim();
}

export interface LocationImportResult {
  updated: number;
  skipped: number;
  notFound: number;
  errors: string[];
  fileUsed: string;
}

export async function importLocationFromBuffer(
  buffer: Buffer,
  fileName: string
): Promise<LocationImportResult> {
  const result: LocationImportResult = { updated: 0, skipped: 0, notFound: 0, errors: [], fileUsed: fileName };

  const wb   = XLSX.read(buffer, { type: 'buffer', raw: false, cellText: true });
  const ws   = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '', raw: false }) as string[][];

  if (rows.length < 2) throw new Error('Planilha vazia ou sem dados');

  const headers    = rows[0].map(h => h?.toString().trim());
  const cnpjIdx    = findIdx(headers, CNPJ_HEADERS);
  const cidadeIdx  = findIdx(headers, MUNICIPIO_HEADERS);
  const ufIdx      = findIdx(headers, UF_HEADERS);

  if (cnpjIdx   === -1) throw new Error(`Coluna CNPJ não encontrada. Esperado: ${CNPJ_HEADERS.join(' | ')}`);
  if (cidadeIdx === -1) throw new Error(`Coluna Município não encontrada. Esperado: ${MUNICIPIO_HEADERS.join(' | ')}`);
  if (ufIdx     === -1) throw new Error(`Coluna UF não encontrada. Esperado: ${UF_HEADERS.join(' | ')}`);

  logger.info(`[location-import] colunas — CNPJ:${cnpjIdx} Município:${cidadeIdx} UF:${ufIdx}`);

  for (const [i, row] of rows.slice(1).entries()) {
    const rawCnpj = row[cnpjIdx]?.toString().trim() ?? '';
    const cidade  = row[cidadeIdx]?.toString().trim() || null;
    const uf      = row[ufIdx]?.toString().trim() || null;

    if (!rawCnpj) { result.skipped++; continue; }

    const cnpj = normalizeCNPJ(rawCnpj);

    try {
      const [res] = await pool.query(
        'UPDATE rs_companies SET cidade = ?, uf = ? WHERE cnpj = ?',
        [cidade, uf, cnpj]
      ) as any;

      if (res.affectedRows > 0) {
        result.updated++;
      } else {
        result.notFound++;
      }
    } catch (e: any) {
      result.errors.push(`Linha ${i + 2}: ${e.message}`);
    }
  }

  logger.info(`[location-import] ${fileName} — atualizado:${result.updated} nãoEncontrado:${result.notFound} pulado:${result.skipped}`);
  return result;
}

export async function importLocationFromPath(filePath: string): Promise<LocationImportResult> {
  if (!fs.existsSync(filePath)) throw new Error(`Arquivo não encontrado: ${filePath}`);
  const buffer = fs.readFileSync(filePath);
  return importLocationFromBuffer(buffer, path.basename(filePath));
}

/** Encontra o XLSX mais recente na pasta de exports do Aditiva Pronto */
export function findLatestExportFile(folder: string): string | null {
  if (!fs.existsSync(folder)) return null;

  const files = fs.readdirSync(folder)
    .filter(f => /Relacao_Empresas.*\.xlsx$/i.test(f) && !f.startsWith('~$'))
    .map(f => ({
      name: f,
      mtime: fs.statSync(path.join(folder, f)).mtime,
    }))
    .sort((a, b) => b.mtime.getTime() - a.mtime.getTime());

  return files.length > 0 ? path.join(folder, files[0].name) : null;
}
