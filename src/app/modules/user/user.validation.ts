import { Role, Status } from '@prisma/client';
import { z } from 'zod';

const createUserZodSchema = z.object({
  body: z.object({
    name: z
      .string({
        error: 'Name is required',
      })
      .min(1, 'Name cannot be empty'),

    phone: z
      .string({
        error: 'Phone number is required',
      })
      .min(10, 'Phone number must be at least 10 digits'),

    password: z
      .string()
      .min(6, 'Password must be at least 6 characters')
      .optional(),

    email: z
      .string()
      .email('Invalid email address')
      .optional()
      .or(z.literal('')),

    status: z.nativeEnum(Status).default(Status.ACTIVE),
    role: z.nativeEnum(Role).default(Role.LANDLORD),

    os: z.string().optional(),
    browser: z.string().optional(),
    device: z.string().optional(),
    ipAddress: z.string().optional(),

    isOnline: z.boolean().default(true),
    isVerify: z.boolean().default(false),
    photo: z.string().optional(),
    isDeleted: z.boolean().default(false),
  }),
});

const createAdminAccountZodSchema = z.object({
  body: z.object({
    name: z
      .string({
        error: 'Name is required',
      })
      .min(1, 'Name cannot be empty'),

    phone: z
      .string({
        error: 'Phone number is required',
      })
      .min(10, 'Phone number must be at least 10 digits'),

    password: z
      .string({error:"Password is required"})
      .min(6, 'Password must be at least 6 characters'),
      

    email: z
      .string({error:"Email is required"})
      .email('Invalid email address')
      .or(z.literal('')),

    status: z.nativeEnum(Status).default(Status.ACTIVE),
    role: z.nativeEnum(Role).default(Role.ADMIN),

    os: z.string().optional(),
    browser: z.string().optional(),
    device: z.string().optional(),
    ipAddress: z.string().optional(),

    isOnline: z.boolean().default(true),
    isVerify: z.boolean().default(true),
    photo: z.string().optional(),
    isDeleted: z.boolean().default(false),
  }),
});

// Update User Validation Schema
const updateUserZodSchema = z.object({
  body: z.object({
    name: z.string().min(1).optional(),
    phone: z.string().min(10).optional(),
    os: z.string().optional(),
    browser: z.string().optional(),
    device: z.string().optional(),
    
    photo: z.string().optional(),
    
  }),
});

export const UserValidation = {
  createUserZodSchema,
  updateUserZodSchema,
  createAdminAccountZodSchema
};

export default UserValidation;