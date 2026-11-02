import { Payload } from './../../../generated/prisma/internal/prismaNamespace';
import { AppointmentStatus, PaymentStatus } from '../../../generated/prisma/enums';
import config from '../../config';
import { getBkashIdToken } from '../../lib/bkash';
import { prisma } from '../../lib/prisma';
import { IRequestUser } from '../../middleware/checkAuth';
import { formatBkashDate } from '../../utils/formatBkashDate ';

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

const payAppointment = async (payload: any, user: IRequestUser) => {
  const appointmentId = payload.appointmentId;

  const existingAppointment = await prisma.appointment.findUnique({
    where: {
      id: appointmentId,
    },
  });

  if (!existingAppointment) {
    throw new Error('Appointment Does Not Exists');
  }

  if (existingAppointment.status !== 'PENDING') {
    throw new Error('Appointment is not pending');
  }

  // if (existingAppointment.status === 'CONFIRMED') {
  //   throw new Error('Appointment allready paid and confirmed');
  // }

  // if (
  //   existingAppointment.status === 'COMPLETED' ||
  //   existingAppointment.status === 'ONGOING' ||
  //   existingAppointment.status === 'CANCEL'
  // ) {
  //   const currentStatus = existingAppointment.status;
  //   throw new Error(`Appointment is already ${currentStatus.toLowerCase}`);
  // }

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
        merchantInvoiceNumber: existingAppointment.id,
      }),
    }
  );

  const bkashCreatePaymentResult = await bkashCreatePaymentResponse.json();

  await prisma.payment.update({
    where: {
      // bkashPaymentId: bkashCreatePaymentResult.paymentId,
      appointmentId: existingAppointment.id,
    },
    data: {
      marchantInvoiceNumber: bkashCreatePaymentResult.merchantInvoiceNumber,
      gatewayResponse: bkashCreatePaymentResult,
      bkashPaymentId: bkashCreatePaymentResult.paymentId,
    },
  });

  return {
    bkashCreatePaymentResult,
  };
};

const bookAppointmentCallback = async (query: Record<string, any>) => {
  const transactionResult = await prisma.$transaction(async (tx) => {
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

    const executeBkashPaymentResult = await executePaymentResponse.json();

    if (status === 'success') {
      await tx.appointment.update({
        where: {
          id: executeBkashPaymentResult.merchantInvoiceNumber,
          // bkashPaymentId: paymentId,
        },
        data: {
          status: AppointmentStatus.CONFIRMED,
        },
      });

      await tx.payment.update({
        where: {
          // appointmentId: executeBkashPaymentResult.merchantInvoiceNumber,
          bkashPaymentId: paymentId,
        },
        data: {
          status: PaymentStatus.PAID,
          bkashTrxId: executeBkashPaymentResult.trxId,
          paidAt: executeBkashPaymentResult.paymentExecuteTime,
          gatewayResponse: executeBkashPaymentResult,
        },
      });

      return {
        redirectUrl: `${config.frontend_url}/dashboard/my-applications?status=success`,
      };
    } else if (status === 'failure') {
      await tx.payment.update({
        where: {
          bkashPaymentId: paymentId,
        },
        data: {
          status: PaymentStatus.FAILED,
          gatewayResponse: executeBkashPaymentResult,
        },
      });
      return {
        redirectUrl: `${config.frontend_url}/dashboard/my-applications?status=failure`,
      };
    } else if (status === 'cancel') {
      await tx.payment.update({
        where: {
          bkashPaymentId: paymentId,
        },
        data: {
          status: PaymentStatus.CANCLED,
          gatewayResponse: executeBkashPaymentResult,
        },
      });
    } else {
      return {
        redirectUrl: `${config.frontend_url}/dashboard/my-applications?error=payment-failed`,
      };
    }

    return executeBkashPaymentResult;
  });

  return transactionResult;
};

const cancleAppointment = async (Payload: any) => {
  const transactionResult = await prisma.$transaction(async (tx) => {
    const appointmentId = Payload.appointmentId;

    // 1. Appointment ID validation
    if (!appointmentId) {
      throw new Error('Appointment ID is required');
    }

    // 2. Find appointment and payment
    const existingAppointment = await prisma.appointment.findUnique({
      where: {
        id: appointmentId,
      },
      include: {
        payment: true,
      },
    });

    if (!existingAppointment) {
      throw new Error('Appointment does not exist');
    }

    // 3. Appointment status validation
    if (existingAppointment.status === 'COMPLETED' || existingAppointment.status === 'ONGOING') {
      throw new Error(`Appointment is ${existingAppointment.status.toLowerCase()}`);
    }

    if (existingAppointment.status === 'CANCEL') {
      throw new Error('Appointment is already cancelled');
    }

    const updatedAppointment = await tx.appointment.update({
      where: {
        id: existingAppointment.id,
      },
      data: {
        status: 'CANCEL',
      },
    });

    // 4. Payment validation
    const payment = existingAppointment.payment;

    if (!payment) {
      throw new Error('Payment information not found');
    }

    if (!payment.bkashPaymentId) {
      throw new Error('bKash Payment ID not found');
    }

    if (!payment.bkashTrxId) {
      throw new Error('bKash Transaction ID not found');
    }

    if (payment.status === PaymentStatus.REFUNDED) {
      throw new Error('Payment has already been refunded');
    }

    // 5. Get bKash token
    const bkashIdToken = await getBkashIdToken();

    if (!bkashIdToken) {
      throw new Error('bKash ID token invalid');
    }

    const bkashRefundPaymentResponse = await fetch(
      `${config.bkash_base_url}/tokenized-checkout/refund/payment/transaction`,
      {
        method: 'POST',
        headers: {
          Authorization: bkashIdToken,
          'X-App-Key': config.bkash_app_key,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          paymentId: existingAppointment.payment?.bkashPaymentId,
          refundAmount: existingAppointment.payment?.amount.toString(),
          trxId: existingAppointment.payment?.bkashTrxId,
          reason: 'patient canceled the appointment',
          sku: 'test',
        }),
      }
    );

    console.log('bkash RefundPayment Response : ', bkashRefundPaymentResponse);
    const bkashRefundPaymentResult = await bkashRefundPaymentResponse.json();
    console.log('bkash RefundPayment Result :', bkashRefundPaymentResult);
    const updatedPayment = await tx.payment.update({
      where: {
        appointmentId: existingAppointment.id,
      },
      data: {
        refundTrxId: bkashRefundPaymentResult.refundTrxId,
        refundedAt: formatBkashDate(bkashRefundPaymentResult.completedTime),
        refundAmount: bkashRefundPaymentResult.refundAmount,
        refundReason: bkashRefundPaymentResult.reason,
        status: PaymentStatus.REFUNDED,
        gatewayResponse: bkashRefundPaymentResult,
      },
    });

    return {
      appointment: updatedAppointment,
      payment: updatedPayment,
    };
  });

  return transactionResult;
};

export const AppointmentService = {
  createAppointmentService,
  payAppointment,
  bookAppointmentCallback,
  cancleAppointment,
};
