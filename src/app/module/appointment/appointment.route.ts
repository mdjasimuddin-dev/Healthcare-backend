import { Request, Response, Router } from 'express';
import { AppointmentController } from './appointment.controller';

const router = Router();

router.post('/book-appointment', AppointmentController.bookAppointment);

router.get('/book-appointment/payment/callback', AppointmentController.paymentCreateSucessfully);

export const AppointmentRoute = router;
