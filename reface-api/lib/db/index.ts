import { drizzle } from 'drizzle-orm/neon-http';
import { neon } from '@neondatabase/serverless';
import * as schema from './schema';
import { config } from '../constants';

const sql = neon(config.db.url);
export const db = drizzle(sql, { schema });