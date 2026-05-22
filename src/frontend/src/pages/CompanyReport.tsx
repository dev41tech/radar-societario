import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Printer, Crosshair } from '@phosphor-icons/react';
import { companies } from '../services/api';
import { LICENSE_LABELS } from '../types';
import LicenseStatusBadge from '../components/LicenseStatusBadge';
import type { CompanyLicense } from '../types';

const STATUS_ORDER: CompanyLicense['status'][] = [
  'expired', 'critical', 'warning', 'notice', 'ok', 'not_set', 'not_applicable',
];

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '—';
  const clean = dateStr.split('T')[0];
  const [y, m, d] = clean.split('-');
  return `${d}/${m}/${y}`;
}

export default function CompanyReport() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: company, isLoading: loadingCompany } = useQuery({
    queryKey: ['company', id],
    queryFn: () => companies.get(id!),
    enabled: !!id,
  });

  const { data: licenses, isLoading: loadingLicenses } = useQuery({
    queryKey: ['licenses', id],
    queryFn: () => companies.getLicenses(id!),
    enabled: !!id,
  });

  if (loadingCompany || loadingLicenses) {
    return (
      <div className="p-8 flex justify-center items-center h-full">
        <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!company) {
    return (
      <div className="p-8 text-center text-slate-500">
        Empresa não encontrada.{' '}
        <button onClick={() => navigate(-1)} className="text-blue-600 hover:underline">Voltar</button>
      </div>
    );
  }

  const sortedLicenses = [...(licenses ?? [])].sort(
    (a, b) => STATUS_ORDER.indexOf(a.status) - STATUS_ORDER.indexOf(b.status)
  );

  const now = new Date().toLocaleString('pt-BR', {
    dateStyle: 'long',
    timeStyle: 'short',
    timeZone: 'America/Sao_Paulo',
  });

  return (
    <div className="min-h-screen bg-white p-8 max-w-4xl mx-auto">
      {/* Barra de ações — oculta na impressão */}
      <div className="flex items-center gap-3 mb-8 print:hidden">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 px-3 py-2 rounded-xl border border-slate-300 text-sm text-slate-600 hover:bg-slate-50 transition-colors"
        >
          <ArrowLeft size={15} />
          Voltar
        </button>
        <button
          onClick={() => window.print()}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-xl hover:bg-blue-700 transition-colors shadow-sm"
        >
          <Printer size={15} />
          Imprimir / Salvar PDF
        </button>
        <span className="text-xs text-slate-400">
          Gerado em {now}
        </span>
      </div>

      {/* Cabeçalho do relatório */}
      <div className="border-b border-slate-200 pb-6 mb-6">
        <div className="flex items-center gap-2 mb-4">
          <Crosshair size={20} weight="fill" className="text-blue-600" />
          <span className="text-sm font-semibold text-slate-400 tracking-wide uppercase">Radar Societário</span>
        </div>
        <h1 className="text-2xl font-bold text-slate-900 mb-2">{company.razao_social}</h1>
        <div className="flex flex-wrap gap-5 text-sm text-slate-500">
          {company.cnpj && (
            <span>
              CNPJ: <strong className="text-slate-700">{company.cnpj}</strong>
            </span>
          )}
          {(company.cidade || company.uf) && (
            <span>
              Localização:{' '}
              <strong className="text-slate-700">
                {[company.cidade, company.uf].filter(Boolean).join(' / ')}
              </strong>
            </span>
          )}
          <span>
            Situação:{' '}
            <strong className={company.active ? 'text-emerald-600' : 'text-slate-400'}>
              {company.active ? 'Ativa' : 'Inativa'}
            </strong>
          </span>
        </div>
      </div>

      {/* Tabela de licenciamentos */}
      <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
        Licenciamentos
      </h2>

      {sortedLicenses.length === 0 ? (
        <p className="text-slate-400 text-sm py-4">Nenhum licenciamento cadastrado.</p>
      ) : (
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="bg-slate-50 border-y border-slate-200">
              <th className="text-left px-3 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Licenciamento
              </th>
              <th className="text-left px-3 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Vencimento
              </th>
              <th className="text-left px-3 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Status
              </th>
              <th className="text-left px-3 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Dias
              </th>
              <th className="text-left px-3 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Observações
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {sortedLicenses.map(lic => (
              <tr key={lic.license_type}>
                <td className="px-3 py-2.5 font-medium text-slate-900">
                  {LICENSE_LABELS[lic.license_type]}
                </td>
                <td className="px-3 py-2.5 text-slate-600">
                  {lic.expiration_date_text ?? formatDate(lic.expiration_date)}
                </td>
                <td className="px-3 py-2.5">
                  <LicenseStatusBadge status={lic.status} />
                </td>
                <td className="px-3 py-2.5 text-slate-500 tabular-nums">
                  {lic.days_until_expiration !== null
                    ? lic.days_until_expiration < 0
                      ? `Vencido há ${Math.abs(lic.days_until_expiration)}d`
                      : `${lic.days_until_expiration}d`
                    : '—'}
                </td>
                <td className="px-3 py-2.5 text-slate-400 text-xs">
                  {lic.notes ?? '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {/* Rodapé */}
      <div className="mt-12 pt-4 border-t border-slate-200 flex justify-between items-center text-xs text-slate-400">
        <span>Radar Societário — 41 Tech</span>
        <span>Gerado em {now}</span>
      </div>
    </div>
  );
}
