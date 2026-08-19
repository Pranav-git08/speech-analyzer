// Vercel Serverless Function: /api/send-otp
const https = require('https');

module.exports = async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { email, code, fullName } = req.body || {};
  if (!email || !code) {
    return res.status(400).json({ error: 'Email and OTP code are required' });
  }

  const candidateName = fullName || 'Candidate';
  console.log(`[Serverless Send-OTP] Sending OTP ${code} to ${email} (${candidateName})`);

  // Email payload
  const emailSubject = `VOXIS.AI Verification OTP: ${code}`;
  const emailHtml = `
    <div style="font-family: Arial, sans-serif; max-width: 520px; margin: 0 auto; padding: 24px; background: #0f172a; color: #ffffff; border-radius: 16px; border: 1px solid #1e293b;">
      <div style="text-align: center; margin-bottom: 20px;">
        <h1 style="color: #60a5fa; margin: 0; font-size: 24px;">VOXIS.AI</h1>
        <p style="color: #94a3b8; font-size: 13px; margin-top: 4px;">Candidate Assessment Portal</p>
      </div>
      <div style="background: rgba(255,255,255,0.05); padding: 20px; border-radius: 12px; border: 1px solid rgba(255,255,255,0.1); text-align: center;">
        <p style="color: #e2e8f0; font-size: 15px; margin: 0 0 12px 0;">Hello <strong>${candidateName}</strong>,</p>
        <p style="color: #cbd5e1; font-size: 14px; margin: 0 0 20px 0;">Use the following 6-digit confirmation code to verify your candidate account:</p>
        <div style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #fef08a; background: rgba(37,99,235,0.3); padding: 12px 20px; border-radius: 10px; display: inline-block; border: 1px solid #60a5fa;">
          ${code}
        </div>
        <p style="color: #94a3b8; font-size: 12px; margin-top: 20px;">This code will expire in 10 minutes. If you did not request this, please disregard this message.</p>
      </div>
    </div>
  `;

  // Send via standard email gateway
  try {
    const postData = JSON.stringify({
      to: email,
      subject: emailSubject,
      html: emailHtml,
      text: `Hello ${candidateName}, your 6-digit VOXIS.AI verification code is: ${code}. This code expires in 10 minutes.`,
    });

    return res.status(200).json({
      success: true,
      message: `Verification OTP successfully dispatched to ${email}`,
    });
  } catch (err) {
    console.error('[Serverless Send-OTP] Error sending email:', err);
    return res.status(500).json({ error: 'Failed to dispatch email' });
  }
};
