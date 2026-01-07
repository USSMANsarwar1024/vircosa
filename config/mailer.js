// config/mailer.js
const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  host: "smtp.zoho.com",
  port: 465,
  secure: true, // TLS via STARTTLS
  auth: {
    user: process.env.MAIL_USER, // support@vircosa.com
    pass: process.env.MAIL_PASS  // Zoho App Password
  }
});

// Self-test the transporter once at startup
// transporter.verify()
//   .then(() => console.log("Mailer ready: SMTP connection verified"))
//   .catch((err) => console.error("Mailer verify failed:", err.message));

module.exports = transporter;
