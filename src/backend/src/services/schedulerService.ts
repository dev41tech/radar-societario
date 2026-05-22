import cron from 'node-cron';
import { getAllSettings } from '../repositories/settingsRepository';
import {
  getExpiringLicenses,
  checkNotificationSent,
  logNotification,
  checkTrelloCardExists,
  logTrelloCard,
} from '../repositories/licensesRepository';
import { sendExpirationNotification } from './emailService';
import { createTrelloCard } from './trelloService';
import logger from '../utils/logger';

let scheduledTask: cron.ScheduledTask | null = null;

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Interpreta valores booleanos armazenados como string no banco.
 * Aceita: 'true', '1', 'yes', 'on' (case-insensitive).
 */
function parseBool(val: string | undefined | null): boolean {
  if (!val) return false;
  const s = String(val).trim().toLowerCase();
  return s === 'true' || s === '1' || s === 'yes' || s === 'on';
}

// ─── Job principal ────────────────────────────────────────────────────────────

export async function runNotificationJob(): Promise<{
  emailSent: number;
  trelloCreated: number;
  errors: string[];
}> {
  // ── 1. Carregar e logar configurações (sem expor senha) ────────────────────
  const s = await getAllSettings();

  logger.info('[NOTIFICATION] SETTINGS_LOADED_FOR_NOTIFICATION', {
    notification_enabled:  s.notification_enabled,
    notification_days_raw: s.notification_days,
    notification_emails:   s.notification_emails,
    notification_hour:     s.notification_hour,
    trello_enabled:        s.trello_enabled,
    smtp_host:             s.smtp_host,
    smtp_user:             s.smtp_user,
    smtp_from:             s.smtp_from,
    has_smtp_pass:         Boolean(s.smtp_pass),
  });

  // ── 2. Parsear dias de notificação (ordenados ASC para match correto) ──────
  let notificationDays: number[];
  try {
    notificationDays = (JSON.parse(s.notification_days || '[90,60,30]') as number[])
      .map(Number)
      .filter(d => !Number.isNaN(d) && d > 0)
      .sort((a, b) => a - b); // IMPORTANTE: ordem crescente para match preciso
  } catch {
    notificationDays = [30, 60, 90];
  }

  logger.info('[NOTIFICATION] NOTIFICATION_DAYS_PARSED', {
    raw: s.notification_days,
    parsed: notificationDays,
  });

  const notificationEnabled = parseBool(s.notification_enabled);
  const trelloEnabled       = parseBool(s.trello_enabled);

  logger.info('[NOTIFICATION] FLAGS', { notificationEnabled, trelloEnabled });

  const errors: string[] = [];
  let emailSent    = 0;
  let trelloCreated = 0;

  if (!notificationEnabled && !trelloEnabled) {
    logger.info('[NOTIFICATION] Notificações e Trello desativados — pulando job');
    return { emailSent, trelloCreated, errors };
  }

  // ── 3. Buscar licenças vencendo dentro do maior prazo configurado ──────────
  const maxDays    = Math.max(...notificationDays);
  const allExpiring = await getExpiringLicenses(maxDays);

  logger.info('[NOTIFICATION] EXPIRING_LICENSES_FOUND', {
    maxDays,
    total: allExpiring.length,
    items: allExpiring.map(i => ({
      company_id:      i.company_id,
      razao_social:    i.razao_social,
      license_type:    i.license_type,
      expiration_date: i.expiration_date,
      days_until:      i.days_until,
    })),
  });

  // ── 4. Analisar cada licença e preparar e-mails / Trello ──────────────────
  // Acumula { item, daysBefore } para log APÓS envio bem-sucedido (BUG-2 fix)
  const pendingEmailItems: Array<{
    item: (typeof allExpiring)[number];
    daysBefore: number;
  }> = [];

  for (const item of allExpiring) {
    const daysUntil = Number(item.days_until);

    // Encontra o menor marco que cobre este item (ex: 60 dias → marco 60, não 90)
    const matchedDaysBefore = notificationDays.find(d => daysUntil <= d);

    logger.info('[NOTIFICATION] LICENSE_ANALYSIS', {
      razao_social:    item.razao_social,
      license_type:    item.license_type,
      expiration_date: item.expiration_date,
      days_until:      daysUntil,
      matched_marco:   matchedDaysBefore ?? null,
    });

    if (matchedDaysBefore === undefined) continue; // fora de todos os marcos

    // ── E-mail ──────────────────────────────────────────────────────────────
    if (notificationEnabled) {
      const alreadySent = await checkNotificationSent(
        item.company_id, item.license_type, matchedDaysBefore, item.expiration_date
      );

      logger.info('[NOTIFICATION] NOTIFICATION_ALREADY_SENT_CHECK', {
        company_id:      item.company_id,
        license_type:    item.license_type,
        days_before:     matchedDaysBefore,
        expiration_date: item.expiration_date,
        alreadySent,
      });

      if (!alreadySent) {
        pendingEmailItems.push({ item, daysBefore: matchedDaysBefore });
      }
    }

    // ── Trello ──────────────────────────────────────────────────────────────
    if (trelloEnabled) {
      try {
        const cardExists = await checkTrelloCardExists(
          item.company_id, item.license_type, item.expiration_date
        );
        if (!cardExists) {
          const cardId = await createTrelloCard(item);
          await logTrelloCard(item.company_id, item.license_type, item.expiration_date, cardId);
          trelloCreated++;
        }
      } catch (e: any) {
        errors.push(`Trello: ${item.razao_social}/${item.license_type} — ${e.message}`);
      }
    }
  }

  // ── 5. Enviar e-mail e registrar log SOMENTE após sucesso ─────────────────
  logger.info('[NOTIFICATION] EMAIL_ITEMS_READY', {
    count: pendingEmailItems.length,
    items: pendingEmailItems.map(({ item, daysBefore }) => ({
      razao_social:    item.razao_social,
      license_type:    item.license_type,
      expiration_date: item.expiration_date,
      days_until:      item.days_until,
      marco_dias:      daysBefore,
    })),
  });

  if (pendingEmailItems.length > 0 && notificationEnabled) {
    logger.info('[NOTIFICATION] SEND_EMAIL_START', {
      recipientCount: pendingEmailItems.length,
    });
    try {
      await sendExpirationNotification(pendingEmailItems.map(p => p.item));

      // Só registra log de cada item APÓS o e-mail ser enviado com sucesso
      for (const { item, daysBefore } of pendingEmailItems) {
        await logNotification(item.company_id, item.license_type, daysBefore, item.expiration_date);
      }

      emailSent = pendingEmailItems.length;
      logger.info('[NOTIFICATION] SEND_EMAIL_SUCCESS', { emailSent });
    } catch (e: any) {
      logger.error('[NOTIFICATION] SEND_EMAIL_ERROR', { message: e.message, code: e.code });
      errors.push(`E-mail: ${e.message}`);
      // NÃO registra logNotification — tentará novamente na próxima execução
    }
  }

  logger.info(
    `[NOTIFICATION] Job concluído: ${emailSent} e-mails, ${trelloCreated} cards Trello, ${errors.length} erros`,
    { errors }
  );
  return { emailSent, trelloCreated, errors };
}

// ─── Scheduler ────────────────────────────────────────────────────────────────

export function startScheduler(): void {
  initScheduler();
}

export async function initScheduler(): Promise<void> {
  if (scheduledTask) {
    scheduledTask.stop();
    scheduledTask = null;
  }

  const s    = await getAllSettings();
  const hour = Number(s.notification_hour) || 8;

  const expression = `0 ${hour} * * *`;
  logger.info(`Agendador configurado: ${expression}`);

  scheduledTask = cron.schedule(expression, async () => {
    logger.info('Iniciando job de notificações agendado...');
    try {
      await runNotificationJob();
    } catch (e: any) {
      logger.error(`Erro no job: ${e.message}`);
    }
  }, { timezone: 'America/Sao_Paulo' });
}
