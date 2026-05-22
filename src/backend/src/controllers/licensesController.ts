import { Request, Response } from 'express';
import * as repo from '../repositories/licensesRepository';
import { checkTrelloCardExists, logTrelloCard } from '../repositories/licensesRepository';
import { createTrelloCard } from '../services/trelloService';
import { sendExpirationNotification } from '../services/emailService';
import { getCompanyById } from '../repositories/companiesRepository';
import { LicenseType } from '../types';

export async function getLicenses(req: Request, res: Response): Promise<void> {
  try {
    const licenses = await repo.getLicensesForCompany(req.params.id);
    res.json(licenses);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
}

export async function saveLicenses(req: Request, res: Response): Promise<void> {
  try {
    const { licenses } = req.body;
    if (!Array.isArray(licenses)) { res.status(400).json({ error: 'licenses deve ser um array' }); return; }
    await repo.upsertAllLicenses(req.params.id, licenses);
    const updated = await repo.getLicensesForCompany(req.params.id);
    res.json(updated);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
}

export async function notifyLicense(req: Request, res: Response): Promise<void> {
  try {
    const company = await getCompanyById(req.params.id);
    if (!company) { res.status(404).json({ error: 'Empresa não encontrada' }); return; }

    const { license_type, expiration_date, days_until } = req.body;
    if (!license_type || !expiration_date) {
      res.status(400).json({ error: 'license_type e expiration_date são obrigatórios' });
      return;
    }

    await sendExpirationNotification([{
      razao_social:    company.razao_social,
      cnpj:            company.cnpj,
      license_type:    license_type as LicenseType,
      expiration_date,
      days_until:      Number(days_until) || 0,
    }]);

    res.json({ ok: true });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
}

export async function createTrelloCardForLicense(req: Request, res: Response): Promise<void> {
  try {
    const { company_id, license_type, expiration_date, razao_social, cnpj, days_until } = req.body;

    const exists = await checkTrelloCardExists(company_id, license_type, expiration_date);
    if (exists) { res.status(409).json({ error: 'Card Trello já criado para este licenciamento' }); return; }

    const cardId = await createTrelloCard({ razao_social, cnpj, license_type, expiration_date, days_until });
    await logTrelloCard(company_id, license_type, expiration_date, cardId);
    res.json({ card_id: cardId });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
}
