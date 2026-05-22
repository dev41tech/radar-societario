import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Bell, Clock, Envelope, Columns, ArrowClockwise,
} from '@phosphor-icons/react';
import { notifications } from '../services/api';
import { LICENSE_LABELS, LicenseType } from '../types';

// ─── Types ────────────────────────────────────────────────────────────────────
interface DiagnosticConfig {
  notification_enabled: boolean;
  trello_enabled: boolean;
  notification_days: number[];
  notification_hour: number;
  notification_emails: string;
}

interface DiagnosticSummary {
  total_applicable: number;
  pending: number;
  sent: number;
  expired: number;
  trello_pending: number;
}

interface DiagnosticItem {
  company_id: string;
  razao_social: string;
  cnpj: string | null;
  license_type: string;
  license_label: string | null;
  expiration_date: string;
  days_until: number;
  matched_threshold: number | null;
  notification_sent: boolean;
  notification_sent_at: string | null;
  notification_days_before: number | null;
  trello_card_exists: boolean;
  status: 'pending' | 'sent' | 'expired' | 'ok';
}

interface DiagnosticResponse {
  config: DiagnosticConfig;
  summary: DiagnosticSummary;
  items: DiagnosticItem[];
  last_checked: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function formatDate(s: string) {
  const [y, m, d] = s.split('-');
  if (!y || !m || !d) return s;
  return `${d}/${m}/${y}`;
}

const STATUS_CONFIG: Record<DiagnosticItem['status'], { label: string; cls: string }> = {
  pending: { label: 'Pendente', cls: 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-400' },
  sent:    { label: 'Enviada',  cls: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400' },
  expired: { label: 'Vencida', cls: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400' },
  ok:      { label: '—',       cls: 'bg-slate-100 text-slate-400 dark:bg-slate-700 dark:text-slate-500' },
};

type FilterType = 'all' | 'pending' | 'sent' | 'expired';

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function Diagnostics() {
  const [filter, setFilter] = useState<FilterType>('all');

  const { data, isLoading, refetch, isFetching, dataUpdatedAt } = useQuery<DiagnosticResponse>({
    queryKey: ['notifications-diagnostic'],
    queryFn: notifications.diagnostic,
    staleTime: 0,
  });

  const items    = data?.items ?? [];
  const filtered = filter === 'all' ? items : items.filter(i => i.status === filter);
  const config   = data?.config;
  const summary  = data?.summary;

  const lastUpdated = dataUpdatedAt
    ? new Date(dataUpdatedAt).toLocaleTimeString('pt-BR')
    : null;

  const filterBtns: { key: FilterType; label: string; count?: number }[] = [
    { key: 'all',     label: 'Todas',     count: summary?.total_applicable },
    { key: 'pending', label: 'Pendentes', count: summary?.pending },
    { key: 'sent',    label: 'Enviadas',  count: summary?.sent },
    { key: 'expired', label: 'Vencidas',  count: summary?.expired },
  ];

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-5">

      {/* ── Header ── */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
            Diagnóstico de Notificações
          </h1>
          <p className="text-sm text-slate-400 dark:text-slate-500 mt-0.5">
            Status de envio de cada alerta de vencimento de licença
            {lastUpdated && <span className="ml-1">— atualizado às {lastUpdated}</span>}
          </p>
        </div>
        <button
          onClick={() => refetch()}
          disabled={isFetching}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:border-slate-300 dark:hover:bg-slate-700 disabled:opacity-50 transition-all shadow-sm"
        >
          <ArrowClockwise size={15} className={isFetching ? 'animate-spin' : ''} />
          {isFetching ? 'Verificando…' : 'Atualizar'}
        </button>
      </div>

      {/* ── Config card ── */}
      {config && (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-4">
          <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-3">
            Configuração atual
          </p>
          <div className="flex flex-wrap gap-2">
            {/* E-mail enabled/disabled */}
            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${
              config.notification_enabled
                ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400'
                : 'bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400'
            }`}>
              <Bell size={11} weight="bold" />
              E-mail {config.notification_enabled ? 'ativado' : 'desativado'}
            </span>

            {/* Thresholds */}
            {config.notification_enabled && config.notification_days.length > 0 && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400">
                <Clock size={11} weight="bold" />
                {config.notification_days.join('d · ')}d de antecedência
              </span>
            )}

            {/* Send hour */}
            {config.notification_enabled && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400">
                <Clock size={11} weight="bold" />
                Disparo às {config.notification_hour}h
              </span>
            )}

            {/* Emails */}
            {config.notification_enabled && config.notification_emails && (() => {
              const emails = config.notification_emails.split(',').map(e => e.trim()).filter(Boolean);
              return (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300">
                  <Envelope size={11} />
                  {emails[0]}
                  {emails.length > 1 && <span className="text-slate-400"> +{emails.length - 1}</span>}
                </span>
              );
            })()}

            {/* Trello */}
            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${
              config.trello_enabled
                ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400'
                : 'bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400'
            }`}>
              <Columns size={11} weight="bold" />
              Trello {config.trello_enabled ? 'ativado' : 'desativado'}
            </span>
          </div>
        </div>
      )}

      {/* ── Summary cards ── */}
      {isLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-20 rounded-2xl bg-slate-100 dark:bg-slate-800 animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            {
              key: 'all' as FilterType,
              label: 'Em monitoramento',
              value: summary?.total_applicable ?? 0,
              color: 'text-slate-900 dark:text-white',
              border: 'border-slate-200 dark:border-slate-700',
            },
            {
              key: 'pending' as FilterType,
              label: 'Pendentes de envio',
              value: summary?.pending ?? 0,
              color: 'text-orange-600 dark:text-orange-400',
              border: 'border-orange-100 dark:border-orange-900',
            },
            {
              key: 'sent' as FilterType,
              label: 'Notificações enviadas',
              value: summary?.sent ?? 0,
              color: 'text-emerald-600 dark:text-emerald-400',
              border: 'border-emerald-100 dark:border-emerald-900',
            },
            {
              key: 'expired' as FilterType,
              label: 'Licenças vencidas',
              value: summary?.expired ?? 0,
              color: 'text-red-600 dark:text-red-400',
              border: 'border-red-100 dark:border-red-900',
            },
          ].map(({ key, label, value, color, border }) => (
            <button
              key={key}
              onClick={() => setFilter(filter === key ? 'all' : key)}
              className={`text-left bg-white dark:bg-slate-800 rounded-2xl border ${border} p-4 hover:shadow-md hover:scale-[1.02] transition-all duration-150 cursor-pointer ${
                filter === key ? 'ring-2 ring-blue-500 ring-offset-2 dark:ring-offset-slate-900' : ''
              }`}
            >
              <p className={`text-2xl font-extrabold ${color}`}>{value.toLocaleString('pt-BR')}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 font-medium">{label}</p>
            </button>
          ))}
        </div>
      )}

      {/* ── Table ── */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">

        {/* Filter tabs */}
        <div className="flex items-center gap-1 px-4 py-3 border-b border-slate-100 dark:border-slate-700">
          {filterBtns.map(({ key, label, count }) => (
            <button
              key={key}
              onClick={() => setFilter(key)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                filter === key
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'
              }`}
            >
              {label}
              {count !== undefined && (
                <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                  filter === key
                    ? 'bg-white/25 text-white'
                    : 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400'
                }`}>
                  {count}
                </span>
              )}
            </button>
          ))}
          <span className="ml-auto text-xs text-slate-400 dark:text-slate-500">
            {filtered.length} item{filtered.length !== 1 ? 's' : ''}
          </span>
        </div>

        {/* Content */}
        {isLoading ? (
          <div className="p-8 flex justify-center">
            <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center">
            <Bell size={36} className="mx-auto mb-3 text-slate-200 dark:text-slate-700" />
            <p className="text-slate-400 dark:text-slate-500 text-sm">
              {filter === 'all'
                ? 'Nenhuma licença em monitoramento no período'
                : 'Nenhum item para este filtro'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-100 dark:border-slate-700">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Empresa</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Licença</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Vencimento</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Dias</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Marco</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Notificação enviada</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Trello</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
                {filtered.map((item, i) => {
                  const sc = STATUS_CONFIG[item.status];
                  const daysAbs = Math.abs(item.days_until);
                  return (
                    <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">

                      {/* Status badge */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${sc.cls}`}>
                          {sc.label}
                        </span>
                      </td>

                      {/* Empresa */}
                      <td className="px-4 py-3">
                        <Link
                          to={`/empresas/${item.company_id}`}
                          className="font-medium text-slate-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                        >
                          {item.razao_social}
                        </Link>
                      </td>

                      {/* Licença */}
                      <td className="px-4 py-3 text-slate-600 dark:text-slate-300 whitespace-nowrap">
                        {item.license_type === 'outros' && item.license_label
                          ? `Outros — ${item.license_label}`
                          : (LICENSE_LABELS[item.license_type as LicenseType] ?? item.license_type)}
                      </td>

                      {/* Vencimento */}
                      <td className="px-4 py-3 font-mono text-xs text-slate-600 dark:text-slate-300 whitespace-nowrap">
                        {formatDate(item.expiration_date)}
                      </td>

                      {/* Dias */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className={`font-mono text-xs font-bold ${
                          item.days_until < 0
                            ? 'text-red-600 dark:text-red-400'
                            : item.days_until <= 30
                            ? 'text-orange-600 dark:text-orange-400'
                            : item.days_until <= 60
                            ? 'text-yellow-600 dark:text-yellow-500'
                            : 'text-sky-600 dark:text-sky-400'
                        }`}>
                          {item.days_until < 0 ? `−${daysAbs}d` : `${item.days_until}d`}
                        </span>
                      </td>

                      {/* Marco */}
                      <td className="px-4 py-3 text-xs text-slate-500 dark:text-slate-400 whitespace-nowrap">
                        {item.matched_threshold != null ? `≤ ${item.matched_threshold}d` : '—'}
                      </td>

                      {/* Notificação */}
                      <td className="px-4 py-3 text-xs whitespace-nowrap">
                        {item.notification_sent ? (
                          <div>
                            <span className="text-emerald-600 dark:text-emerald-400 font-semibold">✓ Sim</span>
                            {item.notification_sent_at && (
                              <p className="text-slate-400 dark:text-slate-500 mt-0.5 font-mono">
                                {item.notification_sent_at}
                              </p>
                            )}
                            {item.notification_days_before != null && (
                              <p className="text-slate-400 dark:text-slate-500">
                                marco {item.notification_days_before}d
                              </p>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-400 dark:text-slate-500">—</span>
                        )}
                      </td>

                      {/* Trello */}
                      <td className="px-4 py-3 text-xs whitespace-nowrap">
                        {item.trello_card_exists ? (
                          <span className="text-blue-600 dark:text-blue-400 font-semibold">✓ Criado</span>
                        ) : (
                          <span className="text-slate-400 dark:text-slate-500">—</span>
                        )}
                      </td>

                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
