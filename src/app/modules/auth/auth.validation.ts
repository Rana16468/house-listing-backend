import { z } from 'zod';

// Login / Auth Zod Validation Schema
const loginZodSchema = z.object({
  body: z.object({
    email: z
      .string({
        error: 'Email is required',
      })
      .email('Invalid email address'),

    password: z
      .string({
        error: 'Password is required',
      })
      .min(1, 'Password cannot be empty'),

    os: z.string().optional(),
    browser: z.string().optional(),
    device: z.string().optional(),
    ipAddress: z.string().optional(),
  }),
});

// Infer TypeScript Type directly from Zod Schema
export type TAuthInput = z.infer<typeof loginZodSchema>['body'];

 const AuthValidation = {
  loginZodSchema,
};

export default AuthValidation;