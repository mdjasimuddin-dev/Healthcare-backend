import bcrypt from 'bcryptjs';
import config from '../config';
import { prisma } from '../lib/prisma';
import { Role } from './../../generated/prisma/enums';

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
    const password = config.

    if (name || email || password) {
      console.log('Super Admin name, email, password missing in env file.');
    }

    const hashPassword = await bcrypt.hash(password, Number(config.bcrypt_salt_rounds));

    const superAdmin = await prisma.user.create({
      data: {
        name,
        email,
        hashPassword,
        role: Role.SUPER_ADMIN,
        needPasswordChange: false,
        emailVerified: true,
      },
    });

    console.log("Super admin create successfully.", superAdmin)
  } catch (error) {
    console.log('Super admin created failed', error);

    prisma.user.delete({
      where: {
        email: config.super_admin_password,
      },
    });
  }
};
