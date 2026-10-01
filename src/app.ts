import cookieParser from 'cookie-parser';
import cors from 'cors';
import express, { NextFunction, type Application, type Request, type Response } from 'express';
import httpStatus from 'http-status';
import z from 'zod';
import config from './app/config';
import { globalErrorHandler } from './app/middleware/globalErrorHandler';
import { notFound } from './app/middleware/notFound';
import { AuthRoutes } from './app/module/auth/auth.route';

const app: Application = express();

app.use(
  cors({
    origin: config.frontend_url,
    credentials: true,
  })
);

// Enable URL-encoded form data parsing
app.use(express.urlencoded({ extended: true }));

// Middleware to parse JSON bodies
app.use(express.json());
app.use(cookieParser());

app.use('/api/v1/auth', AuthRoutes);
app.post('/zod', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userZodSchema = z.object({
      name: z.string(),
      email: z.email(),
      age: z.number(),
      isVerified: z.boolean(),
      books: z.array(z.string()),
    });

    const payload = req.body;

    const result = userZodSchema.safeParse(payload);

    if (!result.success) {
      console.log(result.error);
    }

    if (result.success) {
      console.log(result.data);
    }

    console.log(result);
  } catch (error) {
    next(error);
  }

  res.status(httpStatus.OK).json({
    success: true,
    message: 'Welcome to PH Healthcare System Backend',
  });
});

// Basic route
app.get('/', async (req: Request, res: Response) => {
  res.status(httpStatus.OK).json({
    success: true,
    message: 'Welcome to PH Healthcare System Backend',
  });
});

app.use(globalErrorHandler);
app.use(notFound);

export default app;
