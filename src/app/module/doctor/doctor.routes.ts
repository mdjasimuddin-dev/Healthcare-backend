import { NextFunction, Request, Response, Router } from 'express';

import { DoctorController } from './doctor.controller';
import { upload } from '../../lib/multer';
import { catchAsync } from '../../utils/catchAsync';
import z from 'zod';

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

export const DoctorRoutes = router;
