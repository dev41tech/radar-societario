import nodemailer from 'nodemailer';
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

export async function createTransporter() {
  const s = await getAllSettings();
  return nodemailer.createTransport({
    host: s.smtp_host,
    port: Number(s.smtp_port) || 587,
    secure: s.smtp_secure === 'true',
    auth: { user: s.smtp_user, pass: s.smtp_pass },
  });
}

export async function sendExpirationNotification(items: Array<{
  razao_social: string;
  cnpj: string | null;
  license_type: LicenseType;
  expiration_date: string;
  days_until: number;
}>): Promise<void> {
  const s = await getAllSettings();
  if (!s.smtp_host || !s.smtp_user) throw new Error('SMTP não configurado');

  const emails: string[] = JSON.parse(s.notification_emails || '[]');
  if (!emails.length) throw new Error('Nenhum e-mail de destino configurado');

  const transporter = await createTransporter();

  const rows = items.map(i => `
    <tr>
      <td style="padding:8px;border:1px solid #e2e8f0">${i.razao_social}</td>
      <td style="padding:8px;border:1px solid #e2e8f0">${i.cnpj || '—'}</td>
      <td style="padding:8px;border:1px solid #e2e8f0">${getLicenseLabel(i.license_type)}</td>
      <td style="padding:8px;border:1px solid #e2e8f0">${formatDate(i.expiration_date)}</td>
      <td style="padding:8px;border:1px solid #e2e8f0;color:${i.days_until < 0 ? '#dc2626' : i.days_until <= 30 ? '#ea580c' : '#ca8a04'};font-weight:bold">
        ${i.days_until < 0 ? `Vencido há ${Math.abs(i.days_until)} dias` : `${i.days_until} dias`}
      </td>
    </tr>`).join('');

  const html = `
    <div style="font-family:sans-serif;max-width:800px;margin:0 auto">
      <h2 style="color:#1e293b">⚠️ Radar Societário — Licenciamentos Próximos ao Vencimento</h2>
      <p style="color:#475569">Os seguintes licenciamentos requerem atenção:</p>
      <table style="width:100%;border-collapse:collapse;font-size:14px">
        <thead>
          <tr style="background:#f1f5f9">
            <th style="padding:8px;border:1px solid #e2e8f0;text-align:left">Empresa</th>
            <th style="padding:8px;border:1px solid #e2e8f0;text-align:left">CNPJ</th>
            <th style="padding:8px;border:1px solid #e2e8f0;text-align:left">Licença</th>
            <th style="padding:8px;border:1px solid #e2e8f0;text-align:left">Vencimento</th>
            <th style="padding:8px;border:1px solid #e2e8f0;text-align:left">Situação</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
      <p style="color:#94a3b8;font-size:12px;margin-top:24px">
        Enviado automaticamente pelo Radar Societário — 41 Tech
      </p>
    </div>`;

  await transporter.sendMail({
    from: s.smtp_from || s.smtp_user,
    to: emails.join(','),
    subject: `[Radar Societário] ${items.length} licenciamento(s) próximo(s) do vencimento`,
    html,
  });

  logger.info(`E-mail de notificação enviado para ${emails.join(', ')} — ${items.length} item(s)`);
}

export async function sendTestEmail(to: string): Promise<void> {
  const transporter = await createTransporter();
  const s = await getAllSettings();
  await transporter.sendMail({
    from: s.smtp_from || s.smtp_user,
    to,
    subject: '[Radar Societário] Teste de configuração de e-mail',
    html: '<p>E-mail de teste do <strong>Radar Societário</strong> funcionando corretamente! ✅</p>',
  });
}
