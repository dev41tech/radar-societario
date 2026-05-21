import { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft, FloppyDisk, Columns, MagnifyingGlass, X, Plus,
  CalendarBlank, TextT, Note,
} from '@phosphor-icons/react';
import { companies, trello } from '../services/api';
import { CompanyLicense, LICENSE_LABELS, LicenseType, ALL_LICENSE_TYPES } from '../types';
import LicenseStatusBadge from '../components/LicenseStatusBadge';
import { useToast } from '../context/ToastContext';

// ─── helpers ──────────────────────────────────────────────────────────────────
function toInputDate(s: string | null) {
  if (!s) return '';
  return s.split('T')[0];
}

function initLicense(companyId: string, type: LicenseType, saved?: CompanyLicense): CompanyLicense {
  return {
    id: saved?.id ?? 0,
    company_id: companyId,
    license_type: type,
    expiration_date: saved?.expiration_date ?? null,
    expiration_date_text: saved?.expiration_date_text ?? null,
    notes: saved?.notes ?? null,
    applicable: true,
    status: saved?.status ?? 'not_set',
    days_until_expiration: saved?.days_until_expiration ?? null,
    use_text:   !!(saved?.expiration_date_text && !saved?.expiration_date),
    show_notes: !!(saved?.notes),
  };
}

// ─── LicenseCard ──────────────────────────────────────────────────────────────
function LicenseCard({
  license, company, onUpdate, onRemove, onTrello,
}: {
  license: CompanyLicense;
  company: { razao_social: string; cnpj: string | null };
  onUpdate: (field: keyof CompanyLicense, val: any) => void;
  onRemove: () => void;
  onTrello: () => void;
}) {
  const inputCls = 'px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none';

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4">
      {/* header row */}
      <div className="flex items-center gap-3 mb-3">
        <div className="flex-1 flex items-center gap-2 flex-wrap">
          <span className="font-semibold text-slate-900 dark:text-white text-sm">
            {LICENSE_LABELS[license.license_type]}
          </span>
          <LicenseStatusBadge status={license.status} />
          {license.days_until_expiration !== null && (
            <span className="text-xs text-slate-400">
              {license.days_until_expiration < 0
                ? `Vencido há ${Math.abs(license.days_until_expiration)} dias`
                : `${license.days_until_expiration} dias restantes`}
            </span>
          )}
        </div>
        <button onClick={onRemove} title="Remover licenciamento"
          className="p-1 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
          <X size={15} />
        </button>
      </div>

      {/* date row */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <label className="text-xs text-slate-500 dark:text-slate-400 font-medium">Vencimento</label>
          {/* toggle date / text */}
          <button
            onClick={() => onUpdate('use_text', !license.use_text)}
            title={license.use_text ? 'Usar calendário' : 'Digitar texto livre'}
            className={`flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium border transition-colors ${
              license.use_text
                ? 'border-slate-400 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                : 'border-slate-200 dark:border-slate-600 text-slate-400 hover:text-slate-600'
            }`}
          >
            {license.use_text ? <TextT size={11} /> : <CalendarBlank size={11} />}
            {license.use_text ? 'Texto' : 'Data'}
          </button>
        </div>

        {license.use_text ? (
          <input
            type="text"
            className={`flex-1 min-w-40 ${inputCls}`}
            value={license.expiration_date_text ?? ''}
            onChange={e => onUpdate('expiration_date_text', e.target.value || null)}
            placeholder="Ex: Renovando, Outubro/2026, Aguardando…"
          />
        ) : (
          <input
            type="date"
            className={inputCls}
            value={toInputDate(license.expiration_date)}
            onChange={e => onUpdate('expiration_date', e.target.value || null)}
          />
        )}

        {/* toggle notes */}
        <button
          onClick={() => onUpdate('show_notes', !license.show_notes)}
          className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium border transition-colors ${
            license.show_notes
              ? 'border-amber-300 bg-amber-50 dark:bg-amber-900/20 dark:border-amber-700 text-amber-700 dark:text-amber-400'
              : 'border-slate-200 dark:border-slate-600 text-slate-400 hover:text-slate-600'
          }`}
        >
          <Note size={12} />
          Observações
        </button>

        {/* Trello */}
        {(license.expiration_date || license.expiration_date_text) && (
          <button onClick={onTrello} title="Criar card no Trello"
            className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium border border-slate-200 dark:border-slate-600 text-slate-400 hover:text-blue-600 hover:border-blue-300 transition-colors">
            <Columns size={12} />
            Trello
          </button>
        )}
      </div>

      {/* notes */}
      {license.show_notes && (
        <div className="mt-3">
          <textarea
            rows={2}
            value={license.notes ?? ''}
            onChange={e => onUpdate('notes', e.target.value || null)}
            placeholder="Observações sobre este licenciamento…"
            className={`w-full resize-none ${inputCls}`}
          />
        </div>
      )}
    </div>
  );
}

// ─── LicenseSearch ────────────────────────────────────────────────────────────
function LicenseSearch({
  addedTypes, onAdd,
}: {
  addedTypes: LicenseType[];
  onAdd: (type: LicenseType) => void;
}) {
  const [query, setQuery]     = useState('');
  const [open, setOpen]       = useState(false);
  const containerRef          = useRef<HTMLDivElement>(null);

  const available = ALL_LICENSE_TYPES.filter(t =>
    !addedTypes.includes(t) &&
    LICENSE_LABELS[t].toLowerCase().includes(query.toLowerCase())
  );

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  if (available.length === 0 && addedTypes.length === ALL_LICENSE_TYPES.length) return null;

  return (
    <div ref={containerRef} className="relative">
      <div
        className="flex items-center gap-2 px-4 py-3 rounded-xl border-2 border-dashed border-slate-300 dark:border-slate-600 hover:border-blue-400 dark:hover:border-blue-500 cursor-text transition-colors"
        onClick={() => setOpen(true)}
      >
        <Plus size={16} className="text-slate-400" />
        <input
          value={query}
          onChange={e => { setQuery(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          placeholder="Adicionar licenciamento…"
          className="flex-1 bg-transparent text-sm text-slate-700 dark:text-slate-300 placeholder-slate-400 outline-none"
        />
        <MagnifyingGlass size={14} className="text-slate-400" />
      </div>

      {open && available.length > 0 && (
        <div className="absolute left-0 right-0 top-full mt-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-lg z-20 overflow-hidden">
          {available.map(t => (
            <button
              key={t}
              onMouseDown={() => { onAdd(t); setQuery(''); setOpen(false); }}
              className="w-full text-left px-4 py-2.5 text-sm text-slate-700 dark:text-slate-300 hover:bg-blue-50 dark:hover:bg-blue-900/30 hover:text-blue-700 dark:hover:text-blue-400 transition-colors"
            >
              {LICENSE_LABELS[t]}
            </button>
          ))}
        </div>
      )}

      {open && available.length === 0 && query && (
        <div className="absolute left-0 right-0 top-full mt-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-lg z-20 px-4 py-3 text-sm text-slate-400">
          Nenhum resultado para "{query}"
        </div>
      )}
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function CompanyDetail() {
  const { id } = useParams<{ id: string }>();
  const qc = useQueryClient();
  const { toast } = useToast();

  const { data: company, isLoading: loadingCompany } = useQuery({
    queryKey: ['company', id],
    queryFn: () => companies.get(id!),
    enabled: !!id,
  });

  const { data: savedLicenses, isLoading: loadingLicenses } = useQuery({
    queryKey: ['licenses', id],
    queryFn: () => companies.getLicenses(id!),
    enabled: !!id,
  });

  const [licenses, setLicenses] = useState<CompanyLicense[]>([]);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (savedLicenses) {
      setLicenses(savedLicenses.map(l => initLicense(id!, l.license_type, l)));
      setDirty(false);
    }
  }, [savedLicenses, id]);

  const saveMutation = useMutation({
    mutationFn: () =>
      companies.saveLicenses(id!, licenses.map(l => ({
        license_type:         l.license_type,
        expiration_date:      l.use_text ? null : (l.expiration_date || null),
        expiration_date_text: l.use_text ? (l.expiration_date_text || null) : null,
        notes:                l.notes || null,
        applicable:           true,
      }))),
    onSuccess: (data) => {
      setLicenses(data.map(l => initLicense(id!, l.license_type, l)));
      setDirty(false);
      toast('Licenciamentos salvos', 'success');
      qc.invalidateQueries({ queryKey: ['dashboard'] });
    },
    onError: (e: any) => toast(e.response?.data?.error || 'Erro ao salvar', 'error'),
  });

  const trelloMutation = useMutation({
    mutationFn: (lic: CompanyLicense) =>
      trello.createCard({
        company_id:      id!,
        license_type:    lic.license_type,
        expiration_date: lic.expiration_date!,
        razao_social:    company!.razao_social,
        cnpj:            company?.cnpj ?? null,
        days_until:      lic.days_until_expiration ?? 0,
      }),
    onSuccess: () => toast('Card criado no Trello', 'success'),
    onError:   (e: any) => toast(e.response?.data?.error || 'Erro Trello', 'error'),
  });

  function addLicense(type: LicenseType) {
    setLicenses(prev => [...prev, initLicense(id!, type)]);
    setDirty(true);
  }

  function removeLicense(type: LicenseType) {
    setLicenses(prev => prev.filter(l => l.license_type !== type));
    setDirty(true);
  }

  function updateLicense(type: LicenseType, field: keyof CompanyLicense, val: any) {
    setLicenses(prev => prev.map(l => l.license_type === type ? { ...l, [field]: val } : l));
    if (field !== 'show_notes' && field !== 'use_text') setDirty(true);
  }

  if (loadingCompany) {
    return (
      <div className="p-8 flex justify-center h-full items-center">
        <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!company) {
    return (
      <div className="p-8 text-center text-slate-500">
        Empresa não encontrada.{' '}
        <Link to="/empresas" className="text-blue-600 hover:underline">Voltar</Link>
      </div>
    );
  }

  const addedTypes = licenses.map(l => l.license_type);

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* header */}
      <div className="flex items-center gap-3 mb-6">
        <Link to="/empresas" className="p-2 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">
          <ArrowLeft size={18} className="text-slate-500" />
        </Link>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-bold text-slate-900 dark:text-white truncate">{company.razao_social}</h1>
          <p className="text-sm text-slate-400 dark:text-slate-500 mt-0.5 flex items-center gap-2 flex-wrap">
            {company.cnpj && <span>CNPJ: {company.cnpj}</span>}
            {(company.cidade || company.uf) && (
              <span>{[company.cidade, company.uf].filter(Boolean).join('/')}</span>
            )}
            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
              company.active
                ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400'
                : 'bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400'
            }`}>
              {company.active ? 'Ativa' : 'Inativa'}
            </span>
          </p>
        </div>
        <button
          onClick={() => saveMutation.mutate()}
          disabled={!dirty || saveMutation.isPending}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-xl hover:bg-blue-700 disabled:opacity-40 transition-colors shadow-sm"
        >
          <FloppyDisk size={16} />
          {saveMutation.isPending ? 'Salvando…' : 'Salvar'}
        </button>
      </div>

      {/* licenses section */}
      {loadingLicenses ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-20 rounded-xl bg-slate-100 dark:bg-slate-800 animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {licenses.length === 0 && (
            <div className="py-10 text-center text-slate-400 dark:text-slate-500">
              <CalendarBlank size={36} className="mx-auto mb-2 opacity-40" />
              <p className="text-sm">Nenhum licenciamento cadastrado.</p>
              <p className="text-xs mt-1">Use o campo abaixo para adicionar.</p>
            </div>
          )}

          {licenses.map(lic => (
            <LicenseCard
              key={lic.license_type}
              license={lic}
              company={{ razao_social: company.razao_social, cnpj: company.cnpj }}
              onUpdate={(field, val) => updateLicense(lic.license_type, field, val)}
              onRemove={() => removeLicense(lic.license_type)}
              onTrello={() => trelloMutation.mutate(lic)}
            />
          ))}

          {/* search to add */}
          <LicenseSearch addedTypes={addedTypes} onAdd={addLicense} />
        </div>
      )}

      {/* floating save bar */}
      {dirty && (
        <div className="fixed bottom-5 left-1/2 -translate-x-1/2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 px-5 py-3 rounded-2xl shadow-2xl text-sm flex items-center gap-4 z-30">
          <span className="font-medium">Alterações não salvas</span>
          <button
            onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending}
            className="px-4 py-1.5 bg-blue-600 text-white rounded-xl text-xs font-semibold hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            Salvar
          </button>
          <button
            onClick={() => {
              if (savedLicenses) setLicenses(savedLicenses.map(l => initLicense(id!, l.license_type, l)));
              setDirty(false);
            }}
            className="text-xs text-slate-400 dark:text-slate-500 hover:text-slate-200 dark:hover:text-slate-700"
          >
            Descartar
          </button>
        </div>
      )}
    </div>
  );
}
