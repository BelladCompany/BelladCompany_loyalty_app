const { z } = require('zod');

// Phone regex allowing optional '+' prefix followed by 10 to 15 digits
const phoneRegex = /^\+?[0-9]{10,15}$/;

const phoneSchema = z
  .string({ required_error: 'Phone number is required' })
  .trim()
  .regex(phoneRegex, 'Invalid phone number format. Must contain 10-15 numeric digits (optional leading +).');

const nonNegativeInteger = z
  .number({ required_error: 'Amount is required' })
  .int('Amount must be an integer (no decimals)')
  .min(0, 'Amount cannot be negative');

const positiveInteger = z
  .number({ required_error: 'Amount is required' })
  .int('Amount must be an integer (no decimals)')
  .positive('Amount must be greater than zero');

// Auth Validators
const loginSchema = z.object({
  username: z.string({ required_error: 'Username is required' }).min(1, 'Username cannot be empty'),
  password: z.string({ required_error: 'Password is required' }).min(1, 'Password cannot be empty'),
});

const registerSchema = z.object({
  username: z.string({ required_error: 'Username is required' }).min(3, 'Username must be at least 3 characters'),
  password: z.string({ required_error: 'Password is required' }).min(6, 'Password must be at least 6 characters'),
  role: z.enum(['cashier', 'admin'], {
    required_error: 'Role is required',
    invalid_type_error: "Role must be either 'cashier' or 'admin'",
  }),
  branch_id: z.number().int().positive().optional().nullable(),
});

// Customer Validators
const createCustomerSchema = z.object({
  name: z.string({ required_error: 'Customer name is required' }).trim().min(1, 'Customer name cannot be empty'),
  email: z.string().email('Invalid email address').optional().nullable(),
  phone_numbers: z
    .array(phoneSchema, { required_error: 'At least one phone number is required' })
    .min(1, 'At least one phone number is required'),
  // Optional vehicle to register alongside the new customer
  vehicle: z.object({
    registration_number: z.string().trim().optional().nullable(),
    vin: z.string().trim().optional().nullable(),
    chassis_no: z.string().trim().optional().nullable(),
    model: z.string().trim().optional().nullable(),
    variant: z.string().trim().optional().nullable(),
    brand_name: z.string().trim().optional().nullable(),
    branch_name: z.string().trim().optional().nullable(),
    fuel_type: z.string().trim().optional().nullable(),
    brand_id: z.number().int().positive().optional().nullable(),
    purchase_date: z.string().optional().nullable(),           // ISO date string e.g. "2026-09-01"
    ex_showroom_price: z.number().nonnegative().optional().nullable(), // In rupees; stored as paise
    vehicle_city: z.string().trim().optional().nullable(),
    firm_name: z.string().trim().optional().nullable(),
  }).optional().nullable(),
  // Optional opening points (admin-only meaningful; cashier always gets 0 enforced server-side)
  opening_points: z.coerce.number().int().min(0, 'Opening points cannot be negative').default(0).optional(),
  // Mandatory Aadhaar & GST Number
  aadhaar_number: z
    .string({ required_error: 'Aadhaar number is required' })
    .trim()
    .regex(/^\d{12}$/, 'Aadhaar number must be exactly 12 numeric digits.'),
  gst_number: z
    .string({ required_error: 'GST number is required' })
    .trim()
    .min(1, 'GST number is required'),
  age: z.coerce.number().int().positive().optional().nullable(),
  firm_name: z.string().trim().optional().nullable(),
  address: z.string().trim().optional().nullable(),
  visit_type: z.string().trim().optional().nullable(),
  is_first_time_visitor: z.boolean().optional().nullable(),
  otp: z.string().trim().optional().nullable(),
  otp_verified: z.boolean().optional().nullable(),

  // Tally / ERP Party & Ledger fields
  ledger_name: z.string().trim().optional().nullable(),
  ledger_code: z.string().trim().optional().nullable(),
  ledger_group: z.string().trim().optional().nullable(),
  party_type: z.string().trim().optional().nullable(),
  customer_type: z.string().trim().optional().nullable(),
  gst_registration_type: z.string().trim().optional().nullable(),
  state: z.string().trim().optional().nullable(),
  city: z.string().trim().optional().nullable(),
  pincode: z.string().trim().optional().nullable(),
  vat_no: z.string().trim().optional().nullable(),
  pan_no: z.string().trim().optional().nullable(),
  service_tax_no: z.string().trim().optional().nullable(),
  ecc_no: z.string().trim().optional().nullable(),
});

const updateCustomerSchema = z.object({
  name: z.string().trim().min(1, 'Customer name cannot be empty').optional(),
  email: z.string().email('Invalid email address').optional().nullable(),
});

const addPhoneSchema = z.object({
  phone_number: phoneSchema,
  is_primary: z.boolean().optional(),
});

// Vehicle Validators
// DB NOTE: the live `vehicles` table only has a single identifier column (chassis_no) - there
// is no registration_number column. We still accept registration_number/vin/chassis_no on the
// API (any one of them) and store whichever is provided into chassis_no.
const createVehicleSchema = z
  .object({
    customer_id: z.string({ required_error: 'Customer ID is required' }).min(1),
    brand_id: z.number().int().positive().optional().nullable(),
    registration_number: z.string().trim().min(1).optional().nullable(),
    vin: z.string().trim().optional().nullable(),
    chassis_no: z.string().trim().optional().nullable(),
    model: z.string().trim().optional().nullable(),
  })
  .refine((data) => data.registration_number || data.vin || data.chassis_no, {
    message: 'A vehicle identifier is required (registration_number, vin, or chassis_no).',
    path: ['registration_number'],
  });

const updateVehicleSchema = z.object({
  brand_id: z.number().int().positive().optional().nullable(),
  registration_number: z.string().trim().min(1).optional().nullable(),
  vin: z.string().trim().optional().nullable(),
  chassis_no: z.string().trim().optional().nullable(),
  model: z.string().trim().optional().nullable(),
});

// Branch Validators
// DB NOTE: branches.code no longer exists as a column. Still accepted here (and simply
// ignored by the controller) so any existing frontend form that sends it keeps working.
const createBranchSchema = z.object({
  name: z.string({ required_error: 'Branch name is required' }).trim().min(1),
  code: z.string().trim().min(1).optional().nullable(),
  address: z.string().trim().optional().nullable(),
});

const updateBranchSchema = z.object({
  name: z.string().trim().min(1).optional(),
  code: z.string().trim().min(1).optional().nullable(),
  address: z.string().trim().optional().nullable(),
});

// Brand Validators
// DB NOTE: brands.code no longer exists as a column; same treatment as branches.code above.
const createBrandSchema = z.object({
  name: z.string({ required_error: 'Brand name is required' }).trim().min(1),
  code: z.string().trim().min(1).optional().nullable(),
});

const updateBrandSchema = z.object({
  name: z.string().trim().min(1).optional(),
  code: z.string().trim().min(1).optional().nullable(),
});

// Search Validators
const searchSchema = z.object({
  q: z.string().trim().optional(),
  phone: z.string().trim().optional(),
  name: z.string().trim().optional(),
  vehicle: z.string().trim().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
}).refine((data) => data.q || data.phone || data.name || data.vehicle, {
  message: 'Must provide either "q", "phone", "name", or "vehicle" parameter for search',
});

// Points Earning Validator
const earnPointsSchema = z.object({
  customer_id: z.string({ required_error: 'Customer ID is required' }).min(1, 'Customer ID cannot be empty'),
  vehicle_id: z.number().int().positive().optional().nullable(),
  branch_id: z.number({ required_error: 'Branch ID is required' }).int().positive('Branch ID must be a positive integer'),
  amount: positiveInteger,
  type: z.enum(['sale', 'service'], {
    required_error: "Transaction type is required ('sale' or 'service')",
    invalid_type_error: "Type must be either 'sale' or 'service'",
  }),
  reference_id: z.string().trim().optional().nullable(),
  description: z.string().trim().optional().nullable(),
});

// Ledger Query Validator
const ledgerQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});

// Referral Validators
const registerReferralSchema = z.object({
  referrer_customer_id: z.string({ required_error: 'Referrer Customer ID is required' }).min(1),
  referred_customer_id: z.string({ required_error: 'Referred Customer ID is required' }).min(1),
}).refine((data) => data.referrer_customer_id !== data.referred_customer_id, {
  message: 'Self-referral is not allowed. Referrer and Referred customer IDs must be different.',
  path: ['referred_customer_id'],
});

const approveReferralSchema = z.object({
  points: positiveInteger,
  reason: z.string({ required_error: 'Mandatory reason is required for referral points approval' })
    .trim()
    .min(3, 'Reason must be at least 3 characters long'),
  approver_id: z.number().int().positive().optional().nullable(),
});

const createApproverSchema = z.object({
  user_id: z.number({ required_error: 'User ID is required' }).int().positive(),
  name: z.string({ required_error: 'Approver name is required' }).trim().min(1),
});

// Redemption Validators
const requestOtpSchema = z.object({
  phone: phoneSchema.optional(),
  customer_id: z.string().trim().optional(),
}).refine((data) => data.phone || data.customer_id, {
  message: 'Must provide either "phone" or "customer_id" to request an OTP',
});

const redeemPointsSchema = z.object({
  phone: phoneSchema.optional(),
  customer_id: z.string().trim().optional(),
  otp: z.string({ required_error: 'OTP is required' }).trim().regex(/^\d{6}$/, 'OTP must be a 6-digit numeric code'),
  bill_amount: z.coerce.number().positive('Bill amount must be a positive number').optional(),
  points: z.coerce.number().int().min(0).optional(),
  category: z.string().optional().default('service'),
  receipt_no: z.string().optional().nullable(),
  account_ledger_no: z.string().optional().nullable(),
  branch_id: z.coerce.number().int().optional().nullable(),
  vehicle_id: z.coerce.number().int().optional().nullable(),
});

// Notification (Manual WhatsApp Send) Validators
const sendPointsEarnedNowSchema = z.object({
  customer_id: z.string({ required_error: 'Customer ID is required' }).min(1, 'Customer ID cannot be empty'),
  points: z.coerce.number().int('Points must be an integer').min(1, 'Points must be a positive number'),
  transaction_type: z.string().trim().optional().nullable(),
});

const sendRedemptionNowSchema = z.object({
  customer_id: z.string({ required_error: 'Customer ID is required' }).min(1, 'Customer ID cannot be empty'),
  phone: phoneSchema.optional(),
  pointsRedeemed: z.coerce.number().int('Points must be an integer').min(1, 'Points redeemed must be a positive number'),
  discountRupees: z.coerce.number().int().min(0).default(0),
  remainingBalance: z.coerce.number().int().min(0).default(0),
});

// Merge Validator
const mergeCustomersSchema = z.object({
  surviving_customer_id: z.string({ required_error: 'Surviving Customer ID is required' }).min(1),
  merged_customer_id: z.string({ required_error: 'Merged Customer ID is required' }).min(1),
  reason: z.string({ required_error: 'Mandatory merge reason is required' })
    .trim()
    .min(5, 'Merge reason must be at least 5 characters long'),
}).refine((data) => data.surviving_customer_id !== data.merged_customer_id, {
  message: 'Surviving and merged customer IDs must be different.',
  path: ['merged_customer_id'],
});

module.exports = {
  phoneSchema,
  nonNegativeInteger,
  positiveInteger,
  loginSchema,
  registerSchema,
  createCustomerSchema,
  updateCustomerSchema,
  addPhoneSchema,
  createVehicleSchema,
  updateVehicleSchema,
  createBranchSchema,
  updateBranchSchema,
  createBrandSchema,
  updateBrandSchema,
  searchSchema,
  earnPointsSchema,
  ledgerQuerySchema,
  registerReferralSchema,
  approveReferralSchema,
  createApproverSchema,
  requestOtpSchema,
  redeemPointsSchema,
  sendPointsEarnedNowSchema,
  sendRedemptionNowSchema,
  mergeCustomersSchema,
};
