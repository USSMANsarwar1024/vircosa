const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  host: "smtp.zoho.com",
  port: 587,
  secure: false, // TLS via STARTTLS
  auth: {
    user: process.env.MAIL_USER, // support@vircosa.com
    pass: process.env.MAIL_PASS  // Zoho App Password
  }
});

module.exports = transporter;
