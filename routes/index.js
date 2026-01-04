const express = require("express");
const router = express.Router();
const product = require("../models/product");
const Contact = require("../models/contactMessage");
const newsletterModel = require("../models/newsletter");
const transporter = require("../config/mailer");

router.get("/", async (req, res) => {
  const products = await product.find();
  res.render("index", { products, req });
});

router.get("/sitemap.xml", async (req, res) => {
  const products = await product.find(
    { slug: { $exists: true, $ne: "" } },
    "slug"
  );

  res.header("Content-Type", "application/xml");

  res.send(`<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${products.map(p => `
<url>
  <loc>https://vircosa.com/products/product-details/${p.slug}</loc>
</url>`).join("")}
</urlset>`);
});


router.get("/about-us", (req, res) => {
  res.render("about-us", { req });
});

router.get("/contact-us", (req, res) => {
  res.render("contact-us", { req });
});

router.post("/contact-us", async (req, res) => {
  try {
    const { firstName, lastName, email, phone, topic, message } = req.body;

    if (!firstName || !email || !message) {
      return res.status(400).json({ message: "Required fields missing" });
    }

    // Save to DB
    await Contact.create({
      firstName,
      lastName,
      email,
      phone,
      topic,
      message
    });

    // Email 1: Send notification to admin
    await transporter.sendMail({
      from: `"Vircosa" <${process.env.MAIL_USER}>`,
      to: "support@vircosa.com",
      bcc: "ceo@vircosa.com",
      replyTo: email,
      subject: `New Contact Inquiry | ${topic || "General"}`,
      html: `
        <div style="font-family: 'Montserrat', Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #8B5A2B;">New Contact Message</h2>
          <div style="background-color: #F8F5F2; padding: 20px; border-radius: 10px;">
            <p><strong>Name:</strong> ${firstName} ${lastName}</p>
            <p><strong>Email:</strong> ${email}</p>
            <p><strong>Phone:</strong> ${phone || "Not provided"}</p>
            <p><strong>Topic:</strong> ${topic || "Not specified"}</p>
            <p><strong>Message:</strong><br>${message}</p>
          </div>
        </div>
      `
    });


    // Email 2: Send confirmation to user
    await transporter.sendMail({
      from: `"Vircosa Customer Care" <${process.env.MAIL_USER}>`,
      to: email,
      subject: `We've Received Your Message - Vircosa`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: 'Montserrat', Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #8B5A2B 0%, #6B4423 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background-color: #ffffff; padding: 30px; border: 1px solid #e0e0e0; }
            .footer { background-color: #F8F5F2; padding: 20px; text-align: center; border-radius: 0 0 10px 10px; font-size: 12px; color: #666; }
            .highlight { background-color: #FFF8F0; padding: 15px; border-left: 4px solid #8B5A2B; margin: 20px 0; }
            .button { display: inline-block; padding: 12px 30px; background-color: #8B5A2B; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1 style="margin: 0;">Thank You for Contacting Vircosa</h1>
            </div>
            <div class="content">
              <p>Dear ${firstName},</p>
              
              <p>We've successfully received your message and wanted to confirm that it's now in our queue. Our customer care team will review your inquiry and respond within <strong>2 hours</strong> during business hours.</p>
              
              <div class="highlight">
                <h3 style="margin-top: 0; color: #8B5A2B;">Your Inquiry Details:</h3>
                <p><strong>Topic:</strong> ${topic || "General Inquiry"}</p>
                <p><strong>Your Message:</strong><br>${message}</p>
              </div>
              
              <h3 style="color: #8B5A2B;">What Happens Next?</h3>
              <ul>
                <li>Our specialist will review your inquiry carefully</li>
                <li>You'll receive a personalized response via email</li>
                <li>If urgent, we may contact you via phone</li>
              </ul>
              
              <p><strong>Need immediate assistance?</strong><br>
              Call us at <a href="tel:+923081036864" style="color: #8B5A2B;">+92 308 1036 864</a><br>
              Mon-Fri: 9:00 AM - 5:00 PM PST</p>
              
              <center>
                <a href="https://vircosa.com/products" class="button">Continue Shopping</a>
              </center>
            </div>
            <div class="footer">
              <p><strong>Vircosa</strong><br>
              Phase 1, Johar Town, Lahore<br>
              Email: info@vircosa.com | Phone: +92 308 1036 864</p>
              <p style="margin-top: 15px;">This is an automated confirmation email. Please do not reply to this message.</p>
            </div>
          </div>
        </body>
        </html>
      `
    });

    // Redirect with success and user email
    return res.redirect(`/contact-us?success=true&email=${encodeURIComponent(email)}`);
  } catch (err) {
    console.error("Contact form error:", err);
    return res.redirect("/contact-us?error=true");
  }
});

router.post("/newsletter", async (req, res) => {
  try {
    const { email, redirectTo } = req.body;

    const existing = await newsletterModel.findOne({ email });

    if (existing) {
      return res.redirect(`${redirectTo}?newsletter=exists`);
    }

    await newsletterModel.create({ email });

    return res.redirect(`${redirectTo}?newsletter=success`);

  } catch (err) {
    console.error(err);

    const redirectTo = req.body.redirectTo || "/";
    res.redirect(`${redirectTo}?newsletter=error`);
  }
});

router.get("/api/products/search", async (req, res) => {
  try {
    const query = req.query.q;
    
    if (!query || query.length < 2) {
      return res.json({ products: [] });
    }

    const products = await product.find({
      name: { $regex: query, $options: 'i' }
    }).limit(5);

    res.json({ products });
  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({ error: 'Search failed' });
  }
});


module.exports = router;