import z from 'zod';

const PatientRegistrationZodSchema = z.object({
  name: z.string().min(3, 'Name must atleast 3 characters.'),
  email: z.email('Not an email!!'),
  password: z
    .string()
    .min(6)
    .max(15)
    .regex(/[A-Z]/, 'Password must contain at least 1 uppercase letter!')
    .regex(/[a-z]/, 'Password must contain at least 1 lowercase letter! ')
    .regex(/[0-9]/, 'Password must contain at least 1 number! ')
    .regex(/[^A-Za-z0-9]/, 'Password must contain at least 1 special character! '),
  patient: z
    .object({
      contactNumber: z.string().optional(),
    })
    .optional(),
});

export const AuthValidation = { PatientRegistrationZodSchema };
