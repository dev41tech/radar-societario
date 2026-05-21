import { LicenseStatus } from '../types';

export function getLicenseStatus(
  expirationDate: string | null,
  applicable: boolean
): { status: LicenseStatus; daysUntil: number | null } {
  if (!applicable) return { status: 'not_applicable', daysUntil: null };
  if (!expirationDate) return { status: 'not_set', daysUntil: null };

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const expDate = new Date(expirationDate);
  expDate.setHours(0, 0, 0, 0);

  const diffMs = expDate.getTime() - today.getTime();
  const daysUntil = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  let status: LicenseStatus;
  if (daysUntil < 0) status = 'expired';
  else if (daysUntil <= 30) status = 'critical';
  else if (daysUntil <= 60) status = 'warning';
  else if (daysUntil <= 90) status = 'notice';
  else status = 'ok';

  return { status, daysUntil };
}
