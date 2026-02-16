import express from "express";
import mysql from "mysql2";
import dotenv from "dotenv";
import cors from "cors";
import QRCode from "qrcode";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// Serve frontend
app.use(express.static("../public"));

// MySQL connect
const db = mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT,
});

db.connect((err) => {
  if (err) console.error("❌ DB Error:", err);
  else console.log("✅ MySQL connected");
});

/* ============================================================
   SMART DONATION ELIGIBILITY SYSTEM
   ============================================================*/
function checkEligibility(age, lastDonation, hb) {
  if (age < 18 || age > 60) return false;
  if (hb && hb < 12.5) return false;

  if (lastDonation) {
    const diff = (Date.now() - new Date(lastDonation)) / (1000 * 60 * 60 * 24);
    if (diff < 90) return false;
  }
  return true;
}

/* ============================================================
   REGISTER DONOR  (ADDED new fields but kept old behavior)
   ============================================================*/
app.post("/api/donors", (req, res) => {
  const {
    name,
    email,
    phone,
    blood_group,
    age,
    address,
    city,
    state,
    pincode,
    country,
    latitude,
    longitude,
    last_donation_date,
    hemoglobin
  } = req.body;

  if (!name || !age || !phone || !blood_group || !city)
    return res.status(400).json({ error: "Missing fields" });

  const eligible = checkEligibility(age, last_donation_date, hemoglobin);

  const sql = `
    INSERT INTO donors 
    (name, email, phone, blood_group, age, address, city, state,
     pincode, country, latitude, longitude,
     last_donation_date, hemoglobin, eligible,
     points, donation_count, badge)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0, 'Helper')
  `;

  db.query(
    sql,
    [
      name,
      email || null,
      phone,
      blood_group,
      age,
      address || null,
      city,
      state || null,
      pincode || null,
      country || null,
      latitude || null,
      longitude || null,
      last_donation_date || null,
      hemoglobin || null,
      eligible
    ],
    (err, result) => {
      if (err) return res.status(500).json({ error: "Insert failed" });
      res.json({ message: "Donor registered", id: result.insertId });
    }
  );
});

/* ============================================================
   EXISTING — GET ALL DONORS
   ============================================================*/
app.get("/api/donors", (req, res) => {
  db.query("SELECT * FROM donors", (err, rows) => {
    if (err) return res.status(500).json({ error: "DB error" });
    res.json(rows);
  });
});

/* ============================================================
   EXISTING — NEARBY DONORS SEARCH (Not removed)
   ============================================================*/
app.get("/api/hospitals/nearby-donors", (req, res) => {
  const { latitude, longitude, blood_group } = req.query;

  let query = `
    SELECT id, name, blood_group, city, address, phone AS contact,
    latitude, longitude,
    (
      6371 * acos(
        cos(radians(?)) *
        cos(radians(latitude)) *
        cos(radians(longitude) - radians(?)) +
        sin(radians(?)) *
        sin(radians(latitude))
      )
    ) AS distance
    FROM donors
    WHERE latitude IS NOT NULL AND longitude IS NOT NULL
  `;

  const params = [latitude, longitude, latitude];

  if (blood_group) {
    query += " AND blood_group = ?";
    params.push(blood_group);
  }

  query += " ORDER BY distance ASC LIMIT 20";

  db.query(query, params, (err, rows) => {
    if (err) return res.status(500).json({ error: "DB error" });
    res.json(rows);
  });
});

/* ============================================================
   ✔ BROADCAST BLOOD REQUEST TO ALL DONORS
   ============================================================*/
app.post("/api/requests", (req, res) => {
  const { requesterName, requesterPhone, message } = req.body;

  db.query("SELECT * FROM donors", (err, donors) => {
    if (err) return res.status(500).json({ error: "DB error" });

    donors.forEach((d) => {
      console.log(
        `📢 EMAIL to ${d.email} - ${requesterName} needs help.`
      );
    });

    res.json({ success: true, broadcasted: true });
  });
});

/* ============================================================
   ⭐ DONATION REWARD SYSTEM
   ============================================================*/
app.post("/api/donors/reward/:id", (req, res) => {
  const donorId = req.params.id;

  db.query(
    "UPDATE donors SET donation_count = donation_count + 1, points = points + 50 WHERE id=?",
    [donorId],
    () => {
      db.query(
        "SELECT donation_count FROM donors WHERE id=?",
        [donorId],
        (err, rows) => {
          const count = rows[0].donation_count;
          let badge = "Helper";
          if (count >= 5) badge = "Life Saver";
          else if (count >= 3) badge = "Hero";

          db.query(
            "UPDATE donors SET badge=? WHERE id=?",
            [badge, donorId]
          );

          res.json({ success: true, badge });
        }
      );
    }
  );
});

/* ============================================================
   🔐 OTP VERIFICATION
   ============================================================*/
app.post("/api/request/send-otp", (req, res) => {
  const { phone } = req.body;

  const otp = Math.floor(100000 + Math.random() * 900000);
  const expires = new Date(Date.now() + 5 * 60 * 1000);

  db.query(
    "INSERT INTO request_otp (phone, otp, expires_at) VALUES (?, ?, ?)",
    [phone, otp, expires]
  );

  console.log("Generated OTP:", otp);

  res.json({ otpSent: true });
});

app.post("/api/request/verify-otp", (req, res) => {
  const { phone, otp } = req.body;

  db.query(
    "SELECT * FROM request_otp WHERE phone=? AND otp=? AND expires_at > NOW()",
    [phone, otp],
    (err, rows) => {
      if (!rows.length) return res.status(400).json({ error: "Invalid OTP" });

      res.json({ verified: true });
    }
  );
});

/* ============================================================
   🎫 QR CODE FOR DONOR CARD
   ============================================================*/
app.get("/api/donor/:id/qr", (req, res) => {
  const { id } = req.params;

  db.query("SELECT * FROM donors WHERE id=?", [id], async (err, rows) => {
    if (!rows.length) return res.status(404).json({ error: "Not found" });

    const qr = await QRCode.toDataURL(JSON.stringify(rows[0]));

    res.json({ qr });
  });
});

/* ============================================================
   START SERVER
   ============================================================*/
app.listen(process.env.PORT || 3000, () => {
  console.log("🚀 Server running");
});
