import { createHmac, randomUUID, timingSafeEqual } from 'crypto';
import { mkdir, writeFile } from 'fs/promises';
import path from 'path';
import { v2 as cloudinary } from 'cloudinary';
import { config } from './config.js';
import { HttpError } from './middleware.js';

if (config.cloudinary) cloudinary.config({ ...config.cloudinary, secure: true });

// Check real file contents, not just the client-sent mimetype.
function sniff(b: Buffer): 'jpg' | 'png' | 'webp' | null {
  if (b.length > 12 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return 'jpg';
  if (b.length > 12 && b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return 'png';
  if (b.length > 12 && b.subarray(0, 4).toString() === 'RIFF' && b.subarray(8, 12).toString() === 'WEBP') return 'webp';
  return null;
}

// Returns an opaque key stored on the expense: "cld:<public_id>" or "local:<filename>".
export async function saveReceipt(file: Express.Multer.File): Promise<string> {
  const ext = sniff(file.buffer);
  if (!ext) throw new HttpError(400, 'Only JPG, PNG or WEBP images are allowed');
  if (config.cloudinary) {
    const id = await new Promise<string>((resolve, reject) => cloudinary.uploader.upload_stream(
      { folder: 'receipts', type: 'authenticated', resource_type: 'image' }, (e, r) => (e || !r ? reject(e ?? new Error('upload failed')) : resolve(r.public_id))).end(file.buffer));
    return `cld:${id}`;
  }
  await mkdir(config.uploadDir, { recursive: true });
  const name = `${randomUUID()}.${ext}`;
  await writeFile(path.join(config.uploadDir, name), file.buffer);
  return `local:${name}`;
}

const sign = (file: string, exp: number) => createHmac('sha256', config.jwtSecret).update(`${file}.${exp}`).digest('hex');
// Private receipts: Cloudinary "authenticated" delivery, or an expiring HMAC-signed local link.
export function receiptUrl(key?: string | null): string | undefined {
  if (!key) return undefined;
  if (key.startsWith('cld:')) return cloudinary.url(key.slice(4), { type: 'authenticated', sign_url: true, secure: true, resource_type: 'image' });
  const file = key.slice(6), exp = Math.floor(Date.now() / 1000) + 3600;
  return `${config.publicUrl}/api/v1/receipts/${file}?exp=${exp}&sig=${sign(file, exp)}`;
}
export function verifyLocal(file: string, exp: unknown, sig: unknown): string {
  const e = Number(exp);
  if (!/^[\w-]+\.(jpg|png|webp)$/.test(file) || typeof sig !== 'string' || !Number.isFinite(e) || e < Date.now() / 1000) throw new HttpError(403, 'Link expired or invalid');
  const a = Buffer.from(sign(file, e)), b = Buffer.from(sig);
  if (a.length !== b.length || !timingSafeEqual(a, b)) throw new HttpError(403, 'Link expired or invalid');
  return path.resolve(config.uploadDir, file);
}
