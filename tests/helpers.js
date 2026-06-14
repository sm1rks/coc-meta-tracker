import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse } from 'ultrahtml';
import { querySelector, querySelectorAll } from 'ultrahtml/selector';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, '..');
const DIST_DIR = path.join(PROJECT_ROOT, 'dist');

export function loadPage(relativeHtmlPath) {
  const fullPath = path.join(DIST_DIR, relativeHtmlPath);
  const htmlContent = fs.readFileSync(fullPath, 'utf-8');
  const ast = parse(htmlContent);
  
  return {
    ast,
    htmlContent,
    querySelector: (selector) => querySelector(ast, selector),
    querySelectorAll: (selector) => querySelectorAll(ast, selector),
  };
}

// Helper to extract text content recursively
export function getText(node) {
  if (!node) return '';
  if (node.type === 2) { // TEXT_NODE
    return node.value;
  }
  if (node.children) {
    return node.children.map(getText).join('');
  }
  return '';
}

// Helper to get attribute of a node
export function getAttribute(node, attr) {
  return node.attributes?.[attr] || null;
}

// Helper to check if a class is present
export function hasClass(node, className) {
  const classes = node.attributes?.class || '';
  return classes.split(/\s+/).includes(className);
}
