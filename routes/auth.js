const express = require("express");
const router = express.Router();
const multer = require("multer");
const userModel = require("../models/user");
const bcrypt = require("bcrypt");
const fs = require("fs");
const path = require("path");

const { setCookie, redirectIfLoggedIn } = require("../middleware/auth");
const transporter = require("../config/mailer");

// ============================
// Multer storage configuration
// ============================
const uploadDir = path.join(__dirname, "..", "public", "uploads", "userPictures");
fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const unique = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, unique + "-" + file.originalname.replace(/\s+/g, "_"));
  },
});
const upload = multer({ storage });


// --- Signup Routes ---
router.get("/signup", redirectIfLoggedIn, (req, res) => {
  res.render("signup");
});

router.post("/signup", upload.single("profilePicture"), async (req, res) => {
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
      otpExpires: Date.now() + 5 * 60 * 1000, // 5 minutes
      profilePicture: req.file ? `/uploads/userPictures/${req.file.filename}` : undefined,
    });

    // console.log("FILE:", req.file);

    // Send verification email
    const mailFrom = process.env.MAIL_FROM || process.env.MAIL_USER;

    const mailInfo = await transporter.sendMail({
      from: mailFrom,
      to: newUser.email,
      subject: "Verify Your Email — Vircosa",
      html: `
        <!DOCTYPE html>
        <html>
        <body style="margin:0;padding:0;background:#F5F2EF;font-family:Montserrat,Arial,sans-serif;">
          <div style="max-width:600px;margin:40px auto;background:#ffffff;border-radius:12px;overflow:hidden;">
            
            <!-- Header -->
            <div style="background:#8B5A2B;color:#fff;padding:30px;text-align:center;">
              <h1 style="margin:0;font-weight:600;">Verify Your Email</h1>
              <p style="margin:8px 0 0;font-size:14px;opacity:.9;">Welcome to Vircosa</p>
            </div>

            <!-- Body -->
            <div style="padding:30px;color:#333;">
              <p>Hello <strong>${newUser.firstname}</strong>,</p>
              <p>Use the verification code below to complete your signup.</p>

              <!-- OTP BOX -->
              <div style="
                margin:30px auto;
                text-align:center;
                font-size:32px;
                letter-spacing:10px;
                font-weight:600;
                background:#FFF8F0;
                padding:18px 10px;
                border-radius:10px;
                border:1px dashed #8B5A2B;
                user-select:all;
              ">
                ${otp}
              </div>

              <p style="text-align:center;font-size:14px;color:#666;">
                Tip: Double-click the code to copy it
              </p>

              <p style="margin-top:25px;">
                This code expires in <strong>5 minutes</strong>.
                For security reasons, never share it with anyone.
              </p>

              <p style="margin-top:30px;">
                —<br>
                <strong>Vircosa Support Team</strong>
              </p>
            </div>

            <!-- Footer -->
            <div style="background:#F8F5F2;padding:15px;text-align:center;font-size:12px;color:#777;">
              © ${new Date().getFullYear()} Vircosa. All rights reserved.
            </div>

          </div>
        </body>
        </html>
        `
      });

    // Log for troubleshooting email delivery (does not expose secrets)
    // console.log("Signup mail queued", { to: newUser.email, messageId: mailInfo.messageId });



    // Redirect to verification page
    return res.redirect(`/verify-email?email=${email}`);

  } catch (err) {
    console.error(err);
    res.status(500).send("Server Error, Please contact support.<br>support@vircosa.com");
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
    return res.status(500).send("Server Error, Please contact support.<br>support@vircosa.com");
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
    await transporter.sendMail({
      from: process.env.MAIL_FROM,
      to: email,
      subject: "Your New Verification Code",
      text: `Your new OTP is: ${otp}. It expires in 5 minutes.`
    });


    return res.json({ message: "OTP resent successfully" });

  } catch (err) {
    res.status(500).json({ message: "Server Error, Please contact support.<br>support@vircosa.com" });
  }
});

router.get("/forget-password", (req, res) => {
  // res.send("Please contact us at: support@vircosa.com <b> for password assistance.</b>");
  res.render("forget-password");
});

router.get("/logout", (req, res) => {
  res.cookie("token", "");
  res.redirect("/login");
});

module.exports = router;