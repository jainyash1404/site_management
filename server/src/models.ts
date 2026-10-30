import { Schema, model, Types } from 'mongoose';

// Money is stored as integer paise (₹1 = 100 paise) and converted to rupees only in API responses.
const paise = { type: Number, required: true, validate: { validator: Number.isInteger, message: 'amount must be integer paise' } };
const ref = (to: string, required = true) => ({ type: Schema.Types.ObjectId, ref: to, required });

export const User = model('User', new Schema({
  name: { type: String, required: true, trim: true },
  phone: { type: String, required: true, unique: true },
  email: { type: String, trim: true, default: '' },
  passwordHash: { type: String, required: true },
  role: { type: String, enum: ['ADMIN', 'WORKER'], required: true },
  isActive: { type: Boolean, default: true },
  pendingApproval: { type: Boolean, default: false }, // self-signup waiting for the owner
  passwordChangedAt: Date, resetTokenHash: String, resetExpires: Date, resetRequestedAt: Date,
}, { timestamps: true }));

export const Site = model('Site', new Schema({
  name: { type: String, required: true, trim: true },
  address: { type: String, default: '' },
  description: { type: String, default: '' },
  isActive: { type: Boolean, default: true },
  isCompleted: { type: Boolean, default: false },
}, { timestamps: true }));

export const Category = model('Category', new Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    unique: true,
  },

  isActive: {
    type: Boolean,
    default: true,
  },

  subcategories: [
    {
      name: {
        type: String,
        required: true,
        trim: true,
      },

      isActive: {
        type: Boolean,
        default: true,
      },
    },
  ],

}, {
  timestamps: true,
  collation: {
    locale: 'en',
    strength: 2,
  },
}));

// Append-only ledger of money given to workers. There are no update/delete routes.
export const Fund = model('Fund', new Schema({
  workerId: { ...ref('User'), index: true }, siteId: ref('Site', false),
  amountPaise: paise, type: { type: String, enum: ['INITIAL', 'ADDITIONAL'], required: true },
  notes: { type: String, default: '' }, createdBy: ref('User'),
}, { timestamps: { createdAt: true, updatedAt: false } }));

export const Expense = model('Expense', new Schema({
  workerId: { ...ref('User'), index: true }, siteId: { ...ref('Site'), index: true },
  category: { type: String, required: true }, amountPaise: { ...paise, min: 1 },
  description: { type: String, default: '' },
  status: { type: String, enum: ['PENDING', 'APPROVED', 'REJECTED'], default: 'PENDING', index: true },
  reviewNote: { type: String, default: '' }, reviewedBy: ref('User', false), reviewedAt: Date,
  receiptKey: String,
  history: [{ _id: false, status: String, by: { type: Schema.Types.ObjectId, ref: 'User' }, at: Date, note: String }],
}, { timestamps: true }));

export const AuditLog = model('AuditLog', new Schema({
  actorId: ref('User'), action: { type: String, required: true }, entity: String, entityId: String, meta: Schema.Types.Mixed,
}, { timestamps: { createdAt: true, updatedAt: false } }));

export const audit = (actorId: string, action: string, entity: string, entityId: string, meta?: object) =>
  AuditLog.create({ actorId, action, entity, entityId, meta }).catch(e => console.error('audit failed', e));
export const oid = (s: string) => new Types.ObjectId(s);
