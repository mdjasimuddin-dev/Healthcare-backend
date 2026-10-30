import config from '../../config';
import { getBkashIdToken } from '../../lib/bkash';

const createAppointmentService = async () => {
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
        payerReference: 'TEST001ABC',
        agreementId: 'TestnewAdmin4GCYE4Q1789633823180',
        callbackURL: `${config.bkash_base_callback_url}/appointment/book-appointment/payment/callback`,
        amount: '200',
        currency: 'BDT',
        intent: 'sale',
        merchantInvoiceNumber: 'INV001',
      }),
    }
  );

  const bkashCratePaymentResult = await bkashCreatePaymentResponse.json();

  return bkashCratePaymentResult;
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
