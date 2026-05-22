import axios from 'axios';
import { Company, CompanyLicense, DashboardStats, LicenseType, Settings, UpcomingExpiration } from '../types';

const api = axios.create({ baseURL: '/api', timeout: 30000 });

export const dashboard = {
  get: () => api.get<{ stats: DashboardStats; upcoming: UpcomingExpiration[] }>('/dashboard').then(r => r.data),
};

export const companies = {
  list: (params: { page?: number; limit?: number; search?: string; status?: string; licenseFilter?: string }) =>
    api.get<{ data: Company[]; total: number }>('/companies', { params }).then(r => r.data),
  get: (id: string) => api.get<Company>(`/companies/${id}`).then(r => r.data),
  create: (data: { razao_social: string; cnpj?: string; cidade?: string; uf?: string }) =>
    api.post<Company>('/companies', data).then(r => r.data),
  patch: (id: string, data: { razao_social?: string; cidade?: string; uf?: string }) =>
    api.patch<Company>(`/companies/${id}`, data).then(r => r.data),
  inactivate: (id: string) => api.post(`/companies/${id}/inactivate`).then(r => r.data),
  activate:   (id: string) => api.post(`/companies/${id}/activate`).then(r => r.data),
  getLicenses: (id: string) => api.get<CompanyLicense[]>(`/companies/${id}/licenses`).then(r => r.data),
  saveLicenses: (id: string, licenses: Partial<CompanyLicense>[]) =>
    api.put<CompanyLicense[]>(`/companies/${id}/licenses`, { licenses }).then(r => r.data),
  notifyLicense: (id: string, data: { license_type: string; expiration_date: string; days_until: number }) =>
    api.post(`/companies/${id}/licenses/notify`, data).then(r => r.data),
  bulkStatus: (ids: string[], active: boolean) =>
    api.post('/companies/bulk-status', { ids, active }).then(r => r.data),
};

export const settings = {
  get: () => api.get<Settings>('/settings').then(r => r.data),
  save: (data: Partial<Settings>) => api.put('/settings', data).then(r => r.data),
  testEmail:  (to: string) => api.post('/settings/test-email', { to }).then(r => r.data),
  testTrello: () => api.post('/settings/test-trello').then(r => r.data),
  getTrelloLists: (boardId: string) =>
    api.get<Array<{ id: string; name: string }>>(`/settings/trello/boards/${boardId}/lists`).then(r => r.data),
};

export const sync = {
  fromAditiva:          () => api.post<{ ok: boolean; synced: number }>('/sync').then(r => r.data),
  triggerNotifications: () => api.post('/notifications/trigger').then(r => r.data),
  /** Auto-detecta o XLSX mais recente na pasta de exports do Aditiva Pronto */
  importLocation: () =>
    api.post<{ ok: boolean; updated: number; notFound: number; skipped: number; fileUsed: string }>(
      '/sync/location'
    ).then(r => r.data),
  /** Upload manual de XLSX (fallback) */
  importLocationFile: (file: File) => {
    return file.arrayBuffer().then(buf =>
      api.post<{ ok: boolean; updated: number; notFound: number; skipped: number; fileUsed: string }>(
        '/sync/location',
        buf,
        {
          headers: {
            'Content-Type': 'application/octet-stream',
            'X-File-Name': file.name,
          },
        }
      ).then(r => r.data)
    );
  },
};

export const notifications = {
  diagnostic: () => api.get('/notifications/diagnostic').then(r => r.data),
};

export const exportApi = {
  /** Abre download direto do XLSX no browser */
  companiesUrl: '/api/export/companies',
};


export const trello = {
  createCard: (data: {
    company_id: string; license_type: LicenseType;
    expiration_date: string; razao_social: string;
    cnpj: string | null; days_until: number;
  }) => api.post('/licenses/trello-card', data).then(r => r.data),
};
