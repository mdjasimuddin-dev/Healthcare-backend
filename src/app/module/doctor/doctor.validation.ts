import { z } from 'zod';

export const applyDoctorRegistrationZodSchema = z.object({
  user: z.object({
    name: z.string().min(3, 'Name must be at least 3 characters'),
    email: z.email('Invalid email address'),
  }),

  doctor: z.object({
    address: z.string().min(5, 'Address is required'),
    specialization: z.string().min(2, 'Specialization is required'),
    licenseNumber: z.string().min(5, 'License number is required'),
    qualifications: z.string().min(2, 'Qualifications are required'),

    experienceYears: z
      .number()
      .int('Experience must be an integer')
      .min(0, 'Experience cannot be negative'),

    bio: z.string().min(20, 'Bio must be at least 20 characters'),

    consultationsFee: z.number().positive('Consultation fee must be greater than 0'),

    contactNumber: z.string().regex(/^\+8801[3-9]\d{8}$/, 'Invalid Bangladeshi phone number'),
  }),
});
