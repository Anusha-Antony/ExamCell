const express = require("express");
const router = express.Router();
const SeatingArrangement = require("../models/SeatingArrangement");
const Student = require("../models/Student");

const normalizeSemester = (semester) => {
  if (!semester) return "";
  const sem = String(semester).trim();
  return sem.toLowerCase().startsWith("s") ? sem.toUpperCase() : `S${sem}`;
};

const parseRollNumber = (rollNumber) => {
  if (!rollNumber) return null;
  const match = String(rollNumber).match(/(\d+)\s*$/);
  if (!match) return null;
  const num = Number(match[1]);
  return Number.isNaN(num) ? null : num;
};

const formatRollRanges = (rolls = []) => {
  const nums = rolls.map(r => Number(String(r).replace(/\D/g, ""))).filter(n => !Number.isNaN(n));
  if (nums.length === 0) return "";
  nums.sort((a, b) => a - b);
  const ranges = [];
  let start = nums[0];
  let end = nums[0];
  for (let i = 1; i < nums.length; i++) {
    if (nums[i] === end + 1) {
      end = nums[i];
    } else {
      ranges.push(start === end ? `${start}` : `${start}-${end}`);
      start = end = nums[i];
    }
  }
  ranges.push(start === end ? `${start}` : `${start}-${end}`);
  return ranges.join(", ");
};

const normalizeClassConfig = (classConfig = []) =>
  classConfig.map((item) => {
    const rollStart = Number(item.rollStart);
    const rollEnd = Number(item.rollEnd);
    const hasRange = !Number.isNaN(rollStart) && !Number.isNaN(rollEnd) && rollEnd >= rollStart;
    
    let rolls = [];
    if (Array.isArray(item.rolls)) {
      rolls = item.rolls.map(r => Number(r)).filter(r => !Number.isNaN(r));
    }

    return {
      sem: String(item.sem || "").trim().toUpperCase(),
      div: String(item.div || "").trim().toUpperCase(),
      rollStart: hasRange ? rollStart : null,
      rollEnd: hasRange ? rollEnd : null,
      rolls: rolls,
      count: rolls.length > 0 ? rolls.length : (hasRange ? rollEnd - rollStart + 1 : 0),
    };
  });

const normalizeHallConfig = (hallConfig = []) =>
  hallConfig
    .map((item) => {
      const name = String(item.name || "").trim();
      const capacity = Number(item.capacity);
      if (!name || Number.isNaN(capacity) || capacity <= 0) return null;
      return { name, capacity };
    })
    .filter(Boolean);

// GET /api/seating/student/:id — seating for a specific student
router.get("/student/:id", async (req, res) => {
  try {
    const student = await Student.findById(req.params.id);
    if (!student) {
      return res.status(404).json({ error: "Student not found" });
    }

    const semKey = normalizeSemester(student.semester);
    const rollNum = parseRollNumber(student.rollNumber);
    const rollDigits = String(student.rollNumber || "").replace(/\D/g, "");
    const division = (student.division || "").toUpperCase();

    if (!semKey || (!rollDigits && rollNum === null)) {
      return res.json([]);
    }

    const arrangements = await SeatingArrangement.find().sort({ createdAt: -1 });
    const results = [];

    arrangements.forEach((arr) => {
      arr.slots.forEach((slot) => {
        const match = slot.groups?.find((g) => {
          const groupSem = normalizeSemester(g.sem);
          const groupDiv = (g.div || "").toUpperCase();
          if (groupSem !== semKey || !Array.isArray(g.rolls)) return false;
          // If the student has a division, ensure it matches
          if (division && groupDiv && groupDiv !== division) return false;
          
          return g.rolls.some((r) => {
            if (rollNum !== null && Number(r) === rollNum) return true;
            if (rollDigits) return String(r).replace(/\D/g, "") === rollDigits;
            return false;
          });
        });
        
        if (match) {
          results.push({
            id: `${arr._id}_${slot.hall}_${rollNum}`,
            arrangementId: arr._id,
            seriesLabel: arr.seriesLabel,
            date: arr.date,
            time: arr.time,
            hallName: slot.hall,
            seatNumber: rollNum !== null ? String(rollNum) : "",
            rollRange: formatRollRanges(match.rolls || []),
            rowNumber: match.div || division || "",
            columnNumber: "",
            status: arr.date && new Date(arr.date) > new Date() ? "Upcoming" : "Completed",
          });
        }
      });
    });

    res.json(results);
  } catch (err) {
    console.error("Student seating error:", err);
    res.status(500).json({ error: "Failed to fetch seating for student" });
  }
});

// POST /api/seating/generate — save a new arrangement
router.post("/generate", async (req, res) => {
  try {
    const doc = new SeatingArrangement({
      seriesType: req.body.seriesType,
      batchType: req.body.batchType,
      seriesLabel: req.body.seriesLabel,
      date: req.body.date,
      time: req.body.time,
      status: req.body.status || "Generated",
      totalStudents: req.body.totalStudents || 0,
      multiSem: req.body.multiSem || false,
      classConfig: normalizeClassConfig(req.body.classConfig || []),
      hallConfig: normalizeHallConfig(req.body.hallConfig || []),
      slots: req.body.slots || [],
    });

    const saved = await doc.save();
    res.status(201).json({ success: true, _id: saved._id, data: saved });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/seating — list all arrangements (newest first)
router.get("/", async (req, res) => {
  try {
    const list = await SeatingArrangement.find().sort({ createdAt: -1 });
    res.json({ success: true, data: list });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/seating/roll-config/latest?batchType=odd|even
router.get("/roll-config/latest", async (req, res) => {
  try {
    const { batchType } = req.query;
    if (!batchType) {
      return res.status(400).json({ success: false, message: "batchType is required" });
    }
    const doc = await SeatingArrangement.findOne({
      batchType,
      classConfig: { $exists: true, $ne: [] },
    }).sort({ updatedAt: -1, createdAt: -1 });

    res.json({
      success: true,
      data: doc ? normalizeClassConfig(doc.classConfig) : [],
      arrangementId: doc?._id || null,
      updatedAt: doc?.updatedAt || null,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/seating/hall-config/latest
router.get("/hall-config/latest", async (req, res) => {
  try {
    const doc = await SeatingArrangement.findOne({
      hallConfig: { $exists: true, $ne: [] },
    }).sort({ updatedAt: -1, createdAt: -1 });

    res.json({
      success: true,
      data: doc ? normalizeHallConfig(doc.hallConfig) : [],
      arrangementId: doc?._id || null,
      updatedAt: doc?.updatedAt || null,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/seating/:id — single arrangement
router.get("/:id", async (req, res) => {
  try {
    const doc = await SeatingArrangement.findById(req.params.id);
    if (!doc) return res.status(404).json({ success: false, message: "Not found" });
    res.json({ success: true, data: doc });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// PATCH /api/seating/:id/publish — publish an arrangement
router.patch("/:id/publish", async (req, res) => {
  try {
    const doc = await SeatingArrangement.findByIdAndUpdate(
      req.params.id,
      { status: "Published" },
      { new: true }
    );
    if (!doc) return res.status(404).json({ success: false, message: "Not found" });
    res.json({ success: true, data: doc });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// DELETE /api/seating/:id
router.delete("/:id", async (req, res) => {
  try {
    await SeatingArrangement.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: "Deleted" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/seating/classes/upload — upload Excel with class students
const multer = require('multer');
const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

const upload = multer({
  dest: 'uploads/classes/',
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' || 
        file.mimetype === 'application/vnd.ms-excel') {
      cb(null, true);
    } else {
      cb(new Error('Only Excel files allowed'), false);
    }
  }
});

router.post('/classes/upload', upload.single('classesFile'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No Excel file uploaded' });
    }

    const workbook = XLSX.readFile(req.file.path);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const jsonData = XLSX.utils.sheet_to_json(worksheet);

    if (jsonData.length === 0) {
      return res.status(400).json({ success: false, message: 'Empty Excel file' });
    }

    // Find column indices (case-insensitive)
    const headers = Object.keys(jsonData[0]);
    const colRoll = headers.find(h => h.toLowerCase().includes('roll') || h.toLowerCase().includes('id'));
    const colSem = headers.find(h => h.toLowerCase().includes('sem'));
    const colDiv = headers.find(h => h.toLowerCase().includes('div') || h.toLowerCase().includes('section'));

    if (!colRoll || !colSem || !colDiv) {
      return res.status(400).json({ 
        success: false, 
        message: `Missing columns. Expected: Roll(${colRoll}), Semester(${colSem}), Division(${colDiv})`,
        found: headers.join(', ')
      });
    }

    // Group rolls by sem_div
    const classMap = new Map();
    for (const row of jsonData) {
      const rollStr = String(row[colRoll] || '');
      const rollMatch = rollStr.match(/\\d+/);
      if (!rollMatch) continue;
      const roll = parseInt(rollMatch[0]);

      const sem = normalizeSemester(row[colSem]);
      const div = String(row[colDiv] || '').trim().toUpperCase();
      if (!sem || !div) continue;

      const key = `${sem}_${div}`;
      if (!classMap.has(key)) {
        classMap.set(key, { rolls: [] });
      }
      classMap.get(key).rolls.push(roll);
    }

    // Convert to UI classes format
    const classes = [];
    for (const [key, data] of classMap) {
      const [sem, div] = key.split('_');
      const rolls = data.rolls.sort((a,b) => a-b);
      const rollStart = rolls[0];
      const rollEnd = rolls[rolls.length - 1];
      const count = rolls.length;

      classes.push({
        id: key,
        sem,
        div,
        rollStart: String(rollStart),
        rollEnd: String(rollEnd),
        count
      });
    }

    // Cleanup temp file
    fs.unlinkSync(req.file.path);

    res.json({ 
      success: true, 
      classes,
      summary: `${classes.length} classes loaded, ${classes.reduce((s,c)=>s+c.count,0)} students`
    });

  } catch (err) {
    console.error('Excel parse error:', err);
    if (req.file) fs.unlinkSync(req.file.path);
    res.status(500).json({ success: false, message: 'Failed to parse Excel: ' + err.message });
  }
});

module.exports = router;
