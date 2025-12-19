// Minimal cross-runtime webcrypto helpers for symmetric AES-GCM encryption.
const subtle =
  typeof window !== 'undefined' && window.crypto && window.crypto.subtle
    ? window.crypto.subtle
    : (globalThis.crypto && globalThis.crypto.subtle) || require('crypto').webcrypto.subtle;

function toUint8Array(str) {
  return new TextEncoder().encode(str);
}

function fromUint8Array(bytes) {
  return new TextDecoder().decode(bytes);
}

function base64Encode(bytes) {
  if (typeof Buffer !== 'undefined') return Buffer.from(bytes).toString('base64');
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

function base64Decode(str) {
  if (typeof Buffer !== 'undefined') return new Uint8Array(Buffer.from(str, 'base64'));
  const binary = atob(str);
  const len = binary.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

async function deriveKey(password, salt, iterations = 250000) {
  const pwKey = await subtle.importKey('raw', toUint8Array(password), { name: 'PBKDF2' }, false, [
    'deriveKey',
  ]);
  return subtle.deriveKey(
    { name: 'PBKDF2', salt: salt, iterations, hash: 'SHA-256' },
    pwKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

export async function encryptString(password, plaintext) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(password, salt);
  const cipherBytes = new Uint8Array(
    await subtle.encrypt({ name: 'AES-GCM', iv }, key, toUint8Array(plaintext))
  );
  return JSON.stringify({
    salt: base64Encode(salt),
    iv: base64Encode(iv),
    data: base64Encode(cipherBytes),
  });
}

export async function decryptString(password, payload) {
  const obj = typeof payload === 'string' ? JSON.parse(payload) : payload;
  const salt = base64Decode(obj.salt);
  const iv = base64Decode(obj.iv);
  const data = base64Decode(obj.data);
  const key = await deriveKey(password, salt);
  const plainBytes = new Uint8Array(await subtle.decrypt({ name: 'AES-GCM', iv }, key, data));
  return fromUint8Array(plainBytes);
}
