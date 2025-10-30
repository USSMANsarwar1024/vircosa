const express = require("express");
const app = express();
require("dotenv").config();

const userModel = require("./models/user");
const PORT = process.env.PORT || 3000;

const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const cookieParser = require("cookie-parser");

// --- Middleware ---
app.set("view engine", "ejs");
app.use(express.static("public"));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// --- Routes ---
app.get("/", (req, res) => {
  res.render("index");
});

app.get("/signup", (req, res) => {
  res.render("signup");
});

app.post("/signup", async (req, res) => {
  try {
    const { firstname, lastname, gender, email, password, phone, address } =
      req.body;

    const existingUser = await userModel.findOne({ email });
    if (existingUser) {
      return res.status(400).send(`
        <html>
          <head>
            <meta http-equiv="refresh" content="2;url=/login">
            <title>Success!</title>
            <style>
              body { font-family: sans-serif; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; background-color: #f0f0f0; }
              h1 { color: #28a745; border: 1px solid #28a745; padding: 20px; border-radius: 8px; background-color: #e9f7ef; }
            </style>
          </head>
          <body>
            <h1>User Already exists, Redirecting...</h1>
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
    // successful user signup
    // cookie-saved at frontend
    // user saved in mongo-db
  } catch (err) {
    console.error(err);
    res.status(500).send("Server Error");
  }
});

app.get("/login", (req, res) => {
  res.render("login");
});

app.post("/login", (req, res) => {});

app.get("/forget-password", () => {});

app.get("/products", (req, res) => {
  res.render("products");
});

app.get("/about-us", (req, res) => {
  res.render("about-us");
});

app.get("/contact-us", (req, res) => {
  res.render("contact-us");
});

function setCookie(user, res, action) {
  const token = jwt.sign(
    { email: user.email, userId: user._id },
    process.env.JWT_SECRET
  );
  res.cookie("token", token, { httpOnly: true });

  let message;
  if (action === "signup") {
    message = "User Registered Successfully!";
  } else if (action === "login") {
    message = "Login Successful!";
  } else {
    message = "Action Successful!";
  }

  res.status(200).send(`
  <html>
    <head>
      <meta http-equiv="refresh" content="2;url=/dashboard">
      <title>Success!</title>
      <style>
        body { font-family: sans-serif; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; background-color: #f0f0f0; }
        h1 { color: #28a745; border: 1px solid #28a745; padding: 20px; border-radius: 8px; background-color: #e9f7ef; }
      </style>
    </head>
    <body>
      <h1>${message}, Redirecting...</h1>
    </body>
  </html>
`);
}

// --- Server Start ---
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
