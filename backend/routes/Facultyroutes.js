const express = require('express');
const router = express.Router();
const multer = require('multer');
const XLSX = require('xlsx');
const path = require('path');
const fs = require('fs');
const Faculty = require('../models/Faculty');

const formatDateForFileName = (value = new Date()) => {
  const date = value instanceof Date ? value : new Date(value);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// File upload configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = 'uploads/';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (ext !== '.xlsx' && ext !== '.xls' && ext !== '.csv') {
      return cb(new Error('Only Excel files (.xlsx, .xls, .csv) are allowed'));
    }
    cb(null, true);
  }
});

// Ã¢Å“â€¦ SINGLE UPLOAD ROUTE WITH UPSERT MODE
router.post('/upload', upload.single('file'), async (req, res) => {
  try {
    console.log('Ã°Å¸â€œÂ¤ Upload request received');
    console.log('Body:', req.body);
    console.log('File:', req.file ? req.file.originalname : 'No file');
    
    const { semester, mode } = req.body;
    
    if (!semester) {
      console.log('Ã¢ÂÅ’ No semester provided');
      return res.status(400).json({ error: 'Semester is required' });
    }
    
    if (!req.file) {
      console.log('Ã¢ÂÅ’ No file uploaded');
      return res.status(400).json({ error: 'No file uploaded' });
    }

    console.log(`📊 Processing file for Semester ${semester}, Mode: ${mode || 'replace'}`);

    // Read Excel file
    const workbook = XLSX.readFile(req.file.path);
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    // Find the actual header row
    const rawData = XLSX.utils.sheet_to_json(sheet, { header: 1 });
    let headerRowIndex = 0;
    for (let i = 0; i < Math.min(20, rawData.length); i++) {
      const rowStr = (rawData[i] || []).map(String).join(' ').toLowerCase();
      if (rowStr.includes('faculty name') || rowStr.includes('name')) {
        headerRowIndex = i;
        break;
      }
    }
    
    // Parse using the found header row
    const data = XLSX.utils.sheet_to_json(sheet, { range: headerRowIndex });

    console.log(`📊 Found ${data.length} rows in Excel (header at row ${headerRowIndex + 1})`);

    if (data.length === 0) {
      fs.unlinkSync(req.file.path);
      console.log('⚠️ Excel file is empty');
      return res.status(400).json({ error: 'Excel file is empty' });
    }

    // Transform data dynamically handling missing structured columns
    const facultyData = data.filter(r => {
      const nameKey = Object.keys(r).find(k => String(k).toLowerCase().includes('name') || String(k).toLowerCase().includes('faculty'));
      const n = nameKey ? r[nameKey] : undefined;
      if (!n || String(n).trim() === '') return false;
      
      const lowerName = String(n).toLowerCase();
      // Exclude exam cell coordinators
      if (lowerName.includes('coordinator') || lowerName.includes('coorinator') || lowerName.includes('exam cell') || lowerName.includes('examcell')) {
        return false;
      }
      return true;
    }).map(row => {
      const nameKey = Object.keys(row).find(k => String(k).toLowerCase().includes('name') || String(k).toLowerCase().includes('faculty'));
      const name = String(row[nameKey]).trim();
      
      // Look for total count or prev duty count
      let dCount = 0;
      for (const key of Object.keys(row)) {
        const kLow = String(key).toLowerCase();
        if (kLow.includes('total count') || kLow.includes('prev.duty count') || kLow.includes('prev. duty count')) {
          const val = parseInt(row[key]);
          if (!isNaN(val) && val > dCount) dCount = val; // Try to get the max explicit value (e.g. Total count is larger than Prev Duty)
        }
      }
      
      
      const emailDomain = name.toLowerCase().replace(/[^a-z0-9]/g, '');
      
      let finalDesignation = row['Designation'] || 'Assistant Professor';
      if (name.toLowerCase().startsWith('dr ') || name.toLowerCase().includes('dr.')) {
        finalDesignation = 'Professor';
      }

      return {
        name: name,
        designation: finalDesignation, 
        department: row['Department'] || 'Computer Science',
        email: row['Email'] || `${emailDomain || 'faculty'}@vidya.ac.in`,
        semester: semester,
        dutyCount: dCount
      };
    });

    const invalidRows = [];

    let inserted = 0;
    let updated = 0;

    if (mode === 'upsert') {
      console.log('🔄 UPSERT MODE: Updating existing, inserting new');
      
      for (const facultyRecord of facultyData) {
        let existing = await Faculty.findOne({ email: facultyRecord.email });
        if (!existing) {
          existing = await Faculty.findOne({ name: facultyRecord.name, semester: facultyRecord.semester });
        }

        if (existing) {
          const newEmail = facultyRecord.email.includes('@vidya.ac.in') && !existing.email.includes('@vidya.ac.in') ? existing.email : facultyRecord.email;
          const newDesignation = facultyRecord.designation === 'Assistant Professor' && existing.designation !== 'Assistant Professor' ? existing.designation : facultyRecord.designation;

          await Faculty.findByIdAndUpdate(existing._id, {
            name: facultyRecord.name,
            designation: newDesignation,
            department: facultyRecord.department,
            email: newEmail,
            dutyCount: facultyRecord.dutyCount > 0 ? facultyRecord.dutyCount : existing.dutyCount
          });
          updated++;
          console.log(`  ✏️  Updated: ${facultyRecord.name} (Duty count -> ${facultyRecord.dutyCount > 0 ? facultyRecord.dutyCount : existing.dutyCount})`);
        } else {
          await Faculty.create({
            ...facultyRecord
          });
          inserted++;
          console.log(`  ➕ Inserted: ${facultyRecord.name} (Duty count -> ${facultyRecord.dutyCount})`);
        }
      }
    } else {
      console.log('🔄 REPLACE MODE: Deleting all and inserting new');
      
      await Faculty.deleteMany({});
      const insertedFaculty = await Faculty.insertMany(
        facultyData
      );
      inserted = insertedFaculty.length;
      console.log(`  ➕ Inserted ${inserted} faculty members`);
    }

    // Delete uploaded file
    fs.unlinkSync(req.file.path);

    // Get final data
    const allFaculty = await Faculty.find({ semester }).sort({ dutyCount: 1, name: 1 });

    console.log(`Ã¢Å“â€¦ Upload complete: ${inserted} inserted, ${updated} updated`);

    res.json({
      success: true,
      message: mode === 'upsert' 
        ? `${inserted} new faculty added, ${updated} updated` 
        : `${inserted} faculty members uploaded successfully`,
      count: allFaculty.length,
      inserted,
      updated,
      faculty: allFaculty
    });

  } catch (error) {
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    
    console.error('Ã¢ÂÅ’ Upload error:', error);
    
    if (error.code === 11000) {
      return res.status(400).json({ 
        error: 'Duplicate email found in Excel file' 
      });
    }
    
    res.status(500).json({ error: error.message });
  }
});

// Get all faculty
router.get('/', async (req, res) => {
  try {
    
    const query = {}; // Faculty list is global
    const faculty = await Faculty.find(query).sort({ dutyCount: 1, name: 1 });
    
    res.json(faculty);
  } catch (error) {
    console.error('Ã¢ÂÅ’ Get faculty error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Verify faculty email for login
router.post('/verify-email', async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    console.log(`Ã°Å¸â€Â Verifying faculty email: ${email}`);
    
    // Check if faculty exists with this email
    const faculty = await Faculty.findOne({ email: email.toLowerCase() });
    
    if (faculty) {
      console.log(`Ã¢Å“â€¦ Faculty found: ${faculty.name}`);
      res.json({
        exists: true,
        faculty: {
          _id: faculty._id,
          name: faculty.name,
          email: faculty.email,
          designation: faculty.designation,
          department: faculty.department,
          semester: faculty.semester,
          dutyCount: faculty.dutyCount
        }
      });
    } else {
      console.log(`Ã¢ÂÅ’ Faculty not found with email: ${email}`);
      res.status(404).json({ 
        exists: false,
        message: 'Faculty email not found in system' 
      });
    }
  } catch (error) {
    console.error('Ã¢ÂÅ’ Verify email error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get faculty statistics
router.get('/stats', async (req, res) => {
  try {
    const totalFaculty = await Faculty.countDocuments();
    const availableFaculty = await Faculty.countDocuments({ available: true });
    const drFaculty = await Faculty.countDocuments({ 
      designation: { $regex: /professor/i } 
    });
    
    res.json({
      total: totalFaculty,
      available: availableFaculty,
      doctors: drFaculty
    });
  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get duty summary
router.get('/duty-summary', async (req, res) => {
  try {
    const query = {}; // Faculty list is global
    
    const facultyWithDuties = await Faculty.find(query)
      .select('name designation department dutyCount semester')
      .sort({ dutyCount: -1, name: 1 });
    
    res.json(facultyWithDuties);
  } catch (error) {
    console.error('Get duty summary error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Download template
router.get('/template', async (req, res) => {
  try {
    const sampleData = [
      {
        'Faculty Name': 'Dr. John Doe',
        'Designation': 'Professor',
        'Department': 'Computer Science',
        'Email': 'john.doe@example.com',
      },
      {
        'Faculty Name': 'Ms. Jane Smith',
        'Designation': 'Assistant Professor',
        'Department': 'Computer Science',
        'Email': 'jane.smith@example.com',
      },
      {
        'Faculty Name': 'Mr. Robert Johnson',
        'Designation': 'Lab Staff',
        'Department': 'Computer Science',
        'Email': 'robert.j@example.com',
      }
    ];
    
    const ws = XLSX.utils.json_to_sheet(sampleData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Faculty Template');
    
    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    
    res.setHeader('Content-Disposition', 'attachment; filename=faculty_template.xlsx');
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.send(buffer);
  } catch (error) {
    console.error('Template download error:', error);
    res.status(500).json({ error: 'Failed to generate template' });
  }
});

// Delete all faculty
router.delete('/all', async (req, res) => {
  try {
    const result = await Faculty.deleteMany({});
    res.json({ success: true, message: `Successfully deleted ${result.deletedCount} faculty members` });
  } catch (error) {
    console.error('Delete all faculty error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Delete faculty
router.delete('/:id', async (req, res) => {
  try {
    const faculty = await Faculty.findByIdAndDelete(req.params.id);
    
    if (!faculty) {
      return res.status(404).json({ error: 'Faculty not found' });
    }
    
    res.json({ success: true, message: 'Faculty deleted successfully' });
  } catch (error) {
    console.error('Delete faculty error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update availability (for compatibility)
router.patch('/:id/availability', async (req, res) => {
  try {
    const { available } = req.body;
    const faculty = await Faculty.findByIdAndUpdate(
      req.params.id,
      { available },
      { new: true }
    );
    
    if (!faculty) {
      return res.status(404).json({ error: 'Faculty not found' });
    }
    
    res.json({ success: true, faculty });
  } catch (error) {
    console.error('Update availability error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Export faculty data
const exportFacultyData = async (req, res) => {
  try {
    const { semester } = req.query;
    const query = {}; // Faculty list is global
    
    const faculty = await Faculty.find(query).sort({ name: 1 });
    
    const exportData = faculty.map(f => ({
      'Faculty Name': f.name,
      'Designation': f.designation,
      'Department': f.department,
      'Email': f.email,
      'Semester': f.semester,
      'Duty Count': f.dutyCount
    }));
    
    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Faculty Data');
    
    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    
    const semesterLabel = semester && semester !== 'All' ? `sem${semester}` : `all_${formatDateForFileName()}`;
    res.setHeader('Content-Disposition', `attachment; filename=faculty_data_${semesterLabel}.xlsx`);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.send(buffer);
  } catch (error) {
    console.error('Export error:', error);
    res.status(500).json({ error: 'Failed to export data' });
  }
};

router.get('/export/data', exportFacultyData);
router.get('/export', exportFacultyData);

module.exports = router;
