import { Router } from 'express';
import { UserController } from './user.controller';

const router = Router();

router.post('/profile-image', UserController.uploadProfileImage);

export const UserRoute = { router };
