import { Request, Response } from 'express';
import pool from '../db/connection';
import { upsertCompanyFromAditiva } from '../repositories/companiesRepository';
import { runNotificationJob } from '../services/schedulerService';
import {
  importLocationFromBuffer,
  importLocationFromPath,
  findLatestExportFile,
} from '../services/locationImportService';
import logger from '../utils/logger';

// Pasta padrão de exports do Aditiva Pronto (Windows local)
const DEFAULT_EXPORT_FOLDER = 'N:\\KAUAN\\AditivaPronto\\Exports';

export async function syncFromAditiva(req: Request, res: Response): Promise<void> {
  try {
    const [rows] = await pool.query(
      `SELECT c.id, c.razao_social, c.cnpj,
              cc.cidade_empresa AS cidade, cc.estado_empresa AS uf
       FROM companies c
       LEFT JOIN company_complements cc ON cc.company_id = c.id`
    ) as any;

    let synced = 0;
    for (const row of rows) {
      await upsertCompanyFromAditiva({
        aditiva_id:   row.id,
        razao_social: row.razao_social,
        cnpj:         row.cnpj,
        cidade:       row.cidade ?? null,
        uf:           row.uf    ?? null,
      });
      synced++;
    }

    logger.info(`Sync concluído: ${synced} empresas sincronizadas`);
    res.json({ ok: true, synced });
  } catch (e: any) {
    logger.error(`Erro no sync: ${e.message}`);
    res.status(500).json({ error: e.message });
  }
}

export async function syncLocation(req: Request, res: Response): Promise<void> {
  try {
    // Suporta: upload de arquivo (multipart, campo "file" como raw bytes via
    // express.raw) OU path no body OU auto-detect da pasta padrão
    const customPath = req.body?.filePath as string | undefined;
    const folder     = req.body?.folder ?? DEFAULT_EXPORT_FOLDER;

    let result;

    // 1. Upload de arquivo via body (application/octet-stream com nome no header)
    if (req.headers['content-type']?.startsWith('application/octet-stream')) {
      const fileName = (req.headers['x-file-name'] as string) || 'upload.xlsx';
      result = await importLocationFromBuffer(req.body as Buffer, fileName);

    // 2. Caminho explícito no body JSON
    } else if (customPath) {
      result = await importLocationFromPath(customPath);

    // 3. Auto-detect na pasta padrão
    } else {
      const filePath = findLatestExportFile(folder);
      if (!filePath) {
        res.status(404).json({
          error: `Nenhum arquivo "Relacao_Empresas*.xlsx" encontrado em: ${folder}`,
          folder,
        });
        return;
      }
      result = await importLocationFromPath(filePath);
    }

    res.json({ ok: true, ...result });
  } catch (e: any) {
    logger.error(`Erro ao importar localização: ${e.message}`);
    res.status(500).json({ error: e.message });
  }
}

export async function triggerNotifications(req: Request, res: Response): Promise<void> {
  try {
    const result = await runNotificationJob();
    res.json(result);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
}
