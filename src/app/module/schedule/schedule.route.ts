import { type NextFunction, type Request, type Response, Router } from 'express';
import { auth } from '../../middleware/checkAuth';
import { Role } from '../../../generated/prisma/enums';
import { CreateScheduleZodSchema, UpdateScheduleZodSchema } from './schedule.validation';
import { catchAsync } from '../../utils/catchAsync';
import { ScheduleController } from './schedule.controller';
import type z from 'zod';
import { ValidateRequest } from '../auth/auth.route';

const router = Router();

// export const ValidateRequest = (zodSchema: z.ZodObject) => {
// 	return catchAsync(async (req: Request, res: Response, next: NextFunction) => {
// 		try {
// 			const payload = req.body ?? {};
// 			const result = zodSchema.safeParse(payload);
// 			if (!result.success) {
// 				const errorFormat = result.error.issues
// 					.map((issue) => issue.message)
// 					.join();
// 				throw new Error(errorFormat);
// 			}

// 			req.body = result.data;

// 			next();
// 		} catch (error) {
// 			next(error);
// 		}
// 	});
// };

// done
router.post(
  '/create-schedule',
  auth(Role.DOCTOR),
  ValidateRequest(CreateScheduleZodSchema),
  ScheduleController.createSchedule
);

router.get('/my-schedules', auth(Role.DOCTOR), ScheduleController.getMySchedules);

router.get(
  '/all-schedules',
  auth(Role.ADMIN, Role.SUPER_ADMIN),
  ScheduleController.getAllSchedules
);

router.get('/todays-schedules', auth(Role.PATIENT), ScheduleController.getTodaysSchedules);

router.get('/schedule/:scheduleId', auth(Role.DOCTOR), ScheduleController.getScheduleById);

router.patch(
  '/update-schedule/:scheduleId',
  auth(Role.DOCTOR),
  ValidateRequest(UpdateScheduleZodSchema),
  ScheduleController.updateSchedule
);

router.patch(
  '/publish-schedule/:scheduleId',
  auth(Role.DOCTOR),
  ScheduleController.publishedSchedule
);

router.delete('/delete-schedule/:scheduleId', auth(Role.DOCTOR), ScheduleController.deteleSchedule);

export const ScheduleRoutes = router;
