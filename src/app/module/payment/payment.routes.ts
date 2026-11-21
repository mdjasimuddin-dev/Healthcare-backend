import { Router } from "express";
import { auth } from "../../middleware/checkAuth";
import { Role } from "../../../generated/prisma/enums";

import { PaymentController } from "./payment.controller";

const router = Router();

router.get(
	"/my-payments",
	auth(Role.PATIENT),
	// ValidateRequest(bookAppointmentValidationZodSchema),
	PaymentController.getMyPayment,
);

router.get(
	"/all-payments",
	auth(Role.ADMIN, Role.SUPER_ADMIN),
	// ValidateRequest(payAppointmentValidationZodSchema),
	PaymentController.getAllPayments,
);

router.get(
	"/:paymentId",
	auth(Role.PATIENT, Role.DOCTOR, Role.ADMIN, Role.SUPER_ADMIN),
	// ValidateRequest(cancelAppointmentValidationZodSchema),
	PaymentController.getSinglePayments,
);

export const PaymentRoutes = router;
