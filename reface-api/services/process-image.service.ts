import path from 'path';
import { randomUUID } from 'crypto';
import fs from 'fs';
import { db } from '../lib/db/index';
import { processRecords } from '../lib/db/schema';
import { eq } from 'drizzle-orm';

// Base directory for image storage
const IMAGES_DIR = path.resolve(process.cwd(), 'public/images');

export type CreateProcessInput = {
  sourceImage: string;
  targetImage: string;
  outputPrefix?: string;
};

export async function ensureDirExists(dirPath: string) {
  await fs.promises.mkdir(dirPath, { recursive: true });
}

export async function createProcessRecord(input: CreateProcessInput) {
  const now = new Date();
  const [record] = await db
    .insert(processRecords)
    .values({
      sourceImage: input.sourceImage,
      targetImage: input.targetImage,
      resultImage: null,
      status: 'pending',
      outputPrefix: input.outputPrefix ?? 'result',
      createdAt: now,
      updatedAt: now,
      processStartedAt: null,
      processEndedAt: null,
    })
    .returning();
  return record;
}

export function uniqueFilename(prefix: string, originalName?: string): string {
  const ext = path.extname(originalName || '.jpg') || '.jpg';
  return `${prefix}_${randomUUID()}${ext}`;
}

// Get full path for a stored image
export function getImagePath(filename: string): string {
  return path.join(IMAGES_DIR, filename);
}

// Get URL path for an image (for API responses)
export function getImageUrl(filename: string): string {
  return `/images/${filename}`;
}

// Save a file buffer to the images directory
export async function saveFile(filename: string, buffer: Buffer): Promise<void> {
  await ensureDirExists(IMAGES_DIR);
  await fs.promises.writeFile(getImagePath(filename), buffer);
}

// Delete a file from the images directory
export async function deleteFile(filename: string): Promise<void> {
  const filePath = getImagePath(filename);
  try {
    await fs.promises.unlink(filePath);
  } catch (err) {
    // Ignore if file doesn't exist
    if (err.code !== 'ENOENT') throw err;
  }
}

export async function listProcessRecords(options?: {
  skip?: number;
  limit?: number;
}) {
  const skip = options?.skip ?? 0;
  const limit = options?.limit ?? 10;
  // Neon HTTP + Drizzle lacks offset/limit helpers; use sql tagged template if needed
  // But drizzle's .execute on raw sql would be more complex; keep it simple here by fetching and slicing if small scale
  // For production, replace with proper pagination query.
  const rows = await db.select().from(processRecords);
  const total = rows.length;
  return { items: rows.slice(skip, skip + limit), total };
}

export async function getProcessRecordById(id: number) {
  const rows = await db.select().from(processRecords).where(eq(processRecords.id, id));
  return rows[0] || null;
}

export type UpdateProcessInput = Partial<{
  sourceImageName: string;
  targetImageName: string;
  resultImageName: string | null;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  outputPrefix: string;
  processStartedAt: Date | null;
  processEndedAt: Date | null;
}>;

export async function updateProcessRecord(id: number, data: UpdateProcessInput) {
  const now = new Date();
  const [updated] = await db
    .update(processRecords)
    .set({ ...data, updatedAt: now })
    .where(eq(processRecords.id, id))
    .returning();
  return updated || null;
}

export async function deleteProcessRecord(id: number) {
  const [deleted] = await db
    .delete(processRecords)
    .where(eq(processRecords.id, id))
    .returning();
  return deleted || null;
}
