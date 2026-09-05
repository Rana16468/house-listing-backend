import { PaymentStatus } from '@prisma/client';

export interface TUserSubscription {
  id?: string;
  userId: string;
  planId: string;
  endDate: Date;
  isPaymentVerify?: boolean;
  paymentAmount: number;
  trxId: string;
  paymentMethod: string;
  invoiceNo?: string | null;
  paymentStatus?: PaymentStatus;
  currency?: string;
  isActive?: boolean;
  isDeleted?: boolean;
 
}

export type TUpdateUserSubscriptionPayload = Partial<TUserSubscription>;


export interface ServiceResponse {
  status: number;
  message: string;
}