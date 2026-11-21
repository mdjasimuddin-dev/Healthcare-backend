import httpStatus, { status } from "http-status";
import {
	AppointmentStatus,
	DoctorVerificationStatus,
	PaymentStatus,
	ScheduleStatus,
} from "../../../generated/prisma/enums";
import { prisma } from "../../lib/prisma";
import type { IRequestUser } from "../../middleware/checkAuth";
import { AppError } from "../../utils/appError";

const getAdminAnalytics = async () => {
	// total doctor

	const totalDoctors = await prisma.doctor.count({
		where: {
			isDeleted: false,
		},
	});

	const totalPendingDoctorApplication = await prisma.doctor.count({
		where: {
			isDeleted: false,
			verificationStatus: DoctorVerificationStatus.PENDING,
		},
	});

	const totalApprovedDoctors = await prisma.doctor.count({
		where: {
			isDeleted: false,
			verificationStatus: DoctorVerificationStatus.APPROVED,
		},
	});

	const totalRejectedDoctors = await prisma.doctor.count({
		where: {
			isDeleted: false,
			verificationStatus: DoctorVerificationStatus.REJECTED,
		},
	});

	// patients

	const totalPatients = await prisma.patient.count({
		where: {
			isDeleted: false,
		},
	});

	// appointment

	const totalAppointments = await prisma.appointment.count();

	const totalCompleteAppointments = await prisma.appointment.count({
		where: {
			status: AppointmentStatus.COMPLETED,
		},
	});

	const totalCancelAppointments = await prisma.appointment.count({
		where: {
			status: AppointmentStatus.CANCELED,
		},
	});

	const totalConfirmedAppointments = await prisma.appointment.count({
		where: {
			status: AppointmentStatus.CONFIRMED,
		},
	});

	const totalOngoingAppointments = await prisma.appointment.count({
		where: {
			status: AppointmentStatus.ONGOING,
		},
	});

	const totalRefundResult = prisma.payment.aggregate({
		where: {
			status: PaymentStatus.REFUNDED,
		},
		_sum: {
			amount: true,
		},
	});

	const totalRefund = (await totalRefundResult)._sum.amount?.toNumber() || 0;

	const totalRevenueResult = await prisma.payment.aggregate({
		where: {
			status: PaymentStatus.PAID,
		},
		_sum: {
			amount: true,
		},
	});

	const totalRevenue =
		(totalRevenueResult._sum.amount?.toNumber() || 0) - totalRefund;

	return {
		totalDoctors,
		totalPendingDoctorApplication,
		totalApprovedDoctors,
		totalRejectedDoctors,
		totalPatients,
		totalAppointments,
		totalCompleteAppointments,
		totalCancelAppointments,
		totalOngoingAppointments,
		totalConfirmedAppointments,
		totalRevenue,
		totalRefund,
	};
};

const getPatientAnalytics = async (user: IRequestUser) => {
	const patient = await prisma.patient.findUnique({
		where: {
			userId: user.userId,
		},
	});

	if (!patient) {
		throw new AppError(httpStatus.NOT_FOUND, "Patient Profiel not found");
	}

	const totalAppointment = await prisma.appointment.count({
		where: {
			patientId: patient.id,
		},
	});

	const upcommingAppointment = await prisma.appointment.count({
		where: {
			patientId: patient.id,
			status: AppointmentStatus.CONFIRMED,
		},
	});

	const completeAppointment = await prisma.appointment.count({
		where: {
			patientId: patient.id,
			status: AppointmentStatus.COMPLETED,
		},
	});

	const cancelAppointment = await prisma.appointment.count({
		where: {
			patientId: patient.id,
			status: AppointmentStatus.CANCELED,
		},
	});

	const totalAmountSpentResult = await prisma.payment.aggregate({
		where: {
			appointment: {
				patientId: patient.id,
			},
			status: PaymentStatus.PAID,
		},
		_sum: {
			amount: true,
		},
	});

	const totalAmountSpent = totalAmountSpentResult._sum.amount?.toNumber() || 0;

	const totalAmountRefundResult = await prisma.payment.aggregate({
		where: {
			appointment: {
				patientId: patient.id,
			},
			status: PaymentStatus.REFUNDED,
		},
		_sum: {
			amount: true,
		},
	});

	const totalAmountRefund =
		totalAmountRefundResult._sum.amount?.toNumber() || 0;

	return {
		totalAppointment,
		upcommingAppointment,
		completeAppointment,
		cancelAppointment,
		totalAmountSpent,
		totalAmountRefund,
	};
};

const getDoctorAnalytics = async (user: IRequestUser) => {
	const doctor = await prisma.doctor.findUnique({
		where: {
			userId: user.userId,
		},
	});

	if (!doctor) {
		throw new AppError(httpStatus.NOT_FOUND, "Doctor Profiel not found");
	}

	const totalSchedules = await prisma.schedule.count({
		where: {
			doctorId: doctor.id,
			isDeleted: false,
		},
	});

	const publishedSchedules = await prisma.schedule.count({
		where: {
			doctorId: doctor.id,
			isDeleted: false,
			status: ScheduleStatus.PUBLISHED,
		},
	});

	const cancelSchedules = await prisma.schedule.count({
		where: {
			doctorId: doctor.id,
			isDeleted: false,
			status: ScheduleStatus.CANCELLED,
		},
	});

	const totalAppointment = await prisma.appointment.count({
		where: {
			doctorId: doctor.id,
		},
	});

	const upcommingAppointment = await prisma.appointment.count({
		where: {
			doctorId: doctor.id,
			status: AppointmentStatus.CONFIRMED,
		},
	});

	const completeAppointment = await prisma.appointment.count({
		where: {
			doctorId: doctor.id,
			status: AppointmentStatus.COMPLETED,
		},
	});

	const cancelAppointment = await prisma.appointment.count({
		where: {
			doctorId: doctor.id,
			status: AppointmentStatus.CANCELED,
		},
	});

	const totalDoctorRefundResult = await prisma.payment.aggregate({
		where: {
			appointment: {
				doctorId: doctor.id,
			},
			status: PaymentStatus.REFUNDED,
		},
		_sum: {
			amount: true,
		},
	});

	const totalDoctorRefund =
		totalDoctorRefundResult._sum.amount?.toNumber() || 0;

	const totalDoctorEarningResult = await prisma.payment.aggregate({
		where: {
			appointment: {
				doctorId: doctor.id,
			},
			status: PaymentStatus.PAID,
		},
		_sum: {
			amount: true,
		},
	});

	const totalDoctorEarnings =
		(totalDoctorEarningResult._sum.amount?.toNumber() || 0) - totalDoctorRefund;

	return {
		totalSchedules,
		publishedSchedules,
		cancelSchedules,
		totalAppointment,
		upcommingAppointment,
		completeAppointment,
		cancelAppointment,
		totalDoctorRefund,
		totalDoctorEarnings,
	};
};

export const AnalyticsServices = {
	getAdminAnalytics,
	getPatientAnalytics,
	getDoctorAnalytics,
};
