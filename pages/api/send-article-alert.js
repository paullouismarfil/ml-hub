import nodemailer from "nodemailer";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({
      success: false,
      error: "Method not allowed",
    });
  }

  const { title, email } = req.body;

  const emailUser = process.env.EMAIL_USER;
  const emailPass = process.env.EMAIL_PASS || process.env.EMAIL_APP_PASSWORD;

  if (!emailUser || !emailPass) {
    return res.status(500).json({
      success: false,
      error: "Missing email credentials",
    });
  }

  try {
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: emailUser,
        pass: emailPass,
      },
    });

    await transporter.sendMail({
      from: `"ML Hub" <${emailUser}>`,
      to: emailUser,
      subject: "New Article Published - ML Hub",
      html: `
        <h2>New Article Published</h2>
        <p><strong>Title:</strong> ${title}</p>
        <p><strong>Published by:</strong> ${email}</p>
        <p><strong>Date:</strong> ${new Date().toLocaleString()}</p>
      `,
    });

    return res.status(200).json({
      success: true,
    });
  } catch (error) {
    console.error("Article email error:", error);

    return res.status(500).json({
      success: false,
      error: "Failed to send article notification",
    });
  }
}