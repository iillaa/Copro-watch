import localforage from 'localforage';
import { db } from '../db';
import { describe, it, test, expect, beforeEach } from 'vitest';

describe('db export/import', () => {
  beforeEach(async () => {
    // Provide a simple in-memory mock for localforage since tests run in Node
    const store = {};
    localforage.getItem = async (key) => store[key] ?? null;
    localforage.setItem = async (key, value) => { store[key] = value; return value; };
    localforage.removeItem = async (key) => { delete store[key]; };
    localforage.clear = async () => { for (const k in store) delete store[k]; };
    await localforage.clear();
    await db.init();
  });

  test('export and import plain JSON', async () => {
    const json = await db.exportData();
    expect(typeof json).toBe('string');

    // clear and import
    await localforage.clear();
    const ok = await db.importData(json);
    expect(ok).toBe(true);

    const workers = await db.getWorkers();
    expect(workers.length).toBeGreaterThan(0);
  });

  test('export and import encrypted JSON', async () => {
    const pass = 'StrongPass123!';
    const enc = await db.exportDataEncrypted(pass);
    expect(typeof enc).toBe('string');

    await localforage.clear();
    const ok = await db.importDataEncrypted(enc, pass);
    expect(ok).toBe(true);

    const workers = await db.getWorkers();
    expect(workers.length).toBeGreaterThan(0);
  });
});
