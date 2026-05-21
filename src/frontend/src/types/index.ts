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

export type LicenseStatus = 'expired' | 'critical' | 'warning' | 'notice' | 'ok' | 'not_set' | 'not_applicable';

export const LICENSE_LABELS: Record<LicenseType, string> = {
  alvara_funcionamento: 'Alvará de Funcionamento',
  meio_ambiente:        'Meio Ambiente',
  vigilancia_sanitaria: 'Vigilância Sanitária',
  corpo_bombeiros:      'Corpo de Bombeiros',
  ibama:                'IBAMA',
  taxa_alvara_anual:    'Taxa de Alvará Anual',
  alvara_policia:       'Alvará da Polícia',
  antt:                 'ANTT',
  outros:               'Outros',
};

export const ALL_LICENSE_TYPES = Object.keys(LICENSE_LABELS) as LicenseType[];

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

// Local-only flags for UX state
export interface CompanyLicense {
  id: number;
  company_id: string;
  license_type: LicenseType;
  expiration_date: string | null;
  expiration_date_text: string | null;
  notes: string | null;
  applicable: boolean;
  status: LicenseStatus;
  days_until_expiration: number | null;
  // local UI state (not stored)
  use_text?: boolean;
  show_notes?: boolean;
}

export interface DashboardStats {
  total: number;
  active: number;
  expiring_30: number;
  expiring_60: number;
  expiring_90: number;
  expired: number;
}

export interface UpcomingExpiration {
  company_id: string;
  razao_social: string;
  license_type: LicenseType;
  expiration_date: string;
  days_until: number;
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
