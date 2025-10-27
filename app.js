const express = require('express');
const app = express();
require("dotenv").config();
const cookieParser = require('cookie-parser');
const PORT = process.env.PORT || 3000;

// --- Middleware ---
app.set('view engine', 'ejs'); 
app.use(express.static("public"));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// --- Routes ---
app.get("/", (req, res) => {
  res.render("index");
});

app.get('/login', (req, res) => {
  res.render('login')
})

app.post('/login', (req, res) => {

})

app.get('/forget-password', () => {

})

// --- Server Start ---
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
