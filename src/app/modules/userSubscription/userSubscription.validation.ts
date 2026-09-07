import { PaymentStatus } from '@prisma/client';
import { z } from 'zod';

const createUserSubscriptionZodSchema = z.object({
  body: z.object({
    planId: z.string({ error: 'Plan ID is required' }),
    endDate: z.string({ error: 'End date is required' }).datetime(),
    paymentAmount: z.number({ error: 'Payment amount is required' }).nonnegative(),
    trxId: z.string({ error: 'Transaction ID is required' }).min(1).optional(),
    paymentMethod: z.string({ error: 'Payment method is required' }).min(1).optional(),
    invoiceNo: z.string().optional(),
    paymentStatus: z.nativeEnum(PaymentStatus).optional(),
    gatewayRef: z.string().optional(),
    currency: z.string().optional().default('BDT'),
  }),
});

const updateUserSubscriptionZodSchema = z.object({
  body: z.object({
    planId: z.string().uuid().optional(),
    startDate: z.string().datetime().optional(),
    endDate: z.string().datetime().optional(),
    isPaymentVerify: z.boolean().optional(),
    paymentAmount: z.number().nonnegative().optional(),
    paymentMethod: z.string().optional(),
    invoiceNo: z.string().optional(),
    paymentStatus: z.nativeEnum(PaymentStatus).optional(),
    gatewayRef: z.string().optional(),
    currency: z.string().optional(),
    isActive: z.boolean().optional(),
  }),
});

const paymentVarificationSchema=z.object({
  body: z.object({
    requestId:z.string({error:"request Id is required"}).min(10).max(100)
  })
})

 const UserSubscriptionValidation = {
  createUserSubscriptionZodSchema,
  updateUserSubscriptionZodSchema,
  paymentVarificationSchema
};

export default UserSubscriptionValidation