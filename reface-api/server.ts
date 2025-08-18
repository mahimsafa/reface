import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import session from 'express-session';
import passport from './lib/passport';

import { initializeQueue, closeConnection } from './services/queue.service';
import processImageRoutes from './routes/process-image.routes';
import queueRoutes from './routes/queue.routes';
import authRoutes from './routes/auth.routes';
import { isAuthenticated } from './middleware/auth.middleware';

const app = express();

// Middleware
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';
app.use(cors({ origin: FRONTEND_URL, credentials: true }));
app.use(express.json());

// Trust proxy if behind one (important for secure cookies in production)
if (process.env.NODE_ENV === 'production') {
  app.set('trust proxy', 1);
}

// Sessions
const SESSION_SECRET = process.env.SESSION_SECRET || 'dev_session_secret_change_me';
app.use(session({
  secret: SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    // sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days
  },
}));

// Passport
app.use(passport.initialize());
app.use(passport.session());

// Ensure public directory exists
const PUBLIC_DIR = path.resolve(process.cwd(), 'public');
const IMAGES_DIR = path.join(process.cwd(), 'images');
fs.mkdirSync(IMAGES_DIR, { recursive: true });

// Serve static files from public directory
app.use('/assets', express.static(PUBLIC_DIR));
app.use('/images', express.static(IMAGES_DIR));

// Initialize queue connection
initializeQueue().catch(err => {
  console.error('Failed to initialize queue:', err);
  process.exit(1);
});

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.log('Shutting down server...');
  await closeConnection();
  process.exit(0);
});

// Routes
app.use('/auth', authRoutes);
app.use('/api/process-image', processImageRoutes);
app.use('/api/queue', queueRoutes);

app.get('/', (req, res) => {
  res.send('Reface API is running');
});

app.get('/me', (req, res) => {
  console.log(req.isAuthenticated());
  console.log(req.user);
  res.json({
    isAuthenticated: req.isAuthenticated(),
    user: req.user,
  });
});

const PORT = process.env.PORT ? Number(process.env.PORT) : 5000;

app.listen(PORT, () => {
  console.log(`Server started on port ${PORT}`);
});