const express = require('express');
const db = require('./db');
const router = express.Router();

// Broadcast blood request to ALL donors
router.post('/', async (req, res) => {
  try {
    const { requesterName, requesterPhone, message } = req.body;

    const [donors] = await db.query("SELECT * FROM donors");

    donors.forEach((donor) => {
      console.log(
        `📢 Email to ${donor.email} - ${requesterName} requires blood`
      );
    });

    res.json({ success: true, broadcast: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;
