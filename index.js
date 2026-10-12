
require("dotenv").config();

const express = require("express");
const cors = require("cors");
const nodemailer = require("nodemailer");

const app = express();

// Allow local development and deployed Vercel frontend
const allowedOrigins = [
  "http://localhost:3000",
  "https://bulkmail-frontend-silk.vercel.app"
];

const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests without an Origin header and approved frontend URLs
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  methods: ["GET", "POST", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"]
};

app.use(cors(corsOptions));
app.use(express.json());

// Gmail transporter
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

// Email template
const emailTemplate = (message, recipient) => ({
  from: process.env.EMAIL_USER,
  to: recipient,
  subject: "You get a Text Message from Your App!",
  text: message
});

// Send emails one by one
async function sendMails({ message, emailList }) {
  for (const recipient of emailList) {
    await transporter.sendMail(
      emailTemplate(message, recipient)
    );

    console.log(`Email sent to ${recipient}`);
  }
}

// Health-check route
app.get("/", (req, res) => {
  res.status(200).send("BulkMail Backend is running!");
});

// Send email route
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
        error: "Message and email list are required"
      });
    }

    // Validate recipient email addresses
    const validEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    const invalidEmails = emailList.filter(
      email =>
        typeof email !== "string" ||
        !validEmail.test(email.trim())
    );

    if (invalidEmails.length > 0) {
      return res.status(400).json({
        error: "Invalid email addresses found"
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
    console.error("Email sending error:", error.message);

    return res.status(500).json({
      success: false,
      error: "Failed to send emails. Check backend logs."
    });
  }
});

// Start server using Render's assigned port
const PORT = process.env.PORT || 5000;

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server Started on port ${PORT}`);
  console.log("EMAIL_USER loaded:", Boolean(process.env.EMAIL_USER));
  console.log("EMAIL_PASS loaded:", Boolean(process.env.EMAIL_PASS));
});
