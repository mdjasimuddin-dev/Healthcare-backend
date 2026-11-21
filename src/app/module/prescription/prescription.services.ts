import PDFDocument from "pdfkit";
import httpStatus from "http-status";
import { prisma } from "../../lib/prisma";
import type { IRequestUser } from "../auth/auth.interface";
import type { ICreatePrescriptionPayload } from "./prescription.interface";
import { AppError } from "../../utils/appError";
import { AppointmentStatus, Role } from "../../../generated/prisma/enums";
import type { UploadApiResponse } from "cloudinary";
import { cloudinary } from "../../lib/cloudinary";
import { transporter } from "../../lib/nodemailer";
import config from "../../config";

const createPrescription = async (
	payload: ICreatePrescriptionPayload,
	user: IRequestUser,
) => {
	const doctor = await prisma.doctor.findUnique({
		where: {
			userId: user.userId,
		},
		include: {
			appointments: true,
		},
	});

	if (!doctor) {
		throw new AppError(httpStatus.NOT_FOUND, "Doctor profile not found");
	}

	const appointment = await prisma.appointment.findUnique({
		where: {
			id: payload.appointmentId,
			doctorId: doctor.id,
		},
		include: {
			patient: {
				select: {
					id: true,
					name: true,
					email: true,
				},
			},
		},
	});

	if (!appointment) {
		throw new AppError(httpStatus.NOT_FOUND, "Doctor appointment not found");
	}

	if (appointment.status !== AppointmentStatus.COMPLETED) {
		throw new AppError(
			httpStatus.FORBIDDEN,
			"Prescription can only be written for a completed appointment",
		);
	}

	if (appointment.prescriptionUrl) {
		throw new AppError(
			httpStatus.CONFLICT,
			"A prescription already exits for this appointment",
		);
	}

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
	pdfDocument.fontSize(14).text("Prescription", { align: "center" });
	pdfDocument.moveDown(2);

	pdfDocument.fontSize(12).text(`Patient Name : ${appointment.patient?.name}`);
	pdfDocument.text(`Patient Email : ${appointment.patient?.email}`);
	pdfDocument.moveDown(2);

	pdfDocument.text(`Doctor Name : ${doctor.name}`);
	pdfDocument.text(`Doctor specialization : ${doctor?.specialization}`);
	pdfDocument.text(`Date : ${new Date().toDateString()}`);
	pdfDocument.moveDown(2);

	pdfDocument.fontSize(14).text(`Findings `);
	pdfDocument.fontSize(12).text(payload.findings);
	pdfDocument.moveDown(2);

	pdfDocument.fontSize(14).text(`Medicines `);
	pdfDocument.moveDown(0.5);

	for (let i = 0; i < payload.medicines.length; i++) {
		const medicine = payload.medicines[i];

		pdfDocument.fontSize(12).text(`${i + 1}. ${medicine.name}`);
		pdfDocument.text(`Dosage : ${medicine.dosage}`);
		pdfDocument.text(`Duration : ${medicine.duration}`);

		if (medicine.instructions) {
			pdfDocument.text(`Instructions : ${medicine.instructions}`);
		}

		pdfDocument.moveDown(0.5);
	}

	pdfDocument.end();

	const pdfBuffer = await pdfReadyPromise;

	const cloudPrescriptionUploadResult = await new Promise<UploadApiResponse>(
		(resolve, reject) => {
			cloudinary.uploader
				.upload_stream(
					{ resource_type: "raw", format: "pdf" },
					(error, result) => {
						if (error) {
							return reject(error);
						}

						if (!result) {
							throw new AppError(
								httpStatus.INTERNAL_SERVER_ERROR,
								"No result returned from cloudinary",
							);
						}

						resolve(result);
					},
				)
				.end(pdfBuffer);
		},
	);

	const updateAppointment = await prisma.appointment.update({
		where: {
			id: appointment.id,
		},
		data: {
			prescriptionUrl: cloudPrescriptionUploadResult.secure_url,
			prescriptionPublicId: cloudPrescriptionUploadResult.public_id,
		},
	});

	await transporter.sendMail({
		from: config.email_sender,
		to: appointment.patient.email,
		subject: "Your Prescription - Smart Healthcare Limited",
		text: "Please find your prescripiton attached",
		attachments: [{ filename: "prescription.pdf", content: pdfBuffer }],
	});

	return updateAppointment;
};

const getSinglePrescription = async (
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
					id: true,
					name: true,
					email: true,
					userId: true,
				},
			},
		},
	});

	if (!appointment) {
		throw new AppError(httpStatus.NOT_FOUND, "Doctor appointment not found");
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

	if (!appointment.prescriptionUrl) {
		throw new AppError(
			httpStatus.FORBIDDEN,
			"No prescription has been written yet",
		);
	}

	return {
		appointment,
		prescription: appointment.prescriptionUrl,
	};
};

export const PrescriptionServices = {
	createPrescription,
	getSinglePrescription,
};
