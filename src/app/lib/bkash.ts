import { IdTokenClient } from 'google-auth-library';
import config from '../config';
import { redisClient } from './redis';

const IdTokenKey = 'bkash:idToken';
const RefreshIdTokenKey = 'bkash:idRefreshToken';

export const getBkashIdToken = async () => {
  try {
    let bkashIdToken = await redisClient.get(IdTokenKey);
    let bkashIdTokenTTL = await redisClient.ttl(IdTokenKey);
    let bkashRefreshToken = await redisClient.get(RefreshIdTokenKey);

    if (bkashIdTokenTTL <= 600 && bkashRefreshToken) {
      const refreshTokenResponse = await fetch(
        `${config.bkash_base_url}/tokenized-checkout/auth/refresh-token`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
            username: config.bkash_username,
            password: config.bkash_password,
          },
          body: JSON.stringify({
            app_key: config.bkash_app_key,
            app_secret: config.bkash_app_secret,
            refresh_token: bkashRefreshToken,
          }),
        }
      );

      const bkashIdTokenResult = refreshTokenResponse.json();
      bkashIdToken = bkashIdTokenResult.id_token;

      await redisClient.set(IdTokenKey, bkashIdToken as string, {
        expiration: {
          type: 'EX',
          value: 60 * 60,
        },
      });

      return bkashIdToken;
    }

    if (bkashIdToken) {
      return bkashIdToken;
    }

    const response = await fetch(`${config.bkash_base_url}/tokenized-checkout/auth/grant-token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        username: config.bkash_username,
        password: config.bkash_password,
      },
      body: JSON.stringify({
        app_key: config.bkash_app_key,
        app_secret: config.bkash_app_secret,
      }),
    });

    if (!response.ok) {
      throw new Error('Bkash access token Grant Failed');
    }

    const result = await response.json();

    await redisClient.set(IdTokenKey, result.id_token, {
      expiration: {
        type: 'EX',
        value: 60 * 60,
      },
    });

    await redisClient.set(RefreshIdTokenKey, result.refresh_token, {
      expiration: {
        type: 'EX',
        value: 60 * 60 * 24 * 28,
      },
    });

    bkashIdToken = result.id_token;

    return bkashIdToken;
  } catch (error: any) {
    console.log(error, 'Khuje payechi..');
  }
};
