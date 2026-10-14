import bcrypt from 'bcryptjs';
import config from '../config';
import { prisma } from '../lib/prisma';
import { Role } from './../../generated/prisma/enums';

// super admin

export const SeedSuperAdmin = async () => {
  try {
    const isExitsSuperAdmin = await prisma.user.findFirst({
      where: {
        role: Role.SUPER_ADMIN,
      },
    });

    if (isExitsSuperAdmin) {
      console.log('Super admin already exits.');
      return;
    }

    const name = config.super_admin_name;
    const email = config.super_admin_email;
    const password = config.super_admin_password;

    if (!name || !email || !password) {
      console.log('Super Admin name, email, password missing in env file.');
    }

    const hashPassword = await bcrypt.hash(password, Number(config.bcrypt_salt_rounds));

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

    console.log('Super admin create successfully.', superAdmin);
  } catch (error) {
    console.log('Super admin created failed', error);

    prisma.user.delete({
      where: {
        email: config.super_admin_password,
      },
    });
  }
};

// tester admin

export const seedTesterAdmin = async () => {
  try {
    const isExitsTestAdmin = await prisma.user.findUnique({
      where: {
        email: config.tester_admin_email,
      },
    });

    if (isExitsTestAdmin) {
      console.log('Tester admin already exits.');
      return;
    }

    const name = config.tester_admin_name;
    const email = config.tester_admin_email;
    const password = config.super_admin_password;

    if (!name || !email || !password) {
      console.log('Tester Admin name, email, password missing in env file.');
    }

    const hashPassword = await bcrypt.hash(password, Number(config.bcrypt_salt_rounds));

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

    console.log('Super admin create successfully.', testerAdmin);
  } catch (error) {
    console.log('Super admin created failed', error);

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
    const isExitsTesterDoctor = await prisma.user.findUnique({
      where: {
        email: config.tester_doctor_email,
      },
    });

    if (isExitsTesterDoctor) {
      console.log('Tester Doctor already exits.');
      return;
    }

    const name = config.tester_doctor_name;
    const email = config.tester_doctor_email;
    const password = config.tester_doctor_password;

    if (!name || !email || !password) {
      console.log('Tester Doctor name, email, password missing in env file.');
    }

    const hashPassword = await bcrypt.hash(password, Number(config.bcrypt_salt_rounds));

    const testerDoctor = await prisma.user.create({
      data: {
        name,
        email,
        password: hashPassword,
        role: Role.DOCTOR,
        needPasswordChange: false,
        emailVerified: true,
      },
    });

    console.log('Tester doctor create successfully.', testerDoctor);
  } catch (error) {
    console.log('Tester doctor created failed', error);

    prisma.user.delete({
      where: {
        email: config.tester_doctor_email,
      },
    });
  }
};
