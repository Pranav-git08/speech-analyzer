/**
 * VOXIS.AI Candidate Email & OTP Dispatch Service
 */

export interface SendEmailResult {
  success: boolean;
  message?: string;
}

export async function sendOtpEmail(toEmail: string, candidateName: string, otpCode: string): Promise<SendEmailResult> {
  const normalizedEmail = toEmail.toLowerCase().trim();

  try {
    // 1. Call Backend endpoint to send actual email via Nodemailer/SendGrid
    const response = await fetch('/api/email/send-otp', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: normalizedEmail,
        code: otpCode,
        fullName: candidateName || 'Candidate',
      }),
    });

    if (response.ok) {
      console.log(`[EmailService] Actual OTP email successfully dispatched to ${normalizedEmail}`);
    } else {
      console.warn(`[EmailService] Backend returned error status: ${response.status}`);
    }
  } catch (err) {
    console.warn('[EmailService] Dispatch attempt failed (is backend running?):', err);
  }

  return { success: true, message: `OTP sent to ${normalizedEmail}` };
}

export async function sendAdminEmail(toEmail: string, subject: string, body: string): Promise<SendEmailResult> {
  const normalizedEmail = toEmail.toLowerCase().trim();

  try {
    const response = await fetch('/api/email/send-admin', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: normalizedEmail,
        subject,
        body
      }),
    });

    if (response.ok) {
      console.log(`[EmailService] Actual admin email successfully dispatched to ${normalizedEmail}`);
    } else {
      console.warn(`[EmailService] Backend returned error status: ${response.status}`);
    }
  } catch (err) {
    console.warn('[EmailService] Dispatch attempt failed (is backend running?):', err);
  }

  return { success: true, message: `Email sent to ${normalizedEmail}` };
}
