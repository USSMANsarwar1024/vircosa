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
    const { firstname, lastname, gender, email, password, phone, address } =
      req.body;

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

    const hash = await bcrypt.hash(password, 12);
    const newUser = await userModel.create({
      firstname,
      lastname,
      gender,
      email,
      password: hash,
      phone,
      address,
    });

    setCookie(newUser, res, "signup");
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

router.get("/forget-password", (req, res) => {
  res.send("Please contact us at: +92-3081036864 <b> WhatsApp Only!");
});

router.get("/logout", (req, res) => {
  res.cookie("token", "");
  res.redirect("/login");
});

module.exports = router;