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

export async function runNotificationJob(): Promise<{ emailSent: number; trelloCreated: number; errors: string[] }> {
  const s = await getAllSettings();
  const notificationDays: number[] = JSON.parse(s.notification_days || '[90,60,30]');
  const notificationEnabled = s.notification_enabled === 'true';
  const trelloEnabled = s.trello_enabled === 'true';

  const errors: string[] = [];
  let emailSent = 0;
  let trelloCreated = 0;

  if (!notificationEnabled && !trelloEnabled) {
    logger.info('Notificações desativadas, pulando job');
    return { emailSent, trelloCreated, errors };
  }

  const maxDays = Math.max(...notificationDays);
  const allExpiring = await getExpiringLicenses(maxDays);

  const emailItems: typeof allExpiring = [];

  for (const item of allExpiring) {
    const daysUntil = item.days_until;

    for (const daysBefore of notificationDays) {
      if (daysUntil <= daysBefore) {
        if (notificationEnabled) {
          const alreadySent = await checkNotificationSent(
            item.company_id, item.license_type, daysBefore, item.expiration_date
          );
          if (!alreadySent) {
            emailItems.push(item);
            await logNotification(item.company_id, item.license_type, daysBefore, item.expiration_date);
          }
        }

        if (trelloEnabled) {
          try {
            const cardExists = await checkTrelloCardExists(item.company_id, item.license_type, item.expiration_date);
            if (!cardExists) {
              const cardId = await createTrelloCard(item);
              await logTrelloCard(item.company_id, item.license_type, item.expiration_date, cardId);
              trelloCreated++;
            }
          } catch (e: any) {
            errors.push(`Trello: ${item.razao_social}/${item.license_type} — ${e.message}`);
          }
        }

        break;
      }
    }
  }

  if (emailItems.length > 0 && notificationEnabled) {
    try {
      await sendExpirationNotification(emailItems);
      emailSent = emailItems.length;
    } catch (e: any) {
      errors.push(`E-mail: ${e.message}`);
    }
  }

  logger.info(`Job concluído: ${emailSent} e-mails, ${trelloCreated} cards Trello, ${errors.length} erros`);
  return { emailSent, trelloCreated, errors };
}

export function startScheduler(): void {
  initScheduler();
}

export async function initScheduler(): Promise<void> {
  if (scheduledTask) {
    scheduledTask.stop();
    scheduledTask = null;
  }

  const s = await getAllSettings();
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
  });
}
