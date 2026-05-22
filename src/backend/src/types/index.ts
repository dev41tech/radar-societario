export type LicenseType =
  | 'alvara_funcionamento'
  | 'meio_ambiente'
  | 'vigilancia_sanitaria'
  | 'corpo_bombeiros'
  | 'ibama'
  | 'taxa_alvara_anual'
  | 'alvara_policia'
  | 'antt'
  | 'outros';

export const LICENSE_TYPES: { key: LicenseType; label: string }[] = [
  { key: 'alvara_funcionamento', label: 'Alvará de Funcionamento' },
  { key: 'meio_ambiente',        label: 'Meio Ambiente' },
  { key: 'vigilancia_sanitaria', label: 'Vigilância Sanitária' },
  { key: 'corpo_bombeiros',      label: 'Corpo de Bombeiros' },
  { key: 'ibama',                label: 'IBAMA' },
  { key: 'taxa_alvara_anual',    label: 'Taxa de Alvará Anual' },
  { key: 'alvara_policia',       label: 'Alvará da Polícia' },
  { key: 'antt',                 label: 'ANTT' },
  { key: 'outros',               label: 'Outros' },
];

export type LicenseStatus = 'expired' | 'critical' | 'warning' | 'notice' | 'ok' | 'not_set' | 'not_applicable';

export interface Company {
  id: string;
  aditiva_id: string | null;
  razao_social: string;
  cnpj: string | null;
  cidade: string | null;
  uf: string | null;
  source: 'imported' | 'manual';
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CompanyLicense {
  id: number;
  company_id: string;
  license_type: LicenseType;
  license_label: string | null;
  expiration_date: string | null;
  expiration_date_text: string | null;
  notes: string | null;
  applicable: boolean;
  status?: LicenseStatus;
  days_until_expiration?: number | null;
}

export interface Settings {
  smtp_host: string;
  smtp_port: string;
  smtp_user: string;
  smtp_pass: string;
  smtp_from: string;
  smtp_secure: string;
  notification_days: string;
  notification_emails: string;
  notification_enabled: string;
  notification_hour: string;
  trello_api_key: string;
  trello_token: string;
  trello_board_id: string;
  trello_list_id: string;
  trello_enabled: string;
}
