// Client-side encryption utilities using Web Crypto API
// All encryption/decryption happens on the client - server never sees plaintext

export async function deriveKeyFromPin(pin: string, salt: string): Promise<CryptoKey> {
  const encoder = new TextEncoder()
  const pinData = encoder.encode(pin)
  const saltData = encoder.encode(salt)

  const keyMaterial = await crypto.subtle.importKey("raw", pinData, "PBKDF2", false, ["deriveBits", "deriveKey"])

  return crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: saltData,
      iterations: 100000,
      hash: "SHA-256",
    },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  )
}

export async function encryptContent(content: string, key: CryptoKey): Promise<{ encrypted: string; iv: string }> {
  const encoder = new TextEncoder()
  const data = encoder.encode(content)
  const iv = crypto.getRandomValues(new Uint8Array(12))

  const encrypted = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, data)

  return {
    encrypted: bufferToBase64(new Uint8Array(encrypted)),
    iv: bufferToBase64(iv),
  }
}

export async function decryptContent(encrypted: string, iv: string, key: CryptoKey): Promise<string> {
  const decoder = new TextDecoder()
  const encryptedData = base64ToBuffer(encrypted)
  const ivData = base64ToBuffer(iv)

  const decrypted = await crypto.subtle.decrypt(
    // @ts-expect-error - Uint8Array type compatibility issue with newer TypeScript
    { name: "AES-GCM", iv: ivData },
    key,
    encryptedData
  )

  return decoder.decode(decrypted)
}

export async function hashPin(pin: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(pin)
  const hash = await crypto.subtle.digest("SHA-256", data)
  return bufferToBase64(new Uint8Array(hash))
}

function bufferToBase64(buffer: Uint8Array): string {
  return btoa(String.fromCharCode(...buffer))
}

function base64ToBuffer(base64: string): Uint8Array {
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }
  return bytes
}
