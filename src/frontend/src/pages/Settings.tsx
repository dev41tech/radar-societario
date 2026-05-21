import { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { FloppyDisk, Envelope, Columns, Bell, Plus, X, Check } from '@phosphor-icons/react';
import { settings as settingsApi } from '../services/api';
import { Settings as SettingsType } from '../types';
import { useToast } from '../context/ToastContext';

function Section({ title, icon: Icon, children }: { title: string; icon: any; children: React.ReactNode }) {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden mb-5">
      <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-700 flex items-center gap-2">
        <Icon size={17} className="text-blue-600" />
        <h2 className="font-semibold text-slate-900 dark:text-white">{title}</h2>
      </div>
      <div className="p-5 space-y-4">{children}</div>
    </div>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{label}</label>
      {hint && <p className="text-xs text-slate-400 mb-1">{hint}</p>}
      {children}
    </div>
  );
}

const inputCls = 'w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition-shadow';

function Toggle({ checked, onChange }: { checked: boolean; onChange: () => void }) {
  return (
    <button
      onClick={onChange}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
        checked ? 'bg-blue-600' : 'bg-slate-300 dark:bg-slate-600'
      }`}
    >
      <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
        checked ? 'translate-x-6' : 'translate-x-1'
      }`} />
    </button>
  );
}

// ── custom notification days component ────────────────────────────────────────
const PRESET_DAYS = [90, 60, 30, 15];

function NotificationDays({
  days, onChange,
}: { days: number[]; onChange: (d: number[]) => void }) {
  const [showCustom, setShowCustom] = useState(false);
  const [customVal, setCustomVal]   = useState('');

  function toggle(d: number) {
    onChange(days.includes(d) ? days.filter(x => x !== d) : [...days, d].sort((a, b) => b - a));
  }

  function addCustom() {
    const n = parseInt(customVal, 10);
    if (!isNaN(n) && n > 0 && !days.includes(n)) {
      onChange([...days, n].sort((a, b) => b - a));
    }
    setCustomVal('');
    setShowCustom(false);
  }

  function removeCustom(d: number) {
    onChange(days.filter(x => x !== d));
  }

  const customDays = days.filter(d => !PRESET_DAYS.includes(d));

  return (
    <div>
      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
        Notificar com antecedência de (dias)
      </label>
      <div className="flex flex-wrap gap-2 items-center">
        {PRESET_DAYS.map(d => (
          <button
            key={d}
            onClick={() => toggle(d)}
            className={`px-4 py-1.5 rounded-xl border text-sm font-medium transition-colors ${
              days.includes(d)
                ? 'bg-blue-600 border-blue-600 text-white'
                : 'border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-400 hover:border-blue-400'
            }`}
          >
            {d} dias
          </button>
        ))}

        {/* custom day pills */}
        {customDays.map(d => (
          <span key={d} className="flex items-center gap-1 px-3 py-1.5 rounded-xl border border-blue-600 bg-blue-600 text-white text-sm font-medium">
            {d} dias
            <button onClick={() => removeCustom(d)} className="ml-0.5 hover:text-blue-200 transition-colors">
              <X size={12} />
            </button>
          </span>
        ))}

        {/* Outro button */}
        {!showCustom ? (
          <button
            onClick={() => setShowCustom(true)}
            className="px-4 py-1.5 rounded-xl border border-dashed border-slate-300 dark:border-slate-600 text-sm text-slate-500 dark:text-slate-400 hover:border-blue-400 hover:text-blue-600 transition-colors"
          >
            + Outro
          </button>
        ) : (
          <div className="flex items-center gap-1">
            <input
              type="number"
              min="1"
              value={customVal}
              onChange={e => setCustomVal(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') addCustom(); if (e.key === 'Escape') setShowCustom(false); }}
              placeholder="dias"
              autoFocus
              className="w-20 px-3 py-1.5 rounded-xl border border-blue-400 bg-white dark:bg-slate-700 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
            />
            <button onClick={addCustom} className="p-1.5 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors">
              <Check size={14} />
            </button>
            <button onClick={() => setShowCustom(false)} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 transition-colors">
              <X size={14} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function Settings() {
  const { toast } = useToast();
  const { data: serverSettings } = useQuery({ queryKey: ['settings'], queryFn: settingsApi.get });

  const [form, setForm]         = useState<Partial<SettingsType>>({});
  const [emails, setEmails]     = useState<string[]>([]);
  const [newEmail, setNewEmail] = useState('');
  const [notifDays, setNotifDays] = useState<number[]>([90, 60, 30]);
  const [testEmailTo, setTestEmailTo]   = useState('');
  const [trelloBoardId, setTrelloBoardId] = useState('');
  const [trelloLists, setTrelloLists]   = useState<Array<{ id: string; name: string }>>([]);

  useEffect(() => {
    if (!serverSettings) return;
    setForm(serverSettings);
    try { setEmails(JSON.parse(serverSettings.notification_emails || '[]')); } catch {}
    try { setNotifDays(JSON.parse(serverSettings.notification_days || '[90,60,30]')); } catch {}
    setTrelloBoardId(serverSettings.trello_board_id || '');
  }, [serverSettings]);

  const saveMutation = useMutation({
    mutationFn: () => settingsApi.save({
      ...form,
      notification_emails: JSON.stringify(emails),
      notification_days:   JSON.stringify(notifDays),
    }),
    onSuccess: () => toast('Configurações salvas', 'success'),
    onError:   (e: any) => toast(e.response?.data?.error || 'Erro ao salvar', 'error'),
  });

  const testEmailMutation  = useMutation({
    mutationFn: () => settingsApi.testEmail(testEmailTo),
    onSuccess: () => toast('E-mail de teste enviado!', 'success'),
    onError:   (e: any) => toast(e.response?.data?.error || 'Erro SMTP', 'error'),
  });

  const testTrelloMutation = useMutation({
    mutationFn: settingsApi.testTrello,
    onSuccess: () => toast('Conexão Trello OK!', 'success'),
    onError:   (e: any) => toast(e.response?.data?.error || 'Erro Trello', 'error'),
  });

  const loadListsMutation  = useMutation({
    mutationFn: () => settingsApi.getTrelloLists(trelloBoardId),
    onSuccess: (d) => setTrelloLists(d),
    onError:   (e: any) => toast(e.response?.data?.error || 'Erro ao carregar listas', 'error'),
  });

  const set = (key: keyof SettingsType) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setForm(f => ({ ...f, [key]: e.target.value }));

  function addEmail() {
    if (newEmail && !emails.includes(newEmail)) { setEmails(e => [...e, newEmail]); setNewEmail(''); }
  }

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">Configurações</h1>
          <p className="text-slate-400 dark:text-slate-500 text-sm mt-0.5">E-mail, notificações e Trello</p>
        </div>
        <button
          onClick={() => saveMutation.mutate()}
          disabled={saveMutation.isPending}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-xl hover:bg-blue-700 disabled:opacity-50 transition-colors shadow-sm"
        >
          <FloppyDisk size={16} />
          {saveMutation.isPending ? 'Salvando…' : 'Salvar configurações'}
        </button>
      </div>

      {/* E-mail */}
      <Section title="Configuração de E-mail (SMTP)" icon={Envelope}>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Host SMTP"><input className={inputCls} value={form.smtp_host ?? ''} onChange={set('smtp_host')} placeholder="smtp.gmail.com" /></Field>
          <Field label="Porta"><input className={inputCls} value={form.smtp_port ?? '587'} onChange={set('smtp_port')} placeholder="587" /></Field>
          <Field label="Usuário"><input className={inputCls} value={form.smtp_user ?? ''} onChange={set('smtp_user')} placeholder="email@dominio.com" /></Field>
          <Field label="Senha"><input className={inputCls} type="password" value={form.smtp_pass ?? ''} onChange={set('smtp_pass')} placeholder="App Password" /></Field>
          <Field label="Remetente (From)"><input className={inputCls} value={form.smtp_from ?? ''} onChange={set('smtp_from')} placeholder="Radar Societário <noreply@dominio.com>" /></Field>
          <Field label="Segurança">
            <select className={inputCls} value={form.smtp_secure ?? 'false'} onChange={set('smtp_secure')}>
              <option value="false">STARTTLS (porta 587)</option>
              <option value="true">SSL/TLS (porta 465)</option>
            </select>
          </Field>
        </div>
        <div className="flex items-center gap-2 pt-2 border-t border-slate-100 dark:border-slate-700">
          <input className={`flex-1 ${inputCls}`} value={testEmailTo} onChange={e => setTestEmailTo(e.target.value)} placeholder="E-mail para teste" type="email" />
          <button
            onClick={() => testEmailMutation.mutate()}
            disabled={!testEmailTo || testEmailMutation.isPending}
            className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-700 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600 disabled:opacity-50 transition-colors whitespace-nowrap"
          >
            {testEmailMutation.isPending ? 'Enviando…' : 'Testar e-mail'}
          </button>
        </div>
      </Section>

      {/* Notificações */}
      <Section title="Notificações" icon={Bell}>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-slate-700 dark:text-slate-300">Notificações ativas</p>
            <p className="text-xs text-slate-400">Envio automático diário por e-mail</p>
          </div>
          <Toggle
            checked={form.notification_enabled === 'true'}
            onChange={() => setForm(f => ({ ...f, notification_enabled: f.notification_enabled === 'true' ? 'false' : 'true' }))}
          />
        </div>

        <Field label="Horário de envio">
          <select className={inputCls} value={form.notification_hour ?? '8'} onChange={set('notification_hour')}>
            {Array.from({ length: 24 }, (_, i) => (
              <option key={i} value={String(i)}>{String(i).padStart(2, '0')}:00</option>
            ))}
          </select>
        </Field>

        <NotificationDays days={notifDays} onChange={setNotifDays} />

        <Field label="E-mails de destino">
          <div className="flex gap-2 mb-2">
            <input
              className={`flex-1 ${inputCls}`}
              value={newEmail}
              onChange={e => setNewEmail(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addEmail()}
              placeholder="email@exemplo.com"
              type="email"
            />
            <button onClick={addEmail} className="px-3 py-2 rounded-xl bg-blue-600 text-white hover:bg-blue-700 transition-colors">
              <Plus size={16} />
            </button>
          </div>
          {emails.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {emails.map(email => (
                <div key={email} className="flex items-center gap-1 bg-slate-100 dark:bg-slate-700 px-2.5 py-1 rounded-full text-xs">
                  <span className="text-slate-700 dark:text-slate-300">{email}</span>
                  <button onClick={() => setEmails(e => e.filter(x => x !== email))} className="text-slate-400 hover:text-red-500 transition-colors">
                    <X size={12} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </Field>
      </Section>

      {/* Trello */}
      <Section title="Integração Trello" icon={Columns}>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-slate-700 dark:text-slate-300">Criação automática de cards</p>
            <p className="text-xs text-slate-400">Cria cards no Trello junto com o envio de e-mails</p>
          </div>
          <Toggle
            checked={form.trello_enabled === 'true'}
            onChange={() => setForm(f => ({ ...f, trello_enabled: f.trello_enabled === 'true' ? 'false' : 'true' }))}
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Field label="API Key"><input className={inputCls} value={form.trello_api_key ?? ''} onChange={set('trello_api_key')} placeholder="Trello API Key" /></Field>
          <Field label="Token"><input className={inputCls} value={form.trello_token ?? ''} onChange={set('trello_token')} placeholder="Trello Token" /></Field>
          <Field label="ID do Board">
            <div className="flex gap-2">
              <input
                className={`flex-1 ${inputCls}`}
                value={trelloBoardId}
                onChange={e => { setTrelloBoardId(e.target.value); setForm(f => ({ ...f, trello_board_id: e.target.value })); }}
                placeholder="ID do quadro Trello"
              />
              <button
                onClick={() => loadListsMutation.mutate()}
                disabled={!trelloBoardId || loadListsMutation.isPending}
                className="px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-700 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-200 disabled:opacity-50 whitespace-nowrap"
              >
                Carregar listas
              </button>
            </div>
          </Field>
          <Field label="Lista de destino">
            {trelloLists.length > 0 ? (
              <select className={inputCls} value={form.trello_list_id ?? ''} onChange={set('trello_list_id')}>
                <option value="">Selecione uma lista</option>
                {trelloLists.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
              </select>
            ) : (
              <input className={inputCls} value={form.trello_list_id ?? ''} onChange={set('trello_list_id')} placeholder="ID da lista Trello" />
            )}
          </Field>
        </div>
        <button
          onClick={() => testTrelloMutation.mutate()}
          disabled={!form.trello_api_key || !form.trello_token || testTrelloMutation.isPending}
          className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-700 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600 disabled:opacity-50 transition-colors"
        >
          {testTrelloMutation.isPending ? 'Testando…' : 'Testar conexão Trello'}
        </button>
      </Section>
    </div>
  );
}
