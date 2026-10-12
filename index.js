require("dotenv").config();

const express = require("express");
const cors = require("cors");
const nodemailer = require("nodemailer");

const app = express();

const corsOptions = {
  origin: process.env.FRONTEND_URL
};

app.use(cors(corsOptions));
app.use(express.json());

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

const emailTemplate = (message, recipient) => ({
  from: process.env.EMAIL_USER,
  to: recipient,
  subject: "You get Text Message from Your App!",
  text: message
});

async function sendMails({ message, emailList }) {
  for (const recipient of emailList) {
    await transporter.sendMail(
      emailTemplate(message, recipient)
    );

    console.log(`Email sent to ${recipient}`);
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
        error: "Message and email list are required"
      });
    }

    await sendMails({ message, emailList });

    return res.json(true);
  } catch (error) {
    console.error("Email sending error:", error.message);

    return res.status(500).json({
      error: "Failed to send emails. Check backend logs."
    });
  }
});

app.listen(5000, () => {
  console.log("Server Started on port 5000");
});

console.log("EMAIL_USER loaded:", Boolean(process.env.EMAIL_USER));
console.log("EMAIL_PASS loaded:", Boolean(process.env.EMAIL_PASS));