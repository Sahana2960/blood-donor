const express = require('express');
const db = require('../db');
const router = express.Router();

// Add donor
router.post('/', async (req, res) => {
  try {
    const { name, email, phone, blood_group, city } = req.body;
    if (!name || !blood_group || !city) return res.status(400).json({ error: 'name, blood_group and city are required' });

    const [result] = await db.query(
      'INSERT INTO donors (name, email, phone, blood_group, city) VALUES (?, ?, ?, ?, ?)',
      [name, email || null, phone || null, blood_group, city]
    );
    res.json({ id: result.insertId, name, email, phone, blood_group, city });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
});

// Get all donors
router.get('/', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM donors ORDER BY created_at DESC');
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
});

// Search donors by blood group and/or city
router.get('/search', async (req, res) => {
  try {
    const { blood_group, city } = req.query;
    let sql = 'SELECT * FROM donors WHERE 1=1';
    const params = [];
    if (blood_group) { sql += ' AND blood_group = ?'; params.push(blood_group); }
    if (city) { sql += ' AND city LIKE ?'; params.push('%' + city + '%'); }
    sql += ' ORDER BY created_at DESC';
    const [rows] = await db.query(sql, params);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
});

// Delete donor
router.delete('/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    await db.query('DELETE FROM donors WHERE id = ?', [id]);
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
});

module.exports = router;
