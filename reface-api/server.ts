import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import uploadRoutes from './routes/process-image.routes';

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

// Routes
app.use('/api', uploadRoutes);

app.get('/', (req, res) => {
  res.send('Reface API is running');
});

const PORT = process.env.PORT ? Number(process.env.PORT) : 5000;

app.listen(PORT, () => {
  console.log(`Server started on port ${PORT}`);
});