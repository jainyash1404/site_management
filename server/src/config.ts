const need = (k: string): string => { const v = process.env[k]; if (!v) throw new Error(`Missing required env var ${k}`); return v; };
const port = Number(process.env.PORT ?? 5000);
const jwtSecret = need('JWT_SECRET');
if (jwtSecret.length < 32) throw new Error('JWT_SECRET must be at least 32 characters');
const { CLOUDINARY_CLOUD_NAME: cn, CLOUDINARY_API_KEY: ck, CLOUDINARY_API_SECRET: cs } = process.env;

export const config = {
  port, jwtSecret,
  mongoUri: need('MONGODB_URI'),
  jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? '12h',
  corsOrigins: (process.env.CORS_ORIGINS ?? 'http://localhost:5173').split(',').map(s => s.trim()).filter(Boolean),
  publicUrl: (process.env.PUBLIC_URL ?? `http://localhost:${port}`).replace(/\/$/, ''),
  uploadDir: process.env.UPLOAD_DIR ?? 'uploads',
  appUrl: (process.env.APP_URL ?? 'http://localhost:5173').replace(/\/$/, ''),
  isProd: process.env.NODE_ENV === 'production',
  mailFrom: process.env.MAIL_FROM ?? 'Construction Manager <no-reply@example.com>',
  smtp: process.env.SMTP_HOST ? { host: process.env.SMTP_HOST, port: Number(process.env.SMTP_PORT ?? 587), secure: process.env.SMTP_SECURE === 'true', user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : null,
  cloudinary: cn && ck && cs ? { cloud_name: cn, api_key: ck, api_secret: cs } : null,
};
