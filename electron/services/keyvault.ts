import { app, safeStorage } from 'electron';
import fs from 'node:fs';
import path from 'node:path';

const secretFile = path.join(app.getPath('userData'), 'secrets.json');

export function saveSecret(key: string, value: string): void {
  if (!safeStorage.isEncryptionAvailable()) {
    throw new Error('OS encryption unavailable');
  }

  const raw = fs.existsSync(secretFile)
    ? JSON.parse(fs.readFileSync(secretFile, 'utf8'))
    : {};

  raw[key] = safeStorage.encryptString(value).toString('base64');
  fs.writeFileSync(secretFile, JSON.stringify(raw, null, 2), 'utf8');
}

export function loadSecret(key: string): string | null {
  if (!fs.existsSync(secretFile)) return null;

  const raw = JSON.parse(fs.readFileSync(secretFile, 'utf8'));
  if (!raw[key]) return null;

  return safeStorage.decryptString(Buffer.from(raw[key], 'base64'));
}

export function deleteSecret(key: string): void {
  if (!fs.existsSync(secretFile)) return;

  const raw = JSON.parse(fs.readFileSync(secretFile, 'utf8'));
  delete raw[key];
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
