import httpStatus from "http-status";
import {
	AppointmentStatus,
	PaymentStatus,
	Role,
	ScheduleStatus,
} from "../../../generated/prisma/enums";
import config from "../../config";
import { getBkashIdToken } from "../../lib/bkash";
import { prisma } from "../../lib/prisma";
import type { IRequestUser } from "../../middleware/checkAuth";
import { formatBkashDate } from "../../utils/formatBkashDate ";
import { AppError } from "../../utils/appError";
import type {
	IBookAppointmentPayload,
	ICancleAppointmentPayload,
	IPayAppointmentPayload,
	IUpdateAppointmentStatusPayload,
} from "./appointment.interface";
import { addMinutes, isAfter, isBefore, isSameDay, subHours } from "date-fns";
import { transporter } from "../../lib/nodemailer";

import PDFDocument from "pdfkit";
import type { IQuery } from "../../interfaces";
import type { AppointmentWhereInput } from "../../../generated/prisma/models";

const bookAppointment = async (
	payload: IBookAppointmentPayload,
	user: IRequestUser,
) => {
	const transactionResult = await prisma.$transaction(async (tx) => {
		// Business Login
		const patient = await prisma.patient.findUnique({
			where: {
				userId: user.userId,
			},
		});

		if (!patient) {
			throw new AppError(httpStatus.NOT_FOUND, "Patient Profile not found");
		}

		const schedule = await prisma.schedule.findUnique({
			where: {
				id: payload.scheduleId,
			},
			include: {
				doctor: true,
			},
		});

		if (!schedule || schedule.isDeleted) {
			throw new AppError(httpStatus.NOT_FOUND, "Schedule not found");
		}

		if (schedule.status !== ScheduleStatus.PUBLISHED) {
			throw new AppError(
				httpStatus.BAD_REQUEST,
				"This schedule is not published yet",
			);
		}

		const now = new Date();
		if (!isSameDay(now, schedule.startDateTime)) {
			throw new AppError(
				httpStatus.BAD_REQUEST,
				"This schedule is not avilable today",
			);
		}

		// if (isBefore(now, schedule.startDateTime)) {
		//   throw new AppError(httpStatus.BAD_REQUEST, 'This schedule is already started');
		// }
		if (isAfter(now, schedule.startDateTime)) {
			throw new AppError(
				httpStatus.BAD_REQUEST,
				"This schedule is already started",
			);
		}

		const existingAppointment = await prisma.appointment.findFirst({
			where: {
				patientId: patient.id,
				scheduleId: schedule.id,
				// status: {
				//   not: AppointmentStatus.CANCELED,
				// },
			},
		});

		if (existingAppointment?.status === AppointmentStatus.PENDING) {
			throw new AppError(
				httpStatus.BAD_REQUEST,
				"You already have a pending appointment. Please pay for that",
			);
		}
		if (existingAppointment?.status === AppointmentStatus.CONFIRMED) {
			throw new AppError(
				httpStatus.BAD_REQUEST,
				"You already confirm appointment. Please try again another day",
			);
		}

		if (existingAppointment?.status === AppointmentStatus.ONGOING) {
			throw new AppError(
				httpStatus.BAD_REQUEST,
				"You already have a ongoing appointment.",
			);
		}

		if (existingAppointment?.status === AppointmentStatus.COMPLETED) {
			throw new AppError(
				httpStatus.BAD_REQUEST,
				"You already have a completed appointment on this schedule. Please try again another day.",
			);
		}

		if (schedule.availableSlots === 0) {
			throw new AppError(
				httpStatus.BAD_REQUEST,
				"This schedule is fully booked",
			);
		}

		if (!schedule.doctor.consultationsFee) {
			throw new AppError(
				httpStatus.BAD_REQUEST,
				"Doctor has not set a consultation fee yet",
			);
		}

		const amount = schedule.doctor.consultationsFee.toString();

		const appointment = await tx.appointment.create({
			data: {
				status: AppointmentStatus.PENDING,
				patientId: patient.id,
				doctorId: schedule.doctor.id,
				scheduleId: schedule.id,
			},
		});

		const bkashIdToken = await getBkashIdToken();

		if (!bkashIdToken) {
			throw new AppError(
				httpStatus.BAD_GATEWAY,
				"No Bkash Access Token Found!",
			);
		}

		const bkashCreatePaymentResponse = await fetch(
			`${config.bkash_base_url}/tokenized-checkout/payment/create`,
			{
				method: "POST",
				headers: {
					"X-App-Key": config.bkash_app_key!,
					Authorization: bkashIdToken,
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					payerReference: user.email,
					// agreementId: 'TestnewAdmin4GCYE4Q1789633823180',
					callbackURL: `${config.bkash_base_callback_url}/appointment/book-appointment/payment/callback`,
					amount: amount,
					currency: "BDT",
					intent: "sale",
					merchantInvoiceNumber: appointment.id,
				}),
			},
		);

		const bkashCreatePaymentResult = await bkashCreatePaymentResponse.json();

		await tx.payment.create({
			data: {
				marchantInvoiceNumber: bkashCreatePaymentResult.merchantInvoiceNumber,
				appointmentId: appointment.id,
				amount: amount,
				gatewayResponse: bkashCreatePaymentResult,
				bkashPaymentId: bkashCreatePaymentResult.paymentId,
				payerReferences: user.email,
			},
		});

		return {
			paymentUrl: bkashCreatePaymentResult.bkashURL,
		};
	});

	return transactionResult;
};

const payAppointment = async (
	payload: IPayAppointmentPayload,
	user: IRequestUser,
) => {
	const appointmentId = payload.appointmentId;

	const existingAppointment = await prisma.appointment.findUnique({
		where: {
			id: appointmentId,
		},
		include: {
			schedule: {
				include: {
					doctor: true,
				},
			},
		},
	});

	if (!existingAppointment) {
		throw new Error("Appointment Does Not Exists");
	}

	if (existingAppointment.status !== "PENDING") {
		throw new Error("Appointment is not pending");
	}

	if (!existingAppointment.schedule.doctor.consultationsFee) {
		throw new AppError(
			httpStatus.BAD_REQUEST,
			"Doctor has not set a consultation fee.",
		);
	}

	const amount = existingAppointment.schedule.doctor.consultationsFee;
	const bkashIdToken = await getBkashIdToken();

	if (!bkashIdToken) {
		throw new Error("Bkash ID token invalid");
	}

	const bkashCreatePaymentResponse = await fetch(
		`${config.bkash_base_url}/tokenized-checkout/payment/create`,
		{
			method: "POST",
			headers: {
				Authorization: bkashIdToken,
				"X-App-Key": config.bkash_app_key!,
				"Content-Type": "application/json",
			},
			body: JSON.stringify({
				payerReference: user.email,
				agreementId: "TestnewAdmin4GCYE4Q1789633823180",
				callbackURL: `${config.bkash_base_callback_url}/appointment/book-appointment/payment/callback`,
				amount: amount,
				currency: "BDT",
				intent: "sale",
				merchantInvoiceNumber: existingAppointment.id,
			}),
		},
	);

	const bkashCreatePaymentResult = await bkashCreatePaymentResponse.json();

	await prisma.payment.update({
		where: {
			// bkashPaymentId: bkashCreatePaymentResult.paymentId,
			appointmentId: existingAppointment.id,
		},
		data: {
			marchantInvoiceNumber: bkashCreatePaymentResult.merchantInvoiceNumber,
			gatewayResponse: bkashCreatePaymentResult,
			bkashPaymentId: bkashCreatePaymentResult.paymentId,
		},
	});

	return {
		bkashCreatePaymentResult,
	};
};

const bookAppointmentCallback = async (query: Record<string, any>) => {
	const transactionResult = await prisma.$transaction(
		async (tx) => {
			const paymentId = query.paymentID;

			if (!paymentId) {
				throw new AppError(httpStatus.BAD_REQUEST, "Payment Id Missing");
			}

			const status = query.status;

			if (!status) {
				throw new Error("Payment status is Missing");
			}

			const bkashIdToken = await getBkashIdToken();

			if (!bkashIdToken) {
				throw new Error("bkash Id token missing");
			}

			const executePaymentResponse = await fetch(
				`${config.bkash_base_url}/tokenized-checkout/payment/execute`,
				{
					method: "POST",
					headers: {
						"X-App-Key": config.bkash_app_key!,
						Authorization: bkashIdToken,
						"Content-Type": "application/json",
						Accept: "application/json",
					},
					body: JSON.stringify({
						paymentId: paymentId,
					}),
				},
			);

			const executeBkashPaymentResult = await executePaymentResponse.json();

			if (status === "success") {
				const appointment = await prisma.appointment.findUnique({
					where: {
						id: executeBkashPaymentResult.merchantInvoiceNumber,
					},
					include: {
						schedule: true,
						patient: true,
						doctor: true,
					},
				});

				if (!appointment) {
					throw new AppError(httpStatus.NOT_FOUND, "Appointment not found");
				}

				const newAvailableSlots = appointment.schedule.availableSlots - 1;
				const alreadyBookedSlots =
					appointment.schedule.totalSlots - appointment.schedule.availableSlots;

				const serialNumber = alreadyBookedSlots + 1;

				const joiningTime = addMinutes(
					appointment.schedule.startDateTime,
					(serialNumber - 1) * 20,
				);

				await tx.appointment.update({
					where: {
						id: executeBkashPaymentResult.merchantInvoiceNumber,
						// bkashPaymentId: paymentId,
					},
					data: {
						status: AppointmentStatus.CONFIRMED,
						joiningTime,
						serialNumber,
					},
				});

				await prisma.schedule.update({
					where: {
						id: appointment.schedule.id,
					},
					data: {
						availableSlots: newAvailableSlots,
					},
				});

				await tx.payment.update({
					where: {
						// appointmentId: executeBkashPaymentResult.merchantInvoiceNumber,
						bkashPaymentId: paymentId,
					},
					data: {
						status: PaymentStatus.PAID,
						bkashTrxId: executeBkashPaymentResult.trxId,
						paidAt: executeBkashPaymentResult.paymentExecuteTime,
						gatewayResponse: executeBkashPaymentResult,
					},
				});

				const pdfDocument = new PDFDocument({ margin: 50 });

				const pdfChunks: Buffer[] = [];

				pdfDocument.on("data", (chunk: Buffer) => {
					pdfChunks.push(chunk);
				});

				const pdfReadyPromise = new Promise<Buffer>((resolve) => {
					pdfDocument.on("end", () => {
						resolve(Buffer.concat(pdfChunks));
					});
				});

				pdfDocument
					.fontSize(20)
					.text("Smart Healthcare Limited", { align: "center" });
				pdfDocument
					.fontSize(14)
					.text("Appointment Invoice", { align: "center" });
				pdfDocument.moveDown(2);

				pdfDocument
					.fontSize(12)
					.text(`Patient Name : ${appointment.patient?.name}`);
				pdfDocument.text(`Patient Email : ${appointment.patient?.email}`);
				pdfDocument.moveDown(2);

				pdfDocument.text(`Doctor Name : ${appointment.doctor.name}`);
				pdfDocument.text(
					`Doctor specialization : ${appointment.doctor?.specialization}`,
				);
				pdfDocument.moveDown(2);

				pdfDocument.text(
					`Appointment Date : ${appointment.schedule.startDateTime.toDateString()}`,
				);
				pdfDocument.text(`Your Joining Time : ${joiningTime}`);
				pdfDocument.text(`Your serial number : ${serialNumber}`);
				pdfDocument.text(`Meeting Link : ${appointment.schedule.meetingLink}`);
				pdfDocument.moveDown(2);

				pdfDocument.text(
					`Paid amount : ${executeBkashPaymentResult.amount} BDT `,
				);
				pdfDocument.text(`Payment method : Bkash`);
				pdfDocument.text(`Transaction Id : ${executeBkashPaymentResult.trxId}`);
				pdfDocument.text(
					`Paid At : ${executeBkashPaymentResult.paymentExecuteTime}`,
				);
				pdfDocument.moveDown(2);

				pdfDocument.end();

				const pdfBuffer = await pdfReadyPromise;

				// ================ ai generated code ========================

				// ===============================================================

				await transporter.sendMail({
					from: config.email_sender,
					to: appointment.patient.email,
					subject: "Your appointment Invoice - Smart Healthcare Limited",
					text: "Thank you for booking an appointment. Please find your invoice attached",
					attachments: [{ filename: "Invoice.pdf", content: pdfBuffer }],
				});

				return {
					redirectUrl: `${config.frontend_url}/dashboard/my-applications?status=success`,
				};
			} else if (status === "failure") {
				await tx.payment.update({
					where: {
						bkashPaymentId: paymentId,
					},
					data: {
						status: PaymentStatus.FAILED,
						gatewayResponse: executeBkashPaymentResult,
					},
				});
				return {
					redirectUrl: `${config.frontend_url}/dashboard/my-applications?status=failure`,
				};
			} else if (status === "cancel") {
				await tx.payment.update({
					where: {
						bkashPaymentId: paymentId,
					},
					data: {
						status: PaymentStatus.CANCELED,
						gatewayResponse: executeBkashPaymentResult,
					},
				});
			} else {
				return {
					redirectUrl: `${config.frontend_url}/dashboard/my-applications?error=payment-failed`,
				};
			}

			return executeBkashPaymentResult;
		},
		{ maxWait: 10000, timeout: 30000 },
	);

	return transactionResult;
};

const cancleAppointment = async (
	payload: ICancleAppointmentPayload,
	user: IRequestUser,
) => {
	const transactionResult = await prisma.$transaction(async (tx) => {
		const appointmentId = payload.appointmentId;

		// 1. Appointment ID validation
		if (!appointmentId) {
			throw new Error("Appointment ID is required");
		}

		// 2. Find appointment and payment
		const existingAppointment = await prisma.appointment.findUnique({
			where: {
				id: appointmentId,
				patient: {
					email: user.email,
				},
			},
			include: {
				payment: true,
				schedule: true,
			},
		});

		if (!existingAppointment) {
			throw new AppError(httpStatus.NOT_FOUND, "Appointment does not exist");
		}

		// 3. Appointment status validation
		if (
			existingAppointment.status === "COMPLETED" ||
			existingAppointment.status === "ONGOING"
		) {
			throw new AppError(
				httpStatus.BAD_REQUEST,
				`Appointment is ${existingAppointment.status.toLowerCase()}`,
			);
		}

		if (existingAppointment.status === "CANCELED") {
			throw new Error("Appointment is already cancelled");
		}

		const updatedAppointment = await tx.appointment.update({
			where: {
				id: existingAppointment.id,
			},
			data: {
				status: AppointmentStatus.CANCELED,
			},
		});

		// 04. Available Slote +1
		await prisma.schedule.update({
			where: {
				id: existingAppointment.schedule.id,
			},
			data: {
				availableSlots: { increment: 1 },
			},
		});

		// 05. refund process

		const now = new Date();
		const startDateTime = existingAppointment.schedule.startDateTime;
		const refundCutOffTime = subHours(startDateTime, 1);
		const isEligibleForRefund = isBefore(now, refundCutOffTime);

		if (isEligibleForRefund) {
			// 4. Payment validation
			const payment = existingAppointment.payment;

			if (!payment) {
				throw new Error("Payment information not found");
			}

			if (!payment.bkashPaymentId) {
				throw new Error("bKash Payment ID not found");
			}

			if (!payment.bkashTrxId) {
				throw new Error("bKash Transaction ID not found");
			}

			if (payment.status === PaymentStatus.REFUNDED) {
				throw new Error("Payment has already been refunded");
			}

			// 5. Get bKash token
			const bkashIdToken = await getBkashIdToken();

			if (!bkashIdToken) {
				throw new Error("bKash ID token invalid");
			}

			const bkashRefundPaymentResponse = await fetch(
				`${config.bkash_base_url}/tokenized-checkout/refund/payment/transaction`,
				{
					method: "POST",
					headers: {
						Authorization: bkashIdToken,
						"X-App-Key": config.bkash_app_key,
						"Content-Type": "application/json",
					},
					body: JSON.stringify({
						paymentId: existingAppointment.payment?.bkashPaymentId,
						refundAmount: existingAppointment.payment?.amount.toString(),
						trxId: existingAppointment.payment?.bkashTrxId,
						reason: "patient canceled the appointment",
						sku: "test",
					}),
				},
			);

			const bkashRefundPaymentResult = await bkashRefundPaymentResponse.json();

			await tx.payment.update({
				where: {
					appointmentId: existingAppointment.id,
				},
				data: {
					refundTrxId: bkashRefundPaymentResult.refundTrxId,
					refundedAt: formatBkashDate(bkashRefundPaymentResult.completedTime),
					refundAmount: bkashRefundPaymentResult.refundAmount,
					refundReason: bkashRefundPaymentResult.reason,
					status: PaymentStatus.REFUNDED,
					gatewayResponse: bkashRefundPaymentResult,
				},
			});
		}

		const newPaymentInfo = await prisma.payment.findUnique({
			where: {
				appointmentId: existingAppointment.id,
			},
		});

		return {
			appointment: updatedAppointment,
			payment: newPaymentInfo,
		};
	});

	return transactionResult;
};

// Doctor only
const updateAppointmentStatus = async (
	appointmentId: string,
	payload: IUpdateAppointmentStatusPayload,
	user: IRequestUser,
) => {
	const doctor = await prisma.doctor.findUnique({
		where: {
			userId: user.userId,
		},
	});

	if (!doctor) {
		throw new AppError(httpStatus.NOT_FOUND, "Doctor profile not found");
	}

	const appointment = await prisma.appointment.findUnique({
		where: {
			id: appointmentId,
			doctorId: doctor.id,
		},
	});

	if (!appointment) {
		throw new AppError(httpStatus.NOT_FOUND, "Doctor appointment not found");
	}

	if (appointment.status === AppointmentStatus.COMPLETED) {
		throw new AppError(
			httpStatus.FORBIDDEN,
			"Doctor appointment is already completed",
		);
	}

	if (appointment.status === AppointmentStatus.CANCELED) {
		throw new AppError(
			httpStatus.FORBIDDEN,
			"Doctor appointment is already cancelled",
		);
	}

	if (appointment.status === AppointmentStatus.PENDING) {
		throw new AppError(
			httpStatus.FORBIDDEN,
			"Doctor appointment is pending. you can change the status after appointment is confirm",
		);
	}

	if (appointment.status === AppointmentStatus.CONFIRMED) {
		if (payload.status !== "ONGOING") {
			throw new AppError(
				httpStatus.BAD_REQUEST,
				"Confirmed appointment must be ongoing at first",
			);
		}

		await prisma.appointment.update({
			where: {
				id: appointment.id,
			},
			data: {
				status: AppointmentStatus.ONGOING,
			},
		});
	}

	if (appointment.status === AppointmentStatus.ONGOING) {
		if (payload.status !== "COMPLETED") {
			throw new AppError(
				httpStatus.BAD_REQUEST,
				"Ongoing appointment must be completed at first",
			);
		}

		await prisma.appointment.update({
			where: {
				id: appointment.id,
			},
			data: {
				status: AppointmentStatus.COMPLETED,
			},
		});
	}

	const updateAppointment = await prisma.appointment.findUnique({
		where: {
			id: appointment.id,
		},
	});

	return updateAppointment;
};

// patient
const getMyAppointments = async (query: IQuery, user: IRequestUser) => {
	const limit = query.limit ? Number(query.limit) : 10;
	const page = query.page ? Number(query.page) : 1;
	const skip = (page - 1) * limit;
	const sortBy = query.sortBy ? query.sortBy : "createdAt";
	const sortOrder = query.sortOrder ? query.sortOrder : "desc";

	const patient = await prisma.patient.findUnique({
		where: {
			userId: user.userId,
		},
	});

	if (!patient) {
		throw new AppError(httpStatus.NOT_FOUND, "Patient profile not found");
	}

	const andConditions: AppointmentWhereInput[] = [
		{
			patientId: patient.id,
		},
	];

	if (query.status) {
		andConditions.push({ status: query.status });
	}

	const appointments = await prisma.appointment.findMany({
		where: {
			AND: andConditions,
		},

		take: limit,
		skip,
		orderBy: {
			[sortBy]: sortOrder,
		},
		include: {
			schedule: true,
			doctor: true,
			payment: true,
		},
	});

	const total = await prisma.appointment.count({
		where: { AND: andConditions },
	});

	return {
		data: appointments,
		meta: {
			page,
			limit,
			total,
			totalPages: Math.ceil(total / limit),
		},
	};
};

// Doctor Appointment
const getDoctorAppointments = async (query: IQuery, user: IRequestUser) => {
	const limit = query.limit ? Number(query.limit) : 10;
	const page = query.page ? Number(query.page) : 1;
	const skip = (page - 1) * limit;
	const sortBy = query.sortBy ? query.sortBy : "createdAt";
	const sortOrder = query.sortOrder ? query.sortOrder : "desc";

	const doctor = await prisma.doctor.findUnique({
		where: {
			userId: user.userId,
		},
	});

	if (!doctor) {
		throw new AppError(httpStatus.NOT_FOUND, "Doctor profile not found");
	}

	const andConditions: AppointmentWhereInput[] = [
		{
			doctorId: doctor.id,
		},
	];

	if (query.status) {
		andConditions.push({ status: query.status });
	}

	const appointments = await prisma.appointment.findMany({
		where: {
			AND: andConditions,
		},

		take: limit,
		skip,
		orderBy: {
			[sortBy]: sortOrder,
		},
		include: {
			patient: {
				select: {
					id: true,
					name: true,
					email: true,
					contactNumber: true,
				},
			},
			schedule: true,
			payment: true,
		},
	});

	const total = await prisma.appointment.count({
		where: { AND: andConditions },
	});

	return {
		data: appointments,
		meta: {
			page,
			limit,
			total,
			totalPages: Math.ceil(total / limit),
		},
	};
};

// Get All Appointment
const getAllAppointments = async (query: IQuery, user: IRequestUser) => {
	const limit = query.limit ? Number(query.limit) : 10;
	const page = query.page ? Number(query.page) : 1;
	const skip = (page - 1) * limit;
	const sortBy = query.sortBy ? query.sortBy : "createdAt";
	const sortOrder = query.sortOrder ? query.sortOrder : "desc";

	// const doctor = await prisma.doctor.findUnique({
	//   where: {
	//     userId: user.userId,
	//   },
	// });

	// if (!doctor) {
	//   throw new AppError(httpStatus.NOT_FOUND, 'Doctor profile not found');
	// }

	const andConditions: AppointmentWhereInput[] = [];

	if (query.status) {
		andConditions.push({ status: query.status });
	}
	if (query.doctorId) {
		andConditions.push({ doctorId: query.doctorId });
	}
	if (query.patientId) {
		andConditions.push({ patientId: query.patientId });
	}
	if (query.doctorEmail) {
		andConditions.push({
			doctor: {
				email: query.doctorEmail,
			},
		});
	}

	const appointments = await prisma.appointment.findMany({
		where: {
			AND: andConditions,
		},

		take: limit,
		skip,
		orderBy: {
			[sortBy]: sortOrder,
		},
		include: {
			patient: {
				select: {
					id: true,
					name: true,
					email: true,
					contactNumber: true,
				},
			},
			doctor: {
				select: {
					id: true,
					name: true,
					specialization: true,
				},
			},
			schedule: true,
			payment: true,
		},
	});

	const total = await prisma.appointment.count({
		where: { AND: andConditions },
	});

	return {
		data: appointments,
		meta: {
			page,
			limit,
			total,
			totalPages: Math.ceil(total / limit),
		},
	};
};

// Single Appointment
const getSingleAppointment = async (
	appointmentId: string,
	user: IRequestUser,
) => {
	const appointment = await prisma.appointment.findUnique({
		where: {
			id: appointmentId,
		},
		include: {
			patient: {
				select: {
					id: true,
					name: true,
					email: true,
					userId: true,
				},
			},
			doctor: {
				select: {
					name: true,
					email: true,
					specialization: true,
					userId: true,
				},
			},
			schedule: true,
			payment: true,
		},
	});

	if (!appointment) {
		throw new AppError(httpStatus.NOT_FOUND, "Appointment not found");
	}

	if (user.role === Role.PATIENT) {
		if (appointment.patient.userId !== user.userId) {
			throw new AppError(
				httpStatus.FORBIDDEN,
				"You are not allowed to view this appointment",
			);
		}
	}

	if (user.role === Role.DOCTOR) {
		if (appointment.doctor.userId !== user.userId) {
			throw new AppError(
				httpStatus.FORBIDDEN,
				"You are not allowed to view this appointment",
			);
		}
	}

	return appointment;
};

//

export const AppointmentService = {
	bookAppointment,
	payAppointment,
	bookAppointmentCallback,
	cancleAppointment,
	updateAppointmentStatus,
	getMyAppointments,
	getDoctorAppointments,
	getAllAppointments,
	getSingleAppointment,
};
