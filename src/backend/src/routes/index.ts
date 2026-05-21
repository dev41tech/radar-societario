import express, { Router } from 'express';
import {
  getDashboard, listCompanies, getCompany,
  createCompany, patchCompany, inactivateCompany, activateCompany,
} from '../controllers/companiesController';
import { getLicenses, saveLicenses, createTrelloCardForLicense } from '../controllers/licensesController';
import { getSettings, saveSettings, testEmail, testTrello, listTrelloLists } from '../controllers/settingsController';
import { syncFromAditiva, syncLocation, triggerNotifications } from '../controllers/syncController';

const router = Router();

router.get('/health', (_, res) => res.json({ ok: true, ts: new Date().toISOString() }));

router.get('/dashboard', getDashboard);

router.get('/companies', listCompanies);
router.post('/companies', createCompany);
router.get('/companies/:id', getCompany);
router.patch('/companies/:id', patchCompany);
router.post('/companies/:id/inactivate', inactivateCompany);
router.post('/companies/:id/activate', activateCompany);
router.get('/companies/:id/licenses', getLicenses);
router.put('/companies/:id/licenses', saveLicenses);

router.post('/licenses/trello-card', createTrelloCardForLicense);

router.get('/settings', getSettings);
router.put('/settings', saveSettings);
router.post('/settings/test-email', testEmail);
router.post('/settings/test-trello', testTrello);
router.get('/settings/trello/boards/:boardId/lists', listTrelloLists);

router.post('/sync', syncFromAditiva);
router.post('/sync/location', express.raw({ type: 'application/octet-stream', limit: '20mb' }), syncLocation);
router.post('/notifications/trigger', triggerNotifications);

export default router;
