import fs from 'fs';
import path from 'path';
import type { MetaData } from '../types';

export function getMetaData(): MetaData | null {
  const dataPath = path.join(process.cwd(), 'data', 'meta.json');
  let metaData: MetaData | null = null;

  try {
    if (fs.existsSync(dataPath)) {
      metaData = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));
    }
  } catch (e) {
    console.error("Error reading meta data:", e);
  }

  return metaData;
}
