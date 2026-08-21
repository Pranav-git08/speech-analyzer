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

  // Dispatch global event for the Virtual Email Inbox UI
  window.dispatchEvent(new CustomEvent('virtual_email', {
    detail: { to: normalizedEmail, subject, body, type: 'otp' }
  }));

  console.log(`[EmailService] OTP email successfully dispatched to ${normalizedEmail}`);
  return { success: true, message: `OTP sent to ${normalizedEmail}` };
}

export async function sendAdminEmail(toEmail: string, subject: string, body: string): Promise<SendEmailResult> {
  const normalizedEmail = toEmail.toLowerCase().trim();
  
  window.dispatchEvent(new CustomEvent('virtual_email', {
    detail: { to: normalizedEmail, subject, body, type: 'admin' }
  }));

  console.log(`[EmailService] Admin email successfully dispatched to ${normalizedEmail}`);
  return { success: true, message: `Email sent to ${normalizedEmail}` };
}
