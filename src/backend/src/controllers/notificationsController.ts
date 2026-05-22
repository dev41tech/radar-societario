import { Request, Response } from 'express';
import { getAllSettings } from '../repositories/settingsRepository';
import { getDiagnosticLicenses } from '../repositories/licensesRepository';

function parseBool(val: string | undefined | null): boolean {
  if (!val) return false;
  const s = String(val).trim().toLowerCase();
  return s === 'true' || s === '1' || s === 'yes' || s === 'on';
}

export async function getNotificationDiagnostic(req: Request, res: Response): Promise<void> {
  try {
    const s = await getAllSettings();

    const notificationEnabled = parseBool(s.notification_enabled);
    const trelloEnabled       = parseBool(s.trello_enabled);

    let notificationDays: number[];
    try {
      notificationDays = (JSON.parse(s.notification_days || '[90,60,30]') as number[])
        .map(Number)
        .filter(d => !Number.isNaN(d) && d > 0)
        .sort((a, b) => a - b); // crescente para match correto (igual ao scheduler)
    } catch {
      notificationDays = [30, 60, 90];
    }

    const maxDays = notificationDays.length > 0 ? Math.max(...notificationDays) : 90;
    const rows    = await getDiagnosticLicenses(maxDays);

    const items = rows.map(row => {
      const daysUntil = Number(row.days_until);

      // Mesma lógica do scheduler: menor marco que cobre o item
      const matchedThreshold = daysUntil >= 0
        ? (notificationDays.find(d => daysUntil <= d) ?? null)
        : null;

      const notificationSent  = Number(row.notification_count) > 0;
      const trelloCardExists  = Number(row.trello_count) > 0;

      let status: 'pending' | 'sent' | 'expired' | 'ok';
      if (daysUntil < 0) {
        status = 'expired';
      } else if (matchedThreshold === null) {
        status = 'ok';
      } else if (notificationSent) {
        status = 'sent';
      } else {
        status = 'pending';
      }

      return {
        company_id:              row.company_id,
        razao_social:            row.razao_social,
        cnpj:                    row.cnpj,
        license_type:            row.license_type,
        expiration_date:         row.expiration_date,
        days_until:              daysUntil,
        matched_threshold:       matchedThreshold,
        notification_sent:       notificationSent,
        notification_sent_at:    row.notification_sent_at ?? null,
        notification_days_before: row.notification_days_before != null
          ? Number(row.notification_days_before)
          : null,
        trello_card_exists:      trelloCardExists,
        status,
      };
    });

    const pending      = items.filter(i => i.status === 'pending').length;
    const sent         = items.filter(i => i.status === 'sent').length;
    const expired      = items.filter(i => i.status === 'expired').length;
    const trelloPending = trelloEnabled
      ? items.filter(i => i.days_until >= 0 && !i.trello_card_exists).length
      : 0;

    res.json({
      config: {
        notification_enabled: notificationEnabled,
        trello_enabled:       trelloEnabled,
        notification_days:    notificationDays,
        notification_hour:    Number(s.notification_hour) || 8,
        notification_emails:  s.notification_emails || '',
      },
      summary: {
        total_applicable: items.length,
        pending,
        sent,
        expired,
        trello_pending: trelloPending,
      },
      items,
      last_checked: new Date().toISOString(),
    });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
}
