const router = require("express").Router();
const { OAuth2Client } = require("google-auth-library");
const userModel = require("../models/user");
const { setCookie } = require("../middleware/auth");

// initialize OAuth2 client
const client = new OAuth2Client(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
);

// Step 1: Redirect to Google Login
router.get("/google", (req, res) => {
  const redirectURL = client.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: ["email", "profile"],
    redirect_uri: process.env.GOOGLE_REDIRECT_URI,
  });

  res.redirect(redirectURL);
});

// Step 2: Google Callback
router.get("/google/callback", async (req, res) => {
  try {
    const code = req.query.code;

    // EXCHANGE THE CODE — Must include client_secret
    const { tokens } = await client.getToken({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID,
      client_secret: process.env.GOOGLE_CLIENT_SECRET,
      redirect_uri: process.env.GOOGLE_REDIRECT_URI,
      grant_type: "authorization_code"
    });

    client.setCredentials(tokens);

    const ticket = await client.verifyIdToken({
      idToken: tokens.id_token,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();

    const email = payload.email;
    const firstname = payload.given_name || "User";
    const lastname = payload.family_name || " ";
    const picture = payload.picture;

    let user = await userModel.findOne({ email });

    // Create user if doesn't exist
    if (!user) {
      user = await userModel.create({
        firstname,
        lastname,
        gender: "o",
        email,
        password: "GOOGLE_LOGIN",
        phone: "",
        address: "",
        profilePicture: picture,
        isVerified: true,
      });
    }

    // Login user
    return setCookie(user, res, "login");

  } catch (err) {
    console.log("GOOGLE CALLBACK ERROR:", err.response?.data || err.message);
    return res.redirect("/login");
  }
});

module.exports = router;
