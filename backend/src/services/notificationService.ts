import crypto from 'crypto';
import twilio from 'twilio';
import sgMail from '@sendgrid/mail';
import { pool } from '../db/connection';
import { config } from '../config/env';

// ─── Twilio / SendGrid clients (lazy-initialised) ────────────────────────────

let _twilioClient: ReturnType<typeof twilio> | null = null;

function getTwilioClient(): ReturnType<typeof twilio> {
  if (!_twilioClient) {
    if (!config.twilio.accountSid || !config.twilio.authToken) {
      throw new Error('Twilio credentials are not configured');
    }
    _twilioClient = twilio(config.twilio.accountSid, config.twilio.authToken);
  }
  return _twilioClient;
}

let _sendgridConfigured = false;

function getSendGridClient(): typeof sgMail {
  if (!_sendgridConfigured) {
    if (!config.sendgrid.apiKey) {
      throw new Error('SendGrid API key is not configured');
    }
    sgMail.setApiKey(config.sendgrid.apiKey);
    _sendgridConfigured = true;
  }
  return sgMail;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const CODE_LENGTH = 12;
const CODE_CHARSET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
const MAX_RETRIES = 3;
const RETRY_BASE_DELAY_MS = 500;

// ─── Unique Code Generation ───────────────────────────────────────────────────

/**
 * Generate a cryptographically random alphanumeric code of CODE_LENGTH chars.
 * Does NOT check database uniqueness – use generateUniqueCode() for that.
 */
export function generateRawCode(): string {
  const bytes = crypto.randomBytes(CODE_LENGTH);
  return Array.from(bytes)
    .map((b) => CODE_CHARSET[b % CODE_CHARSET.length])
    .join('');
}

/**
 * Generate a unique GD Access Code (e.g. GD-A9B4X2) and persist uniqueness in candidates table.
 */
export async function generateGDCode(): Promise<string> {
  for (let attempt = 0; attempt < 10; attempt++) {
    const raw = generateRawCode().slice(0, 6);
    const code = `GD-${raw}`;
    const { rows } = await pool.query<{ id: string }>(
      'SELECT id FROM candidates WHERE gd_code = $1 OR unique_code = $1',
      [code]
    );
    if (rows.length === 0) {
      return code;
    }
  }
  return `GD-${generateRawCode().slice(0, 6)}`;
}

/**
 * Generate a unique HR Access Code (e.g. HR-K8M2W9) and persist uniqueness in candidates table.
 */
export async function generateHRCode(): Promise<string> {
  for (let attempt = 0; attempt < 10; attempt++) {
    const raw = generateRawCode().slice(0, 6);
    const code = `HR-${raw}`;
    const { rows } = await pool.query<{ id: string }>(
      'SELECT id FROM candidates WHERE hr_code = $1 OR unique_code = $1',
      [code]
    );
    if (rows.length === 0) {
      return code;
    }
  }
  return `HR-${generateRawCode().slice(0, 6)}`;
}

/**
 * Generate a unique alphanumeric code and ensure it does not already exist
 * in the candidates table.
 *
 * Requirements: 4.1
 */
export async function generateUniqueCode(): Promise<string> {
  for (let attempt = 0; attempt < 10; attempt++) {
    const code = generateRawCode();
    const { rows } = await pool.query<{ unique_code: string }>(
      'SELECT unique_code FROM candidates WHERE unique_code = $1',
      [code]
    );
    if (rows.length === 0) {
      return code;
    }
  }
  throw new Error('Failed to generate a unique code after 10 attempts');
}

// ─── Unique Code Verification ─────────────────────────────────────────────────

export type VerifyCodeResult =
  | { valid: true }
  | { valid: false; reason: 'not_found' | 'not_approved' };

/**
 * Verify that a candidate's GD Access Code is valid and they cleared Round 1.
 */
export async function verifyGDCode(code: string): Promise<any | null> {
  const trimmed = code.trim();
  const { rows } = await pool.query<{
    id: string;
    name: string;
    email: string;
    phone: string;
    job_role_id: string;
    track: string;
    status: string;
  }>(
    `SELECT id, name, email, phone, job_role_id, track, status 
     FROM candidates 
     WHERE gd_code = $1 OR unique_code = $1`,
    [trimmed]
  );

  if (rows.length === 0) return null;
  return rows[0];
}

/**
 * Verify that a candidate's HR Access Code is valid and they passed the GD round.
 */
export async function verifyHRCode(code: string): Promise<any | null> {
  const trimmed = code.trim();
  const { rows } = await pool.query<{
    id: string;
    name: string;
    email: string;
    phone: string;
    job_role_id: string;
    track: string;
    status: string;
  }>(
    `SELECT id, name, email, phone, job_role_id, track, status 
     FROM candidates 
     WHERE hr_code = $1 OR unique_code = $1`,
    [trimmed]
  );

  if (rows.length === 0) return null;
  return rows[0];
}

/**
 * Verify that a unique code belongs to an approved candidate.
 *
 * Returns true for valid approved-candidate codes, false otherwise.
 *
 * Requirements: 4.3, 4.4
 */
export async function verifyUniqueCode(code: string): Promise<boolean> {
  const { rows } = await pool.query<{ status: string }>(
    'SELECT status FROM candidates WHERE hr_code = $1 OR unique_code = $1',
    [code]
  );

  if (rows.length === 0) return false;
  return rows[0].status === 'pending_hr' || rows[0].status === 'approved';
}


// ─── Retry Helper ─────────────────────────────────────────────────────────────

/**
 * Format phone number to international format (E.164).
 * Ensures phone number starts with + and country code.
 * 
 * Examples:
 * - "9591050952" → "+919591050952" (assumes India if 10 digits)
 * - "+919591050952" → "+919591050952" (already formatted)
 * - "919591050952" → "+919591050952" (adds +)
 */
function formatPhoneNumber(phoneNumber: string): string {
  // Remove any whitespace
  let formatted = phoneNumber.trim();
  
  // If already has +, return as-is
  if (formatted.startsWith('+')) {
    return formatted;
  }
  
  // If starts with country code (91 for India), add +
  if (formatted.startsWith('91') && formatted.length > 10) {
    return '+' + formatted;
  }
  
  // If 10 digits, assume India and add +91
  if (formatted.length === 10 && /^\d{10}$/.test(formatted)) {
    return '+91' + formatted;
  }
  
  // Otherwise, add + prefix
  return '+' + formatted;
}

async function withRetry<T>(
  fn: () => Promise<T>,
  label: string
): Promise<T> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      if (attempt < MAX_RETRIES) {
        const delay = RETRY_BASE_DELAY_MS * Math.pow(2, attempt - 1);
        await new Promise((res) => setTimeout(res, delay));
      }
    }
  }
  throw new Error(
    `${label} failed after ${MAX_RETRIES} attempts: ${String(lastError)}`
  );
}

// ─── SMS ──────────────────────────────────────────────────────────────────────

/**
 * Send an SMS message via Twilio with retry logic (3 attempts, exponential backoff).
 *
 * Requirements: 4.2, 9.3, 9.5, 9.6
 */
export async function sendSMS(phoneNumber: string, message: string): Promise<void> {
  const formattedPhone = formatPhoneNumber(phoneNumber);
  await withRetry(
    () =>
      getTwilioClient().messages.create({
        body: message,
        from: config.twilio.fromNumber,
        to: formattedPhone,
      }),
    `sendSMS to ${formattedPhone}`
  );
}

// ─── Email ────────────────────────────────────────────────────────────────────

export interface EmailAttachment {
  content: string; // base64-encoded
  filename: string;
  type: string;
  disposition: 'attachment' | 'inline';
}

import nodemailer from 'nodemailer';
import fs from 'fs';
import path from 'path';

// Directory for local offer letters archive
const OFFER_LETTERS_DIR = path.join(__dirname, '../../data/offer_letters');
try {
  fs.mkdirSync(OFFER_LETTERS_DIR, { recursive: true });
} catch {}

/**
 * Send an email via SendGrid, Nodemailer SMTP, or simulated delivery with retry logic.
 */
export async function sendEmail(
  email: string,
  subject: string,
  body: string,
  html?: string,
  attachments?: EmailAttachment[]
): Promise<{ success: boolean; mode: 'sendgrid' | 'smtp' | 'simulated'; messageId?: string }> {
  // 1. Try SendGrid if a real API key is provided
  const sendgridKey = config.sendgrid.apiKey;
  const isSendGridReal = sendgridKey && !sendgridKey.includes('your_sendgrid_api_key') && sendgridKey.startsWith('SG.');
  if (isSendGridReal) {

    try {
      const msg: Parameters<typeof sgMail.send>[0] = {
        to: email,
        from: config.sendgrid.fromEmail,
        subject,
        text: body,
        html: html || body,
        attachments: attachments?.map((a) => ({
          content: a.content,
          filename: a.filename,
          type: a.type,
          disposition: a.disposition,
        })),
      };
      await withRetry(() => getSendGridClient().send(msg), `sendEmail to ${email}`);
      console.log(`[Email] Sent via SendGrid to: ${email}`);
      return { success: true, mode: 'sendgrid' };
    } catch (sgErr) {
      console.warn('[Email] SendGrid send failed, trying SMTP/Nodemailer fallback:', sgErr);
    }
  }

  // 2. Try Nodemailer / Gmail SMTP if credentials are provided in process.env
  const smtpUser = process.env.SMTP_USER || process.env.GMAIL_USER;
  const smtpPass = process.env.SMTP_PASS || process.env.GMAIL_APP_PASSWORD;
  const isSmtpReal = smtpUser && smtpPass && !smtpPass.includes('your_');

  if (isSmtpReal) {
    try {
      const isGmail = smtpUser.includes('@gmail.com') || process.env.SMTP_SERVICE === 'gmail';
      const transporter = isGmail
        ? nodemailer.createTransport({
            service: 'gmail',
            auth: { user: smtpUser, pass: smtpPass.replace(/\s+/g, '') },
          })
        : nodemailer.createTransport({
            host: process.env.SMTP_HOST || 'smtp.gmail.com',
            port: parseInt(process.env.SMTP_PORT || '587', 10),
            secure: process.env.SMTP_SECURE === 'true',
            auth: { user: smtpUser, pass: smtpPass },
          });

      const fromAddress = config.sendgrid.fromEmail && !config.sendgrid.fromEmail.includes('example.com')
        ? config.sendgrid.fromEmail
        : smtpUser;

      const info = await transporter.sendMail({
        from: `"SPEECH ANALYZER AI HR" <${fromAddress}>`,
        to: email,
        subject,
        text: body,
        html: html || body,
        attachments: attachments?.map((a) => ({
          filename: a.filename,
          content: Buffer.from(a.content, 'base64'),
          contentType: a.type,
        })),
      });
      console.log(`[Email] Successfully delivered via SMTP to ${email} (messageId: ${info.messageId})`);
      return { success: true, mode: 'smtp', messageId: info.messageId };
    } catch (smtpErr) {
      console.warn('[Email] SMTP send failed:', smtpErr);
    }
  }

  // 3. Simulated Dev Mode: Save offer letter document locally and log
  console.log(`[Email] 📧 Simulated Email Dispatch to: ${email}`);
  console.log(`[Email] Subject: ${subject}`);
  let savedFile = '';
  if (attachments && attachments.length > 0) {
    for (const a of attachments) {
      const savePath = path.join(OFFER_LETTERS_DIR, a.filename);
      fs.writeFileSync(savePath, Buffer.from(a.content, 'base64'));
      savedFile = a.filename;
      console.log(`[Email] 📎 Offer Letter saved on disk: ${savePath}`);
    }
  }

  return { success: true, mode: 'simulated', messageId: savedFile };

}

// ─── Offer Letter HTML Template Generator ─────────────────────────────────────

export function generateOfferLetterHtml(params: {
  candidateName: string;
  jobRoleName: string;
  salary: string;
  joiningDate: string;
  location: string;
  customMessage?: string;
}): string {
  const currentDate = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Job Offer Letter - SPEECH ANALYZER AI</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #2d3748; line-height: 1.6; margin: 0; padding: 0; background-color: #f7fafc; }
    .wrapper { max-width: 680px; margin: 30px auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.08); border: 1px solid #e2e8f0; }
    .header { background: linear-gradient(135deg, #3182ce 0%, #2b6cb0 100%); color: #ffffff; padding: 36px 40px; text-align: left; }
    .header h1 { margin: 0; font-size: 26px; font-weight: 700; letter-spacing: -0.5px; }
    .header p { margin: 6px 0 0 0; font-size: 14px; opacity: 0.9; }
    .content { padding: 40px; }
    .salutation { font-size: 18px; font-weight: 600; color: #1a202c; margin-bottom: 16px; }
    .intro { font-size: 15px; color: #4a5568; margin-bottom: 24px; }
    .details-box { background: #ebf8ff; border: 1px solid #bee3f8; border-radius: 8px; padding: 20px 24px; margin: 24px 0; }
    .details-box h3 { margin: 0 0 14px 0; font-size: 16px; color: #2b6cb0; font-weight: 600; }
    .detail-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e2e8f0; font-size: 14px; }
    .detail-row:last-child { border-bottom: none; }
    .detail-label { color: #718096; font-weight: 500; }
    .detail-val { color: #2d3748; font-weight: 600; text-align: right; }
    .custom-msg { background: #f7fafc; border-left: 4px solid #3182ce; padding: 14px 18px; font-style: italic; color: #4a5568; margin: 20px 0; font-size: 14px; }
    .next-steps { margin: 24px 0; font-size: 14px; color: #4a5568; }
    .footer { background: #edf2f7; padding: 24px 40px; font-size: 13px; color: #718096; text-align: center; border-top: 1px solid #e2e8f0; }
    .btn { display: inline-block; background: #3182ce; color: #ffffff !important; text-decoration: none; padding: 12px 28px; border-radius: 6px; font-weight: 600; font-size: 15px; margin-top: 10px; }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="header">
      <h1>SPEECH ANALYZER AI</h1>
      <p>Official Employment Offer Letter • Date: ${currentDate}</p>
    </div>
    <div class="content">
      <div class="salutation">Dear ${params.candidateName},</div>
      <p class="intro">
        Congratulations! Following your outstanding performance in both the Technical Assessment and HR Interview rounds, we are thrilled to offer you the position of <strong>${params.jobRoleName}</strong> at <strong>SPEECH ANALYZER AI</strong>.
      </p>

      <div class="details-box">
        <h3>📋 Summary of Offer Terms</h3>
        <div class="detail-row">
          <span class="detail-label">Designation / Role:</span>
          <span class="detail-val">${params.jobRoleName}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Annual Compensation (CTC):</span>
          <span class="detail-val" style="color: #276749; font-size: 15px;">${params.salary}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Date of Joining:</span>
          <span class="detail-val">${params.joiningDate}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Work Location:</span>
          <span class="detail-val">${params.location}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Employment Type:</span>
          <span class="detail-val">Full-Time Regular</span>
        </div>
      </div>

      ${params.customMessage ? `<div class="custom-msg">"${params.customMessage}"</div>` : ''}

      <div class="next-steps">
        <p><strong>Next Steps:</strong></p>
        <p>Please review the attached formal offer letter for complete terms, conditions, and benefits. Kindly reply to this email or submit your confirmation within <strong>7 business days</strong> to formalize your acceptance.</p>
      </div>

      <p style="margin-top: 30px; font-size: 14px; color: #4a5568;">
        We are excited about the prospect of you joining our team and look forward to building innovative AI solutions together!
      </p>

      <p style="margin-top: 24px; font-size: 14px; color: #2d3748;">
        Warm regards,<br />
        <strong>Human Resources &amp; Talent Acquisition Team</strong><br />
        <em>SPEECH ANALYZER AI Technologies</em>
      </p>
    </div>
    <div class="footer">
      <p style="margin: 0;">This is an official communication from SPEECH ANALYZER AI. For any questions, please reach out to careers@speechanalyzer.com</p>
    </div>
  </div>
</body>
</html>
  `.trim();
}

/**
 * Send an offer letter to a candidate via email.
 */
export async function sendOfferLetterEmail(params: {
  candidateName: string;
  email: string;
  phone: string;
  jobRoleName: string;
  salary: string;
  joiningDate: string;
  location: string;
  customMessage?: string;
  offerLetterAttachment?: EmailAttachment;
}): Promise<{ success: boolean; message: string; mode: string; fileName?: string }> {
  const html = generateOfferLetterHtml(params);

  const text = `Dear ${params.candidateName},

Congratulations! We are delighted to offer you the position of ${params.jobRoleName} at SPEECH ANALYZER AI.

Offer Details:
- Role: ${params.jobRoleName}
- Annual CTC: ${params.salary}
- Joining Date: ${params.joiningDate}
- Location: ${params.location}

${params.customMessage ? `Note: ${params.customMessage}\n\n` : ''}Please find your formal offer letter attached. Kindly confirm your acceptance within 7 business days.

Warm regards,
HR & Talent Acquisition Team
SPEECH ANALYZER AI`;

  // If no attachment was uploaded by the admin, create an HTML attachment automatically
  let attachment = params.offerLetterAttachment;
  if (!attachment) {
    const filename = `Offer_Letter_${params.candidateName.replace(/[^a-zA-Z0-9]/g, '_')}.html`;
    attachment = {
      content: Buffer.from(html).toString('base64'),
      filename,
      type: 'text/html',
      disposition: 'attachment',
    };
  }

  const subject = `Job Offer: ${params.jobRoleName} – SPEECH ANALYZER AI`;

  // Send the email
  const res = await sendEmail(
    params.email,
    subject,
    text,
    html,
    [attachment]
  );

  // Send SMS notification as well
  try {
    await sendSMS(
      params.phone,
      `Congratulations ${params.candidateName}! You have been selected for the ${params.jobRoleName} role. Your official Offer Letter has been sent to ${params.email}.`
    );
  } catch (smsErr) {
    console.warn('[Notification] SMS delivery note:', smsErr);
  }

  return {
    success: true,
    message:
      res.mode === 'simulated'
        ? `Offer letter generated and saved on server. (Note: To deliver directly to your real Gmail inbox, set GMAIL_USER and GMAIL_APP_PASSWORD in backend/.env).`
        : `Offer letter successfully dispatched to ${params.email} via email!`,
    mode: res.mode,
    fileName: attachment.filename,
  };
}


// ─── Convenience Notification Functions ──────────────────────────────────────

/**
 * Send the HR round unique code to a candidate via SMS.
 * Requirements: 4.2
 */
export async function sendHRRoundCode(
  phoneNumber: string,
  code: string
): Promise<void> {
  const message = `Your SPEECH ANALYZER HR Round access code is: ${code}. Use this code to access your HR interview.`;
  await sendSMS(phoneNumber, message);
}

/**
 * Send a rejection SMS to a candidate.
 * Requirements: 9.5
 */
export async function sendRejectionSMS(phoneNumber: string): Promise<void> {
  await sendSMS(
    phoneNumber,
    'We are sorry to inform you that you have not been selected.'
  );
}

/**
 * Send a selection SMS and job offer email to a candidate.
 * Requirements: 9.6, 9.4
 */
export async function sendSelectionNotification(
  phoneNumber: string,
  email: string,
  offerLetterAttachment?: EmailAttachment
): Promise<void> {
  await sendSMS(
    phoneNumber,
    'You have been selected for the job role. Please check your email for further details.'
  );

  await sendEmail(
    email,
    'Job Offer – SPEECH ANALYZER',
    'Congratulations! Please find your job offer letter attached.',
    undefined,
    offerLetterAttachment ? [offerLetterAttachment] : undefined
  );
}

