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
import { authenticate } from './middlewares/auth.middleware';
import { config } from './lib/constants';

const app = express();

// Middleware
const allowedOrigins = config.corsOrigin.split(',')?.map(origin => origin.trim())
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps or curl requests)
      if (!origin) return callback(null, true);
      if (allowedOrigins.indexOf(origin) === -1) {
        const msg = 'The CORS policy for this site does not allow access from the specified origin.';
        return callback(new Error(msg), false);
      }
      return callback(null, true);
    },
    credentials: true,
  }),
);
app.use(express.json());

// Trust proxy if behind one (important for secure cookies in production)
if (config.env === 'production') {
  app.set('trust proxy', 1);
}

app.use(session({
  secret: config.sessionSecret,
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    // sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    secure: config.env === 'production',
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

app.get('/me', authenticate,(req, res) => {
  res.json({
    isAuthenticated: req.isAuthenticated(),
    user: req.user,
  });
});

app.listen(config.port, () => {
  console.log(`Server started on port ${config.port}`);
});