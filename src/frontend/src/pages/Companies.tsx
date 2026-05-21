import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { MagnifyingGlass, Plus, XCircle, CheckCircle, ArrowRight, MapPin } from '@phosphor-icons/react';
import { companies } from '../services/api';
import { useToast } from '../context/ToastContext';

const UF_LIST = [
  'AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG',
  'PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO',
];

function AddCompanyModal({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [razao,  setRazao]  = useState('');
  const [cnpj,   setCnpj]   = useState('');
  const [cidade, setCidade] = useState('');
  const [uf,     setUf]     = useState('');

  const mutation = useMutation({
    mutationFn: () => companies.create({
      razao_social: razao,
      cnpj:   cnpj   || undefined,
      cidade: cidade || undefined,
      uf:     uf     || undefined,
    }),
    onSuccess: () => {
      toast('Empresa adicionada com sucesso', 'success');
      qc.invalidateQueries({ queryKey: ['companies'] });
      onClose();
    },
    onError: (e: any) => toast(e.response?.data?.error || 'Erro ao criar empresa', 'error'),
  });

  const inputCls = 'w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none';

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-md p-6">
        <h2 className="font-bold text-lg text-slate-900 dark:text-white mb-4">Adicionar Empresa</h2>
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Razão Social *</label>
            <input value={razao} onChange={e => setRazao(e.target.value)} className={inputCls} placeholder="Nome da empresa" />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">CNPJ</label>
            <input value={cnpj} onChange={e => setCnpj(e.target.value)} className={inputCls} placeholder="00.000.000/0000-00" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Cidade</label>
              <input value={cidade} onChange={e => setCidade(e.target.value)} className={inputCls} placeholder="Curitiba" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">UF</label>
              <select value={uf} onChange={e => setUf(e.target.value)} className={inputCls}>
                <option value="">—</option>
                {UF_LIST.map(u => <option key={u} value={u}>{u}</option>)}
              </select>
            </div>
          </div>
        </div>
        <div className="flex gap-2 mt-5">
          <button onClick={onClose} className="flex-1 px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 text-sm text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
            Cancelar
          </button>
          <button
            onClick={() => mutation.mutate()}
            disabled={!razao.trim() || mutation.isPending}
            className="flex-1 px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {mutation.isPending ? 'Salvando…' : 'Adicionar'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Companies() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<'active' | 'inactive' | 'all'>('active');
  const [page,   setPage]   = useState(1);
  const [showAdd, setShowAdd] = useState(false);
  const limit = 20;

  const { data, isLoading } = useQuery({
    queryKey: ['companies', page, search, status],
    queryFn: () => companies.list({ page, limit, search, status }),
  });

  const inactivateMutation = useMutation({
    mutationFn: (id: string) => companies.inactivate(id),
    onSuccess: () => { toast('Empresa inativada', 'success'); qc.invalidateQueries({ queryKey: ['companies'] }); },
    onError: (e: any) => toast(e.response?.data?.error || 'Erro', 'error'),
  });

  const activateMutation = useMutation({
    mutationFn: (id: string) => companies.activate(id),
    onSuccess: () => { toast('Empresa reativada', 'success'); qc.invalidateQueries({ queryKey: ['companies'] }); },
    onError: (e: any) => toast(e.response?.data?.error || 'Erro', 'error'),
  });

  const total      = data?.total ?? 0;
  const totalPages = Math.ceil(total / limit);

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {showAdd && <AddCompanyModal onClose={() => setShowAdd(false)} />}

      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">Empresas</h1>
          <p className="text-slate-400 dark:text-slate-500 text-sm mt-0.5">{total.toLocaleString('pt-BR')} empresa(s)</p>
        </div>
        <button
          onClick={() => setShowAdd(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-xl hover:bg-blue-700 transition-colors shadow-sm"
        >
          <Plus size={16} weight="bold" />
          Adicionar empresa
        </button>
      </div>

      <div className="flex gap-3 mb-4">
        <div className="relative flex-1">
          <MagnifyingGlass size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
            placeholder="Buscar por razão social, CNPJ ou cidade…"
            className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
          />
        </div>
        <select
          value={status}
          onChange={e => { setStatus(e.target.value as any); setPage(1); }}
          className="px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm text-slate-700 dark:text-slate-300 focus:ring-2 focus:ring-blue-500 outline-none"
        >
          <option value="active">Ativas</option>
          <option value="inactive">Inativas</option>
          <option value="all">Todas</option>
        </select>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
        {isLoading ? (
          <div className="p-8 flex justify-center">
            <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full" />
          </div>
        ) : (data?.data ?? []).length === 0 ? (
          <div className="p-10 text-center text-slate-400 dark:text-slate-500">Nenhuma empresa encontrada</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80">
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Razão Social</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">CNPJ</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Localização</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Origem</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Status</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
              {(data?.data ?? []).map(c => (
                <tr key={c.id} className="hover:bg-slate-50 dark:hover:bg-slate-750 transition-colors group">
                  <td className="px-4 py-3">
                    <Link to={`/empresas/${c.id}`} className="font-medium text-slate-900 dark:text-white hover:text-blue-600 transition-colors">
                      {c.razao_social}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-slate-500 dark:text-slate-400 font-mono text-xs">{c.cnpj || '—'}</td>
                  <td className="px-4 py-3">
                    {c.cidade || c.uf ? (
                      <span className="flex items-center gap-1 text-slate-600 dark:text-slate-300">
                        <MapPin size={12} className="text-slate-400 flex-shrink-0" />
                        {[c.cidade, c.uf].filter(Boolean).join('/')}
                      </span>
                    ) : (
                      <span className="text-slate-300 dark:text-slate-600">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                      c.source === 'manual'
                        ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-400'
                        : 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400'
                    }`}>
                      {c.source === 'manual' ? 'Manual' : 'Importada'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                      c.active
                        ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400'
                        : 'bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400'
                    }`}>
                      {c.active ? 'Ativa' : 'Inativa'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      {c.active ? (
                        <button
                          onClick={() => inactivateMutation.mutate(c.id)}
                          disabled={inactivateMutation.isPending}
                          title="Inativar empresa"
                          className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                        >
                          <XCircle size={17} />
                        </button>
                      ) : (
                        <button
                          onClick={() => activateMutation.mutate(c.id)}
                          disabled={activateMutation.isPending}
                          title="Reativar empresa"
                          className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-colors"
                        >
                          <CheckCircle size={17} />
                        </button>
                      )}
                      <Link
                        to={`/empresas/${c.id}`}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                      >
                        <ArrowRight size={17} />
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-4">
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
            className="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 text-sm disabled:opacity-40 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
            Anterior
          </button>
          <span className="text-sm text-slate-500 px-2">{page} / {totalPages}</span>
          <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
            className="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 text-sm disabled:opacity-40 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
            Próxima
          </button>
        </div>
      )}
    </div>
  );
}
