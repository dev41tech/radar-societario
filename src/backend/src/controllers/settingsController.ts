import { Request, Response } from 'express';
import { getAllSettings, updateSettings } from '../repositories/settingsRepository';
import { sendTestEmail } from '../services/emailService';
import { testTrelloConnection, getTrelloLists } from '../services/trelloService';
import { initScheduler } from '../services/schedulerService';

export async function getSettings(req: Request, res: Response): Promise<void> {
  try {
    const settings = await getAllSettings();
    const safe = { ...settings, smtp_pass: settings.smtp_pass ? '••••••••' : '' };
    res.json(safe);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
}

export async function saveSettings(req: Request, res: Response): Promise<void> {
  try {
    const data = req.body;
    if (data.smtp_pass === '••••••••') delete data.smtp_pass;
    await updateSettings(data);
    await initScheduler();
    res.json({ ok: true });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
}

export async function testEmail(req: Request, res: Response): Promise<void> {
  try {
    const { to } = req.body;
    if (!to) { res.status(400).json({ error: 'E-mail de destino obrigatório' }); return; }
    await sendTestEmail(to);
    res.json({ ok: true, message: 'E-mail de teste enviado com sucesso' });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
}

export async function testTrello(req: Request, res: Response): Promise<void> {
  try {
    const result = await testTrelloConnection();
    res.json(result);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
}

export async function listTrelloLists(req: Request, res: Response): Promise<void> {
  try {
    const { boardId } = req.params;
    const lists = await getTrelloLists(boardId);
    res.json(lists);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
}
