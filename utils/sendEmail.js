const nodemailer = require("nodemailer");

const sendEmail = async (options) => {
    const transporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS
        }
    });

    await transporter.sendMail({
        from: `"Vircosa Orders" <${process.env.SMTP_USER}>`,
        to: options.to,
        subject: options.subject,
        html: options.html
    });
};

module.exports = sendEmail;
