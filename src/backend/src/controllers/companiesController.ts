import { Request, Response } from 'express';
import * as repo from '../repositories/companiesRepository';
import { getUpcomingExpirations } from '../repositories/licensesRepository';
import { z } from 'zod';

export async function getDashboard(req: Request, res: Response): Promise<void> {
  try {
    const [stats, upcoming] = await Promise.all([
      repo.getDashboardStats(),
      getUpcomingExpirations(10),
    ]);
    res.json({ stats, upcoming });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
}

export async function listCompanies(req: Request, res: Response): Promise<void> {
  try {
    const page   = Number(req.query.page)  || 1;
    const limit  = Number(req.query.limit) || 20;
    const search = String(req.query.search || '');
    const status = (req.query.status as 'all' | 'active' | 'inactive') || 'active';

    const validLicenseFilters = ['expired', '30', '60', '90'] as const;
    const rawLicenseFilter = req.query.licenseFilter as string | undefined;
    const licenseFilter = validLicenseFilters.includes(rawLicenseFilter as any)
      ? (rawLicenseFilter as 'expired' | '30' | '60' | '90')
      : undefined;

    const result = await repo.listCompanies({ page, limit, search, status, licenseFilter });
    res.json(result);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
}

export async function getCompany(req: Request, res: Response): Promise<void> {
  try {
    const company = await repo.getCompanyById(req.params.id);
    if (!company) { res.status(404).json({ error: 'Empresa não encontrada' }); return; }
    res.json(company);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
}

const createSchema = z.object({
  razao_social: z.string().min(2),
  cnpj:   z.string().optional(),
  cidade: z.string().optional(),
  uf:     z.string().max(2).optional(),
});

export async function createCompany(req: Request, res: Response): Promise<void> {
  try {
    const data = createSchema.parse(req.body);
    const company = await repo.createCompany(data);
    res.status(201).json(company);
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
}

const updateSchema = z.object({
  razao_social: z.string().min(2).optional(),
  cidade: z.string().optional(),
  uf:     z.string().max(2).optional(),
});

export async function patchCompany(req: Request, res: Response): Promise<void> {
  try {
    const company = await repo.getCompanyById(req.params.id);
    if (!company) { res.status(404).json({ error: 'Empresa não encontrada' }); return; }
    const data = updateSchema.parse(req.body);
    await repo.updateCompany(req.params.id, data);
    res.json(await repo.getCompanyById(req.params.id));
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
}

export async function inactivateCompany(req: Request, res: Response): Promise<void> {
  try {
    const company = await repo.getCompanyById(req.params.id);
    if (!company) { res.status(404).json({ error: 'Empresa não encontrada' }); return; }
    await repo.updateCompanyStatus(req.params.id, false);
    res.json({ ok: true });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
}

export async function activateCompany(req: Request, res: Response): Promise<void> {
  try {
    const company = await repo.getCompanyById(req.params.id);
    if (!company) { res.status(404).json({ error: 'Empresa não encontrada' }); return; }
    await repo.updateCompanyStatus(req.params.id, true);
    res.json({ ok: true });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
}

export async function bulkUpdateStatus(req: Request, res: Response): Promise<void> {
  try {
    const { ids, active } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
      res.status(400).json({ error: 'ids deve ser um array não vazio' });
      return;
    }
    if (typeof active !== 'boolean') {
      res.status(400).json({ error: 'active deve ser boolean' });
      return;
    }
    await repo.bulkUpdateCompanyStatus(ids, active);
    res.json({ ok: true, updated: ids.length });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
}
