import path from 'path';
import fs from 'fs';
import type { Request, Response } from 'express';
import { 
  createProcessRecord, 
  ensureDirExists, 
  uniqueFilename, 
  listProcessRecords, 
  getProcessRecordById, 
  updateProcessRecord, 
  deleteProcessRecord 
} from '../services/process-image.service';

const IMAGES_DIR = path.resolve(process.cwd(), 'images');

export async function createImageProcess(req: Request, res: Response) {
  try {
    // Ensure images directory exists
    await ensureDirExists(IMAGES_DIR);

    const source = (req.files as any)?.source_image?.[0];
    const target = (req.files as any)?.target_image?.[0];

    if (!source || !target) {
      return res.status(400).json({ error: 'Both source_image and target_image are required' });
    }

    // Save files to disk with unique names
    const sourceName = uniqueFilename('source', source.originalname);
    const targetName = uniqueFilename('target', target.originalname);

    const sourcePath = path.join(IMAGES_DIR, sourceName);
    const targetPath = path.join(IMAGES_DIR, targetName);

    await fs.promises.writeFile(sourcePath, source.buffer);
    await fs.promises.writeFile(targetPath, target.buffer);

    const outputPrefix = (req.body?.output_prefix as string) || 'result';

    const remoteSource = '/images/'+sourceName;
    const remoteTarget = '/images/'+targetName;

    const record = await createProcessRecord({
      sourceImage: remoteSource,
      targetImage: remoteTarget,
      outputPrefix,
    });

    return res.status(201).json({
      status: 'success',
      process_id: record.id,
      data: record,
      source_image_url: remoteSource,
      target_image_url: remoteTarget,
      message: 'Image process created with pending status',
    });
  } catch (err: any) {
    console.error('Create image-process error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

export { IMAGES_DIR };

export async function listImageProcesses(req: Request, res: Response) {
  try {
    const skip = parseInt(String(req.query.skip ?? '0'), 10) || 0;
    const limit = Math.min(parseInt(String(req.query.limit ?? '10'), 10) || 10, 100);
    const data = await listProcessRecords({ skip, limit });
    return res.json(data);
  } catch (err) {
    console.error('List image-processes error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

export async function getImageProcess(req: Request, res: Response) {
  try {
    const id = parseInt(req.params.id, 10);
    if (Number.isNaN(id)) {
      return res.status(400).json({ error: 'Invalid id' });
    }
    const rec = await getProcessRecordById(id);
    if (!rec) return res.status(404).json({ error: 'Not found' });
    return res.json(rec);
  } catch (err) {
    console.error('Get image-process error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

export async function updateImageProcess(req: Request, res: Response) {
  try {
    const id = parseInt(req.params.id, 10);
    if (Number.isNaN(id)) return res.status(400).json({ error: 'Invalid id' });

    const updates: any = {};
    const { status, output_prefix, process_started_at, process_ended_at, result_image_path } = req.body || {};

    if (status) updates.status = status;
    if (output_prefix) updates.outputPrefix = output_prefix;
    if (result_image_path !== undefined) updates.resultImagePath = result_image_path || null;
    if (process_started_at !== undefined) updates.processStartedAt = process_started_at ? new Date(process_started_at) : null;
    if (process_ended_at !== undefined) updates.processEndedAt = process_ended_at ? new Date(process_ended_at) : null;

    // Optional new files
    const source = (req.files as any)?.source_image?.[0];
    const target = (req.files as any)?.target_image?.[0];
    await ensureDirExists(IMAGES_DIR);
    if (source) {
      const sourceName = uniqueFilename('source', source.originalname);
      const sourcePath = path.join(IMAGES_DIR, sourceName);
      await fs.promises.writeFile(sourcePath, source.buffer);
      updates.sourceImagePath = sourcePath;
    }
    if (target) {
      const targetName = uniqueFilename('target', target.originalname);
      const targetPath = path.join(IMAGES_DIR, targetName);
      await fs.promises.writeFile(targetPath, target.buffer);
      updates.targetImagePath = targetPath;
    }

    const updated = await updateProcessRecord(id, updates);
    if (!updated) return res.status(404).json({ error: 'Not found' });
    return res.json({ status: 'success', data: updated });
  } catch (err) {
    console.error('Update image-process error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

export async function deleteImageProcess(req: Request, res: Response) {
  try {
    const id = parseInt(req.params.id, 10);
    if (Number.isNaN(id)) return res.status(400).json({ error: 'Invalid id' });
    const deleted = await deleteProcessRecord(id);
    if (!deleted) return res.status(404).json({ error: 'Not found' });
    return res.json({ status: 'success', data: deleted });
  } catch (err) {
    console.error('Delete image-process error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
