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
});

app.post('/login', (req, res) => {

});

app.get('/forget-password', () => {

});

app.get('/products', (req, res) => {
  res.render('products');
});

app.get('/signup', (req, res) => {
  res.render('signup');
});

app.get('/about-us', (req, res) => {
  res.render('about-us');
})

// --- Server Start ---
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
