import { Request, Response, Router } from 'express';
import { AppointmentController } from './appointment.controller';
import { auth } from '../../middleware/checkAuth';
import { Role } from '../../../generated/prisma/enums';

const router = Router();

router.post('/book-appointment', auth(Role.PATIENT), AppointmentController.bookAppointment);
router.post('/pay-appointment', auth(Role.PATIENT), AppointmentController.payAppointment);
router.post(
  '/cancle-appointment',
  auth(Role.PATIENT, Role.ADMIN, Role.SUPER_ADMIN),
  AppointmentController.cancleAppointment
);

router.get('/book-appointment/payment/callback', AppointmentController.bookAppointmentCallback);

export const AppointmentRoute = router;
