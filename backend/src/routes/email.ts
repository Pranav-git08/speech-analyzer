import { Router, Request, Response } from 'express';
import { sendEmail } from '../services/notificationService';

const router = Router();

router.post('/send-otp', async (req: Request, res: Response) => {
  try {
    const { email, code, fullName } = req.body;
    if (!email || !code) {
      return res.status(400).json({ error: 'Email and OTP code are required.' });
    }

    const subject = `Your VOXIS.AI Verification Code: ${code}`;
    const text = `Hi ${fullName || 'Candidate'},\n\nYour 6-digit verification OTP is: ${code}\n\nPlease enter this code to verify your email address.\n\nBest,\nVOXIS AI Security`;
    
    const result = await sendEmail(email, subject, text);
    res.json(result);
  } catch (error) {
    console.error('Error sending OTP email:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/send-admin', async (req: Request, res: Response) => {
  try {
    const { email, subject, body } = req.body;
    if (!email || !subject || !body) {
      return res.status(400).json({ error: 'Email, subject, and body are required.' });
    }

    const result = await sendEmail(email, subject, body);
    res.json(result);
  } catch (error) {
    console.error('Error sending Admin email:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
