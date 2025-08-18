import path from 'path';
import { randomUUID } from 'crypto';
import fs from 'fs';
import { db } from '../lib/db/index';
import { processRecords } from '../lib/db/schema';
import { eq, sql, asc, desc } from 'drizzle-orm';

// Base directory for image storage
const IMAGES_DIR = path.resolve(process.cwd(), 'public/images');

export type CreateProcessInput = {
  sourceImage: string;
  targetImage: string;
  sourceIndex?: number;
  targetIndex?: number;
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
      targetIndex: input.targetIndex || 0,
      sourceIndex: input.sourceIndex || 0,
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
    // @ts-ignore
    if (err.code !== 'ENOENT') throw err;
  }
}

export interface PaginationOptions {
  page?: number;
  pageSize?: number;
  sortBy?: keyof typeof processRecords;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedResult<T> {
  items: T[];
  pagination: {
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
  };
}

type ProcessRecord = typeof processRecords.$inferSelect;

export async function listProcessRecords(options: PaginationOptions & { status?: string } = {}): Promise<PaginatedResult<ProcessRecord>> {
  const page = Math.max(1, options.page || 1);
  const pageSize = Math.min(100, Math.max(1, options.pageSize || 10));
  const offset = (page - 1) * pageSize;
  
  try {
    // Get total count with status filter if provided
    let countQuery = db.select({ count: sql<number>`count(*)` }).from(processRecords);
    
    // Build the base query
    let query = db.select().from(processRecords);
    
    // Apply status filter if provided
    if (options.status) {
      const whereClause = eq(processRecords.status, options.status as any);
      countQuery = countQuery.where(whereClause);
      query = query.where(whereClause);
    }
    
    // Execute count query
    const [countResult] = await countQuery;
    const totalItems = Number(countResult?.count ?? 0);
    
    // Apply sorting
    const sortField = (options.sortBy && processRecords[options.sortBy as keyof typeof processRecords])
      ? options.sortBy
      : 'createdAt';
    
    // Apply sorting with proper type assertions
    const sortDirection = options.sortOrder === 'asc' ? asc : desc;
    
    // Use type assertion to bypass TypeScript errors
    const processRecordsAny = processRecords as any;
    
    // Apply sorting based on field
    if (sortField in processRecords) {
      query = query.orderBy(sortDirection(processRecordsAny[sortField]));
    } else {
      // Default sorting if field is invalid
      query = query.orderBy(desc(processRecords.createdAt));
    }
    
    // Apply pagination and execute
    const items = await query.limit(pageSize).offset(offset);
    
    return {
      items,
      pagination: {
        page,
        pageSize,
        totalItems,
        totalPages: Math.ceil(totalItems / pageSize),
      },
    };
  } catch (error) {
    console.error('Error listing process records:', error);
    throw error;
  }
}

export async function getProcessRecordById(id: number) {
  const rows = await db.select().from(processRecords).where(eq(processRecords.id, id));
  return rows[0] || null;
}

export type UpdateProcessInput = Partial<{
  sourceImage: string;
  targetImage: string;
  resultImage: string | null;
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
