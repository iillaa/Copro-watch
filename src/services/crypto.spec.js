import { describe, it, expect } from 'vitest';
import { encryptString, decryptString } from '../crypto';

describe('crypto encrypt/decrypt', () => {
  it('roundtrips a small string', async () => {
    const pw = 'MySecurePassword!';
    const text = JSON.stringify({hello: 'world'});
    const encrypted = await encryptString(pw, text);
    expect(typeof encrypted).toBe('string');
    const decrypted = await decryptString(pw, encrypted);
    expect(decrypted).toBe(text);
  }, 10000);
});
