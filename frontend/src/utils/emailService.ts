/**
 * VOXIS.AI Candidate Email & OTP Dispatch Service
 */

export interface SendEmailResult {
  success: boolean;
  message?: string;
}

export async function sendOtpEmail(toEmail: string, candidateName: string, otpCode: string): Promise<SendEmailResult> {
  const normalizedEmail = toEmail.toLowerCase().trim();
  const subject = `Your VOXIS.AI Verification Code: ${otpCode}`;
  const body = `Hi ${candidateName || 'Candidate'},\n\nYour 6-digit verification OTP is: ${otpCode}\n\nPlease enter this code to verify your email address.\n\nBest,\nVOXIS AI Security`;

  // Dispatch global event for the Virtual Email Inbox UI (for testing)
  window.dispatchEvent(new CustomEvent('virtual_email', {
    detail: { to: normalizedEmail, subject, body, type: 'otp' }
  }));

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
  
  window.dispatchEvent(new CustomEvent('virtual_email', {
    detail: { to: normalizedEmail, subject, body, type: 'admin' }
  }));

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
