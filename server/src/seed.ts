import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import { config } from './config.js';
import { Category, User } from './models.js';

const {
  ADMIN_NAME = 'Owner',
  ADMIN_PHONE,
  ADMIN_PASSWORD,
  ADMIN_EMAIL = '',
} = process.env;

if (
  !ADMIN_PHONE ||
  !/^\d{10}$/.test(ADMIN_PHONE) ||
  !ADMIN_PASSWORD ||
  ADMIN_PASSWORD.length < 8
) {
  throw new Error(
    'Set ADMIN_PHONE (10 digits) and ADMIN_PASSWORD (8+ chars) in .env',
  );
}

await mongoose.connect(config.mongoUri);

try {
  const existing = await User.findOne({ phone: ADMIN_PHONE });

  if (existing) {
    if (existing.role !== 'ADMIN') {
      throw new Error(
        'Configured ADMIN_PHONE belongs to a WORKER. Refusing to promote it automatically.',
      );
    }

    // The configured owner account is the Super Admin.
    existing.isSuperAdmin = true;
    existing.permissions = [];

    if (process.argv.includes('--reset')) {
      existing.passwordHash = await bcrypt.hash(
        ADMIN_PASSWORD,
        10,
      );

      existing.passwordChangedAt = new Date();

      console.log('Super Admin password reset');
    } else {
      console.log('Existing account verified as Super Admin');
    }

    await existing.save();
  } else {
    await User.create({
      name: ADMIN_NAME,
      phone: ADMIN_PHONE,
      email: ADMIN_EMAIL,
      passwordHash: await bcrypt.hash(ADMIN_PASSWORD, 10),
      role: 'ADMIN',
      isSuperAdmin: true,
      permissions: [],
    });

    console.log('Super Admin created');
  }

  for (const name of [
    'Cement',
    'Steel',
    'Labour',
    'Transport',
    'Material',
    'Other',
  ]) {
    await Category.updateOne(
      { name },
      { $setOnInsert: { name } },
      { upsert: true },
    );
  }

  console.log('Seed completed successfully');
} finally {
  await mongoose.disconnect();
}