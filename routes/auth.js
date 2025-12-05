const express = require("express");
const router = express.Router();

const userModel = require("../models/user");
const bcrypt = require("bcrypt");

const { setCookie, redirectIfLoggedIn } = require("../middleware/auth");

// --- Signup Routes ---
router.get("/signup", redirectIfLoggedIn, (req, res) => {
  res.render("signup");
});

router.post("/signup", async (req, res) => {
  try {
    const { firstname, lastname, gender, email, password, phone, address } = req.body;

    const existingUser = await userModel.findOne({ email });
    if (existingUser) {
      return res.status(400).send(`
        <html>
          <head>
            <meta http-equiv="refresh" content="2;url=/login">
            <title>User Exists!</title>
            <style>
              body { font-family: sans-serif; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; background-color: #f0f0f0; }
              h1 { color: #dc3545; border: 1px solid #dc3545; padding: 20px; border-radius: 8px; background-color: #f8d7da; }
            </style>
          </head>
          <body>
            <h1>User Already exists, Redirecting to Login...</h1>
          </body>
        </html>
      `);
    }

    // Hash password
    const hash = await bcrypt.hash(password, 12);

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000);

    const newUser = await userModel.create({
      firstname,
      lastname,
      gender,
      email,
      password: hash,
      phone,
      address,
      isVerified: false,
      otp,
      otpExpires: Date.now() + 5 * 60 * 1000 // 5 minutes
    });

    // ===== Send OTP Email =====
    const nodemailer = require("nodemailer");

    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.MAIL_USER,
        pass: process.env.MAIL_PASS
      }
    });

    await transporter.sendMail({
      from: "Vircosa <no-reply@vircosa.com>",
      to: newUser.email,
      subject: "Verify Your Email - OTP Code",
      text: `Your OTP is: ${otp}. It expires in 5 minutes.`
    });

    // Redirect to verification page
    return res.redirect(`/verify-email?email=${email}`);

  } catch (err) {
    console.error(err);
    res.status(500).send("Server Error");
  }
});

// --- Login Routes ---
router.get("/login", redirectIfLoggedIn, (req, res) => {
  res.render("login");
});

router.post("/login", async (req, res) => {
  let { email, password } = req.body;
  let existingUser = await userModel.findOne({ email });

  if (!existingUser) {
    return res.status(401).send("User not found");
  }

  if (!existingUser.isVerified) {
    return res.status(401).send(`
        <html>
          <head>
            <meta http-equiv="refresh" content="2;url=/login">
            <title>Invalid Credentials!</title>
            <style>
              body { font-family: sans-serif; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; background-color: #f0f0f0; }
              h1 { color: #dc3545; border: 1px solid #dc3545; padding: 20px; border-radius: 8px; background-color: #f8d7da; }
            </style>
          </head>
          <body>
            <h1>Invalid Credentials, Redirecting...</h1>
          </body>
        </html>
`);
  }

  try {
    const compare = await bcrypt.compare(password, existingUser.password);

    if (!compare) {
      return res.status(401).send(`
        <html>
          <head>
            <meta http-equiv="refresh" content="2;url=/login">
            <title>Invalid Credentials!</title>
            <style>
              body { font-family: sans-serif; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; background-color: #f0f0f0; }
              h1 { color: #dc3545; border: 1px solid #dc3545; padding: 20px; border-radius: 8px; background-color: #f8d7da; }
            </style>
          </head>
          <body>
            <h1>Invalid Credentials, Redirecting...</h1>
          </body>
        </html>
`);
    }

    setCookie(existingUser, res, "login");
  } catch (err) {
    console.error("Login Error:", err);
    return res.status(500).send("A server error occurred during login.");
  }
});

router.get("/verify-email", async (req, res) => {
  const email = req.query.email;
  let user = await userModel.findOne({ email });

  res.render("verify-email", { email, user });
});

router.post("/verify-email", async (req, res) => {
  const { email, otp } = req.body;

  const user = await userModel.findOne({ email });
  if (!user) return res.send("User not found");

  if (user.lastOtpSent && Date.now() - user.lastOtpSent < 30 * 1000) {
  return res.status(429).json({ message: "Try again after 30 seconds" });
}

user.lastOtpSent = Date.now();

  if (user.isVerified) return res.redirect("/dashboard");

  if (user.otp !== otp) return res.send("Invalid OTP");

  if (user.otpExpires < Date.now()) return res.send("OTP expired");

  user.isVerified = true;
  user.otp = undefined;
  user.otpExpires = undefined;

  await user.save();

  // Create session cookie
  setCookie(user, res, "signup");
});

router.post("/resend-otp", async (req, res) => {
  try {
    const { email } = req.body;

    const user = await userModel.findOne({ email });
    if (!user) return res.status(404).json({ message: "User not found" });

    if (user.isVerified)
      return res.status(400).json({ message: "User already verified" });

    // Generate NEW OTP
    const otp = Math.floor(100000 + Math.random() * 900000);

    user.otp = otp;
    user.otpExpires = Date.now() + 5 * 60 * 1000; // new 5 min timer
    await user.save();

    // Send email again
    const nodemailer = require("nodemailer");
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.MAIL_USER,
        pass: process.env.MAIL_PASS
      }
    });

    await transporter.sendMail({
      from: "Vircosa <no-reply@vircosa.com>",
      to: email,
      subject: "Your New Verification Code",
      text: `Your new OTP is: ${otp}. It expires in 5 minutes.`
    });

    return res.json({ message: "OTP resent successfully" });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

router.get("/forget-password", (req, res) => {
  res.send("Please contact us at: +92-3081036864 <b> WhatsApp Only!");
});

router.get("/logout", (req, res) => {
  res.cookie("token", "");
  res.redirect("/login");
});

module.exports = router;