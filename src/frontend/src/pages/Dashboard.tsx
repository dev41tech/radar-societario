import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  Buildings, Warning, Clock, CheckCircle, ArrowClockwise,
  Bell, ArrowRight, CalendarCheck, TrendUp,
} from '@phosphor-icons/react';
import { dashboard, sync } from '../services/api';
import { LICENSE_LABELS, LicenseType } from '../types';
import { useToast } from '../context/ToastContext';

// ─── helpers ──────────────────────────────────────────────────────────────────
function formatDate(s: string) {
  // Extrai apenas a parte da data (YYYY-MM-DD) para lidar com ISO strings
  // do tipo "2026-06-21T03:00:00.000Z" que podem vir de colunas DATE do MySQL
  const datePart = String(s).split('T')[0];
  const [y, m, d] = datePart.split('-');
  if (!y || !m || !d) return s;
  return `${d}/${m}/${y}`;
}

function today() {
  return new Date().toLocaleDateString('pt-BR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
}

function statusFromDays(days: number) {
  if (days < 0)   return 'expired';
  if (days <= 30) return 'critical';
  if (days <= 60) return 'warning';
  if (days <= 90) return 'notice';
  return 'ok';
}

const STATUS_COLORS: Record<string, string> = {
  expired:  'bg-red-500',
  critical: 'bg-orange-500',
  warning:  'bg-yellow-500',
  notice:   'bg-sky-500',
  ok:       'bg-emerald-500',
};

const STATUS_BADGE: Record<string, string> = {
  expired:  'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400',
  critical: 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-400',
  warning:  'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-400',
  notice:   'bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-400',
  ok:       'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400',
};

const STATUS_LABEL: Record<string, string> = {
  expired:  'Vencido',
  critical: 'Crítico',
  warning:  'Atenção',
  notice:   'Em breve',
  ok:       'OK',
};

// ─── StatCard ─────────────────────────────────────────────────────────────────
function StatCard({
  label, value, sub, icon: Icon, bg, border, text, to,
}: {
  label: string; value: number; sub?: string;
  icon: any; bg: string; border: string; text: string; to?: string;
}) {
  const baseCls = `relative overflow-hidden rounded-2xl border ${border} bg-white dark:bg-slate-800 p-5`;
  const clickCls = to ? ' cursor-pointer hover:shadow-lg hover:scale-[1.02] transition-all duration-150' : '';

  const inner = (
    <>
      <div className={`absolute -top-4 -right-4 w-20 h-20 rounded-full opacity-10 ${bg}`} />
      <div className="flex items-start justify-between mb-3">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${bg}`}>
          <Icon size={20} className="text-white" weight="bold" />
        </div>
        {to && <ArrowRight size={13} className="text-slate-300 dark:text-slate-600 mt-0.5" />}
      </div>
      <p className={`text-3xl font-extrabold ${text}`}>{value.toLocaleString('pt-BR')}</p>
      <p className="text-sm font-medium text-slate-600 dark:text-slate-400 mt-0.5">{label}</p>
      {sub && <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">{sub}</p>}
    </>
  );

  if (to) {
    return <Link to={to} className={`block ${baseCls}${clickCls}`}>{inner}</Link>;
  }
  return <div className={baseCls}>{inner}</div>;
}

// ─── AlertBanner ──────────────────────────────────────────────────────────────
function AlertBanner({ expired, critical }: { expired: number; critical: number }) {
  if (expired === 0 && critical === 0) return null;
  return (
    <div className="flex items-center gap-3 px-5 py-3 rounded-xl bg-red-50 border border-red-200 dark:bg-red-900/20 dark:border-red-800 mb-5">
      <Warning size={20} weight="fill" className="text-red-500 flex-shrink-0" />
      <p className="text-sm text-red-700 dark:text-red-400">
        {expired > 0 && (
          <span className="font-semibold">{expired} licenciamento{expired > 1 ? 's' : ''} vencido{expired > 1 ? 's' : ''}</span>
        )}
        {expired > 0 && critical > 0 && ' e '}
        {critical > 0 && (
          <span className="font-semibold">{critical} empresa{critical > 1 ? 's' : ''} com licença vencendo em até 30 dias</span>
        )}
        {' — '}
        <Link to="/empresas" className="underline hover:text-red-900 dark:hover:text-red-300">
          Ver empresas
        </Link>
      </p>
    </div>
  );
}

// ─── UpcomingRow ──────────────────────────────────────────────────────────────
function UpcomingRow({ item, idx }: { item: any; idx: number }) {
  const status = statusFromDays(item.days_until);
  return (
    <Link
      to={`/empresas/${item.company_id}`}
      className="group flex items-center gap-4 px-5 py-3.5 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
    >
      <div className={`w-1.5 h-10 rounded-full flex-shrink-0 ${STATUS_COLORS[status]}`} />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-slate-900 dark:text-white truncate group-hover:text-blue-600 transition-colors">
          {item.razao_social}
        </p>
        <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
          {LICENSE_LABELS[item.license_type as LicenseType]}
        </p>
      </div>
      <div className="text-right flex-shrink-0">
        <p className="text-sm font-medium text-slate-700 dark:text-slate-300">{formatDate(item.expiration_date)}</p>
        <span className={`inline-flex items-center mt-0.5 px-2 py-0.5 rounded-full text-xs font-semibold ${STATUS_BADGE[status]}`}>
          {item.days_until < 0
            ? `Há ${Math.abs(item.days_until)}d`
            : `${item.days_until}d`}
        </span>
      </div>
      <ArrowRight size={14} className="text-slate-300 dark:text-slate-600 group-hover:text-blue-500 transition-colors flex-shrink-0" />
    </Link>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function Dashboard() {
  const qc = useQueryClient();
  const { toast } = useToast();

  const { data, isLoading } = useQuery({ queryKey: ['dashboard'], queryFn: dashboard.get });

  // Sincroniza empresas do Aditiva E tenta importar localização do XLSX (silencioso se não encontrar)
  const syncMutation = useMutation({
    mutationFn: async () => {
      const result = await sync.fromAditiva();
      try { await sync.importLocation(); } catch { /* pasta/arquivo não encontrado: ignora */ }
      return result;
    },
    onSuccess: (d) => {
      toast(`Sincronização concluída: ${d.synced} empresa(s)`, 'success');
      qc.invalidateQueries({ queryKey: ['dashboard'] });
      qc.invalidateQueries({ queryKey: ['companies'] });
    },
    onError: (e: any) => toast(e.response?.data?.error || 'Erro na sincronização', 'error'),
  });

  const notifyMutation = useMutation({
    mutationFn: sync.triggerNotifications,
    onSuccess: (d: any) => {
      const count = d.emailSent ?? 0;
      toast(
        count > 0 ? `${count} notificação(ões) enviada(s)` : 'Nenhuma notificação pendente',
        'success'
      );
    },
    onError: (e: any) => toast(e.response?.data?.error || 'Erro ao notificar', 'error'),
  });

  const stats    = data?.stats;
  const upcoming = data?.upcoming ?? [];

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">

      {/* ── Header ── */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">Dashboard</h1>
          <p className="text-sm text-slate-400 dark:text-slate-500 mt-0.5 capitalize">{today()}</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => notifyMutation.mutate()}
            disabled={notifyMutation.isPending}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:border-slate-300 dark:hover:bg-slate-700 disabled:opacity-50 transition-all shadow-sm"
          >
            <Bell size={15} />
            {notifyMutation.isPending ? 'Enviando…' : 'Notificar agora'}
          </button>
          <button
            onClick={() => syncMutation.mutate()}
            disabled={syncMutation.isPending}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-xl bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 transition-all shadow-sm"
          >
            <ArrowClockwise size={15} className={syncMutation.isPending ? 'animate-spin' : ''} />
            {syncMutation.isPending ? 'Sincronizando…' : 'Sincronizar Empresas'}
          </button>
        </div>
      </div>

      {/* ── Alert Banner ── */}
      {!isLoading && stats && (
        <AlertBanner expired={stats.expired} critical={stats.expiring_30} />
      )}

      {/* ── Stat Cards ── */}
      {isLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-28 rounded-2xl bg-slate-100 dark:bg-slate-800 animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <StatCard label="Total"        value={stats?.total ?? 0}       icon={Buildings}    bg="bg-slate-500"    border="border-slate-200 dark:border-slate-700" text="text-slate-900 dark:text-white" />
          <StatCard label="Ativas"       value={stats?.active ?? 0}      icon={CheckCircle}  bg="bg-blue-500"     border="border-blue-100 dark:border-blue-900"   text="text-blue-700 dark:text-blue-400" />
          <StatCard label="Vencidas"     value={stats?.expired ?? 0}     icon={Warning}      bg="bg-red-500"      border="border-red-100 dark:border-red-900"     text="text-red-700 dark:text-red-400" sub="Requerem ação imediata" to="/empresas?licenseFilter=expired" />
          <StatCard label="≤ 30 dias"   value={stats?.expiring_30 ?? 0} icon={Clock}        bg="bg-orange-500"   border="border-orange-100 dark:border-orange-900" text="text-orange-700 dark:text-orange-400" to="/empresas?licenseFilter=30" />
          <StatCard label="31–60 dias"  value={stats?.expiring_60 ?? 0} icon={Clock}        bg="bg-yellow-500"   border="border-yellow-100 dark:border-yellow-900" text="text-yellow-700 dark:text-yellow-400" to="/empresas?licenseFilter=60" />
          <StatCard label="61–90 dias"  value={stats?.expiring_90 ?? 0} icon={TrendUp}      bg="bg-sky-500"      border="border-sky-100 dark:border-sky-900"      text="text-sky-700 dark:text-sky-400" to="/empresas?licenseFilter=90" />
        </div>
      )}

      {/* ── Bottom grid ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* Próximos vencimentos */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-700">
            <div className="flex items-center gap-2">
              <CalendarCheck size={18} className="text-blue-600" weight="bold" />
              <h2 className="font-semibold text-slate-900 dark:text-white">Próximos Vencimentos</h2>
            </div>
            <Link to="/empresas" className="text-xs text-blue-600 hover:underline font-medium">
              Ver todas
            </Link>
          </div>
          {isLoading ? (
            <div className="divide-y divide-slate-100 dark:divide-slate-700">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center gap-4 px-5 py-3.5">
                  <div className="w-1.5 h-10 rounded-full bg-slate-100 dark:bg-slate-700 animate-pulse" />
                  <div className="flex-1 space-y-1.5">
                    <div className="h-3.5 bg-slate-100 dark:bg-slate-700 rounded animate-pulse w-2/3" />
                    <div className="h-3 bg-slate-100 dark:bg-slate-700 rounded animate-pulse w-1/3" />
                  </div>
                </div>
              ))}
            </div>
          ) : upcoming.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-14 text-slate-400">
              <CalendarCheck size={36} className="mb-2 opacity-40" />
              <p className="text-sm">Nenhum vencimento próximo</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-700">
              {upcoming.map((item, i) => <UpcomingRow key={i} item={item} idx={i} />)}
            </div>
          )}
        </div>

        {/* Painel de status */}
        <div className="flex flex-col gap-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5">
            <h2 className="font-semibold text-slate-900 dark:text-white mb-4">Situação Geral</h2>
            <div className="space-y-3">
              {[
                { label: 'Vencidas',    value: stats?.expired ?? 0,     color: 'bg-red-500',    max: stats?.active ?? 1 },
                { label: 'Crítico (30d)', value: stats?.expiring_30 ?? 0, color: 'bg-orange-500', max: stats?.active ?? 1 },
                { label: 'Atenção (60d)', value: stats?.expiring_60 ?? 0, color: 'bg-yellow-500', max: stats?.active ?? 1 },
                { label: 'Em breve (90d)', value: stats?.expiring_90 ?? 0, color: 'bg-sky-500',   max: stats?.active ?? 1 },
              ].map(({ label, value, color, max }) => (
                <div key={label}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-slate-500 dark:text-slate-400">{label}</span>
                    <span className="font-semibold text-slate-700 dark:text-slate-300">{value}</span>
                  </div>
                  <div className="h-1.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-700 ${color}`}
                      style={{ width: max > 0 ? `${Math.min(100, (value / max) * 100)}%` : '0%' }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5">
            <h2 className="font-semibold text-slate-900 dark:text-white mb-3">Ações rápidas</h2>
            <div className="space-y-2">
              <Link to="/empresas" className="flex items-center justify-between px-3 py-2.5 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors group">
                <div className="flex items-center gap-2.5">
                  <Buildings size={16} className="text-blue-500" />
                  <span className="text-sm text-slate-700 dark:text-slate-300">Ver empresas</span>
                </div>
                <ArrowRight size={14} className="text-slate-300 group-hover:text-blue-500 transition-colors" />
              </Link>
              <button
                onClick={() => syncMutation.mutate()}
                disabled={syncMutation.isPending}
                className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors group disabled:opacity-40"
              >
                <div className="flex items-center gap-2.5">
                  <ArrowClockwise size={16} className={`text-emerald-500 ${syncMutation.isPending ? 'animate-spin' : ''}`} />
                  <span className="text-sm text-slate-700 dark:text-slate-300">Sincronizar Empresas</span>
                </div>
                <ArrowRight size={14} className="text-slate-300 group-hover:text-emerald-500 transition-colors" />
              </button>
              <button
                onClick={() => notifyMutation.mutate()}
                disabled={notifyMutation.isPending}
                className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors group disabled:opacity-40"
              >
                <div className="flex items-center gap-2.5">
                  <Bell size={16} className="text-purple-500" />
                  <span className="text-sm text-slate-700 dark:text-slate-300">Notificar agora</span>
                </div>
                <ArrowRight size={14} className="text-slate-300 group-hover:text-purple-500 transition-colors" />
              </button>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
