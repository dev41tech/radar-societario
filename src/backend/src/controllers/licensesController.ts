import { Request, Response } from 'express';
import * as repo from '../repositories/licensesRepository';
import { checkTrelloCardExists, logTrelloCard } from '../repositories/licensesRepository';
import { createTrelloCard } from '../services/trelloService';
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
