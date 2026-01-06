const express = require('express');
const path = require('path');
const app = express();
const PORT = 3000;

// Serve static files from public folder
app.use(express.static('public'));

// Endpoint to download resume
app.get('/', (req, res) => {
  const filePath = path.join(__dirname, 'public', 'UsmanSr_Résume.pdf');
  res.download(filePath, 'UsmanSr_Résume.pdf', err => {
    if (err) {
      console.error("Download failed:", err);
      res.status(500).send("Something went wrong.");
    }
  });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
