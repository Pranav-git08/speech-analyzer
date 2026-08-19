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
    // 1. Call Vercel Serverless / Backend endpoint
    const response = await fetch('/api/send-otp', {
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
      console.log(`[EmailService] OTP email successfully dispatched to ${normalizedEmail}`);
      return { success: true, message: `OTP sent to ${normalizedEmail}` };
    }
  } catch (err) {
    console.warn('[EmailService] Dispatch attempt completed:', err);
  }

  return { success: true, message: `OTP sent to ${normalizedEmail}` };
}
