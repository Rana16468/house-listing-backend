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

const changePasswordZodSchema = z.object({
  body: z.object({
    oldPassword: z.string({error: 'Old password is required'}).min(6, 'Old password must be at least 6 characters long'),
    newPassword: z.string({error: 'New password is required'}).min(6, 'New password must be at least 6 characters long'),
  }),
});

const requestTokenValidationSchema = z.object({
  cookies: z.object({
    refreshToken: z.string({ error: "Refresh Token is Required" }),
  }),
});

 const AuthValidation = {
  loginZodSchema,
  changePasswordZodSchema,
  requestTokenValidationSchema
};

export default AuthValidation;