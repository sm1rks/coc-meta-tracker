import fs from 'fs';
import path from 'path';

export function getMetaData() {
  const dataPath = path.join(process.cwd(), 'data', 'meta.json');
  let metaData = null;

  try {
    if (fs.existsSync(dataPath)) {
      metaData = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));
    }
  } catch (e) {
    console.error("Error reading meta data:", e);
  }

  return metaData;
}
