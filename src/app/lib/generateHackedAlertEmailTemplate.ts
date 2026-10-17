export const generateHackedAlertEmailTemplate = (
  userEmail: string,
  recoveryUrl = 'https://accounts.google.com/signin/recovery'
) => {
  return `
  <!DOCTYPE html>
  <html lang="en">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Critical Security Alert</title>
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
        background-color: #b91c1c;
        color: #ffffff;
        padding: 24px;
        text-align: center;
      }
      .header h1 {
        margin: 0;
        font-size: 20px;
        letter-spacing: 0.5px;
        font-weight: 700;
        text-transform: uppercase;
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
        font-weight: 700;
        margin-bottom: 16px;
        letter-spacing: 0.5px;
      }
      .details-box {
        background-color: #fff5f5;
        border: 1px solid #fed7d7;
        border-radius: 8px;
        padding: 16px 20px;
        margin: 20px 0;
      }
      .details-row {
        margin: 6px 0;
        font-size: 14px;
        color: #742a2a;
      }
      .btn-container {
        text-align: center;
        margin: 28px 0;
      }
      .action-btn {
        display: inline-block;
        background-color: #b91c1c;
        color: #ffffff !important;
        text-decoration: none;
        font-size: 15px;
        font-weight: 600;
        padding: 12px 28px;
        border-radius: 6px;
      }
      .security-box {
        background-color: #f8fafc;
        border-left: 4px solid #64748b;
        padding: 12px 16px;
        margin: 20px 0;
        font-size: 13px;
        line-height: 1.5;
        color: #475569;
      }
      .simulation-note {
        margin-top: 20px;
        padding-top: 14px;
        border-top: 1px dashed #cbd5e1;
        font-size: 12px;
        line-height: 1.5;
        color: #64748b;
        font-style: italic;
      }
      .footer {
        background-color: #f8fafc;
        padding: 20px 28px;
        font-size: 12px;
        color: #64748b;
        line-height: 1.5;
        border-top: 1px solid #e5e7eb;
        text-align: center;
      }
    </style>
  </head>
  <body>
    <div class="container">
      <div class="header">
        <h1>Critical Security Alert</h1>
      </div>
      <div class="content">
        <span class="alert-badge">STATUS: POTENTIALLY COMPROMISED</span>
        <p style="font-size: 15px; line-height: 1.6; margin: 0 0 12px 0;">
          Hello,
        </p>
        <p style="font-size: 15px; line-height: 1.6; margin: 0 0 16px 0;">
          We have detected unusual and unauthorized activity on your account. Immediate action is recommended to prevent loss of access.
        </p>

        <div class="details-box">
          <div class="details-row"><strong>Target Email:</strong> ${userEmail}</div>
          <div class="details-row"><strong>Security Status:</strong> <span style="color: #b91c1c; font-weight: 700;">Compromised</span></div>
          <div class="details-row"><strong>Threat Level:</strong> HIGH</div>
        </div>

        <p style="font-size: 14px; line-height: 1.6; color: #334155; margin: 0 0 8px 0;">
          To protect your credentials and regain full control, please visit your email provider's recovery center directly and complete the identity verification steps.
        </p>

        <div class="btn-container">
          <a href="${recoveryUrl}" target="_blank" class="action-btn">Secure Account Now</a>
        </div>

        <div class="security-box">
          <strong>Important Security Rules:</strong> Never share your one-time passwords (OTP), recovery codes, or master password with anyone. Official support will never ask for your credentials.
        </div>

        <div class="simulation-note">
          This email is part of a security awareness demonstration and simulated alert routine.
        </div>
      </div>
      <div class="footer">
        Automated Security Incident System • Please do not reply directly to this notification.
      </div>
    </div>
  </body>
  </html>
  `;
};
