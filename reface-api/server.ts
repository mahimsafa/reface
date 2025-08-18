import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import uploadRoutes from './routes/process-image.routes';
import queueRoutes from './routes/queue.routes';
import { initializeQueue, closeConnection } from './services/queue.service';

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

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
app.use('/api', uploadRoutes);
app.use('/api', queueRoutes);

app.get('/', (req, res) => {
  res.send('Reface API is running');
});

const PORT = process.env.PORT ? Number(process.env.PORT) : 5000;

app.listen(PORT, () => {
  console.log(`Server started on port ${PORT}`);
});