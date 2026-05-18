import 'server-only';

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { z } from 'zod';

export const appSettingsSchema = z.object({
  companyName: z.string().trim().min(1).max(80).default('Portail Client'),
  logoUrl: z.string().trim().max(500).optional().or(z.literal('')),
  faviconUrl: z.string().trim().max(500).optional().or(z.literal(''))
});

export type AppSettings = z.infer<typeof appSettingsSchema>;

const defaultSettings: AppSettings = {
  companyName: 'Portail Client',
  logoUrl: '',
  faviconUrl: ''
};

const settingsPath = path.join(process.cwd(), 'data', 'app-settings.json');

export async function getAppSettings(): Promise<AppSettings> {
  try {
    const raw = await readFile(settingsPath, 'utf8');
    return appSettingsSchema.parse({ ...defaultSettings, ...JSON.parse(raw) });
  } catch {
    return defaultSettings;
  }
}

export async function saveAppSettings(settings: AppSettings): Promise<AppSettings> {
  const parsed = appSettingsSchema.parse(settings);
  await mkdir(path.dirname(settingsPath), { recursive: true });
  await writeFile(settingsPath, JSON.stringify(parsed, null, 2), 'utf8');
  return parsed;
}
