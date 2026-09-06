import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { authRouter } from './routes/auth.js';
import { apiRouter, rpcRouter } from './routes/api.js';
import { requireAuth } from './auth.js';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json({ limit: '5mb' }));

app.get('/health', (_req, res) => res.json({ ok: true }));
app.use('/auth', authRouter);
app.use('/rpc', requireAuth, rpcRouter);
app.use('/rest/v1', requireAuth, apiRouter);

app.use((err: any, _req: any, res: any, _next: any) => {
  console.error(err);
  res.status(500).json({ error: err.message || 'Server error' });
});

const port = parseInt(process.env.PORT || '4000', 10);
app.listen(port, () => console.log(`API listening on :${port}`));
