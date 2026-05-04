import nodemailer from "nodemailer";

function isValidEmail(email) {
  return typeof email === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ success: false, error: "Method not allowed" });
  }

  const { email } = req.body;

  if (!isValidEmail(email)) {
    return res.status(400).json({
      success: false,
      error: "Invalid email address",
    });
  }

  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    return res.status(500).json({
      success: false,
      error: "Missing EMAIL_USER or EMAIL_PASS in .env.local",
    });
  }

  try {
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    await transporter.sendMail({
      from: `"ML Hub Security" <${process.env.EMAIL_USER}>`,
      to: process.env.EMAIL_USER,
      subject: "New Signup Notification - ML Hub",
      html: `
        <h2>New User Signup</h2>
        <p>A new user registered.</p>
        <p><strong>Email:</strong> ${email}</p>
        <p><strong>Date:</strong> ${new Date().toLocaleString("en-PH", {
          timeZone: "Asia/Manila",
        })}</p>
      `,
    });

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error("Signup email error:", error);

    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
}