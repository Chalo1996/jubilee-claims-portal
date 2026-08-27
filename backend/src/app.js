require('dotenv').config();

const express      = require('express');
const cors         = require('cors');
const helmet       = require('helmet');
const morgan       = require('morgan');
const errorHandler = require('./middleware/errorHandler');
const authRouter    = require('./routes/auth');
const claimsRouter  = require('./routes/claims');
const policiesRouter = require('./routes/policies');

const app = express();

app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  methods: ['GET', 'POST', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(express.json({ limit: '100kb' }));
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

app.use('/api/auth',     authRouter);
app.use('/api/claims',   claimsRouter);
app.use('/api/policies', policiesRouter);

app.get('/health', (_req, res) => res.json({ status: 'ok' }));
app.use((_req, res) => res.status(404).json({ error: 'Route not found.' }));
app.use(errorHandler);

module.exports = app;
