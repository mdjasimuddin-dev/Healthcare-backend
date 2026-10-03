import { NextFunction, Request, Response, Router } from 'express';
import z from 'zod';
import { Role } from '../../../generated/prisma/enums';
import { auth } from '../../middleware/checkAuth';
import { catchAsync } from '../../utils/catchAsync';
import { AuthController } from './auth.controller';
import { AuthValidation } from './authValidation';

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
  '/register',
  ValidateRequest(AuthValidation.PatientRegistrationZodSchema),
  AuthController.registerPatient
);
router.post('/login', AuthController.loginUser);
router.get(
  '/me',
  auth(Role.ADMIN, Role.DOCTOR, Role.PATIENT, Role.SUPER_ADMIN),
  AuthController.getMe
);
router.post('/refresh-token', AuthController.refreshToken);
router.post('/google', AuthController.googleLogin);
export const AuthRoutes = router;
