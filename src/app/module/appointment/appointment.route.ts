import { Request, Response, Router } from "express";
import { AppointmentController } from "./appointment.controller";
import { auth } from "../../middleware/checkAuth";
import { Role } from "../../../generated/prisma/enums";
import { ValidateRequest } from "../auth/auth.route";
import {
	bookAppointmentValidationZodSchema,
	cancelAppointmentValidationZodSchema,
	payAppointmentValidationZodSchema,
	UpdateAppointmentStatusValidationZodSchema,
} from "./appointment.validation";

const router = Router();

router.post(
	"/book-appointment",
	auth(Role.PATIENT),
	ValidateRequest(bookAppointmentValidationZodSchema),
	AppointmentController.bookAppointment,
);

router.post(
	"/pay-appointment",
	auth(Role.PATIENT),
	ValidateRequest(payAppointmentValidationZodSchema),
	AppointmentController.payAppointment,
);

router.post(
	"/cancle-appointment",
	auth(Role.PATIENT, Role.ADMIN, Role.SUPER_ADMIN),
	ValidateRequest(cancelAppointmentValidationZodSchema),
	AppointmentController.canceleAppointments,
);

router.get(
	"/book-appointment/payment/callback",
	AppointmentController.bookAppointmentCallback,
);

router.patch(
	"/update-status/:appointmentId",
	auth(Role.DOCTOR),
	ValidateRequest(UpdateAppointmentStatusValidationZodSchema),
	AppointmentController.updateAppointmentStatus,
);
router.get(
	"/my-appointment/",
	auth(Role.PATIENT),
	AppointmentController.getMyAppointments,
);
router.get(
	"/doctor-appointment/",
	auth(Role.DOCTOR),
	AppointmentController.getDoctorAppointments,
);
router.get(
	"/all-appointment/",
	auth(Role.ADMIN, Role.SUPER_ADMIN),
	AppointmentController.getAllAppointments,
);

router.get(
	"/:appointmentId",
	auth(Role.PATIENT, Role.DOCTOR, Role.ADMIN, Role.SUPER_ADMIN),
	AppointmentController.getSingleAppointment,
);

export const AppointmentRoute = router;
