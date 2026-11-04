import { Schema, model, Types } from 'mongoose';

// Money is stored as integer paise
const paise = {
  type: Number,
  required: true,
  validate: {
    validator: Number.isInteger,
    message: 'amount must be integer paise',
  },
};

const ref = (to: string, required = true) => ({
  type: Schema.Types.ObjectId,
  ref: to,
  required,
});

// Admin permission definitions
export const ADMIN_PERMISSIONS = [
  'dashboard.view',

  'workers.view',
  'workers.create',
  'workers.update',
  'workers.deactivate',

  'sites.view',
  'sites.create',
  'sites.update',
  'sites.deactivate',
  'sites.complete',
  'sites.delete',

  'funds.view',
  'funds.allocate',

  'expenses.view',
  'expenses.approve',
  'expenses.reject',
  'expenses.create.own',
  'expenses.create.forWorker',

  'categories.view',
  'categories.create',
  'categories.update',
  'categories.deactivate',
  'categories.delete',
  'categories.subcategories',
] as const;

export type AdminPermission = typeof ADMIN_PERMISSIONS[number];

// User Model
export const User = model('User', new Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },

  phone: {
    type: String,
    required: true,
    unique: true,
  },

  email: {
    type: String,
    trim: true,
    default: '',
  },

  passwordHash: {
    type: String,
    required: true,
  },

  role: {
    type: String,
    enum: ['ADMIN', 'WORKER'],
    required: true,
  },

  isSuperAdmin: {
    type: Boolean,
    default: false,
  },

  permissions: {
    type: [String],
    enum: [...ADMIN_PERMISSIONS],
    default: [],
  },

  isActive: {
    type: Boolean,
    default: true,
  },

  assignedSites: {
    type: [{
      type: Schema.Types.ObjectId,
      ref: 'Site',
    }],
    default: [],
  },

  pendingApproval: {
    type: Boolean,
    default: false,
  },

  passwordChangedAt: Date,
  resetTokenHash: String,
  resetExpires: Date,
  resetRequestedAt: Date,

}, { timestamps: true }));

// Site Model
export const Site = model('Site', new Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },

  address: {
    type: String,
    default: '',
  },

  description: {
    type: String,
    default: '',
  },

  isActive: {
    type: Boolean,
    default: true,
  },

  isCompleted: {
    type: Boolean,
    default: false,
  },

}, { timestamps: true }));


// Category Model - Unlimited Hierarchical Categories
export const Category = model('Category', new Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },

  parentId: {
    type: Schema.Types.ObjectId,
    ref: 'Category',
    default: null,
    index: true,
  },

  isActive: {
    type: Boolean,
    default: true,
  },

}, {
  timestamps: true,
  collation: {
    locale: 'en',
    strength: 2,
  },
}));

Category.schema.index({ parentId: 1, name: 1 }, { unique: true });

// Fund Model
export const Fund = model('Fund', new Schema({
  workerId: {
    ...ref('User'),
    index: true,
  },

  siteId: ref('Site', false),

  amountPaise: paise,

  type: {
    type: String,
    enum: ['INITIAL', 'ADDITIONAL'],
    required: true,
  },

  notes: {
    type: String,
    default: '',
  },

  createdBy: ref('User'),

}, {
  timestamps: {
    createdAt: true,
    updatedAt: false,
  },
}));

// Expense Model
export const Expense = model('Expense', new Schema({

  // Person whose account receives the expense
  // Worker expense = worker ID
  // Admin personal expense = admin ID
  workerId: {
    ...ref('User'),
    index: true,
  },

  // Actual person who entered the expense
  // For admin-added worker expense, this is the admin
  // For worker self-submission, this is the worker
  addedBy: {
    ...ref('User'),
    index: true,
  },

  addedByRole: {
    type: String,
    enum: ['ADMIN', 'WORKER'],
  },

  siteId: {
    ...ref('Site'),
    index: true,
  },

  // Actual date on which the expense happened
    expenseDate: {
      type: Date,
      required: true,
      index: true,
    },

  category: {
    type: String,
    required: true,
    trim: true,
  },

  subcategory: {
    type: String,
    default: '',
    trim: true,
  },

  amountPaise: {
    ...paise,
    min: 1,
  },

  description: {
    type: String,
    default: '',
  },

  status: {
    type: String,
    enum: [
      'PENDING',
      'APPROVED',
      'REJECTED',
      'RECORDED',
    ],
    default: 'PENDING',
    index: true,
  },

  reviewNote: {
    type: String,
    default: '',
  },

  reviewedBy: ref('User', false),
  reviewedAt: Date,

  receiptKey: String,

  receiptKeys: {
    type: [String],
    default: [],
    validate: {
      validator: (v: string[]) => v.length <= 5,
      message: 'Maximum 5 receipt images are allowed',
    },
  },

  history: [{
    _id: false,
    status: String,
    by: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    at: Date,
    note: String,
  }],

}, { timestamps: true }));

// Audit Log Model
export const AuditLog = model('AuditLog', new Schema({
  actorId: ref('User'),

  action: {
    type: String,
    required: true,
  },

  entity: String,
  entityId: String,
  meta: Schema.Types.Mixed,

}, {
  timestamps: {
    createdAt: true,
    updatedAt: false,
  },
}));

// Audit helper
export const audit = (
  actorId: string,
  action: string,
  entity: string,
  entityId: string,
  meta?: object,
) =>
  AuditLog.create({
    actorId,
    action,
    entity,
    entityId,
    meta,
  }).catch(e => console.error('audit failed', e));

// ObjectId helper
export const oid = (s: string) => new Types.ObjectId(s);