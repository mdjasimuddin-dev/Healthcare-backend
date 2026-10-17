import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { TokenPayload } from 'google-auth-library';
import type { JwtPayload, SignOptions } from 'jsonwebtoken';
import { AuthProvider, Role, UserStatus } from '../../../generated/prisma/enums';
import config from '../../config';
import { googleClient } from '../../lib/googleAuth';
import { prisma } from '../../lib/prisma';
import { redisClient } from '../../lib/redis';
import { jwtUtils } from '../../utils/jwt';
import type {
  IForgetPasswordPayload,
  IGoogleLoginPayload,
  ILoginUserPayload,
  IRegisterPatientPayload,
  IRequestUser,
  IResetPasswordPayload,
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

  const hashedPassword = await bcrypt.hash(password, 8);

  const createdUser = await prisma.user.create({
    data: {
      name,
      email,
      password: hashedPassword,
      role: Role.PATIENT,
      status: UserStatus.ACTIVE,
      emailVerified: false,
      patient: {
        create: { name, email, contactNumber: patientData?.contactNumber || '' },
      },
    },
    omit: { password: true },
    include: { patient: true },
  });

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

  await redisClient.del([key]);
};

export const AuthService = {
  registerPatient,
  loginUser,
  getMe,
  refreshToken,
  googleLogin,
  forgetPassword,
  resetPassword,
};
