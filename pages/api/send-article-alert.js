import nodemailer from "nodemailer";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({
      success: false,
      error: "Method not allowed",
    });
  }

  const { title, content, email, authorName } = req.body;

  if (!title || !email) {
    return res.status(400).json({
      success: false,
      error: "Missing title or email",
    });
  }

  const emailUser = process.env.EMAIL_USER;
  const emailPass = process.env.EMAIL_PASS || process.env.EMAIL_APP_PASSWORD;

  if (!emailUser || !emailPass) {
    return res.status(500).json({
      success: false,
      error: "Missing EMAIL_USER or EMAIL_PASS",
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
      from: `"ML Hub Article Alert" <${emailUser}>`,
      to: emailUser,
      subject: `New Article Posted: ${title}`,
      html: `
        <h2>New Article Posted</h2>

        <p><strong>Posted by:</strong> ${authorName || "Unknown User"}</p>
        <p><strong>Email:</strong> ${email}</p>
        <p><strong>Time posted:</strong> ${new Date().toLocaleString("en-PH", {
          timeZone: "Asia/Manila",
        })}</p>

        <hr />

        <p><strong>Article title:</strong></p>
        <p>${title}</p>

        <p><strong>Article content:</strong></p>
        <p>${content || "No content provided."}</p>
      `,
    });

    return res.status(200).json({
      success: true,
    });
  } catch (error) {
    console.error("Article email error:", error);

    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
}