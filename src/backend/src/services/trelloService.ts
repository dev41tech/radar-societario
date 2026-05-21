import axios from 'axios';
import { getAllSettings } from '../repositories/settingsRepository';
import { LICENSE_TYPES, LicenseType } from '../types';
import logger from '../utils/logger';

function getLicenseLabel(type: LicenseType): string {
  return LICENSE_TYPES.find(l => l.key === type)?.label ?? type;
}

function formatDate(dateStr: string): string {
  const [y, m, d] = dateStr.split('-');
  return `${d}/${m}/${y}`;
}

const BASE = 'https://api.trello.com/1';

export async function createTrelloCard(data: {
  razao_social: string;
  cnpj: string | null;
  license_type: LicenseType;
  expiration_date: string;
  days_until: number;
}): Promise<string> {
  const s = await getAllSettings();
  if (!s.trello_api_key || !s.trello_token || !s.trello_list_id) {
    throw new Error('Trello não configurado');
  }

  const dueDate = new Date(data.expiration_date).toISOString();
  const licenseLabel = getLicenseLabel(data.license_type);
  const situacao = data.days_until < 0
    ? `⛔ VENCIDO há ${Math.abs(data.days_until)} dias`
    : `⚠️ Vence em ${data.days_until} dias`;

  const name = `[Radar] ${data.razao_social} — ${licenseLabel}`;
  const desc = [
    `**Empresa:** ${data.razao_social}`,
    data.cnpj ? `**CNPJ:** ${data.cnpj}` : '',
    `**Licenciamento:** ${licenseLabel}`,
    `**Vencimento:** ${formatDate(data.expiration_date)}`,
    `**Situação:** ${situacao}`,
  ].filter(Boolean).join('\n');

  const response = await axios.post(
    `${BASE}/cards`,
    {
      name,
      desc,
      idList: s.trello_list_id,
      due: dueDate,
    },
    {
      params: { key: s.trello_api_key, token: s.trello_token },
    }
  );

  logger.info(`Trello card criado: ${name} — ID ${response.data.id}`);
  return response.data.id as string;
}

export async function testTrelloConnection(): Promise<{ boards: Array<{ id: string; name: string }> }> {
  const s = await getAllSettings();
  const response = await axios.get(`${BASE}/members/me/boards`, {
    params: { key: s.trello_api_key, token: s.trello_token, fields: 'name' },
  });
  return { boards: response.data };
}

export async function getTrelloLists(boardId: string): Promise<Array<{ id: string; name: string }>> {
  const s = await getAllSettings();
  const response = await axios.get(`${BASE}/boards/${boardId}/lists`, {
    params: { key: s.trello_api_key, token: s.trello_token, fields: 'name' },
  });
  return response.data;
}
