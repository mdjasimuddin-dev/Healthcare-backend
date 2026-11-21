import httpStatus from "http-status";
import bcrypt from "bcryptjs";
import config from "../config";
import { prisma } from "../lib/prisma";
import { DoctorVerificationStatus, Role } from "./../../generated/prisma/enums";
import { AppError } from "./appError";

// super admin

export const SeedSuperAdmin = async () => {
	try {
		const isSuperAdminExit = await prisma.user.findFirst({
			where: {
				role: Role.SUPER_ADMIN,
			},
		});

		if (isSuperAdminExit) {
			console.log("Super admin already exits.");
			return;
		}

		const name = config.super_admin_name;
		const email = config.super_admin_email;
		const password = config.super_admin_password;

		if (!name || !email || !password) {
			throw new AppError(
				httpStatus.INTERNAL_SERVER_ERROR,
				"Super Admin name, email, password missing in env file.",
			);
		}

		const hashPassword = await bcrypt.hash(
			password,
			Number(config.bcrypt_salt_rounds),
		);

		const superAdmin = await prisma.user.create({
			data: {
				name,
				email,
				password: hashPassword,
				role: Role.SUPER_ADMIN,
				needPasswordChange: false,
				emailVerified: true,
			},
		});

		console.log("Super admin create successfully.", superAdmin);
	} catch (error) {
		console.log("Super admin created failed", error);

		prisma.user.delete({
			where: {
				email: config.super_admin_email,
			},
		});
	}
};

// create tester admin

export const seedTesterAdmin = async () => {
	try {
		const isTestAdminExist = await prisma.user.findUnique({
			where: {
				email: config.tester_admin_email,
			},
		});

		if (isTestAdminExist) {
			console.log("Tester admin already exits.");
			return;
		}

		const name = config.tester_admin_name;
		const email = config.tester_admin_email;
		const password = config.tester_admin_password;

		if (!name || !email || !password) {
			throw new AppError(
				httpStatus.INTERNAL_SERVER_ERROR,
				"Tester admin name, email, password is missing in env file.",
			);
		}

		const hashPassword = await bcrypt.hash(
			password,
			Number(config.bcrypt_salt_rounds),
		);

		const testerAdmin = await prisma.user.create({
			data: {
				name,
				email,
				password: hashPassword,
				role: Role.ADMIN,
				needPasswordChange: false,
				emailVerified: true,
			},
		});

		console.log("Super admin create successfully.", testerAdmin);
	} catch (error) {
		console.log("Super admin created failed", error);

		prisma.user.delete({
			where: {
				email: config.tester_admin_email,
			},
		});
	}
};

// tester doctor

export const seedTesterDoctor = async () => {
	try {
		const isTesterDoctorExits = await prisma.user.findUnique({
			where: {
				email: config.tester_doctor_email,
			},
		});

		if (isTesterDoctorExits) {
			console.log("Tester Doctor already exits.");
			return;
		}

		const name = config.tester_doctor_name;
		const email = config.tester_doctor_email;
		const password = config.tester_doctor_password;

		if (!name || !email || !password) {
			throw new AppError(
				httpStatus.INTERNAL_SERVER_ERROR,
				"Tester doctor name, email, password is missing in env file.",
			);
		}

		const hashPassword = await bcrypt.hash(
			password,
			Number(config.bcrypt_salt_rounds),
		);

		const testerDoctor = await prisma.user.create({
			data: {
				name,
				email,
				password: hashPassword,
				role: Role.DOCTOR,
				needPasswordChange: false,
				emailVerified: true,
				doctor: {
					create: {
						email,
						name,
						experienceYears: 5,
						licenseNumber: "BMDC-0001",
						qualifications: "MMBS",
						specialization: "Neurology",
						verificationStatus: DoctorVerificationStatus.APPROVED,
					},
				},
			},
		});

		console.log("Tester doctor create successfully.", testerDoctor);
	} catch (error) {
		console.log("Tester doctor created failed", error);

		prisma.user.delete({
			where: {
				email: config.tester_doctor_email,
			},
		});
	}
};
