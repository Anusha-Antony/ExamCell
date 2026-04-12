const express = require('express');
const router  = express.Router();
const Slot    = require('../models/Slot');
const Faculty = require('../models/Faculty');

const isSaturday = (dateString) => new Date(dateString).getDay() === 6;
const formatDateKey = (value) => {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')}`;
};
const formatDateDisplay = (value) => {
  const key = formatDateKey(value);
  if (!key) return '';
  const [year, month, day] = key.split('-');
  return `${day}/${month}/${year}`;
};
const formatWeekdayDisplay = (value) => {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat('en-IN', { weekday: 'long', timeZone: 'UTC' }).format(date);
};
const isDoctor = (designation) => {
  const d = designation?.trim().toLowerCase() || '';
  return d === 'professor' || d === 'associate professor';
};

const assignInvigilatorsAI = async (slot, allFaculty, allSlots = []) => {
  let availableFaculty = [...allFaculty];
  
  if (isSaturday(slot.date)) availableFaculty = availableFaculty.filter(f => !isDoctor(f.designation));
  if (availableFaculty.length === 0) return [];
  
  const needed = slot.invigilatorsNeeded;
  const used = new Set();
  
  // 1. Check for those already assigned to THIS slot
  if (slot.assignedInvigilators && Array.isArray(slot.assignedInvigilators)) {
    slot.assignedInvigilators.forEach(invig => {
      if (invig.facultyId) used.add(invig.facultyId.toString());
    });
  }

  // 2. Prevent double booking on exactly the same date & time elsewhere
  allSlots.forEach(otherSlot => {
    if (otherSlot._id.toString() !== (slot._id || slot.id || "").toString()) {
      if (new Date(otherSlot.date).getTime() === new Date(slot.date).getTime() && otherSlot.time === slot.time) {
        if (otherSlot.assignedInvigilators && Array.isArray(otherSlot.assignedInvigilators)) {
          otherSlot.assignedInvigilators.forEach(invig => {
            if (invig.facultyId) used.add(invig.facultyId.toString());
          });
        }
      }
    }
  });

  availableFaculty = availableFaculty.filter(f => !used.has(f._id.toString()));

  const coreDesignations = ['Teaching Assistant', 'Lab Staff', 'Lecturer', 'Senior Lecturer', 'Assistant Professor'];
  const seniorDesignations = ['Associate Professor', 'Professor'];
  
  let coreFaculty = [];
  let seniorFaculty = [];
  let otherFaculty = [];
  
  availableFaculty.forEach(faculty => {
    let des = faculty.designation || 'Lecturer';
    if (coreDesignations.includes(des)) {
      coreFaculty.push(faculty);
    } else if (seniorDesignations.includes(des)) {
      seniorFaculty.push(faculty);
    } else {
      otherFaculty.push(faculty);
    }
  });

  // Strict load balancing: Sort each pool strictly by dutyCount ascending
  const sortByDuty = (a, b) => (a.dutyCount || 0) - (b.dutyCount || 0);
  coreFaculty.sort(sortByDuty);
  seniorFaculty.sort(sortByDuty);
  otherFaculty.sort(sortByDuty);

  const selected = [];
  
  const pickFromPool = (pool) => {
    for (const candidate of pool) {
      if (selected.length >= needed) break;
      if (!used.has(candidate._id.toString())) {
        selected.push(candidate);
        used.add(candidate._id.toString());
      }
    }
  };

  // 1. Try core designations strictly by lowest count to leave professors free
  pickFromPool(coreFaculty);

  // 2. Fallback to seniors if not enough base staff
  if (selected.length < needed) {
    pickFromPool(seniorFaculty);
  }

  // 3. Final fallback for missing designated types
  if (selected.length < needed) {
    pickFromPool(otherFaculty);
  }
  
  return selected.slice(0, needed).map(f => ({ facultyId: f._id, name: f.name, designation: f.designation }));
};

// ═══════════════════════════════════════════════════════════════
// FACULTY ROUTES  (added here — no separate Facultyroutes needed)
// ═══════════════════════════════════════════════════════════════

// GET  /api/slots/faculty-list          — list all faculty (optional ?semester=)
router.get('/faculty-list', async (req, res) => {
  try {
    const filter = {}; // Faculty list is global
    const faculty = await Faculty.find(filter).lean();
    res.json(faculty);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/slots/faculty-verify        — verify faculty email for login
router.post('/faculty-verify', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ exists: false, message: 'Email is required' });
    const faculty = await Faculty.findOne({ email: email.toLowerCase().trim() }).lean();
    if (!faculty) return res.status(404).json({ exists: false, message: 'Faculty email not found in system' });
    res.json({
      exists: true,
      faculty: {
        _id:         faculty._id,
        name:        faculty.name,
        email:       faculty.email,
        designation: faculty.designation || '',
        department:  faculty.department  || '',
        semester:    faculty.semester    || ''
      }
    });
  } catch (err) { res.status(500).json({ exists: false, message: err.message }); }
});

// GET  /api/slots/faculty-detail/:id    — get one faculty by ID
router.get('/faculty-detail/:id', async (req, res) => {
  try {
    const faculty = await Faculty.findById(req.params.id).lean();
    if (!faculty) return res.status(404).json({ message: 'Faculty not found' });
    res.json(faculty);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// ═══════════════════════════════════════════════════════════════
// SLOT ROUTES  (unchanged from your original)
// ═══════════════════════════════════════════════════════════════

// POST  /api/slots
router.post('/', async (req, res) => {
  try {
    const slot = new Slot(req.body);
    await slot.save();
    res.status(201).json({ success: true, slot });
  } catch (error) { res.status(400).json({ error: error.message }); }
});

// GET   /api/slots
router.get('/', async (req, res) => {
  try {
    const { semester } = req.query;
    const query = (semester && semester !== 'All') ? { semester } : {};
    const slots = await Slot.find(query)
      .populate('assignedInvigilators.facultyId', 'name designation department')
      .sort({ date: 1, time: 1 });
    res.json(slots);
  } catch (error) { res.status(500).json({ error: error.message }); }
});

// POST  /api/slots/auto-assign
router.post('/auto-assign', async (req, res) => {
  try {
    const { semester } = req.body;
    if (!semester) return res.status(400).json({ error: 'Semester is required' });
    const allSlotsForSemester = await Slot.find({ semester }).sort({ date: 1, time: 1 });
    const slots = allSlotsForSemester.filter(s => (s.invigilatorsNeeded || 0) > (s.assignedInvigilators?.length || 0));
    
    if (slots.length === 0) return res.json({ success: true, message: 'All slots already assigned', assigned: 0 });
    const allFaculty = await Faculty.find({}); // Global
    if (allFaculty.length === 0) return res.status(400).json({ error: 'No faculty found' });
    let totalAssigned = 0;
    
    // We will re-fetch current slots dynamically inside the loop for the constraint checks
    for (const slot of slots) {
      const needed = slot.invigilatorsNeeded - (slot.assignedInvigilators?.length || 0);
      if (needed <= 0) continue;
      
      const currentFaculty = await Faculty.find({}); // Global
      const currentAllSlots = await Slot.find({ semester });
      
      const assigned = await assignInvigilatorsAI({ ...slot.toObject(), invigilatorsNeeded: needed }, currentFaculty, currentAllSlots);
      if (assigned.length === 0) continue;
      
      slot.assignedInvigilators = [...(slot.assignedInvigilators || []), ...assigned];
      await slot.save();
      
      for (const invig of assigned) {
        await Faculty.findByIdAndUpdate(invig.facultyId, { $inc: { dutyCount: 1 } });
      }
      totalAssigned += assigned.length;
    }
    res.json({ success: true, message: `Assigned ${totalAssigned} faculty to ${slots.length} slots`, assigned: totalAssigned, slotsProcessed: slots.length });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

// GET   /api/slots/export/schedule
router.get('/export/schedule', async (req, res) => {
  try {
    const XLSX = require('xlsx');
    const { semester } = req.query;
    const filter = (semester && semester !== 'All') ? { semester } : {};
    const slots = await Slot.find(filter)
      .populate('assignedInvigilators.facultyId', 'name designation department')
      .sort({ date: 1, time: 1 });
    const exportData = slots.map(slot => ({
      'Date': formatDateDisplay(slot.date),
      'Day': formatWeekdayDisplay(slot.date),
      'Time': slot.time, 'Semester': slot.semester, 'Slot': slot.slot,
      'Subject': slot.subject, 'Classroom': slot.classroom, 'Capacity': slot.capacity,
      'Invigilators Needed': slot.invigilatorsNeeded,
      'Assigned Count': slot.assignedInvigilators.length,
      'Assigned Faculty': slot.assignedInvigilators.map(i => `${i.name} (${i.designation})`).join(', ') || 'Not assigned'
    }));
    const ws = XLSX.utils.json_to_sheet(exportData);
    exportData.forEach((row, index) => {
      const excelRow = index + 2;
      ws[`A${excelRow}`] = { t: 's', v: row.Date };
      ws[`B${excelRow}`] = { t: 's', v: row.Day };
      ws[`C${excelRow}`] = { t: 's', v: row.Time };
    });
    ws['!cols'] = [{ wch:16 },{ wch:16 },{ wch:20 },{ wch:10 },{ wch:10 },{ wch:30 },{ wch:15 },{ wch:10 },{ wch:18 },{ wch:15 },{ wch:60 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Schedule');
    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    res.setHeader('Content-Disposition', 'attachment; filename=invigilation_schedule.xlsx');
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.send(buffer);
  } catch (error) { res.status(500).json({ error: 'Failed to export' }); }
});

// GET   /api/slots/timetable/generate
router.get('/timetable/generate', async (req, res) => {
  try {
    const { semester } = req.query;
    const filter = (semester && semester !== 'All') ? { semester } : {};
    const slots = await Slot.find(filter)
      .populate('assignedInvigilators.facultyId', 'name designation')
      .sort({ date: 1, time: 1 });
    const timetable = {};
    slots.forEach(slot => {
      const k = formatDateKey(slot.date);
      if (!timetable[k]) timetable[k] = [];
      timetable[k].push(slot);
    });
    res.json(timetable);
  } catch (error) { res.status(500).json({ error: 'Failed to generate timetable' }); }
});

// GET   /api/slots/faculty/:facultyId   — duties for one faculty
router.get('/faculty/:facultyId', async (req, res) => {
  try {
    const { facultyId } = req.params;
    const slots = await Slot.find({ 'assignedInvigilators.facultyId': facultyId }).sort({ date: 1, time: 1 });
    const duties = slots.map(slot => {
      const invig = slot.assignedInvigilators.find(i => i.facultyId.toString() === facultyId);
      return {
        _id: slot._id, exam: slot.subject, subject: `Slot ${slot.slot}`,
        class: `Sem ${slot.semester}`, room: slot.classroom, date: slot.date,
        time: slot.time, students: slot.capacity,
        status: new Date(slot.date) < new Date() ? 'Completed' : 'Upcoming',
        confirmationStatus: invig?.confirmationStatus || 'Pending',
        adjustmentRequested: invig?.adjustmentRequested || false,
        adjustedWith: invig?.adjustedWith || null,
      };
    });
    res.json(duties);
  } catch (error) { res.status(500).json({ error: error.message }); }
});

// GET   /api/slots/adjustments/all
router.get('/adjustments/all', async (req, res) => {
  try {
    const slots = await Slot.find({ 'assignedInvigilators.adjustmentRequested': true }).lean().sort({ date: 1 });
    const allAdjustments = [];
    slots.forEach(slot => {
      slot.assignedInvigilators.forEach(invig => {
        if (invig.adjustmentRequested && invig.adjustedWith && invig.adjustedWith.name) {
          allAdjustments.push({
            _id: `${slot._id}_${invig.facultyId}`, slotId: slot._id, facultyId: invig.facultyId,
            absentTeacher: invig.adjustedWith.absentTeacherName || invig.name, 
            replacedBy: invig.adjustedWith.name,
            swapWithName: invig.adjustedWith.name, reason: invig.adjustedWith.reason || 'Swap Request',
            status: invig.adjustedWith.status || 'Pending', requestedAt: invig.adjustedWith.requestedAt || null,
            rejectionReason: invig.adjustedWith.rejectionReason || '',
            exam: slot.subject, class: `Sem ${slot.semester}`, room: slot.classroom,
            originalDate: slot.date, date: slot.date, time: slot.time, students: slot.capacity,
          });
        }
      });
    });
    allAdjustments.sort((a, b) => {
      if (a.status === 'Pending' && b.status !== 'Pending') return -1;
      if (a.status !== 'Pending' && b.status === 'Pending') return  1;
      return new Date(b.requestedAt || 0) - new Date(a.requestedAt || 0);
    });
    res.json(allAdjustments);
  } catch (error) { res.status(500).json({ error: error.message }); }
});

// GET   /api/slots/adjustments/:facultyId
router.get('/adjustments/:facultyId', async (req, res) => {
  try {
    const { facultyId } = req.params;
    const slots = await Slot.find({
      'assignedInvigilators.adjustmentRequested': true,
      $or: [
        { 'assignedInvigilators.facultyId': facultyId }, 
        { 'assignedInvigilators.adjustedWith.facultyId': facultyId },
        { 'assignedInvigilators.adjustedWith.absentTeacherId': facultyId }
      ]
    }).lean().sort({ date: 1 });
    const adjustments = [];
    slots.forEach(slot => {
      slot.assignedInvigilators.forEach(invig => {
        if (invig.adjustmentRequested && invig.adjustedWith) {
          const involved = invig.facultyId.toString() === facultyId || 
                           invig.adjustedWith.facultyId?.toString() === facultyId ||
                           invig.adjustedWith.absentTeacherId?.toString() === facultyId;
          if (involved) {
            adjustments.push({
              _id: slot._id, exam: slot.subject, class: `Sem ${slot.semester}`, room: slot.classroom,
              originalDate: slot.date, time: slot.time, 
              absentTeacher: invig.adjustedWith.absentTeacherName || invig.name,
              replacedBy: invig.adjustedWith.name, reason: invig.adjustedWith.reason || 'Swap Request',
              status: invig.adjustedWith.status || 'Pending',
            });
          }
        }
      });
    });
    res.json(adjustments);
  } catch (error) { res.status(500).json({ error: error.message }); }
});

// POST  /api/slots/adjustments/reset-corrupted
router.post('/adjustments/reset-corrupted', async (req, res) => {
  try {
    const slots = await Slot.find({ 'assignedInvigilators.adjustedWith.status': 'Confirmed' });
    let fixed = 0;
    for (const slot of slots) {
      let changed = false;
      for (const invig of slot.assignedInvigilators) {
        if (invig.adjustedWith && invig.adjustedWith.status === 'Confirmed' && invig.name === invig.adjustedWith.name) {
          invig.adjustedWith.status = 'Pending'; invig.adjustedWith.resolvedAt = null;
          invig.adjustmentRequested = true; changed = true; fixed++;
        }
      }
      if (changed) await slot.save();
    }
    res.json({ success: true, message: `Reset ${fixed} corrupted record(s).`, fixed });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

// POST  /api/slots/adjustments/:compositeId/approve
router.post('/adjustments/:compositeId/approve', async (req, res) => {
  try {
    const [slotId, facultyId] = req.params.compositeId.split('_');
    const slot = await Slot.findById(slotId);
    if (!slot) return res.status(404).json({ error: 'Slot not found' });
    const invig = slot.assignedInvigilators.find(i => i.facultyId.toString() === facultyId);
    if (!invig || !invig.adjustedWith) return res.status(404).json({ error: 'Adjustment not found' });

    // Store original details to preserve historical tracking
    invig.adjustedWith.absentTeacherId = invig.facultyId;
    invig.adjustedWith.absentTeacherName = invig.name;

    // Modify Duty Counts using the global Faculty model included at the top
    await Faculty.findByIdAndUpdate(invig.facultyId, { $inc: { dutyCount: -1 } });
    await Faculty.findByIdAndUpdate(invig.adjustedWith.facultyId, { $inc: { dutyCount: 1 } });
    
    // Swap the main slot mapping
    invig.facultyId = invig.adjustedWith.facultyId;
    invig.name = invig.adjustedWith.name;
    invig.designation = invig.adjustedWith.designation;

    invig.adjustedWith.status = 'Confirmed'; 
    invig.adjustedWith.resolvedAt = new Date();
    
    await slot.save();
    res.json({ success: true, message: 'Adjustment approved, slot reassigned, and duty counts updated.' });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

// POST  /api/slots/adjustments/:compositeId/reject
router.post('/adjustments/:compositeId/reject', async (req, res) => {
  try {
    const [slotId, facultyId] = req.params.compositeId.split('_');
    const { reason } = req.body;
    const slot = await Slot.findById(slotId);
    if (!slot) return res.status(404).json({ error: 'Slot not found' });
    const invig = slot.assignedInvigilators.find(i => i.facultyId.toString() === facultyId);
    if (!invig || !invig.adjustedWith) return res.status(404).json({ error: 'Adjustment not found' });
    invig.adjustedWith.status = 'Rejected'; invig.adjustedWith.rejectionReason = reason || '';
    invig.adjustedWith.resolvedAt = new Date();
    await slot.save();
    res.json({ success: true, message: 'Adjustment rejected' });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

// POST  /api/slots/:slotId/confirm/:facultyId
router.post('/:slotId/confirm/:facultyId', async (req, res) => {
  try {
    const { slotId, facultyId } = req.params;
    const slot = await Slot.findById(slotId);
    if (!slot) return res.status(404).json({ error: 'Slot not found' });
    const invig = slot.assignedInvigilators.find(i => i.facultyId.toString() === facultyId);
    if (!invig) return res.status(404).json({ error: 'Faculty not assigned to this slot' });
    invig.confirmationStatus = 'Confirmed'; invig.confirmedAt = new Date();
    await slot.save();
    res.json({ success: true, message: 'Duty confirmed successfully' });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

// POST  /api/slots/:slotId/adjust/:facultyId
router.post('/:slotId/adjust/:facultyId', async (req, res) => {
  try {
    const { slotId, facultyId } = req.params;
    const { swapWithFacultyId, swapWithName, swapWithDesignation, reason } = req.body;
    const slot = await Slot.findById(slotId);
    if (!slot) return res.status(404).json({ error: 'Slot not found' });
    const invig = slot.assignedInvigilators.find(i => i.facultyId.toString() === facultyId);
    if (!invig) return res.status(404).json({ error: 'Faculty not assigned to this slot' });
    invig.adjustmentRequested = true;
    invig.adjustedWith = { facultyId: swapWithFacultyId, name: swapWithName, designation: swapWithDesignation, reason: reason || 'Swap Request', status: 'Pending', requestedAt: new Date() };
    await slot.save();
    res.json({ success: true, message: 'Adjustment request submitted' });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

// POST  /api/slots/:id/assign
router.post('/:id/assign', async (req, res) => {
  try {
    const { facultyId } = req.body;
    const slot = await Slot.findById(req.params.id);
    if (!slot) return res.status(404).json({ error: 'Slot not found' });
    const faculty = await Faculty.findById(facultyId);
    if (!faculty) return res.status(404).json({ error: 'Faculty not found' });
    if (isSaturday(slot.date) && isDoctor(faculty.designation)) return res.status(400).json({ error: 'Professors cannot be assigned Saturday exams' });
    if (slot.assignedInvigilators.some(i => i.facultyId.toString() === facultyId)) return res.status(400).json({ error: 'Faculty already assigned' });
    if (slot.assignedInvigilators.length >= slot.invigilatorsNeeded) return res.status(400).json({ error: 'Slot already full' });
    slot.assignedInvigilators.push({ facultyId: faculty._id, name: faculty.name, designation: faculty.designation });
    await slot.save();
    await Faculty.findByIdAndUpdate(facultyId, { $inc: { dutyCount: 1 } });
    const updatedSlot = await Slot.findById(req.params.id).populate('assignedInvigilators.facultyId', 'name designation department');
    res.json({ success: true, slot: updatedSlot });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

// POST  /api/slots/:id/unassign
router.post('/:id/unassign', async (req, res) => {
  try {
    const { facultyId } = req.body;
    const slot = await Slot.findById(req.params.id);
    if (!slot) return res.status(404).json({ error: 'Slot not found' });
    const initial = slot.assignedInvigilators.length;
    slot.assignedInvigilators = slot.assignedInvigilators.filter(i => i.facultyId.toString() !== facultyId);
    if (slot.assignedInvigilators.length === initial) return res.status(400).json({ error: 'Faculty not assigned' });
    await slot.save();
    await Faculty.findByIdAndUpdate(facultyId, { $inc: { dutyCount: -1 } });
    const updatedSlot = await Slot.findById(req.params.id).populate('assignedInvigilators.facultyId', 'name designation department');
    res.json({ success: true, slot: updatedSlot });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

// GET   /api/slots/:id
router.get('/:id', async (req, res) => {
  try {
    const slot = await Slot.findById(req.params.id).populate('assignedInvigilators.facultyId', 'name designation department');
    if (!slot) return res.status(404).json({ error: 'Slot not found' });
    res.json(slot);
  } catch (error) { res.status(500).json({ error: error.message }); }
});

// PUT   /api/slots/:id
router.put('/:id', async (req, res) => {
  try {
    const slot = await Slot.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true })
      .populate('assignedInvigilators.facultyId', 'name designation department');
    if (!slot) return res.status(404).json({ error: 'Slot not found' });
    res.json({ success: true, slot });
  } catch (error) { res.status(400).json({ error: error.message }); }
});

// DELETE /api/slots/:id
router.delete('/:id', async (req, res) => {
  try {
    const slot = await Slot.findById(req.params.id);
    if (!slot) return res.status(404).json({ error: 'Slot not found' });
    for (const invig of slot.assignedInvigilators)
      await Faculty.findByIdAndUpdate(invig.facultyId, { $inc: { dutyCount: -1 } });
    await Slot.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Slot deleted successfully' });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

module.exports = router;
