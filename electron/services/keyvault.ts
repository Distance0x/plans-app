import { app, safeStorage } from 'electron';
import fs from 'node:fs';
import path from 'node:path';

const secretFile = path.join(app.getPath('userData'), 'secrets.json');

interface AIConfig {
  baseURL: string;
  apiKey: string;
  model: string;
}

export function saveAIConfig(config: AIConfig): void {
  if (!safeStorage.isEncryptionAvailable()) {
    throw new Error('OS encryption unavailable');
  }

  const raw = fs.existsSync(secretFile)
    ? JSON.parse(fs.readFileSync(secretFile, 'utf8'))
    : {};

  raw.ai_config = safeStorage.encryptString(JSON.stringify(config)).toString('base64');
  fs.writeFileSync(secretFile, JSON.stringify(raw, null, 2), 'utf8');
}

export function loadAIConfig(): AIConfig | null {
  if (!fs.existsSync(secretFile)) return null;

  const raw = JSON.parse(fs.readFileSync(secretFile, 'utf8'));
  if (!raw.ai_config) return null;

  const decrypted = safeStorage.decryptString(Buffer.from(raw.ai_config, 'base64'));
  return JSON.parse(decrypted);
}

export function deleteAIConfig(): void {
  if (!fs.existsSync(secretFile)) return;

  const raw = JSON.parse(fs.readFileSync(secretFile, 'utf8'));
  delete raw.ai_config;
  fs.writeFileSync(secretFile, JSON.stringify(raw, null, 2), 'utf8');
}

export function getSecretHealth() {
  return {
    encryptionAvailable: safeStorage.isEncryptionAvailable(),
    backend: typeof safeStorage.getSelectedStorageBackend === 'function'
      ? safeStorage.getSelectedStorageBackend()
      : 'unknown',
  };
}
