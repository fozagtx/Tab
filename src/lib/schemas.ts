import { z } from 'zod'

export const createTabSchema = z.object({
  host_address: z.string().min(20),
  host_device_id: z.string().nullable().optional(),
  currency: z.string().default('USD'),
  total_fiat: z.number().positive(),
  people: z.number().int().min(2).max(12),
  title: z.string().max(80).nullable().optional(),
  /** Optional uneven fiat amounts — length must equal people, sum ≈ total */
  share_fiats: z.array(z.number().nonnegative()).optional(),
})

export const patchShareSchema = z.object({
  host_token: z.string().optional(),
  label: z.string().max(40).nullable().optional(),
  amount_luna: z.number().int().positive().optional(),
})

export const markShareSchema = z.object({
  host_token: z.string().min(8),
})

export const resolveMismatchSchema = z.object({
  host_token: z.string().min(8),
  action: z.enum(['accept', 'reject']),
})

export const claimSchema = z.object({
  share_index: z.number().int().min(1).max(12),
  tx_hash: z.string().min(16),
})

export const receiptSchema = z.object({
  host_token: z.string().min(8),
  canonical: z.string().min(2),
  signer: z.string().min(8),
  public_key: z.string().min(16),
  signature: z.string().min(16),
})
