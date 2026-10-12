
require("dotenv").config();

const express = require("express");
const cors = require("cors");
const { google } = require("googleapis");

const app = express();

const allowedOrigins = [
  "http://localhost:3000",
  "http://localhost:5173",
  "https://bulkmail-frontend-silk.vercel.app"
];

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(new Error("Not allowed by CORS"));
    },
    methods: ["GET", "POST", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"]
  })
);

app.use(express.json({ limit: "1mb" }));

// OAuth 2.0 client
const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET
);

oauth2Client.setCredentials({
  refresh_token: process.env.GOOGLE_REFRESH_TOKEN
});

// Gmail API client
const gmail = google.gmail({
  version: "v1",
  auth: oauth2Client
});

app.get("/", (req, res) => {
  res.status(200).send("BulkMail Backend is running!");
});

// Encode an email message in Base64URL format
function createRawEmail(message, recipient) {
  const from = process.env.EMAIL_USER;

  const mimeMessage = [
    `From: ${from}`,
    `To: ${recipient}`,
    "Subject: You get a Text Message from Your App!",
    "MIME-Version: 1.0",
    'Content-Type: text/plain; charset="UTF-8"',
    "Content-Transfer-Encoding: base64",
    "",
    Buffer.from(message, "utf8").toString("base64")
  ].join("\r\n");

  return Buffer.from(mimeMessage, "utf8")
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

async function sendMails({ message, emailList }) {
  for (const recipient of emailList) {
    const raw = createRawEmail(message, recipient);

    await gmail.users.messages.send({
      userId: "me",
      requestBody: { raw }
    });

    console.log("Email sent successfully.");
  }
}

app.post("/sendemail", async (req, res) => {
  try {
    const { message, emailList } = req.body;

    if (
      typeof message !== "string" ||
      !message.trim() ||
      !Array.isArray(emailList) ||
      emailList.length === 0
    ) {
      return res.status(400).json({
        success: false,
        error: "Message and email list are required"
      });
    }

    const validEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    const invalidEmails = emailList.filter(
      email =>
        typeof email !== "string" ||
        !validEmail.test(email.trim())
    );

    if (invalidEmails.length > 0) {
      return res.status(400).json({
        success: false,
        error: "Invalid email addresses found"
      });
    }

    if (
      !process.env.EMAIL_USER ||
      !process.env.GOOGLE_CLIENT_ID ||
      !process.env.GOOGLE_CLIENT_SECRET ||
      !process.env.GOOGLE_REFRESH_TOKEN
    ) {
      console.error("Required Gmail API environment variables are missing.");

      return res.status(500).json({
        success: false,
        error: "Gmail API configuration is incomplete."
      });
    }

    await sendMails({
      message: message.trim(),
      emailList: emailList.map(email => email.trim())
    });

    return res.status(200).json({
      success: true,
      message: "All emails sent successfully"
    });
  } catch (error) {
    // Log diagnostic information, never credentials or tokens.
    console.error(
      "Gmail API error:",
      error.response?.data?.error?.message ||
      error.message ||
      "Unknown error"
    );

    return res.status(500).json({
      success: false,
      error: "Failed to send emails. Check backend logs."
    });
  }
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server Started on port ${PORT}`);
  console.log(
    "Gmail API configuration present:",
    Boolean(
      process.env.GOOGLE_CLIENT_ID &&
      process.env.GOOGLE_CLIENT_SECRET &&
      process.env.GOOGLE_REFRESH_TOKEN &&
      process.env.EMAIL_USER
    )
  );
});
