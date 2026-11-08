const { z } = require('zod');

const nullableText = (max) => z.string().trim().max(max).transform((value) => value || null).nullable().optional();
const nullableNumber = (schema) => z.preprocess(
  (value) => value === null ? null : value === '' ? undefined : value,
  schema.nullable().optional()
);

const studentProfileSchema = z.object({
  department: nullableText(100),
  degree: nullableText(100),
  cgpa: nullableNumber(z.coerce.number().min(0).max(10)),
  graduationYear: nullableNumber(z.coerce.number().int().min(2000).max(2100)),
  backlogs: nullableNumber(z.coerce.number().int().min(0)),
}).strict().refine((value) => Object.keys(value).length > 0, {
  message: 'At least one academic field is required',
});

const legacyStudentProfileSchema = z.object({
  name: z.string().trim().min(1).max(255).optional(),
  department: nullableText(100),
  degree: nullableText(100),
  cgpa: nullableNumber(z.coerce.number().min(0).max(10)),
  batchYear: nullableNumber(z.coerce.number().int().min(2000).max(2100)),
  activeBacklogs: nullableNumber(z.coerce.number().int().min(0)),
}).strict().refine((value) => Object.keys(value).length > 0, {
  message: 'At least one academic field is required',
});

const companySchema = z.object({
  name: z.string().trim().min(1).max(255),
  industry: nullableText(100),
  sector: nullableText(100),
  website: z.string().url().refine((value) => /^https?:\/\//i.test(value), {
    message: 'Website must be an HTTP or HTTPS URL',
  }).nullable().optional(),
  contactEmail: z.string().email().nullable().optional(),
  contactName: nullableText(255),
}).strict();

const companyUpdateSchema = companySchema.partial().refine((value) => Object.keys(value).length > 0, {
  message: 'At least one company field is required',
});

const interviewRoundSchema = z.object({
  applicationId: z.string().uuid(),
  roundNumber: z.coerce.number().int().positive(),
  name: z.string().trim().min(1).max(100),
  roundType: z.enum(['online_assessment', 'technical', 'gd', 'hr', 'final']),
  scheduledAt: z.string().datetime().nullable().optional(),
}).strict();

const interviewAttendanceSchema = z.object({
  roundId: z.string().uuid(),
  applicationId: z.string().uuid(),
  attended: z.boolean(),
}).strict();

const interviewResultSchema = z.object({
  roundId: z.string().uuid(),
  applicationId: z.string().uuid(),
  result: z.enum(['passed', 'failed']),
  feedback: nullableText(5000),
}).strict();

const offerSchema = z.object({
  applicationId: z.string().uuid(),
  ctc: z.coerce.number().positive(),
  offerLetterUrl: z.string().url().nullable().optional(),
}).strict();

const applicationOfferSchema = z.object({
  ctc: z.coerce.number().positive(),
  offerLetterUrl: z.string().url().nullable().optional(),
}).strict();

const offerDecisionSchema = z.object({
  decision: z.literal('accept'),
}).strict();

const applicationInterviewRoundSchema = z.object({
  roundNumber: z.coerce.number().int().positive(),
  name: z.string().trim().min(1).max(100),
  roundType: z.enum(['online_assessment', 'technical', 'gd', 'hr', 'final']),
  scheduledAt: z.string().datetime().nullable().optional(),
}).strict();

const interviewRoundUpdateSchema = z.object({
  result: z.enum(['PASSED', 'FAILED', 'PENDING']),
  feedback: nullableText(5000),
  score: nullableNumber(z.coerce.number().min(0).max(100)),
}).strict();

const offerStatusSchema = z.object({
  status: z.enum(['ACCEPTED', 'DECLINED', 'WITHDRAWN']),
}).strict();

const studentFilterCreateSchema = z.object({
  name: z.string().trim().min(1).max(100),
  filter_json: z.record(z.string(), z.unknown()),
}).strict();

const studentFilterUpdateSchema = z.object({
  name: z.string().trim().min(1).max(100).optional(),
  filter_json: z.record(z.string(), z.unknown()).optional(),
}).strict().refine((value) => Object.keys(value).length > 0, {
  message: 'At least one filter field is required',
});

const adminRoleSchema = z.object({
  role: z.enum(['STUDENT', 'OFFICER', 'RECRUITER', 'ADMIN']),
}).strict();

const applicationStatusSchema = z.object({
  status: z.enum([
    'applied', 'shortlisted', 'in_interview', 'selected', 'rejected', 'withdrawn',
    'APPLIED', 'SHORTLISTED', 'IN_INTERVIEW', 'SELECTED', 'REJECTED', 'WITHDRAWN',
  ]).transform((status) => status.toLowerCase()),
}).strict();

module.exports = {
  studentProfileSchema,
  legacyStudentProfileSchema,
  companySchema,
  companyUpdateSchema,
  interviewRoundSchema,
  interviewAttendanceSchema,
  interviewResultSchema,
  offerSchema,
  applicationOfferSchema,
  offerDecisionSchema,
  applicationInterviewRoundSchema,
  interviewRoundUpdateSchema,
  offerStatusSchema,
  studentFilterCreateSchema,
  studentFilterUpdateSchema,
  adminRoleSchema,
  applicationStatusSchema,
};
