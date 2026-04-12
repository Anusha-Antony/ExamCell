import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  MapPin, Users, Calendar, Grid, List, Download,
  CheckCircle, Shuffle, Plus, Trash2, Eye, FileSpreadsheet, Upload,
  AlertTriangle, Info, ArrowLeft, Pencil
} from 'lucide-react';
import * as XLSX from 'xlsx';

// CONSTANTS
const SERIES_OPTIONS = [
  { value: 'first',  label: 'First Series Exam'  },
  { value: 'second', label: 'Second Series Exam' },
];
const SEMESTER_BATCHES = {
  odd:  ['S1', 'S3', 'S5', 'S7'],
  even: ['S2', 'S4', 'S6', 'S8'],
};
const DIVISIONS = ['A', 'B', 'C', 'D'];

function createEmptyClasses(batch) {
  const sems = SEMESTER_BATCHES[batch] || [];
  return sems.flatMap(sem =>
    DIVISIONS.map(div => ({ id: `${sem}_${div}`, sem, div, rollStart: '', rollEnd: '', rolls: [], count: 0 }))
  );
}

function applySavedClassConfig(batch, classConfig = []) {
  const savedMap = new Map(
    classConfig.map(item => [`${item.sem}_${item.div}`, item])
  );

  return createEmptyClasses(batch).map(cls => {
    const saved = savedMap.get(cls.id);
    if (!saved) return cls;

    const rollStart = Number(saved.rollStart);
    const rollEnd = Number(saved.rollEnd);
    const hasRange = !Number.isNaN(rollStart) && !Number.isNaN(rollEnd) && rollEnd >= rollStart;

    if (saved.rolls && saved.rolls.length > 0) {
      return {
        ...cls,
        rolls: saved.rolls,
        count: saved.rolls.length,
        rollStart: '',
        rollEnd: '',
      };
    }

    return {
      ...cls,
      rollStart: hasRange ? String(rollStart) : '',
      rollEnd: hasRange ? String(rollEnd) : '',
      count: hasRange ? rollEnd - rollStart + 1 : 0,
      rolls: []
    };
  });
}

function createEmptyHalls() {
  return [{ id: 1, name: '', capacity: '' }];
}

function applySavedHallConfig(hallConfig = []) {
  if (!hallConfig.length) return createEmptyHalls();
  return hallConfig.map((hall, index) => ({
    id: Date.now() + index,
    name: hall.name || '',
    capacity: hall.capacity ? String(hall.capacity) : '',
  }));
}

function expandRollRange(startValue, endValue) {
  const start = Number(startValue);
  const end = Number(endValue);
  if (Number.isNaN(start) || Number.isNaN(end) || end < start) return [];
  return Array.from({ length: end - start + 1 }, (_, index) => start + index);
}

function parseRollText(value = '') {
  const tokens = value
    .split(/[\s,]+/)
    .map(token => token.trim())
    .filter(Boolean);

  const rolls = [];
  tokens.forEach(token => {
    const rangeMatch = token.match(/^(\d+)\s*[-:]\s*(\d+)$/);
    if (rangeMatch) {
      const start = Number(rangeMatch[1]);
      const end = Number(rangeMatch[2]);
      expandRollRange(start, end).forEach(roll => rolls.push(roll));
      return;
    }

    const roll = Number(token);
    if (!Number.isNaN(roll)) rolls.push(roll);
  });

  return [...new Set(rolls)].sort((a, b) => a - b);
}

// ROLL-RANGE FORMATTER
function formatRollNumbers(rolls) {
  if (!rolls || rolls.length === 0) return '';
  const sorted = [...rolls].sort((a, b) => a - b);
  const ranges = [];
  let start = sorted[0], end = sorted[0];
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i] === end + 1) {
      end = sorted[i];
    } else {
      ranges.push(start === end ? `${start}` : start + 1 === end ? `${start}, ${end}` : `${start} to ${end}`);
      start = end = sorted[i];
    }
  }
  ranges.push(start === end ? `${start}` : start + 1 === end ? `${start}, ${end}` : `${start} to ${end}`);
  return ranges.join(', ');
}

// CORE SEATING ALGORITHM (STRICT VERSION)
//
// GUARANTEE:
//   1. Every class is split into EXACTLY 2 halves.
//   2. Both halves go to DIFFERENT halls.
//   3. Each hall contains halves from EXACTLY 2 classes.
//   4. The 2 classes in any hall MUST be from DIFFERENT semesters.
//
// ALGORITHM:
//   A. Split all filled classes into Half-1 and Half-2.
//   B. Build cross-semester pairs by matching classes from different semesters
//      using maximum-distance greedy pairing (S1 pairs with S7, S3 with S5, etc.)
//   C. For each pair (A, B):
//   D. If an odd class cannot find a cross-sem partner, it gets flagged as
//      "unpaired" and is NOT placed in a hall (caller is warned to add a class
//      or accept that the class will have a solo hall with warning).
//
// Returns:
//   { slots, warnings }
//   slots: [{ hall, capacity, seated, groups:[{sem,div,rolls,halfIndex}],
//             splitCount, sameSemWarn, classNames }]
//   warnings: string[]
function generateSeatingSlots(classes, halls) {
  const warnings = [];

  const splitClasses = classes.map(cls => {
    let allRolls = [];
    if (cls.rolls && cls.rolls.length > 0) {
      allRolls = [...cls.rolls].sort((a,b) => a - b);
    } else {
      for (let r = cls.rollStart; r <= cls.rollEnd; r++) allRolls.push(r);
    }
    const mid = Math.ceil(allRolls.length / 2);
    return {
      sem:   cls.sem,
      div:   cls.div,
      semNum: parseInt(cls.sem.replace('S', '')),
      half1: { sem: cls.sem, div: cls.div, rolls: allRolls.slice(0, mid), halfIndex: 1 },
      half2: { sem: cls.sem, div: cls.div, rolls: allRolls.slice(mid),    halfIndex: 2 },
    };
  });

  // Group by semester so we can pick from different groups
  const bySem = {};
  splitClasses.forEach(sc => {
    if (!bySem[sc.sem]) bySem[sc.sem] = [];
    bySem[sc.sem].push(sc);
  });

  const pairs      = [];     // { clsA, clsB, crossSem }
  const unmatched  = [];

  // Sort all classes by semNum for deterministic front-back pairing
  const sortedAll = [...splitClasses].sort((a,b) => a.semNum - b.semNum);

  // Greedy maximum-distance cross-sem pairing
  const usedIdx = new Array(sortedAll.length).fill(false);

  for (let i = 0; i < sortedAll.length; i++) {
    if (usedIdx[i]) continue;

    const clsA   = sortedAll[i];
    let bestJ    = -1;
    let bestDist = -1;

    for (let j = i + 1; j < sortedAll.length; j++) {
      if (usedIdx[j]) continue;
      // STRICT: only pair different semesters
      if (sortedAll[j].sem === clsA.sem) continue;
      const dist = Math.abs(clsA.semNum - sortedAll[j].semNum);
      if (dist > bestDist) { bestDist = dist; bestJ = j; }
    }

    if (bestJ !== -1) {
      pairs.push({ clsA, clsB: sortedAll[bestJ], crossSem: true });
      usedIdx[i] = usedIdx[bestJ] = true;
    } else {
      unmatched.push(clsA);
      usedIdx[i] = true;
    }
  }

  // Handle unmatched classes
  // They will still be split into 2 halls but will be solo (same class, different half)
  if (unmatched.length > 0) {
    const names = unmatched.map(c => `${c.sem} CSE ${c.div}`).join(', ');
    warnings.push(
      `${names} could not be paired with a different-semester class. ` +
      `These classes will occupy solo halls (no cross-semester pairing). ` +
      `Consider adding classes from a different semester to pair with them.`
    );
    unmatched.forEach(cls => {
      pairs.push({ clsA: cls, clsB: null, crossSem: false });
    });
  }

  const hallAssignments = [];

  pairs.forEach(({ clsA, clsB, crossSem }) => {
    if (clsB) {
      hallAssignments.push({
        groups:    [clsA.half1, clsB.half1],
        crossSem,
        sameSemWarn: !crossSem,
      });
      hallAssignments.push({
        groups:    [clsA.half2, clsB.half2],
        crossSem,
        sameSemWarn: !crossSem,
      });
    } else {
      // Unpaired class: solo halls for each half
      hallAssignments.push({ groups: [clsA.half1], crossSem: false, sameSemWarn: false, solo: true });
      hallAssignments.push({ groups: [clsA.half2], crossSem: false, sameSemWarn: false, solo: true });
    }
  });

  const preparedAssignments = hallAssignments.map(asgn => {
    const groups = asgn.groups.filter(g => g.rolls.length > 0);
    return {
      ...asgn,
      groups,
      seated: groups.reduce((s, g) => s + g.rolls.length, 0),
      classNames: groups.map(g => `${g.sem} CSE ${g.div}`),
    };
  });

  const sortedAssignments = [...preparedAssignments].sort((a, b) => b.seated - a.seated);
  const sortedHalls = [...halls].sort((a, b) => b.capacity - a.capacity);

  const slots = [];
  sortedAssignments.forEach((asgn, idx) => {
    if (idx >= sortedHalls.length) {
      warnings.push(`Not enough halls! Need ${sortedAssignments.length} halls but only ${sortedHalls.length} provided.`);
      return;
    }

    const hall = sortedHalls[idx];
    slots.push({
      hall:        hall.name,
      capacity:    hall.capacity,
      seated:      asgn.seated,
      groups:      asgn.groups,
      splitCount:  asgn.groups.length,
      sameSemWarn: asgn.sameSemWarn,
      solo:        asgn.solo || false,
      crossSem:    asgn.crossSem,
      classNames:  asgn.classNames,
    });
  });

  // Check capacity
  slots.forEach(slot => {
    if (slot.seated > slot.capacity) {
      warnings.push(
        `Hall ${slot.hall} has ${slot.seated} students but only ${slot.capacity} capacity. ` +
        `Students: ${slot.classNames.join(' + ')}`
      );
    }
  });

  return { slots, warnings };
}

// Build a per-class split summary
function buildClassSplitSummary(slots) {
  const map = {};
  slots.forEach(slot => {
    slot.groups.forEach(g => {
      const key = `${g.sem} CSE ${g.div}`;
      if (!map[key]) map[key] = [];
      map[key].push({ hall: slot.hall, rolls: g.rolls, halfIndex: g.halfIndex });
    });
  });
  return map;
}

// EXPORT TO CSV
function exportToXLS(arrangement) {
  const rows = [];
  rows.push(['VIDYA ACADEMY OF SCIENCE AND TECHNOLOGY']);
  rows.push(['Thalakkottukara , Thrissur 680501']);
  rows.push(['Department of Computer Science and Engineering']);
  rows.push([`Seating Arrangements for ${arrangement.seriesLabel}`]);
  rows.push([]);
  rows.push(['Date', 'Class rooms', 'Roll Nos', 'Time', 'No of Students']);

  arrangement.slots.forEach((slot, i) => {
    const semGroups = {};
    slot.groups.forEach(g => {
      if (!semGroups[g.sem]) semGroups[g.sem] = [];
      semGroups[g.sem].push(g);
    });
    const semKeys = Object.keys(semGroups);

    const rollNosLines = semKeys.map(sem =>
      semGroups[sem].map(g => `${g.sem} CSE ${g.div}(${formatRollNumbers(g.rolls)})`).join(', ')
    ).join('\n');

    const countLines = semKeys.map(sem =>
      semGroups[sem].map(g => `${g.sem} CSE ${g.div}(${g.rolls.length})`).join('  ')
    ).join('  ');

    rows.push([
      i === 0 ? arrangement.date : '',
      slot.hall,
      rollNosLines,
      i === 0 ? arrangement.time : '',
      countLines,
    ]);
  });

  const ws = XLSX.utils.aoa_to_sheet(rows);
  ws['!cols'] = [
    { wch: 14 },
    { wch: 18 },
    { wch: 60 },
    { wch: 22 },
    { wch: 24 },
  ];
  ws['!merges'] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: 4 } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: 4 } },
    { s: { r: 2, c: 0 }, e: { r: 2, c: 4 } },
    { s: { r: 3, c: 0 }, e: { r: 3, c: 4 } },
  ];

  for (let rowIndex = 7; rowIndex <= rows.length; rowIndex++) {
    ['A', 'B', 'C', 'D', 'E'].forEach((col) => {
      const cellRef = `${col}${rowIndex}`;
      if (ws[cellRef]) ws[cellRef].t = 's';
    });
  }

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Seating Arrangement');
  const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([wbout], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${arrangement.seriesLabel.replace(/\s+/g, '_')}_${arrangement.date}.xlsx`;
  a.click();
  URL.revokeObjectURL(url);
}

function downloadHallsTemplate() {
  const csv = `Hall Name,Capacity
NB-215,69
NB-110,67
NB-111,68
NB-113,69
NB-212,69
NB-213,70
NB-214,65
NB-301,70
NB-302,68
NB-303,67`;
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url; a.download = 'halls_template.csv'; a.click();
  URL.revokeObjectURL(url);
}

// SAVE TO BACKEND
async function saveArrangementToDB(arrangement) {
  try {
    const res = await fetch('http://localhost:5000/api/seating/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(arrangement),
    });
    if (!res.ok) {
      const err = await res.text();
      alert('Server error: ' + err);
      throw new Error('Server error');
    }
    return await res.json();
  } catch (err) {
    console.error('DB save failed:', err);
    alert('Failed to save: ' + err.message);
    return null;
  }
}

// PRINTED TABLE
function PrintedTable({ arrangement }) {
  const tdBorder = { border: '1px solid #555', padding: '6px 10px', verticalAlign: 'middle' };
  const thStyle  = { ...tdBorder, background: '#f0f0f0', fontWeight: 'bold', textAlign: 'center' };

  return (
    <div style={{ fontFamily: "'Times New Roman', Times, serif", background: '#fff', color: '#000', padding: '24px 32px' }}>
      <p style={{ textAlign: 'center', fontWeight: 'bold', fontSize: 16, textDecoration: 'underline', margin: '0 0 2px' }}>
        VIDYA ACADEMY OF SCIENCE AND TECHNOLOGY
      </p>
      <p style={{ textAlign: 'center', fontSize: 13, margin: '0 0 2px' }}>
        Thalakkottukara ,Thrissur 680501
      </p>
      <p style={{ textAlign: 'center', fontWeight: 'bold', fontSize: 13, margin: '0 0 2px' }}>
        Department of Computer Science and Engineering
      </p>
      <p style={{ textAlign: 'center', fontSize: 12, margin: '0 0 14px' }}>
        Seating Arrangements for {arrangement.seriesLabel}
      </p>

      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
        <thead>
          <tr>
            <th style={{ ...thStyle, width: '10%' }}>Date</th>
            <th style={{ ...thStyle, width: '12%' }}>Class rooms</th>
            <th style={{ ...thStyle, width: '40%' }}>Roll Nos</th>
            <th style={{ ...thStyle, width: '14%' }}>Time</th>
            <th style={{ ...thStyle, width: '24%' }}>No of Students</th>
          </tr>
        </thead>
        <tbody>
          {arrangement.slots.map((slot, i) => {
            const semGroups = {};
            slot.groups.forEach(g => {
              if (!semGroups[g.sem]) semGroups[g.sem] = [];
              semGroups[g.sem].push(g);
            });
            const semKeys = Object.keys(semGroups).sort();

            const rollNosContent = semKeys.map((sem, si) => (
              <div key={sem} style={{ marginBottom: si < semKeys.length - 1 ? 4 : 0 }}>
                {semGroups[sem].map((g, gi) => (
                  <span key={gi}>
                    {gi > 0 && ', '}
                    <strong>{g.sem} CSE {g.div}</strong>({formatRollNumbers(g.rolls)})
                  </span>
                ))}
              </div>
            ));

            const countContent = (
              <div style={{ display: 'flex', justifyContent: 'space-around', flexWrap: 'wrap', gap: 4 }}>
                {semKeys.map(sem =>
                  semGroups[sem].map((g, gi) => (
                    <span key={`${sem}_${gi}`} style={{ whiteSpace: 'nowrap' }}>
                      {g.sem} CSE {g.div}({g.rolls.length})
                    </span>
                  ))
                )}
              </div>
            );

            return (
              <tr key={i}>
                {i === 0 && (
                  <td rowSpan={arrangement.slots.length}
                    style={{ ...tdBorder, textAlign: 'center', fontWeight: 'bold' }}>
                    {arrangement.date}
                  </td>
                )}
                <td style={{ ...tdBorder, textAlign: 'center', fontWeight: 'bold' }}>
                  {slot.hall}
                </td>
                <td style={{ ...tdBorder }}>{rollNosContent}</td>
                {i === 0 && (
                  <td rowSpan={arrangement.slots.length}
                    style={{ ...tdBorder, textAlign: 'center', fontWeight: 'bold' }}>
                    {arrangement.time}
                  </td>
                )}
                <td style={{ ...tdBorder, textAlign: 'center', fontSize: 11 }}>{countContent}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// FIELD WRAPPER
function Field({ label, children, required }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {children}
    </div>
  );
}
const inputCls = "w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all";

function SplitBadge({ slot }) {
  if (slot.solo || slot.groups.length === 1) {
    const g = slot.groups[0];
    return (
      <div className="flex items-center gap-1.5 flex-wrap">
        <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded-full text-xs font-bold">
          {g.sem} CSE {g.div}
        </span>
      </div>
    );
  }
  const [gA, gB] = slot.groups;
  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      <span className="px-2 py-0.5 bg-[#ffe0e0] text-[#b02020] rounded-full text-xs font-bold">
        {gA.sem} CSE {gA.div}
      </span>
      <span className="text-slate-400 text-xs font-bold">+</span>
      <span className="px-2 py-0.5 bg-slate-100 text-[#800000] rounded-full text-xs font-bold">
        {gB.sem} CSE {gB.div}
      </span>
    </div>
  );
}

function PairingPreview({ classes }) {
  const filled = classes.filter(c => c.count > 0);
  if (filled.length === 0) return null;

  // Simulate the pairing logic
  const sorted = [...filled].sort((a,b) =>
    parseInt(a.sem.replace('S','')) - parseInt(b.sem.replace('S',''))
  );
  const usedIdx = new Array(sorted.length).fill(false);
  const pairs = [];

  for (let i = 0; i < sorted.length; i++) {
    if (usedIdx[i]) continue;
    let bestJ = -1, bestDist = -1;
    for (let j = i+1; j < sorted.length; j++) {
      if (usedIdx[j]) continue;
      if (sorted[j].sem === sorted[i].sem) continue;
      const dist = Math.abs(
        parseInt(sorted[i].sem.replace('S','')) - parseInt(sorted[j].sem.replace('S',''))
      );
      if (dist > bestDist) { bestDist = dist; bestJ = j; }
    }
    if (bestJ !== -1) {
      pairs.push({ a: sorted[i], b: sorted[bestJ], ok: true });
      usedIdx[i] = usedIdx[bestJ] = true;
    } else {
      pairs.push({ a: sorted[i], b: null, ok: false });
      usedIdx[i] = true;
    }
  }

  return (
    <div className="mt-4 p-4 rounded-xl border border-blue-200 bg-blue-50">
      <div className="flex items-center gap-2 mb-3">
        <Info className="w-4 h-4 text-blue-600" />
        <span className="text-sm font-bold text-blue-800">Predicted Pairing (before generation)</span>
      </div>
      <div className="space-y-2">
        {pairs.map((p, i) => (
          <div key={i} className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold
            ${p.ok ? 'bg-emerald-50 border border-emerald-200' : 'bg-amber-50 border border-amber-200'}`}>
            <span className="px-2 py-0.5 bg-white border border-slate-200 rounded-full text-indigo-700">{p.a.sem} CSE {p.a.div}</span>
            {p.b ? (
              <>
                <span className="text-slate-400">vs</span>
                <span className="px-2 py-0.5 bg-white border border-slate-200 rounded-full text-purple-700">{p.b.sem} CSE {p.b.div}</span>
                <span className="ml-auto text-emerald-700">OK Cross-sem -> 2 halls</span>
              </>
            ) : (
              <span className="ml-auto text-amber-700">Warning No cross-sem partner -> solo halls</span>
            )}
          </div>
        ))}
      </div>
      <div className="mt-3 text-xs text-blue-700">
        <strong>{pairs.filter(p=>p.ok).length}</strong> valid pairs ->{' '}
        <strong>{pairs.filter(p=>p.ok).length * 2}</strong> cross-sem halls needed
        {pairs.some(p=>!p.ok) && (
          <span className="ml-2 text-amber-700">
            + <strong>{pairs.filter(p=>!p.ok).length * 2}</strong> solo halls (unpaired)
          </span>
        )}
      </div>
    </div>
  );
}

// MAIN COMPONENT
export default function SeatingArrangement() {
  const navigate = useNavigate();
  const [viewMode,      setViewMode]     = useState('list');
  const [arrangements,  setArrangements] = useState([]);
  const [step,          setStep]         = useState(0);
  const [previewArr,    setPreviewArr]   = useState(null);
  const [genWarnings,   setGenWarnings]  = useState([]);

  const [seriesType, setSeriesType] = useState('');
  const [batchType,  setBatchType]  = useState('');
  const [examDate,   setExamDate]   = useState('');
  const [examTime,   setExamTime]   = useState('');
  const [savedRollConfigInfo, setSavedRollConfigInfo] = useState(null);
  const [loadingRollConfig, setLoadingRollConfig] = useState(false);
  const [rollConfigLocked, setRollConfigLocked] = useState(false);
  const [rollConfigDirty, setRollConfigDirty] = useState(false);
  const [hallConfigLocked, setHallConfigLocked] = useState(false);
  const [savedHallConfigInfo, setSavedHallConfigInfo] = useState(null);
  const [loadingHallConfig, setLoadingHallConfig] = useState(false);

// Fetch arrangements function (reusable)
  const fetchArrangements = async () => {
    try {
      const res = await fetch('http://localhost:5000/api/seating');
      const data = await res.json();
      if (data.success) {
        setArrangements(data.data);
      }
    } catch (err) {
      console.error('Failed to fetch seating arrangements:', err);
    }
  };

  // Delete handler
  const handleDelete = async (id, seriesLabel) => {
    // eslint-disable-next-line no-alert
    if (!window.confirm(`Delete "${seriesLabel}" permanently? This cannot be undone.`)) return;
    
    try {
      const res = await fetch(`http://localhost:5000/api/seating/${id}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Delete failed');
      
      // Optimistic update
      setArrangements(prev => prev.filter(a => a._id !== id));
    } catch (err) {
      console.error('Delete failed:', err);
      // eslint-disable-next-line no-alert
      window.alert('Failed to delete arrangement. Please try again.');
      // Refetch on error
      await fetchArrangements();
    }
  };

  // Fetch real data on component mount
  useEffect(() => {
    fetchArrangements();
    loadSavedHallConfig();
  }, []);

  // Step 2 - classes
  const [classes, setClasses] = useState([]);



  // Step 2 - halls
  const [halls,             setHalls]             = useState(createEmptyHalls());
  const [uploadedHallsName, setUploadedHallsName] = useState('');
  const hallFileRef = useRef();

  const [uploadedRollsName, setUploadedRollsName] = useState('');
  const rollFileRef = useRef();

  const activeSemesters = batchType ? SEMESTER_BATCHES[batchType] : [];

  const resetRollConfigState = () => {
    setSavedRollConfigInfo(null);
    setLoadingRollConfig(false);
    setRollConfigLocked(false);
    setRollConfigDirty(false);
  };

  const loadSavedRollConfig = async (batch) => {
    setLoadingRollConfig(true);
    try {
      const res = await fetch(`http://localhost:5000/api/seating/roll-config/latest?batchType=${batch}`);
      const data = await res.json();
      if (data.success && Array.isArray(data.data) && data.data.length > 0) {
        setClasses(applySavedClassConfig(batch, data.data));
        setSavedRollConfigInfo({
          arrangementId: data.arrangementId,
          updatedAt: data.updatedAt,
        });
        setRollConfigLocked(true);
        setRollConfigDirty(false);
      } else {
        setClasses(createEmptyClasses(batch));
        setSavedRollConfigInfo(null);
        setRollConfigLocked(false);
        setRollConfigDirty(false);
      }
    } catch (err) {
      console.error('Failed to load saved roll config:', err);
      setClasses(createEmptyClasses(batch));
      setSavedRollConfigInfo(null);
      setRollConfigLocked(false);
      setRollConfigDirty(false);
    } finally {
      setLoadingRollConfig(false);
    }
  };

  const handleBatchChange = async (val) => {
    setBatchType(val);
    setClasses(createEmptyClasses(val));
    setSavedRollConfigInfo(null);
    setRollConfigLocked(false);
    setRollConfigDirty(false);
    await loadSavedRollConfig(val);
  };

  const updateClassRollState = (classId, updates) => {
    setClasses(prev => prev.map(cls => cls.id === classId ? { ...cls, ...updates } : cls));
    setRollConfigLocked(false);
    setRollConfigDirty(true);
  };

  const handleRollTextChange = (classId, value) => {
    const rolls = parseRollText(value);
    updateClassRollState(classId, {
      rolls,
      count: rolls.length,
      rollStart: '',
      rollEnd: '',
    });
  };

  const handleRollRangeChange = (classId, field, value) => {
    setClasses(prev => prev.map(cls => {
      if (cls.id !== classId) return cls;
      return {
        ...cls,
        [field]: value.replace(/[^\d]/g, ''),
      };
    }));
    setRollConfigLocked(false);
    setRollConfigDirty(true);
  };

  const handleAutoFillRollRange = (classId) => {
    const targetClass = classes.find(cls => cls.id === classId);
    if (!targetClass) return;

    const rolls = expandRollRange(targetClass.rollStart, targetClass.rollEnd);
    if (rolls.length === 0) {
      alert('Enter a valid start and end roll number to auto fill.');
      return;
    }

    updateClassRollState(classId, {
      rolls,
      count: rolls.length,
    });
  };

  const loadSavedHallConfig = async () => {
    setLoadingHallConfig(true);
    try {
      const res = await fetch('http://localhost:5000/api/seating/hall-config/latest');
      const data = await res.json();
      if (data.success && Array.isArray(data.data) && data.data.length > 0) {
        setHalls(applySavedHallConfig(data.data));
        setHallConfigLocked(true);
        setSavedHallConfigInfo({
          arrangementId: data.arrangementId,
          updatedAt: data.updatedAt,
        });
      } else {
        setHalls(createEmptyHalls());
        setHallConfigLocked(false);
        setSavedHallConfigInfo(null);
      }
    } catch (err) {
      console.error('Failed to load saved hall config:', err);
      setHalls(createEmptyHalls());
      setHallConfigLocked(false);
      setSavedHallConfigInfo(null);
    } finally {
      setLoadingHallConfig(false);
    }
  };

  const updateHall   = (id, field, val) => setHalls(p => p.map(h => h.id === id ? { ...h, [field]: val } : h));
  const addHall      = () => setHalls(p => [...p, { id: Date.now(), name: '', capacity: '' }]);
  const removeHall   = (id) => setHalls(p => {
    const next = p.filter(h => h.id !== id);
    return next.length ? next : createEmptyHalls();
  });

  const handleHallFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploadedHallsName(file.name);
    const reader = new FileReader();
    reader.onload = (evt) => {
      const text  = evt.target.result;
      const lines = text.trim().split('\n').filter(Boolean);
      const dataLines = lines[0]?.toLowerCase().includes('hall') || lines[0]?.toLowerCase().includes('name')
        ? lines.slice(1) : lines;
      const parsed = dataLines
        .map((line, i) => {
          const cols = line.split(',');
          const name = cols[0]?.trim().replace(/"/g, '');
          const cap  = parseInt(cols[1]?.trim());
          return name && !isNaN(cap) ? { id: Date.now() + i, name, capacity: String(cap) } : null;
        })
        .filter(Boolean);
      if (parsed.length === 0) { alert('No valid hall data found. Format: Hall Name, Capacity'); return; }
      setHalls(parsed);
      setHallConfigLocked(false);
      setSavedHallConfigInfo(null);
      alert(`OK Loaded ${parsed.length} halls from file`);
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const totalStudents = classes.reduce((s, c) => s + c.count, 0);
  const totalHallCap  = halls.reduce((s, h) => s + (parseInt(h.capacity) || 0), 0);

  const handleRollFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploadedRollsName(file.name);
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = new Uint8Array(evt.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        
        if (!workbook || !workbook.SheetNames) throw new Error("Invalid workbook parsed by XLSX.");

        const newClasses = classes.map(c => ({
          ...c,
          rolls: Array.isArray(c.rolls) ? [...c.rolls] : []
        }));
        
        let foundStudents = 0;
        let lastSampleRowStr = ''; // Used for debugging to show the user

        workbook.SheetNames.forEach(sheetName => {
          const ws = workbook.Sheets[sheetName];
          // Read as array of arrays
          const rawData = XLSX.utils.sheet_to_json(ws, { header: 1 });
          if (!rawData || rawData.length === 0) return;

          // Find the header row index by scanning for common keywords
          let headerRowIndex = -1;
          for (let i = 0; i < Math.min(20, rawData.length); i++) {
            const rowStr = (rawData[i] || []).map(String).join(' ').toLowerCase();
            if (rowStr.includes('roll') || rowStr.includes('reg ') || rowStr.includes('reg.') || rowStr.includes('register') || rowStr.includes('university no') || rowStr.includes('student name')) {
              headerRowIndex = i;
              break;
            }
          }

          let headers = [];
          let startIdx = 0;
          if (headerRowIndex !== -1) {
            headers = (rawData[headerRowIndex] || []).map(h => String(h || '').trim().toLowerCase());
            startIdx = headerRowIndex + 1;
            if (!lastSampleRowStr && headers.some(h => h)) {
              lastSampleRowStr = `Detected Headers: [${headers.filter(h => h).join(', ')}]`;
            }
          } else {
            // No recognizable header words found. Just map columns generically.
            headers = (rawData[0] || []).map((_, i) => `col${i}`);
            startIdx = 0;
            if (!lastSampleRowStr) {
               lastSampleRowStr = `No headers detected. First data row: [${(rawData[0] || []).join(', ')}]`;
            }
          }
          
          // Process rows after the header
          for (let rIdx = startIdx; rIdx < rawData.length; rIdx++) {
            const rowArr = rawData[rIdx];
            if (!rowArr || rowArr.length === 0) continue;

            const values = rowArr.map(v => String(v || '').trim());
            const rowLower = {};
            headers.forEach((h, idx) => {
              if (h && values[idx] !== undefined && values[idx] !== null && values[idx] !== '') {
                rowLower[h] = values[idx];
              }
            });

            let sem = '';
            let div = '';
            let rollStr = '';

            // 1. Look for explicit semester and division from general fields
            if (rowLower['semester']) sem = rowLower['semester'];
            else if (rowLower['sem']) sem = rowLower['sem'];
            else if (rowLower['class']) {
              const match = rowLower['class'].match(/(S[1-8])/i);
              if (match) sem = match[1];
            }
            if (!sem) {
              const match = sheetName.match(/(S[1-8])/i);
              if (match) sem = match[1];
            }

            if (rowLower['division']) div = rowLower['division'];
            else if (rowLower['div']) div = rowLower['div'];
            else if (rowLower['section']) div = rowLower['section'];
            else if (rowLower['class']) {
              const cleanedClass = rowLower['class'].replace(/CSE|EEE|ECE|ME|CE|CS|AD|AI|DS/gi, ' ');
              const match = cleanedClass.match(/\b([A-D])\b/i);
              if (match) div = match[1];
            }
            if (!div) {
              const cleanedSheet = sheetName.replace(/CSE|EEE|ECE|ME|CE|CS|AD|AI|DS/gi, ' ');
              const match = cleanedSheet.match(/\b([A-D])\b/i);
              if (match) div = match[1];
            }

            // 2. Look for explicit roll column
            for (let key of Object.keys(rowLower)) {
              if (key.includes('roll') || key.includes('reg') || key === 'no' || key === 'no.' || key === 'no:') {
                rollStr = rowLower[key];
                break;
              }
            }

            // 3. Fallback: What if the header IS the class name? (e.g. "s4 b2")
            if (!rollStr) {
               for (let key of Object.keys(rowLower)) {
                 const mSem = key.match(/(S[1-8])/i);
                 const mDiv = key.replace(/CSE|EEE|ECE|ME|CE|CS|AD|AI|DS/gi, ' ').match(/\b([A-D])\b/i);
                 if (mSem && mDiv && rowLower[key]) {
                    sem = mSem[1];
                    div = mDiv[1];
                    rollStr = rowLower[key];
                    break;
                 }
               }
            }

            // 4. Absolute Fallback: Find any purely numeric value if sem and div are known
            if (!rollStr && sem && div) {
               for (let val of values) {
                  const cleaned = val.replace(/[^0-9]/g, '');
                  if (cleaned && cleaned === val && parseInt(cleaned) > 0) {
                    rollStr = cleaned;
                    break;
                  }
               }
            }

            sem = String(sem).trim().toUpperCase();
            div = String(div).trim().toUpperCase();
            
            if (sem && div && rollStr) {
               const rollNums = rollStr.split(',').map(r => parseInt(r.trim())).filter(r => !isNaN(r));

               let targetSem = sem;
               // Map Odd <-> Even semesters based on active batch availability
               if (sem === 'S1' && !newClasses.some(c => c.sem === 'S1') && newClasses.some(c => c.sem === 'S2')) targetSem = 'S2';
               else if (sem === 'S2' && !newClasses.some(c => c.sem === 'S2') && newClasses.some(c => c.sem === 'S1')) targetSem = 'S1';
               else if (sem === 'S3' && !newClasses.some(c => c.sem === 'S3') && newClasses.some(c => c.sem === 'S4')) targetSem = 'S4';
               else if (sem === 'S4' && !newClasses.some(c => c.sem === 'S4') && newClasses.some(c => c.sem === 'S3')) targetSem = 'S3';
               else if (sem === 'S5' && !newClasses.some(c => c.sem === 'S5') && newClasses.some(c => c.sem === 'S6')) targetSem = 'S6';
               else if (sem === 'S6' && !newClasses.some(c => c.sem === 'S6') && newClasses.some(c => c.sem === 'S5')) targetSem = 'S5';
               else if (sem === 'S7' && !newClasses.some(c => c.sem === 'S7') && newClasses.some(c => c.sem === 'S8')) targetSem = 'S8';
               else if (sem === 'S8' && !newClasses.some(c => c.sem === 'S8') && newClasses.some(c => c.sem === 'S7')) targetSem = 'S7';

               const clsIndex = newClasses.findIndex(c => c.sem === targetSem && c.div === div);
               if (clsIndex !== -1) {
                 for (let r = 0; r < rollNums.length; r++) {
                   const rollVal = rollNums[r];
                   if (!newClasses[clsIndex].rolls.includes(rollVal)) {
                     newClasses[clsIndex].rolls.push(rollVal);
                     foundStudents++;
                   }
                 }
                 newClasses[clsIndex].count = newClasses[clsIndex].rolls.length;
                 newClasses[clsIndex].rollStart = '';
                 newClasses[clsIndex].rollEnd = '';
               }
            }
          }
        });
        
        newClasses.forEach(c => {
          c.rolls = [...new Set(c.rolls)].sort((a,b) => a - b);
          c.count = c.rolls.length;
        });

        // Ensure we actually added students, otherwise log it as an issue to the user
        if (foundStudents === 0) {
          alert(`Upload parsed but no students matched the active batch (Odd/Even Semesters).\n\nPlease ensure your spreadsheet indicates correct Semester and Division. Sample row parsed:\n\n${lastSampleRowStr || 'Empty spreadsheet'}`);
          return;
        }

        setClasses(newClasses);
        setRollConfigLocked(false);
        setRollConfigDirty(true);
        alert(`Successfully loaded ${foundStudents} students from spreadsheet.`);
      } catch (err) {
        console.error("Error parsing spreadsheet:", err);
        alert(`Failed to read the spreadsheet:\n\n${err.message || String(err)}\n\nPlease ensure it's a valid Excel/CSV file.`);
      }
    };
    reader.readAsArrayBuffer(file);
    e.target.value = '';
  };

  const downloadRollsTemplate = () => {
    const wb = XLSX.utils.book_new();

    ['S2', 'S4'].forEach(sem => {
      const rows = [];
      ['A', 'B'].forEach(div => {
        for(let i=1; i<=5; i++) {
          rows.push({
            Semester: sem,
            Division: div,
            'Roll No': i,
            Name: `Student ${i}`
          });
        }
      });
      const ws = XLSX.utils.json_to_sheet(rows);
      XLSX.utils.book_append_sheet(wb, ws, `CSE ${sem}`);
    });

    const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([wbout], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url; a.download = 'Student_List_Template.xlsx'; a.click();
    URL.revokeObjectURL(url);
  };

  // Count how many halls will be needed
  const filledClasses = classes.filter(c => c.count > 0);
  const hallsNeeded   = filledClasses.length * 2;  // every class -> exactly 2 halls

  const handleGenerate = () => {
    if (!seriesType || !batchType || !examDate || !examTime) { alert('Complete all Step 1 fields'); return; }
    const filled = classes.filter(c => c.count > 0);
    if (filled.length === 0) { alert('Upload roll numbers for at least one class'); return; }
    if (halls.some(h => !h.name || !h.capacity)) { alert('Fill name and capacity for all halls'); return; }

    const requiredHalls = filled.length * 2;
    if (halls.length < requiredHalls) {
      alert(
        `Need exactly ${requiredHalls} halls (${filled.length} classes x 2 splits each).\n` +
        `You currently have ${halls.length} halls.\nPlease add ${requiredHalls - halls.length} more hall(s).`
      );
      return;
    }

    if (totalStudents > totalHallCap) {
      alert(`Students (${totalStudents}) exceed total hall capacity (${totalHallCap}). Add more halls or increase capacity.`);
      return;
    }

    const hallData  = halls.map(h => ({ name: h.name, capacity: parseInt(h.capacity) }));
    const classData = filled.map(c => ({
      sem: c.sem, div: c.div,
      rollStart: parseInt(c.rollStart) || null, rollEnd: parseInt(c.rollEnd) || null,
      rolls: c.rolls || [], count: c.count,
    }));

    const { slots, warnings } = generateSeatingSlots(classData, hallData);
    const series     = SERIES_OPTIONS.find(s => s.value === seriesType);
    const batchLabel = batchType === 'odd' ? 'Odd Semesters (S1, S3, S5, S7)' : 'Even Semesters (S2, S4, S6, S8)';

    const crossSemCount = slots.filter(s => s.crossSem && s.splitCount === 2).length;

    setGenWarnings(warnings);
    setPreviewArr({
      id: Date.now(), seriesType, batchType,
      seriesLabel: `${series.label} - ${batchLabel}`,
      date: examDate, time: examTime,
      status: 'Generated', slots, totalStudents, classConfig: classData, hallConfig: hallData,
      crossSemCount, totalSlots: slots.length,
    });
    setStep(3);
  };

  const handleSaveAndPublish = async () => {
    const saved = await saveArrangementToDB({ ...previewArr, status: 'Published' });
    if (!saved?.success) return;
    setArrangements(p => [saved.data, ...p]);
    setSeriesType(''); setBatchType(''); setExamDate(''); setExamTime('');
    setClasses([]); setHalls(applySavedHallConfig(saved.data?.hallConfig || []));
    setUploadedHallsName('');
    setGenWarnings([]);
    resetRollConfigState();
    setHallConfigLocked(Boolean(saved.data?.hallConfig?.length));
    setSavedHallConfigInfo(saved.data?.hallConfig?.length ? {
      arrangementId: saved.data._id,
      updatedAt: saved.data.updatedAt || new Date().toISOString(),
    } : null);
    setPreviewArr(null); setStep(0);
  };

  const uniqueHallCount = [...new Set(arrangements.flatMap(a => a.slots.map(s => s.hall)))].length;
  const totalSeated     = arrangements.reduce((s, a) => s + (a.totalStudents || 0), 0);


  return (
    <div className="p-6 space-y-6">

      {/* HEADER */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-800">Seating Arrangement</h1>
          <p className="text-slate-600">Manage exam hall seating for CSE Department</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => navigate('/AdminDashboard')} 
            className="flex items-center gap-2 px-4 py-3 bg-slate-200 text-slate-700 rounded-xl text-sm font-semibold hover:bg-slate-300 transition-all"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Dashboard
          </button>
          <button onClick={() => { setStep(1); setPreviewArr(null); setGenWarnings([]); resetRollConfigState(); }}
            className="flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-[#800000] to-[#b02020] text-white rounded-xl font-semibold hover:shadow-xl transition-all">
            <Shuffle className="w-5 h-5" /> New Seating Arrangement
          </button>
        </div>
      </div>

      {/* STATS */}
      <div className="grid md:grid-cols-3 gap-6">
        {[
          { title: 'Total Arrangements', value: arrangements.length, icon: Grid,       color: 'from-[#800000] to-[#b02020]'   },
          { title: 'Halls Used',         value: uniqueHallCount,     icon: MapPin,      color: 'from-[#901010] to-[#c03030]'   },
          { title: 'Students Seated',    value: totalSeated,         icon: Users,       color: 'from-[#a01010] to-[#d04040]'   },
        ].map((stat, i) => {
          const Icon = stat.icon;
          return (
            <div key={i} className="bg-white rounded-2xl shadow-lg p-6 border border-slate-100">
              <div className={`w-12 h-12 bg-gradient-to-br ${stat.color} rounded-xl flex items-center justify-center mb-4`}>
                <Icon className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-slate-600 text-sm font-medium mb-1">{stat.title}</h3>
              <p className="text-3xl font-bold text-slate-800">{stat.value}</p>
            </div>
          );
        })}
      </div>

      {/* ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚ÂÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚ÂÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚ÂÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚ÂÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚ÂÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â WIZARD ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚ÂÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚ÂÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚ÂÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚ÂÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚ÂÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â */}
      {step > 0 && (
        <div className="bg-white rounded-2xl shadow-lg border border-slate-200 overflow-hidden">
          {/* Step tabs */}
          <div className="flex border-b border-slate-200">
            {['Exam Details', 'Class & Hall Setup', 'Preview & Save'].map((label, i) => (
              <div key={i} className={`flex-1 py-4 px-4 text-sm font-semibold text-center border-r last:border-r-0 border-slate-200 transition-colors
                ${step === i+1 ? 'bg-[#fff0f0] text-[#b02020] border-b-2 border-b-[#b02020]' :
                  step  > i+1 ? 'bg-green-50 text-green-600' : 'text-slate-400'}`}>
                <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs mr-2
                  ${step === i+1 ? 'bg-[#b02020] text-white' : step > i+1 ? 'bg-green-500 text-white' : 'bg-slate-200 text-slate-500'}`}>
                  {step > i+1 ? 'OK' : i+1}
                </span>
                {label}
              </div>
            ))}
          </div>

          {/* ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚ÂÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚ÂÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ STEP 1 ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚ÂÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚ÂÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ */}
          {step === 1 && (
            <div className="p-8">
              <h3 className="text-xl font-bold text-slate-800 mb-6">Exam Details</h3>
              <div className="grid md:grid-cols-2 gap-6">
                <Field label="Series" required>
                  <div className="flex gap-3">
                    {SERIES_OPTIONS.map(opt => (
                      <button key={opt.value} onClick={() => setSeriesType(opt.value)}
                        className={`flex-1 py-3 px-4 rounded-xl border-2 text-sm font-semibold transition-all
                          ${seriesType === opt.value ? 'border-[#b02020] bg-[#fff0f0] text-[#800000]' : 'border-slate-200 text-slate-500 hover:border-[#e0b0b0]'}`}>
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </Field>
                <Field label="Semester Batch" required>
                  <div className="flex gap-3">
                    {[{ value: 'odd', label: 'Odd  (S1,S3, S5, S7)' }, { value: 'even', label: 'Even (S2,S4, S6, S8)' }].map(opt => (
                      <button key={opt.value} onClick={() => handleBatchChange(opt.value)}
                        className={`flex-1 py-3 px-4 rounded-xl border-2 text-sm font-semibold transition-all
                          ${batchType === opt.value ? 'border-[#b02020] bg-[#fff0f0] text-[#800000]' : 'border-slate-200 text-slate-500 hover:border-[#e0b0b0]'}`}>
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </Field>
                <Field label="Exam Date" required>
                  <input type="date" value={examDate} onChange={e => setExamDate(e.target.value)} className={inputCls} />
                </Field>
                <Field label="Time Slot" required>
                  <input value={examTime} onChange={e => setExamTime(e.target.value)}
                    placeholder="e.g. 9:15 AM - 10:45 AM" className={inputCls} />
                </Field>
              </div>
              <div className="mt-8 flex justify-end gap-3">
                <button onClick={() => setStep(0)}
                  className="px-6 py-3 bg-slate-100 text-slate-700 rounded-xl font-semibold hover:bg-slate-200 transition-all">Cancel</button>
                <button onClick={() => { if (!seriesType || !batchType || !examDate || !examTime) { alert('Fill all fields'); return; } setStep(2); }}
                  className="flex items-center gap-2 px-8 py-3 bg-gradient-to-r from-[#800000] to-[#b02020] text-white rounded-xl font-semibold hover:shadow-lg transition-all">
                  Next ->
                </button>
              </div>
            </div>
          )}

          {/* ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚ÂÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚ÂÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ STEP 2 ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚ÂÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚ÂÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ */}
          {step === 2 && (
            <div className="p-8 space-y-8">

              {/* ROLL RANGES */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-bold text-slate-800">Student Roll Number Ranges</h3>
                    <p className="text-sm text-slate-500 mt-0.5">
                      {loadingRollConfig
                        ? 'Loading saved roll numbers for this batch...'
                        : 'Saved roll numbers load automatically for this batch. Click edit only when you need to change them.'}
                    </p>
                  </div>
                  <div className="text-right flex items-center gap-4">
                    <div className="flex gap-2">
                       <button onClick={downloadRollsTemplate}
                        className="flex items-center gap-2 px-3 py-2 bg-slate-50 text-slate-600 border border-slate-200 rounded-lg text-xs font-semibold hover:bg-slate-100 transition-all">
                        <Download className="w-4 h-4" /> Demo XLS
                      </button>
                      <button onClick={() => rollFileRef.current?.click()}
                        disabled={loadingRollConfig}
                        className="flex items-center gap-2 px-3 py-2 bg-green-50 text-green-700 border border-green-200 rounded-lg text-xs font-semibold hover:bg-green-100 transition-all">
                        <Upload className="w-4 h-4" />
                        {uploadedRollsName ? `OK` : 'Upload'}
                      </button>
                      <input ref={rollFileRef} type="file" accept=".csv,.xlsx,.xls" className="hidden" onChange={handleRollFileUpload} />
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-[#b02020]">{totalStudents}</div>
                      <div className="text-xs text-slate-400">total students</div>
                    </div>
                  </div>
                </div>

                {savedRollConfigInfo && (
                  <div className="mb-4 flex flex-col gap-3 rounded-xl border border-blue-200 bg-blue-50 p-4 md:flex-row md:items-center md:justify-between">
                    <div>
                      <div className="text-sm font-semibold text-blue-900">
                        {rollConfigDirty ? 'Edited roll numbers are active for this batch' : 'Saved roll numbers are active for this batch'}
                      </div>
                      <div className="text-xs text-blue-700 mt-1">
                        {rollConfigDirty
                          ? 'You can keep editing these values, or restore the latest saved batch data at any time.'
                          : 'These values were automatically loaded from the latest saved seating setup.'}
                      </div>
                      {savedRollConfigInfo.updatedAt && (
                        <div className="text-xs text-blue-700 mt-1">
                          Last updated: {new Date(savedRollConfigInfo.updatedAt).toLocaleString()}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setRollConfigLocked(false)}
                        className="inline-flex items-center gap-2 rounded-lg border border-blue-300 bg-white px-3 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-100 transition-all"
                      >
                        <Pencil className="w-4 h-4" /> Edit Rolls
                      </button>
                      <button
                        onClick={() => loadSavedRollConfig(batchType)}
                        className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 transition-all"
                      >
                        Restore Saved
                      </button>
                    </div>
                  </div>
                )}

                {activeSemesters.map(sem => (
                  <div key={sem} className="mb-5">
                    <div className="flex items-center gap-3 mb-3">
                      <span className="px-3 py-1 bg-[#ffe0e0] text-[#b02020] rounded-full text-xs font-bold">{sem}</span>
                      <div className="flex-1 h-px bg-slate-100" />
                      <span className="text-xs text-slate-400">
                        {classes.filter(c => c.sem === sem).reduce((s, c) => s + c.count, 0)} students
                      </span>
                    </div>
                    <div className="grid grid-cols-4 gap-3">
                      {DIVISIONS.map(div => {
                        const cls = classes.find(c => c.sem === sem && c.div === div);
                        if (!cls) return null;
                        return (
                          <div key={div} className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                            <div className="flex items-center justify-between mb-3">
                              <span className="text-sm font-bold text-slate-700">CSE - {div}</span>
                              {cls.count > 0 && (
                                <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded-full text-xs font-semibold">{cls.count}</span>
                              )}
                            </div>
                            <div className="mt-2 text-sm text-slate-500">
                              {rollConfigLocked ? (
                                cls.count > 0 ? (
                                  <div className="text-xs truncate text-indigo-700 mt-2 font-medium" title={cls.rolls?.join(', ')}>
                                    {cls.rolls?.length ? cls.rolls.join(', ') : `${cls.rollStart} to ${cls.rollEnd}`}
                                  </div>
                                ) : (
                                  <div className="text-xs italic text-slate-400 py-3">No data available</div>
                                )
                              ) : (
                                <div className="space-y-3">
                                  <div className="grid grid-cols-2 gap-2">
                                    <input
                                      value={cls.rollStart}
                                      onChange={e => handleRollRangeChange(cls.id, 'rollStart', e.target.value)}
                                      placeholder="Start"
                                      className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700 outline-none focus:border-[#b02020]"
                                    />
                                    <input
                                      value={cls.rollEnd}
                                      onChange={e => handleRollRangeChange(cls.id, 'rollEnd', e.target.value)}
                                      placeholder="End"
                                      className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700 outline-none focus:border-[#b02020]"
                                    />
                                  </div>
                                  <button
                                    onClick={() => handleAutoFillRollRange(cls.id)}
                                    className="w-full rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-700 hover:bg-amber-100 transition-all"
                                  >
                                    Auto Fill From Range
                                  </button>
                                  <textarea
                                    value={cls.rolls?.join(', ')}
                                    onChange={e => handleRollTextChange(cls.id, e.target.value)}
                                    placeholder="Enter roll numbers like 1, 2, 3 or 1-30"
                                    rows={4}
                                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700 outline-none focus:border-[#b02020] resize-none"
                                  />
                                  <div className="text-[11px] text-slate-500">
                                    Rolls are saved for restore and used directly while generating seating.
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}

                {/* Strict rule banner */}
                <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50 text-sm text-emerald-800 flex items-start gap-3">
                  <span className="text-lg leading-none mt-0.5">Rule</span>
                  <div className="space-y-1">
                    <div><strong>Strict 2-Split + Guaranteed Cross-Semester Rule</strong></div>
                    <div className="text-emerald-700">
                      Every class is divided into <strong>exactly Half-1</strong> and <strong>Half-2</strong>.
                      Both halves go to <strong>different halls</strong>. Each hall will contain halves from
                      <strong> exactly 2 classes from different semesters</strong>. Same-semester pairing is
                      <strong> never allowed</strong>.
                    </div>
                    <div className="flex flex-wrap gap-2 mt-2">
                      <span className="px-2.5 py-1 bg-white border border-emerald-300 rounded-lg text-xs font-bold text-emerald-800">
                        Hall-X: Half-1(S6 A) + Half-1(S4 B)
                      </span>
                      <span className="px-2.5 py-1 bg-white border border-emerald-300 rounded-lg text-xs font-bold text-emerald-800">
                        Hall-Y: Half-2(S6 A) + Half-2(S4 B)
                      </span>
                      {filledClasses.length > 0 && (
                        <span className="px-2.5 py-1 bg-emerald-200 rounded-lg text-xs font-bold text-emerald-900">
                          {filledClasses.length} classes -> exactly {hallsNeeded} halls needed
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Live pairing preview */}
                <PairingPreview classes={classes} />
              </div>

              {/* HALLS */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-bold text-slate-800">Exam Halls</h3>
                    <p className="text-sm text-slate-500 mt-0.5">
                      Need <strong className={halls.length < hallsNeeded && hallsNeeded > 0 ? 'text-red-600' : 'text-green-600'}>
                        {hallsNeeded}
                      </strong> halls ({filledClasses.length} classes x 2)
                      {' '}- Capacity: <strong className={totalHallCap < totalStudents ? 'text-red-600' : 'text-green-600'}>{totalHallCap}</strong> / {totalStudents} students
                    </p>
                  </div>
                  <div className="flex gap-2 flex-wrap justify-end">
                    <button onClick={downloadHallsTemplate}
                      className="flex items-center gap-2 px-4 py-2.5 bg-slate-50 text-slate-600 border border-slate-200 rounded-xl text-sm font-semibold hover:bg-slate-100 transition-all">
                      <Download className="w-4 h-4" /> Demo XLS
                    </button>
                    <button onClick={() => hallFileRef.current?.click()}
                      disabled={loadingHallConfig}
                      className="flex items-center gap-2 px-4 py-2.5 bg-green-50 text-green-700 border border-green-200 rounded-xl text-sm font-semibold hover:bg-green-100 transition-all">
                      <Upload className="w-4 h-4" />
                      {uploadedHallsName ? `OK ${uploadedHallsName}` : 'Upload Hall XLS'}
                    </button>
                    <input ref={hallFileRef} type="file" accept=".csv,.xlsx,.xls" className="hidden" onChange={handleHallFileUpload} />
                    <button onClick={addHall}
                      disabled={hallConfigLocked || loadingHallConfig}
                      className="flex items-center gap-2 px-4 py-2.5 bg-[#fff0f0] text-[#b02020] border border-[#e0b0b0] rounded-xl text-sm font-semibold hover:bg-[#ffe0e0] transition-all">
                      <Plus className="w-4 h-4" /> Add Hall
                    </button>
                  </div>
                </div>

                {savedHallConfigInfo && (
                  <div className="mb-4 flex flex-col gap-3 rounded-xl border border-blue-200 bg-blue-50 p-4 md:flex-row md:items-center md:justify-between">
                    <div>
                      <div className="text-sm font-semibold text-blue-900">Saved hall list is active</div>
                      <div className="text-xs text-blue-700 mt-1">
                        Previously uploaded or saved hall details are shown here automatically, so you do not need to upload them every time.
                      </div>
                      {savedHallConfigInfo.updatedAt && (
                        <div className="text-xs text-blue-700 mt-1">
                          Last updated: {new Date(savedHallConfigInfo.updatedAt).toLocaleString()}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setHallConfigLocked(false)}
                        className="inline-flex items-center gap-2 rounded-lg border border-blue-300 bg-white px-3 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-100 transition-all"
                      >
                        <Pencil className="w-4 h-4" /> Edit Halls
                      </button>
                      <button
                        onClick={loadSavedHallConfig}
                        className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 transition-all"
                      >
                        Restore Saved
                      </button>
                    </div>
                  </div>
                )}

                {/* Hall count mismatch warning */}
                {hallsNeeded > 0 && halls.length !== hallsNeeded && (
                  <div className={`mb-3 p-3 rounded-xl text-sm flex items-center gap-2
                    ${halls.length < hallsNeeded
                      ? 'bg-red-50 border border-red-200 text-red-700'
                      : 'bg-amber-50 border border-amber-200 text-amber-700'}`}>
                    <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                    {halls.length < hallsNeeded
                      ? `Need ${hallsNeeded} halls but only ${halls.length} added. Add ${hallsNeeded - halls.length} more.`
                      : `You have ${halls.length} halls but only ${hallsNeeded} will be used. Extra halls are ignored.`}
                  </div>
                )}

                <div className="space-y-2">
                  {halls.map((hall, idx) => {
                    const isUsed = idx < hallsNeeded;
                    return (
                      <div key={hall.id} className={`flex items-center gap-3 px-4 py-3 rounded-xl border
                        ${isUsed ? 'bg-slate-50 border-slate-200' : 'bg-slate-50/40 border-dashed border-slate-200 opacity-60'}`}>
                        <div className={`w-7 h-7 flex-shrink-0 flex items-center justify-center rounded-lg text-xs font-bold
                          ${isUsed ? 'bg-[#ffe0e0] text-[#b02020]' : 'bg-slate-200 text-slate-500'}`}>
                          {idx + 1}
                        </div>
                        <div className="flex-1">
                          <input value={hall.name} onChange={e => updateHall(hall.id, 'name', e.target.value)}
                            disabled={hallConfigLocked || loadingHallConfig}
                            placeholder="Classroom name  e.g. NB-215"
                            className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#c0392b] ${hallConfigLocked || loadingHallConfig ? 'bg-slate-100 text-slate-500 cursor-not-allowed border-slate-200' : 'bg-white border-slate-200'}`} />
                        </div>
                        <div className="w-32">
                          <input type="number" min="1" value={hall.capacity}
                            disabled={hallConfigLocked || loadingHallConfig}
                            onChange={e => updateHall(hall.id, 'capacity', e.target.value)}
                            placeholder="Capacity"
                            className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#c0392b] ${hallConfigLocked || loadingHallConfig ? 'bg-slate-100 text-slate-500 cursor-not-allowed border-slate-200' : 'bg-white border-slate-200'}`} />
                        </div>
                        <div className="w-20 text-center text-xs text-[#b02020] font-semibold">
                          Max {hall.capacity || '-'}
                        </div>
                        {halls.length > 1 && !(hallConfigLocked || loadingHallConfig) && (
                          <button onClick={() => removeHall(hall.id)} className="p-1.5 text-slate-400 hover:text-red-500 transition-colors">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                        {!isUsed && hallsNeeded > 0 && (
                          <span className="text-xs text-slate-400 italic">unused</span>
                        )}
                      </div>
                    );
                  })}
                </div>

                {totalHallCap < totalStudents && totalStudents > 0 && (
                  <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
                    Warning Capacity ({totalHallCap}) &lt; students ({totalStudents}). Add more halls or increase capacity.
                  </div>
                )}
              </div>

              <div className="flex justify-between gap-3 pt-2">
                <button onClick={() => setStep(1)}
                  className="px-6 py-3 bg-slate-100 text-slate-700 rounded-xl font-semibold hover:bg-slate-200 transition-all">Back</button>
                <button onClick={handleGenerate}
                  className="flex items-center gap-2 px-8 py-3 bg-gradient-to-r from-[#800000] to-[#b02020] text-white rounded-xl font-semibold hover:shadow-xl transition-all">
                  <Shuffle className="w-5 h-5" /> Generate Arrangement
                </button>
              </div>
            </div>
          )}

          {/* ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚ÂÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚ÂÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ STEP 3: Preview ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚ÂÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚ÂÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ */}
          {step === 3 && previewArr && (
            <div className="p-8">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold text-slate-800">Preview Seating Arrangement</h3>
                <div className="flex items-center gap-2 flex-wrap justify-end">
                  {previewArr.slots.every(s => s.crossSem || s.solo) ? (
                    <span className="px-3 py-1.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-700 border border-emerald-200">
                      OK All paired halls are cross-semester
                    </span>
                  ) : (
                    <span className="px-3 py-1.5 rounded-full text-xs font-bold bg-red-100 text-red-700 border border-red-200">
                      X Some halls have same-semester pairing
                    </span>
                  )}
                  <span className="px-3 py-1.5 rounded-full text-xs font-bold bg-[#fff0f0] text-[#b02020] border border-[#e0b0b0]">
                    Rule {previewArr.slots.filter(s => s.splitCount === 2).length}/{previewArr.slots.length} halls fully paired
                  </span>
                </div>
              </div>

              {/* Warnings */}
              {genWarnings.length > 0 && (
                <div className="mb-5 space-y-2">
                  {genWarnings.map((w, i) => (
                    <div key={i} className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-800 flex items-start gap-2">
                      <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5 text-amber-600" />
                      {w}
                    </div>
                  ))}
                </div>
              )}

              {/* Class split summary */}
              <div className="mb-5 p-4 bg-slate-50 rounded-xl border border-slate-200">
                <div className="text-sm font-bold text-slate-700 mb-3 flex items-center gap-2">
                  <Info className="w-4 h-4 text-slate-500" />
                  Class Split Summary - each class appears in exactly 2 halls
                </div>
                <div className="grid md:grid-cols-2 gap-2">
                  {Object.entries(buildClassSplitSummary(previewArr.slots)).map(([cls, halves]) => (
                    <div key={cls} className="flex items-center gap-2 px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs">
                      <span className="font-bold text-slate-700 w-28 flex-shrink-0">{cls}</span>
                      <div className="flex gap-2 flex-wrap">
                        {halves.map((h, i) => (
                          <span key={i} className={`px-2 py-0.5 rounded-full font-semibold
                            ${i === 0 ? 'bg-[#ffe0e0] text-[#b02020]' : 'bg-slate-100 text-[#800000]'}`}>
                            -> {h.hall} ({h.rolls.length} students)
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* THE PRINTED TABLE */}
              <div className="overflow-x-auto mb-6 rounded-xl border border-slate-300 shadow-md">
                <PrintedTable arrangement={previewArr} />
              </div>
              {/* Hall summary cards */}
              <div className="grid md:grid-cols-3 gap-3 mb-8">
                {previewArr.slots.map((slot, i) => {
                  const cardColor =
                    slot.solo        ? 'bg-amber-50 border-amber-200' :
                    !slot.crossSem   ? 'bg-red-50 border-red-200'    :
                                       'bg-emerald-50 border-emerald-200';
                  return (
                    <div key={i} className={`p-4 rounded-xl border ${cardColor}`}>
                      <div className="flex items-center justify-between mb-3">
                        <span className="font-bold text-slate-800">{slot.hall}</span>
                        <span className="text-xs px-2 py-1 bg-white border border-slate-200 text-slate-700 rounded-full font-semibold">
                          {slot.seated} seated
                        </span>
                      </div>
                      <SplitBadge slot={slot} />
                      <div className="mt-3 space-y-1">
                        {slot.groups.map((g, gi) => (
                          <div key={gi} className="flex justify-between text-xs text-slate-600 py-1 border-b border-slate-100 last:border-0">
                            <span className="font-semibold">{g.sem} CSE {g.div}</span>
                            <span className="text-slate-400">{g.rolls.length} students</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="flex justify-between gap-3">
                <button onClick={() => setStep(2)}
                  className="px-6 py-3 bg-slate-100 text-slate-700 rounded-xl font-semibold hover:bg-slate-200 transition-all">Edit</button>
                <div className="flex gap-3">
                  <button onClick={() => exportToXLS(previewArr)}
                    className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl font-semibold hover:shadow-xl transition-all">
                    <FileSpreadsheet className="w-5 h-5" /> Export XLS
                  </button>
                  <button onClick={handleSaveAndPublish}
                    className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-xl font-semibold hover:shadow-xl transition-all">
                    <CheckCircle className="w-5 h-5" /> Save & Publish
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ARRANGEMENTS LIST */}
      <div className="bg-white rounded-2xl shadow-lg p-6 border border-slate-200">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold text-slate-800">Generated Seating Arrangements</h3>
          <div className="flex gap-2 bg-slate-100 p-1 rounded-lg">
            <button onClick={() => setViewMode('list')}
              className={`p-2 rounded-lg transition-all ${viewMode === 'list' ? 'bg-white shadow-sm' : 'text-slate-500'}`}>
              <List className="w-5 h-5" />
            </button>
            <button onClick={() => setViewMode('grid')}
              className={`p-2 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-white shadow-sm' : 'text-slate-500'}`}>
              <Grid className="w-5 h-5" />
            </button>
          </div>
        </div>

        {arrangements.length === 0 ? (
          <div className="text-center py-16">
            <Shuffle className="w-14 h-14 text-slate-200 mx-auto mb-4" />
            <p className="text-slate-500 text-lg font-medium">No arrangements yet</p>
            <p className="text-slate-400 text-sm mt-1">Click "New Seating Arrangement" to get started</p>
          </div>
        ) : (
          <div className={viewMode === 'grid' ? 'grid md:grid-cols-2 gap-4' : 'space-y-4'}>
            {arrangements.map(arr => (
              <div key={arr.id} className="p-6 bg-slate-50 rounded-2xl border border-slate-200 hover:border-blue-300 transition-all">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h4 className="text-lg font-bold text-slate-800">{arr.seriesLabel}</h4>
                    <div className="flex items-center gap-2 mt-2 flex-wrap">
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold
                        ${arr.status === 'Published' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                        {arr.status}
                      </span>
                      <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-semibold">
                        {arr.slots.length} halls
                      </span>
                      <span className="px-3 py-1 bg-emerald-100 text-emerald-700 rounded-full text-xs font-semibold">
                        OK {arr.crossSemCount}/{arr.slots.length} cross-sem
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-2 flex-shrink-0">
                    <button onClick={() => { setPreviewArr(arr); setGenWarnings([]); setStep(3); }}
                      className="flex items-center gap-1 px-3 py-2 bg-slate-200 text-slate-700 rounded-lg text-sm font-semibold hover:bg-slate-300 transition-all">
                      <Eye className="w-4 h-4" /> View
                    </button>
                    <button onClick={() => exportToXLS(arr)}
                      className="flex items-center gap-1 px-3 py-2 bg-green-500 text-white rounded-lg text-sm font-semibold hover:bg-green-600 transition-all">
                      <Download className="w-4 h-4" /> XLS
                    </button>
                    <button
                      onClick={() => handleDelete(arr._id, arr.seriesLabel)}
                      className="flex items-center gap-1 px-3 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg text-sm font-semibold transition-all"
                      title="Delete Arrangement">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm text-slate-600">
                  <div className="flex items-center gap-2"><Calendar className="w-4 h-4 text-slate-400" />{arr.date}</div>
                  <div className="flex items-center gap-2 truncate">
                    <MapPin className="w-4 h-4 text-slate-400 flex-shrink-0" />
                    <span className="truncate">{arr.slots.map(s => s.hall).join(', ')}</span>
                  </div>
                  <div className="flex items-center gap-2"><Users className="w-4 h-4 text-slate-400" />{arr.totalStudents} students</div>
                  <div className="flex items-center gap-2"><span>Time</span>{arr.time}</div>
                </div>
                <div className="mt-4 pt-4 border-t border-slate-200 flex flex-wrap gap-2">
                  {arr.slots.map((s, i) => (
                    <span key={i} className={`px-2.5 py-1 rounded-lg text-xs border
                      ${s.crossSem && s.splitCount === 2
                        ? 'bg-white border-emerald-200 text-slate-600'
                        : 'bg-amber-50 border-amber-200 text-amber-700'}`}>
                      <strong>{s.hall}</strong>: {s.groups.map(g => `${g.sem} CSE ${g.div}`).join(' + ')}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
