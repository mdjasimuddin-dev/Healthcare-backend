import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import ejs from 'ejs';
import { TokenPayload } from 'google-auth-library';
import type { JwtPayload, SignOptions } from 'jsonwebtoken';
import path from 'path';
import { AuthProvider, Role, UserStatus } from '../../../generated/prisma/enums';
import config from '../../config';
import { googleClient } from '../../lib/googleAuth';
import { transporter } from '../../lib/nodemailer';
import { prisma } from '../../lib/prisma';
import { redisClient } from '../../lib/redis';
import { generateHackedAlertEmailTemplate } from '../../templates/generateHackedAlertEmailTemplate';
import { jwtUtils } from '../../utils/jwt';
import type {
  IForgetPasswordPayload,
  IGoogleLoginPayload,
  ILoginUserPayload,
  IRegisterPatientPayload,
  IRequestUser,
  IResetPasswordPayload,
  IVerifyPatientEmailPayload,
} from './auth.interface';

const registerPatient = async (payload: IRegisterPatientPayload) => {
  const { name, password, patient: patientData } = payload;
  const email = payload.email.trim().toLowerCase();

  const isUserExists = await prisma.user.findUnique({
    where: { email },
  });

  if (isUserExists) {
    throw new Error('User with this email already exists');
  }

  const hashedPassword = await bcrypt.hash(password, Number(config.bcrypt_salt_rounds));

  const otpValue = crypto.randomInt(100000, 1000000).toString();
  const key = `patient-register-otp:${email}`;
  const expirationSeconds = 5 * 60;

  const appName = 'Smart Healthcare Limited';
  const appUrl = 'mdjasimuddin.com.bd';
  const userName = name;
  const supportEmail = config.email_sender;

  redisClient.set(key, otpValue, {
    expiration: {
      type: 'EX',
      value: expirationSeconds,
    },
  });

  const redisUserDataPayload = {
    name,
    email,
    password: hashedPassword,
    patient: patientData,
  };

  const patientRegistrationKey = `patient-register-data:${email}`;

  redisClient.set(patientRegistrationKey, JSON.stringify(redisUserDataPayload), {
    expiration: {
      type: 'EX',
      value: expirationSeconds,
    },
  });

  const emailVerifiedTempPath = path.join(
    process.cwd(),
    'src/app/templates/user-email-verified.ejs'
  );

  const EmailVerifiedTempData = {
    otpValue,
    appName,
    appUrl,
    userName,
    expirationMinutes: expirationSeconds / 60,
    supportEmail,
  };

  const htmlContent = await ejs.renderFile(emailVerifiedTempPath, EmailVerifiedTempData);

  await transporter.sendMail({
    from: config.email_sender,
    to: email,
    subject: `${otpValue} is your ${appName} verification code`,
    html: htmlContent,
  });
};

const verifyPatientEmail = async (payload: IVerifyPatientEmailPayload) => {
  const otp = payload.otp;
  const email = payload.email.trim().toLowerCase();

  const isUserExists = await prisma.user.findUnique({
    where: {
      email,
    },
  });

  if (isUserExists) {
    throw new Error('User already exits.');
  }

  if (isUserExists?.status == 'BLOCKED') {
    throw new Error('User is blocked');
  }

  if (isUserExists?.isDeleted || isUserExists?.status === 'DELETED') {
    throw new Error('User is deleted');
  }

  const key = `patient-register-otp:${email}`;

  const redisOTP = await redisClient.get(key);

  if (!redisOTP) {
    throw new Error('Invalid Otp');
  }

  if (redisOTP !== otp) {
    throw new Error('OTP does not match!');
  }

  await redisClient.del(key);

  const patientRegistrationKey = `patient-register-data:${email}`;
  const redisPatientData = await redisClient.get(patientRegistrationKey);

  if (!redisPatientData) {
    throw new Error('Patient data not exits into redis');
  }

  const redisPatientDataPayload: IRegisterPatientPayload = JSON.parse(redisPatientData);

  const createdUser = await prisma.user.create({
    data: {
      name: redisPatientDataPayload.name,
      email: redisPatientDataPayload.email,
      password: redisPatientDataPayload.password,
      role: Role.PATIENT,
      status: UserStatus.ACTIVE,
      emailVerified: true,
      patient: {
        create: {
          name: redisPatientDataPayload.name,
          email: redisPatientDataPayload.email,
          contactNumber: redisPatientDataPayload?.patient?.contactNumber || '',
        },
      },
    },
    omit: { password: true },
    include: { patient: true },
  });

  redisClient.del(patientRegistrationKey);

  const { patient, ...user } = createdUser;
  const jwtPayload = {
    userId: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
  };

  const accessToken = jwtUtils.createToken(
    jwtPayload,
    config.jwt_access_secret,
    config.jwt_access_expires_in as SignOptions
  );

  const refreshToken = jwtUtils.createToken(
    jwtPayload,
    config.jwt_refresh_secret,
    config.jwt_refresh_expires_in as SignOptions
  );

  const appName = 'Smart Healthcare Limited';
  const appUrl = 'mdjasimuddin.com.bd';
  const userName = user?.name;
  const supportEmail = config.email_sender;
  const loginUrl = 'http://localhost:5000/login';

  const emailVerifiedTempPath = path.join(process.cwd(), 'src/app/templates/welcome-email.ejs');

  const EmailVerifiedTempData = {
    appName,
    appUrl,
    userName,
    supportEmail,
    loginUrl,
  };

  const htmlContent = await ejs.renderFile(emailVerifiedTempPath, EmailVerifiedTempData);

  transporter.sendMail({
    from: config.email_sender,
    to: email,
    subject: `Welcome message form ${appName}`,
    html: htmlContent,
  });

  return {
    user,
    patient,
    accessToken,
    refreshToken,
  };
};

const loginUser = async (payload: ILoginUserPayload) => {
  const { password } = payload;
  const email = payload.email.trim().toLowerCase();

  const user = await prisma.user.findUnique({
    where: { email },
  });

  if (!user) {
    throw new Error('User not found');
  }

  if (user.status === UserStatus.BLOCKED) {
    throw new Error('User is blocked');
  }

  if (user.isDeleted || user.status === UserStatus.DELETED) {
    throw new Error('User is deleted');
  }

  const isPasswordMatched = await bcrypt.compare(password, user.password as string);

  if (!isPasswordMatched) {
    throw new Error('Invalid credentials');
  }

  const jwtPayload = {
    userId: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
  };

  const accessToken = jwtUtils.createToken(
    jwtPayload,
    config.jwt_access_secret,
    config.jwt_access_expires_in as SignOptions
  );

  const refreshToken = jwtUtils.createToken(
    jwtPayload,
    config.jwt_refresh_secret,
    config.jwt_refresh_expires_in as SignOptions
  );

  return {
    accessToken,
    refreshToken,
  };
};

const getMe = async (user: IRequestUser) => {
  const isUserExists = await prisma.user.findUnique({
    where: {
      id: user.userId,
    },
    include: {
      patient: true,
    },
    omit: {
      password: true,
    },
  });

  if (!isUserExists) {
    throw new Error('User not found');
  }

  return isUserExists;
};

const refreshToken = async (token: string) => {
  const verifiedRefreshToken = jwtUtils.verifyToken(token, config.jwt_refresh_secret);

  if (!verifiedRefreshToken.success || !verifiedRefreshToken.data) {
    throw new Error(
      config.node_env === 'development' ? verifiedRefreshToken.error : 'Invalid refresh token'
    );
  }

  const data = verifiedRefreshToken.data as JwtPayload;

  const user = await prisma.user.findUnique({
    where: { id: data.userId },
  });

  if (!user || user.isDeleted || user.status !== UserStatus.ACTIVE) {
    throw new Error('User is inactive or not found');
  }

  const jwtPayload = {
    userId: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
  };

  const accessToken = jwtUtils.createToken(
    jwtPayload,
    config.jwt_access_secret,
    config.jwt_access_expires_in as SignOptions
  );

  const refreshToken = jwtUtils.createToken(
    jwtPayload,
    config.jwt_refresh_secret,
    config.jwt_refresh_expires_in as SignOptions
  );

  return {
    accessToken,
    refreshToken,
  };
};

const googleLogin = async (payload: IGoogleLoginPayload) => {
  let googleIdTokenPayload: TokenPayload | null | undefined = null;
  try {
    const ticket = await googleClient.verifyIdToken({
      idToken: payload.idToken,
      audience: config.google_client_id,
    });

    googleIdTokenPayload = ticket.getPayload();

    if (!googleIdTokenPayload) {
      throw new Error('Invalid or Expired Google id token');
    }
  } catch (error) {
    console.log('Google ID Token Verification failed', error);
    throw new Error('Invalid or Expired Google id token');
  }

  if (!googleIdTokenPayload) {
    throw new Error('Invalid or Expired Google id token');
  }

  if (!googleIdTokenPayload.email) {
    throw new Error('google login email not found');
  }

  if (!googleIdTokenPayload.name) {
    throw new Error('google login username not found');
  }

  const ifPatientExistWithGoogleAuth = await prisma.user.findUnique({
    where: {
      email: googleIdTokenPayload.email,
      role: Role.PATIENT,
      googleId: googleIdTokenPayload.sub,
    },
  });

  let user = ifPatientExistWithGoogleAuth;

  if (!ifPatientExistWithGoogleAuth) {
    const ifPatientExistWithCredentials = await prisma.user.findUnique({
      where: {
        email: googleIdTokenPayload.email,
        role: Role.PATIENT,
        AuthProvider: AuthProvider.CREDENTIAL,
      },
    });

    if (ifPatientExistWithCredentials) {
      if (!ifPatientExistWithCredentials.emailVerified) {
        throw new Error('User is blocked');
      }

      if (ifPatientExistWithCredentials.status === UserStatus.BLOCKED) {
        throw new Error('User is blocked');
      }
      if (
        ifPatientExistWithCredentials.isDeleted ||
        ifPatientExistWithCredentials.status === UserStatus.DELETED
      ) {
        throw new Error('User is deleted');
      }

      user = await prisma.user.update({
        where: {
          id: ifPatientExistWithCredentials.id,
        },
        data: {
          googleId: googleIdTokenPayload.sub,
        },
      });
    } else {
      user = await prisma.user.create({
        data: {
          email: googleIdTokenPayload.email,
          name: googleIdTokenPayload.name,
          role: Role.PATIENT,
          googleId: googleIdTokenPayload.sub,
          AuthProvider: AuthProvider.GOOGLE,
          emailVerified: true,
          patient: {
            create: {
              name: googleIdTokenPayload.name,
              email: googleIdTokenPayload.email,
            },
          },
        },
      });
    }
  }

  if (!user) {
    throw new Error('User not found');
  }

  if (user.status === UserStatus.BLOCKED) {
    throw new Error('User is blocked');
  }

  if (user.isDeleted || user.status === UserStatus.DELETED) {
    throw new Error('User is deleted');
  }

  const jwtPayload = {
    userId: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
  };

  const accessToken = jwtUtils.createToken(
    jwtPayload,
    config.jwt_access_secret,
    config.jwt_access_expires_in as SignOptions
  );

  const refreshToken = jwtUtils.createToken(
    jwtPayload,
    config.jwt_refresh_secret,
    config.jwt_refresh_expires_in as SignOptions
  );

  return {
    accessToken,
    refreshToken,
  };
};

const forgetPassword = async (payload: IForgetPasswordPayload) => {
  const { email } = payload;

  const isUserExits = await prisma.user.findUnique({
    where: {
      email: email,
    },
  });

  if (!isUserExits) {
    throw new Error('User does not exists');
  }

  if (isUserExits.status == 'BLOCKED') {
    throw new Error('User is blocked');
  }

  if (!isUserExits.emailVerified) {
    throw new Error('User not verified');
  }

  if (isUserExits.isDeleted || isUserExits.status === 'DELETED') {
    throw new Error('User is deleted');
  }

  if (isUserExits.googleId || isUserExits.AuthProvider === 'GOOGLE') {
    throw new Error('User has account with google');
  }

  const otp = crypto.randomInt(100000, 1000000).toString();
  const key = `forget-password-opt:${isUserExits.email}`;

  redisClient.set(key, otp, {
    expiration: {
      type: 'EX',
      value: 3 * 60,
    },
  });

  const templatePath = path.join(process.cwd(), 'src/app/templates/forget-password.ejs');

  const htmlContent = await ejs.renderFile(templatePath, {
    otp,
  });

  transporter.sendMail({
    from: config.email_sender,
    to: isUserExits.email,
    // subject: `HACKED | SECURITY ALERT | Unauthorized Access Detected Sign-In ${isUserExits.email}`,
    subject: `Forget Password Your`,
    html: htmlContent,
  });
};

const resetPassword = async (payload: IResetPasswordPayload) => {
  const { email, newPassword, otp } = payload;

  const isUserExits = await prisma.user.findUnique({
    where: {
      email: email,
    },
  });

  if (!isUserExits) {
    throw new Error('User does not exists');
  }

  if (isUserExits.status == 'BLOCKED') {
    throw new Error('User is blocked');
  }

  if (!isUserExits.emailVerified) {
    throw new Error('User not verified');
  }

  if (isUserExits.isDeleted || isUserExits.status === 'DELETED') {
    throw new Error('User is deleted');
  }

  if (isUserExits.googleId || isUserExits.AuthProvider === 'GOOGLE') {
    throw new Error('User has account with google');
  }

  const key = `forget-password-opt:${isUserExits.email}`;

  const redisOTP = await redisClient.get(key);

  if (!redisOTP) {
    throw new Error('Invalid OTP');
  }

  if (redisOTP !== otp) {
    throw new Error('OTP does not match!');
  }

  const hashNewPassword = await bcrypt.hash(newPassword, Number(config.bcrypt_salt_rounds));

  await prisma.user.update({
    where: {
      email: isUserExits.email,
    },
    data: {
      password: hashNewPassword,
    },
  });

  transporter.sendMail({
    from: config.email_sender,
    to: isUserExits.email,
    // subject: `HACKED | SECURITY ALERT | Unauthorized Access Detected Sign-In ${isUserExits.email}`,
    subject: `Your Password is Changed`,
    html: generateHackedAlertEmailTemplate(isUserExits.email),
  });

  await redisClient.del([key]);
};

export const AuthService = {
  registerPatient,
  verifyPatientEmail,
  loginUser,
  getMe,
  refreshToken,
  googleLogin,
  forgetPassword,
  resetPassword,
};
