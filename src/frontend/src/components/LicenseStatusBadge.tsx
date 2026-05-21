import { LicenseStatus } from '../types';

const configs: Record<LicenseStatus, { label: string; classes: string }> = {
  expired:        { label: 'Vencido',        classes: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400' },
  critical:       { label: 'Crítico',        classes: 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-400' },
  warning:        { label: 'Atenção',        classes: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-400' },
  notice:         { label: 'Em breve',       classes: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400' },
  ok:             { label: 'OK',             classes: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400' },
  not_set:        { label: 'Não informado',  classes: 'bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400' },
  not_applicable: { label: 'N/A',            classes: 'bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500' },
};

export default function LicenseStatusBadge({ status }: { status: LicenseStatus }) {
  const { label, classes } = configs[status] ?? configs.not_set;
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${classes}`}>
      {label}
    </span>
  );
}

export function statusDotColor(status: LicenseStatus): string {
  const map: Record<LicenseStatus, string> = {
    expired:        'bg-red-500',
    critical:       'bg-orange-500',
    warning:        'bg-yellow-500',
    notice:         'bg-blue-500',
    ok:             'bg-green-500',
    not_set:        'bg-slate-400',
    not_applicable: 'bg-slate-300',
  };
  return map[status] ?? 'bg-slate-400';
}
