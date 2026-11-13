import { z } from 'zod';

export const bookAppointmentValidationZodSchema = z.object({
  scheduleId: z.string().min(1, 'Schedule Id is required'),
});

export const payAppointmentValidationZodSchema = z.object({
  appointmentId: z.string().min(1, 'Appointment Id is required'),
});

export const cancelAppointmentValidationZodSchema = z.object({
  appointmentId: z.string().min(1, 'Appointment Id is required'),
});

export const UpdateAppointmentStatusValidationZodSchema = z.object({
  status: z.enum(['ONGOING', 'COMPLETED'], 'Status must be either ongoing or completed'),
});
