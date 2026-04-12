const express   = require('express');
const router    = express.Router();
const multer    = require('multer');
const XLSX      = require('xlsx');
const path      = require('path');
const fs        = require('fs');
const Timetable = require('../models/Timetable');

const uploadDir = path.join(__dirname, '..', 'uploads', 'timetables');

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 25 * 1024 * 1024 },
  fileFilter: (req, file, cb) => { cb(null, true); }
});

// ── Helper: extract semester number from any string ──────────
function extractSemNum(val) {
  if (val === undefined || val === null || val === '') return null;
  const m = String(val).match(/(\d+)/);
  return m ? parseInt(m[1], 10) : null;
}

function extractSemNums(val) {
  if (val === undefined || val === null || val === '') return [];
  return [...new Set(
    String(val)
      .match(/\d+/g)
      ?.map(num => parseInt(num, 10))
      .filter(num => Number.isInteger(num) && num > 0) || []
  )];
}

function extractSemNumsFromRows(rows = []) {
  const semNums = new Set();
  for (const row of rows) {
    for (const key of Object.keys(row || {})) {
      extractSemNums(key).forEach(num => semNums.add(num));
    }
  }
  return [...semNums];
}

function getDerivedSemNums(timetable) {
  return [...new Set([
    ...(Array.isArray(timetable?.semNums) ? timetable.semNums : []),
    ...extractSemNums(timetable?.semester),
    ...extractSemNums(timetable?.title),
    ...extractSemNums(timetable?.originalName),
    ...extractSemNumsFromRows(timetable?.rows)
  ])];
}

function isGenericTimetableMedia(timetable) {
  const name = `${timetable?.title || ''} ${timetable?.originalName || ''}`.trim();
  const fileType = String(timetable?.fileType || '').toLowerCase();
  return ['image', 'pdf', 'doc'].includes(fileType) && /timetable/i.test(name);
}

// ── POST /api/timetables/upload ──────────────────────────────
router.post('/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

    const { title, semester } = req.body;
    const ext  = path.extname(req.file.originalname).toLowerCase();
    const mime = req.file.mimetype;

    let fileType = 'other';
    if (mime.startsWith('image/'))       fileType = 'image';
    else if (mime.startsWith('audio/'))  fileType = 'audio';
    else if (mime.startsWith('video/'))  fileType = 'video';
    else if (mime === 'application/pdf') fileType = 'pdf';
    else if (['.doc','.docx'].includes(ext)) fileType = 'doc';
    else if (['.xlsx','.xls','.csv'].includes(ext)) fileType = 'excel';

    let rows = [], sheetName = null;
    if (fileType === 'excel') {
      try {
        const wb = XLSX.readFile(req.file.path);
        sheetName = wb.SheetNames[0];
        rows = XLSX.utils.sheet_to_json(wb.Sheets[sheetName], { defval: '', limit: 1000 });
      } catch (e) {
        console.warn('Excel parse failed:', e.message);
        fileType = 'other';
      }
    }

    // Support combined timetables like "S4, S6, S8" while keeping semNum for legacy lookups
    const semNums = [...new Set([
      ...extractSemNums(semester),
      ...extractSemNums(title),
      ...extractSemNums(req.file.originalname),
      ...extractSemNumsFromRows(rows)
    ])];
    const semNum = semNums[0] ?? extractSemNum(semester);

    const timetable = await Timetable.create({
      title:        title || req.file.originalname,
      semester:     semester || undefined,
      semNum,                          // ← always stored as a number
      semNums,
      fileType,
      originalName: req.file.originalname,
      filename:     req.file.filename,
      path:         req.file.path,
      mimeType:     req.file.mimetype,
      size:         req.file.size,
      sheetName,
      rows
    });

    res.json({ success: true, timetable });
  } catch (error) {
    console.error('Timetable upload error:', error);
    if (req.file?.path && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
    res.status(500).json({ error: error.message || 'Failed to upload timetable' });
  }
});

// ── GET /api/timetables?semester=N ──────────────────────────
// ✅ FIX: accept any semester format (4, "4", "sem 4", "Semester 4")
// and return all timetables whose semNum matches the number extracted from the query
router.get('/', async (req, res) => {
  try {
    const { semester } = req.query;

    // If no semester filter → return all
    if (!semester) {
      const all = await Timetable.find().sort({ uploadedAt: -1 });
      return res.json(all);
    }

    // Extract just the number from whatever the student sends ("4", "Semester 4", etc.)
    const requestedNum = extractSemNum(semester);

    if (requestedNum === null) {
      // Can't parse a number — return all
      const all = await Timetable.find().sort({ uploadedAt: -1 });
      return res.json(all);
    }

    // ✅ Step 1: try DB-level match on semNum / semNums (fast & exact)
    let timetables = await Timetable.find({
      $or: [
        { semNum: requestedNum },
        { semNums: requestedNum }
      ]
    }).sort({ uploadedAt: -1 });

    // ✅ Step 2: if nothing found, fetch all and do JS-level number extraction
    // (covers old records where semNum was not stored)
    if (timetables.length === 0) {
      const all = await Timetable.find().sort({ uploadedAt: -1 });
      timetables = all.filter(t => {
        // try semNum field first
        if (t.semNum !== null && t.semNum !== undefined) {
          return Number(t.semNum) === requestedNum;
        }
        // fallback: extract number from semester string or title
        const candidates = new Set(getDerivedSemNums(t));
        return candidates.has(requestedNum);
      });

      // Backfill semNum/semNums for matched records so future lookups are fast
      const saves = [];
      for (const t of timetables) {
        const derivedSemNums = getDerivedSemNums(t);
        let changed = false;
        if (derivedSemNums.length > 0 && JSON.stringify(t.semNums || []) !== JSON.stringify(derivedSemNums)) {
          t.semNums = derivedSemNums;
          changed = true;
        }
        if ((t.semNum === null || t.semNum === undefined) && derivedSemNums.length > 0) {
          t.semNum = derivedSemNums[0];
          changed = true;
        }
        if (changed) {
          saves.push(t.save().catch(() => null));
        }
      }
      if (saves.length) await Promise.all(saves);
    }

    // Final fallback for generic uploaded timetable media with no semester metadata.
    // This covers cases like "timetable.jpeg" where the image itself contains S4/S6/S8
    // but the admin left the semester field blank during upload.
    if (timetables.length === 0) {
      const genericMedia = await Timetable.find().sort({ uploadedAt: -1 });
      timetables = genericMedia.filter(t => {
        const derivedSemNums = getDerivedSemNums(t);
        return derivedSemNums.length === 0 && isGenericTimetableMedia(t);
      }).slice(0, 1);
    }

    res.json(timetables);
  } catch (error) {
    console.error('Get timetables error:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch timetables' });
  }
});

// ── GET /api/timetables/:id/view ─────────────────────────────
router.get('/:id/view', async (req, res) => {
  try {
    const timetable = await Timetable.findById(req.params.id);
    if (!timetable || !timetable.path || !fs.existsSync(timetable.path)) {
      return res.status(404).json({ error: 'File not found' });
    }
    const absPath = path.resolve(timetable.path);
    res.setHeader('Content-Type', timetable.mimeType || 'application/octet-stream');
    res.setHeader('Content-Disposition', 'inline');
    res.sendFile(absPath);
  } catch (error) {
    console.error('File serve error:', error);
    res.status(500).json({ error: 'Failed to serve file' });
  }
});

// ── DELETE /api/timetables/:id ───────────────────────────────
router.delete('/:id', async (req, res) => {
  try {
    const timetable = await Timetable.findById(req.params.id);
    if (!timetable) return res.status(404).json({ error: 'Timetable not found' });
    if (timetable.path && fs.existsSync(timetable.path)) fs.unlinkSync(timetable.path);
    await Timetable.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Timetable deleted' });
  } catch (error) {
    console.error('Delete error:', error);
    res.status(500).json({ error: 'Failed to delete timetable' });
  }
});

module.exports = router;
