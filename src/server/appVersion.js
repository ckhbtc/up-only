import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

function deployedFrontendVersion() {
  if (process.env.APP_RELEASE) return process.env.APP_RELEASE;
  try {
    const indexHtml = readFileSync(join(process.cwd(), 'dist', 'index.html'));
    return createHash('sha256').update(indexHtml).digest('hex').slice(0, 16);
  } catch {
    return 'development';
  }
}

export const APP_VERSION = deployedFrontendVersion();

export function appVersionResponse(version = APP_VERSION) {
  return {
    ok: true,
    version,
  };
}
