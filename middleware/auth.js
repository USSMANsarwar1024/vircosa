const jwt = require("jsonwebtoken");// Note: You might need to import your user model and other utils here
const userModel = require("../models/user"); 
const bcrypt = require("bcrypt"); 

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

async function isLoggedIn(req, res, next) {
  const token = req.cookies.token;
  if (!token) return res.redirect("/login");

  try {
    const data = jwt.verify(token, process.env.JWT_SECRET);
    const user = await userModel.findById(data.userId);
    if (!user) {
      res.clearCookie("token");
      return res.redirect("/login");
    }

    req.user = user; // ✅ full user document now
    next();
  } catch (err) {
    console.log(err);
    res.clearCookie("token");
    res.redirect("/login");
  }
}


function redirectIfLoggedIn(req, res, next) {
    const token = req.cookies.token;
    if (token) {
        try {
            jwt.verify(token, process.env.JWT_SECRET);
            return res.redirect("/dashboard"); // Redirect if user is authenticated
        } catch (err) {
            // Token invalid/expired, continue to next() to show login/signup
        }
    }
    next();
}


module.exports = {
    setCookie,
    isLoggedIn,
    redirectIfLoggedIn
};