const express = require('express');
const router  = express.Router();
const SeatingArrangement = require('../models/SeatingArrangement');

// POST /api/seating/generate  — save a new arrangement
router.post('/generate', async (req, res) => {
  try {
    const doc = new SeatingArrangement({
      seriesType:    req.body.seriesType,
      batchType:     req.body.batchType,
      seriesLabel:   req.body.seriesLabel,
      date:          req.body.date,
      time:          req.body.time,
      status:        req.body.status || 'Generated',
      totalStudents: req.body.totalStudents || 0,
      multiSem:      req.body.multiSem || false,
      slots:         req.body.slots || [],
    });
    const saved = await doc.save();
    res.status(201).json({ success: true, _id: saved._id, data: saved });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/seating  — list all arrangements (newest first)
router.get('/', async (req, res) => {
  try {
    const list = await SeatingArrangement.find().sort({ createdAt: -1 });
    res.json({ success: true, data: list });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/seating/:id  — single arrangement
router.get('/:id', async (req, res) => {
  try {
    const doc = await SeatingArrangement.findById(req.params.id);
    if (!doc) return res.status(404).json({ success: false, message: 'Not found' });
    res.json({ success: true, data: doc });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// PATCH /api/seating/:id/publish  — publish an arrangement
router.patch('/:id/publish', async (req, res) => {
  try {
    const doc = await SeatingArrangement.findByIdAndUpdate(
      req.params.id,
      { status: 'Published' },
      { new: true }
    );
    if (!doc) return res.status(404).json({ success: false, message: 'Not found' });
    res.json({ success: true, data: doc });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// DELETE /api/seating/:id
router.delete('/:id', async (req, res) => {
  try {
    await SeatingArrangement.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;