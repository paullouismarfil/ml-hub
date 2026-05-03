import nodemailer from 'nodemailer';

function isValidEmail(email) {
  return typeof email === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  const { email, deviceName } = req.body;

  if (!isValidEmail(email)) {
    return res.status(400).json({ success: false, error: 'Invalid email address' });
  }

  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    console.error('Missing EMAIL_USER or EMAIL_PASS in .env.local');

    return res.status(500).json({
      success: false,
      error: 'Email credentials missing. Check .env.local.',
    });
  }

  try {
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    await transporter.sendMail({
      from: `"ML Hub Security" <${process.env.EMAIL_USER}>`,
      to: process.env.EMAIL_USER,
      subject: 'Login Security Alert - ML Hub',
      html: `
        <h2>Login Security Alert</h2>
        <p>Someone logged in.</p>
        <p><strong>Email:</strong> ${email}</p>
        <p><strong>Device:</strong> ${deviceName || 'Unknown device'}</p>
        <p><strong>Date:</strong> ${new Date().toLocaleString()}</p>
      `,
    });

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('Login email error:', error);

    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
}