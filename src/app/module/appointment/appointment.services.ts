import { Payload } from './../../../generated/prisma/internal/prismaNamespace';
import { AppointmentStatus } from '../../../generated/prisma/enums';
import config from '../../config';
import { getBkashIdToken } from '../../lib/bkash';
import { prisma } from '../../lib/prisma';
import { IRequestUser } from '../../middleware/checkAuth';

const createAppointmentService = async (Payload: any, user: IRequestUser) => {
  const transactionResult = await prisma.$transaction(async (tx) => {
    // Business Login
    const appointment = await tx.appointment.create({
      data: {
        status: AppointmentStatus.PENDING,
      },
    });

    const bkashIdToken = await getBkashIdToken();

    if (!bkashIdToken) {
      throw new Error('Bkash ID token invalid');
    }

    const bkashCreatePaymentResponse = await fetch(
      `${config.bkash_base_url}/tokenized-checkout/payment/create`,
      {
        method: 'POST',
        headers: {
          Authorization: bkashIdToken,
          'X-App-Key': config.bkash_app_key,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          payerReference: user.email,
          agreementId: 'TestnewAdmin4GCYE4Q1789633823180',
          callbackURL: `${config.bkash_base_callback_url}/appointment/book-appointment/payment/callback`,
          amount: '200',
          currency: 'BDT',
          intent: 'sale',
          merchantInvoiceNumber: appointment.id,
        }),
      }
    );

    const bkashCreatePaymentResult = await bkashCreatePaymentResponse.json();

    await tx.payment.create({
      data: {
        marchantInvoiceNumber: bkashCreatePaymentResult.merchantInvoiceNumber,
        appointmentId: appointment.id,
        amount: '200',
        gatewayResponse: bkashCreatePaymentResult,
        bkashPaymentId: bkashCreatePaymentResult.paymentId,
        payerReferences: user.email,
      },
    });

    return bkashCreatePaymentResult.bKashURL;
  });

  return transactionResult;
};

const bookAppointmentCallback = async (query: Record<string, any>) => {
  const paymentId = await query.paymentID;

  if (!paymentId) {
    throw new Error('Payment Id is missing');
  }

  const status = query.status;

  if (!status) {
    throw new Error('Payment status is Missing');
  }

  const bkashIdToken = await getBkashIdToken();

  if (!bkashIdToken) {
    throw new Error('bkash Id token missing');
  }

  const executePaymentResponse = await fetch(
    `${config.bkash_base_url}/tokenized-checkout/payment/execute`,
    {
      method: 'POST',
      headers: {
        'X-App-Key': config.bkash_app_key,
        Authorization: bkashIdToken,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        paymentId: paymentId,
      }),
    }
  );

  const executeBkashPayment = await executePaymentResponse.json();

  if (status === 'success') {
    return {
      executeBkashPayment,
      redirectUrl: `${config.frontend_url}/dashboard/my-applications?status=success`,
    };
  }
  if (status === 'failure') {
    return {
      executeBkashPayment,
      redirectUrl: `${config.frontend_url}/dashboard/my-applications?status=failure`,
    };
  }
  if (status === 'cancel') {
    return {
      executeBkashPayment,
      redirectUrl: `${config.frontend_url}/dashboard/my-applications?status=cancel`,
    };
  }
  if (status === 'cancel') {
    return {
      executeBkashPayment,
      redirectUrl: `${config.frontend_url}/dashboard/my-applications?status=cancel`,
    };
  }

  return executeBkashPayment;
};

export const AppointmentService = { createAppointmentService, bookAppointmentCallback };
