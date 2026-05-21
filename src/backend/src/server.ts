import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import routes from './routes';
import { startScheduler } from './services/schedulerService';
import logger from './utils/logger';

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT) || 3002;

app.use(cors());
app.use(express.json());

app.use('/api', routes);

if (process.env.NODE_ENV === 'production') {
  const staticPath = path.join(__dirname, '../src/frontend/dist');
  app.use(express.static(staticPath));
  app.get('*', (_, res) => res.sendFile(path.join(staticPath, 'index.html')));
}

app.listen(PORT, async () => {
  logger.info(`Radar Societário rodando na porta ${PORT}`);
  try {
    await startScheduler();
    logger.info('Agendador de notificações iniciado');
  } catch (e: any) {
    logger.error(`Erro ao iniciar agendador: ${e.message}`);
  }
});

export default app;
