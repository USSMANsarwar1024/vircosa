const express = require('express');
const app = express();
require("dotenv").config();
const cookieParser = require('cookie-parser'); // you’re using it later, so import it
const PORT = process.env.PORT || 3000;

// --- Middleware ---
app.set('view engine', 'ejs'); // ✅ Correct way to set EJS
app.use(express.static("public"));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// --- Routes ---
app.get("/", (req, res) => {
  res.render("index");
});

// --- Server Start ---
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
