import { Router } from 'express';
import { auth } from '../../middleware/checkAuth';
import { Role } from '../../../generated/prisma/enums';
import { AnalyticsController } from './analytics.controller';

// import { ValidateRequest } from '../auth/auth.route';

const router = Router();

router.get(
  '/patient-analytics',
  auth(Role.PATIENT),
  // ValidateRequest(CreatePrescriptionZodSchema),
  AnalyticsController.getPatientAnalytics
);

router.get(
  '/doctor-analytics',
  auth(Role.DOCTOR),
  // ValidateRequest(CreatePrescriptionZodSchema),
  AnalyticsController.getDoctorAnalytics
);

router.get(
  '/admin-analytics',
  auth(Role.ADMIN, Role.SUPER_ADMIN),
  // ValidateRequest(CreatePrescriptionZodSchema),
  AnalyticsController.getDoctorAnalytics
);

export const AnalyticsRoutes = router;
