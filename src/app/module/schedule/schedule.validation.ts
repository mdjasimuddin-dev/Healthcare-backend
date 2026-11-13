import { z } from 'zod';

export const CreateScheduleZodSchema = z.object({
  startDateTime: z.coerce.date('Invalid Start Date time').optional(),
  endDateTime: z.coerce.date('Invalid End Date time').optional(),
  meetingLink: z.url('Invalid meeting link').optional(),
});

export const UpdateScheduleZodSchema = z.object({
  startDateTime: z.coerce.date('Invalid Start Date time').optional(),
  endDateTime: z.coerce.date('Invalid End Date time').optional(),
  meetingLink: z.url('Invalid meeting link').optional(),
});
