import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12; // Standard 96-bit IV for GCM
const AUTH_TAG_LENGTH = 16;

export class CredentialsEncryptor {
  private key: Buffer;

  constructor() {
    const rawKey = process.env.ENCRYPTION_KEY || 'default_secret_encryption_key_32chars!';
    // Derive a fixed 32-byte key using SHA-256
    this.key = crypto.createHash('sha256').update(rawKey).digest();
  }

  /**
   * Encrypts plaintext string or JSON object using AES-256-GCM
   */
  encrypt(data: string | Record<string, any>): string {
    const plaintext = typeof data === 'string' ? data : JSON.stringify(data);
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, this.key, iv, { authTagLength: AUTH_TAG_LENGTH });

    let encrypted = cipher.update(plaintext, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    const authTag = cipher.getAuthTag();

    // Format: iv:authTag:ciphertext
    return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
  }

  /**
   * Decrypts AES-256-GCM encrypted string back to plaintext or parsed JSON
   */
  decrypt<T = any>(encryptedString: string, parseJson = false): T {
    const parts = encryptedString.split(':');
    if (parts.length !== 3) {
      throw new Error('Invalid encrypted credentials format. Expected iv:authTag:ciphertext');
    }

    const [ivHex, authTagHex, ciphertextHex] = parts;
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');

    const decipher = crypto.createDecipheriv(ALGORITHM, this.key, iv, { authTagLength: AUTH_TAG_LENGTH });
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(ciphertextHex, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    if (parseJson) {
      try {
        return JSON.parse(decrypted) as T;
      } catch {
        return decrypted as any;
      }
    }

    return decrypted as any;
  }
}

export const credentialsEncryptor = new CredentialsEncryptor();
