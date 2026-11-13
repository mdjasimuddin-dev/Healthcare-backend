import { NextFunction, Request, Response, Router } from 'express';

import { DoctorController } from './doctor.controller';
import { upload } from '../../lib/multer';
import { catchAsync } from '../../utils/catchAsync';
import z from 'zod';
import { auth } from '../../middleware/checkAuth';
import { Role } from '../../../generated/prisma/enums';
import { doctorUpdateProfileZodSchema } from './doctor.validation';

const router = Router();

const ValidateRequest = (zodSchema: z.ZodObject) => {
  return catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    try {
      const payload = req.body ?? {};
      const result = zodSchema.safeParse(payload);
      if (!result.success) {
        const errorFormat = result.error.issues.map((issue) => issue.message).join();
        throw new Error(errorFormat);
      }

      req.body = result.data;

      next();
    } catch (error) {
      next(error);
    }
  });
};

router.post(
  '/apply-doctor',
  // ValidateRequest(doctorRegistrationSchema),
  upload.fields([
    {
      name: 'resume',
      maxCount: 1,
    },
    {
      name: 'additionalFiles',
      maxCount: 10,
    },
  ]),
  DoctorController.applyAsDoctor
);

router.post('/verify-doctor-email', DoctorController.verifyDoctorEmail);
router.post('/approve-doctor', auth(Role.ADMIN, Role.SUPER_ADMIN), DoctorController.approveDoctor);
router.get('/all-doctors', auth(Role.ADMIN, Role.SUPER_ADMIN), DoctorController.getAllDoctors);
router.get(
  '/update-my-profile',
  auth(Role.DOCTOR),
  ValidateRequest(doctorUpdateProfileZodSchema),
  DoctorController.updateDoctorProfile
);
router.get('/public/all-doctors', DoctorController.getAllDoctorsListPublic);
router.get('/public/:doctorId', DoctorController.getSingleDoctorProfilePublic);
router.get('/public/today-available-doctor', DoctorController.getAvailableDoctorByTodaySchedule);

export const DoctorRoutes = router;
