export const generateOtpEmailTemplate = (otp: string, expiryMinutes = 3) => {
  return `
  <!DOCTYPE html>
  <html lang="en">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Verification Code</title>
    <style>
      body {
        margin: 0;
        padding: 0;
        background-color: #f4f6f8;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
        color: #333333;
      }
      .container {
        max-width: 560px;
        margin: 40px auto;
        background: #ffffff;
        border-radius: 8px;
        overflow: hidden;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
        border: 1px solid #e5e7eb;
      }
      .header {
        background-color: #0f172a;
        color: #ffffff;
        padding: 24px;
        text-align: center;
      }
      .header h1 {
        margin: 0;
        font-size: 20px;
        letter-spacing: 0.5px;
        font-weight: 600;
      }
      .content {
        padding: 32px 28px;
      }
      .alert-badge {
        display: inline-block;
        padding: 4px 10px;
        background-color: #fee2e2;
        color: #b91c1c;
        border-radius: 4px;
        font-size: 12px;
        font-weight: 600;
        margin-bottom: 16px;
      }
      .otp-box {
        text-align: center;
        background-color: #f8fafc;
        border: 1px dashed #cbd5e1;
        border-radius: 8px;
        padding: 20px;
        margin: 24px 0;
      }
      .otp-code {
        font-size: 32px;
        font-weight: 700;
        letter-spacing: 6px;
        color: #1e293b;
        margin: 0;
      }
      .expiry-text {
        font-size: 13px;
        color: #64748b;
        margin-top: 8px;
      }
      .footer {
        background-color: #f8fafc;
        padding: 20px 28px;
        font-size: 12px;
        color: #64748b;
        line-height: 1.5;
        border-top: 1px solid #e5e7eb;
      }
    </style>
  </head>
  <body>
    <div class="container">
      <div class="header">
        <h1>Security Verification</h1>
      </div>
      <div class="content">
        <span class="alert-badge">Action Required</span>
        <p style="font-size: 15px; line-height: 1.6; margin: 0 0 12px 0;">
          We received a request to verify your account or sign in from a new session. Please use the verification code below to proceed:
        </p>

        <div class="otp-box">
          <div class="otp-code">${otp}</div>
          <div class="expiry-text">This code will expire in ${expiryMinutes} minutes.</div>
        </div>

        <p style="font-size: 14px; line-height: 1.5; color: #475569; margin: 0;">
          <strong>Security Notice:</strong> Never share this OTP with anyone. If you did not initiate this request, someone may be attempting to access your account. Please secure your account credentials immediately.
        </p>
      </div>
      <div class="footer">
        This is an automated system notification. Please do not reply directly to this email.
      </div>
    </div>
  </body>
  </html>
  `;
};
