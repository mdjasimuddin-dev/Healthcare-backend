<<<<<<< HEAD
import bcrypt from 'bcryptjs';
import { TokenPayload } from 'google-auth-library';
import type { JwtPayload, SignOptions } from 'jsonwebtoken';
import { AuthProvider, Role, UserStatus } from '../../../generated/prisma/enums';
import config from '../../config';
import { googleClient } from '../../lib/googleAuth';
=======
/** biome-ignore-all lint/style/useConst: <explanation> */
import bcrypt from 'bcryptjs';
import type { JwtPayload, SignOptions } from 'jsonwebtoken';
import { AuthProvider, Role, UserStatus } from '../../../generated/prisma/enums';
import config from '../../config';
>>>>>>> origin/main
import { prisma } from '../../lib/prisma';
import { jwtUtils } from '../../utils/jwt';
import type {
  IGoogleLoginPayload,
  ILoginUserPayload,
  IRegisterPatientPayload,
  IRequestUser,
} from './auth.interface';
<<<<<<< HEAD

const registerPatient = async (payload: IRegisterPatientPayload) => {
  const { name, password, patient: patientData } = payload;
=======
import { googleClient } from '../../lib/googleAuth';
import { TokenPayload } from 'google-auth-library';

const registerPatient = async (payload: IRegisterPatientPayload) => {
  const { name, password } = payload;
>>>>>>> origin/main
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
<<<<<<< HEAD
        create: { name, email, contactNumber: patientData?.contactNumber || '' },
=======
        create: { name, email },
>>>>>>> origin/main
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

<<<<<<< HEAD
  const isPasswordMatched = await bcrypt.compare(password, user.password as string);
=======
  const isPasswordMatched = await bcrypt.compare(password, user.password);
>>>>>>> origin/main

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
<<<<<<< HEAD

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
=======
  } catch (error) {
    console.log('Google ID token verification failed.', error);
    throw new Error('Invalid or Expire Google ID token.');
  }

  if (!googleIdTokenPayload) {
    throw new Error('Invalid or Expire Google ID token.');
  }

  if (!googleIdTokenPayload.email) {
    throw new Error('Google email not found.');
  }

  if (!googleIdTokenPayload.name) {
    throw new Error('Google username not found');
>>>>>>> origin/main
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
<<<<<<< HEAD
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
=======
    const ifPatientExitsWithCredentials = await prisma.user.findUnique({
      where: {
        email: googleIdTokenPayload.email,
        role: Role.PATIENT,
        AuthProvider: AuthProvider.CREDENTIALS,
      },
    });

    if (ifPatientExitsWithCredentials) {
      if (!ifPatientExitsWithCredentials.emailVerified) {
        throw new Error('Google email not verified');
      }

      if (ifPatientExitsWithCredentials.status === UserStatus.BLOCKED) {
        throw new Error('Credentials user block');
      }
      if (
        ifPatientExitsWithCredentials.isDeleted ||
        ifPatientExitsWithCredentials.status === UserStatus.DELETED
      ) {
        throw new Error('User Is Delete');
>>>>>>> origin/main
      }

      user = await prisma.user.update({
        where: {
<<<<<<< HEAD
          id: ifPatientExistWithCredentials.id,
=======
          id: ifPatientExitsWithCredentials?.id,
>>>>>>> origin/main
        },
        data: {
          googleId: googleIdTokenPayload.sub,
        },
      });
    } else {
      user = await prisma.user.create({
        data: {
<<<<<<< HEAD
          email: googleIdTokenPayload.email,
          name: googleIdTokenPayload.name,
          role: Role.PATIENT,
          googleId: googleIdTokenPayload.sub,
          AuthProvider: AuthProvider.GOOGLE,
=======
          name: googleIdTokenPayload.name,
          email: googleIdTokenPayload.email,
          role: Role.PATIENT,
          googleId: googleIdTokenPayload.sub,
          authProvider: AuthProvider.CREDENTIALS,
>>>>>>> origin/main
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
<<<<<<< HEAD

  if (user.status === UserStatus.BLOCKED) {
    throw new Error('User is blocked');
  }

  if (user.isDeleted || user.status === UserStatus.DELETED) {
    throw new Error('User is deleted');
  }

  const jwtPayload = {
=======
  if (user.status === UserStatus.BLOCKED) {
    throw new Error('User block');
  }
  if (user.isDeleted || user.status === UserStatus.DELETED) {
    throw new Error('User deleted');
  }

  let jwtPayload = {
>>>>>>> origin/main
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

export const AuthService = {
  registerPatient,
  loginUser,
  getMe,
  refreshToken,
  googleLogin,
};
