import { z } from 'zod';

const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'YYYY-MM-DD 형식이어야 합니다.');
const timeSchema = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'HH:MM 형식이어야 합니다.');
const trimmedString = z.string().transform((value) => value.trim());
const optionalTrimmedString = trimmedString.optional().transform((value) => (value ? value : undefined));

const baseVisitorSchema = z.object({
  company: z.string().min(1, '소속을 입력해주세요.').max(100),
  purpose: z.string().min(1, '방문 목적을 입력해주세요.').max(200),
  visitDate: dateSchema,
  responsiblePerson: z.string().min(1, '담당자를 선택해주세요.').max(120),
  notes: z
    .string()
    .max(500, '비고는 500자 이하로 입력해주세요.')
    .optional()
    .transform((value) => value?.trim() || undefined),
});

export const visitorReservationSchema = baseVisitorSchema.extend({
  name: z.string().min(1, '방문자명을 입력해주세요.').max(100).transform((value) => value.trim()),
  phone: z
    .string()
    .min(7, '연락처를 입력해주세요.')
    .max(30, '연락처는 30자 이하로 입력해주세요.')
    .transform((value) => value.trim()),
  visitTime: z.string().optional().transform((value) => (value ? value.trim() : '')),
});

const visitorRegistrationBaseSchema = baseVisitorSchema.extend({
  name: z.string().min(1, '방문자명을 입력해주세요.').max(100).transform((value) => value.trim()),
  phone: z
    .string()
    .min(7, '연락처를 입력해주세요.')
    .max(30, '연락처는 30자 이하로 입력해주세요.')
    .transform((value) => value.trim()),
  visitTime: timeSchema,
  diTrainingNA: z.boolean().default(false),
  diTrainingSignature: z
    .string()
    .optional()
    .transform((value) => value?.trim() || ''),
  diTrainingNAReason: z
    .string()
    .max(200, '사유는 200자 이하로 입력해주세요.')
    .optional()
    .transform((value) => value?.trim() || ''),
});

export const visitorRegistrationSchema = visitorRegistrationBaseSchema.superRefine((data, ctx) => {
  if (data.diTrainingNA) {
    if (!data.diTrainingNAReason) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['diTrainingNAReason'],
        message: 'N/A 선택 시 사유를 입력해주세요.',
      });
    }
  } else if (!data.diTrainingSignature) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['diTrainingSignature'],
      message: 'D.I 준수 교육 서명이 필요합니다.',
    });
  }
});

export const visitorUpdateSchema = z.object({
  name: optionalTrimmedString,
  phone: optionalTrimmedString,
  status: z.enum(['pending', 'reserved']).optional(),
  visitTime: timeSchema.optional(),
  badgeNumber: optionalTrimmedString,
  diTrainingNA: z.boolean().optional(),
  diTrainingSignature: optionalTrimmedString,
  diTrainingNAReason: optionalTrimmedString,
});

export const visitorFullUpdateSchema = visitorRegistrationBaseSchema
  .partial()
  .extend({
    status: z.enum(['pending', 'reserved']).optional(),
  })
  .transform((value) => value);

export const auditTrailEntrySchema = z.object({
  id: z.string(),
  timestamp: z.string(),
  action: z.enum(['create', 'update', 'delete', 'cancel_reservation', 'complete_reservation']),
  actor: z.string(),
  entityType: z.literal('visitor'),
  entityId: z.string(),
  entityInfo: z
    .object({
      name: z.string().optional(),
      visitDate: z.string().optional(),
      company: z.string().optional(),
      status: z.string().optional(),
    })
    .optional(),
  changes: z
    .array(
      z.object({
        field: z.string(),
        oldValue: z.any(),
        newValue: z.any(),
      })
    )
    .optional(),
  result: z.enum(['success', 'failed']),
  errorMessage: z.string().optional(),
  details: z.string().optional(),
  hash: z.string(),
});

export type VisitorReservationInput = z.infer<typeof visitorReservationSchema>;
export type VisitorRegistrationInput = z.infer<typeof visitorRegistrationSchema>;
export type VisitorUpdateInput = z.infer<typeof visitorUpdateSchema>;

