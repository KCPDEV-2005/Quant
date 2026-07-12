const express = require('express');
const router = express.Router();
const multer = require('multer');
const Papa = require('papaparse');
const xlsx = require('xlsx');

const School = require('../models/School');
const SchoolHead = require('../models/SchoolHead');

// Configure multer to store uploaded files in memory
const upload = multer({ storage: multer.memoryStorage() });

// Helper to clean phone numbers
const cleanPhone = (phoneStr) => {
  if (phoneStr === null || phoneStr === undefined) return null;
  let str = String(phoneStr).trim();
  if (str === '' || str.toLowerCase() === 'nan') return null;
  if (str.endsWith('.0')) {
    str = str.slice(0, -2);
  }
  return str;
};

// Helper to parse CSV/Excel buffer to JSON
const parseFileBuffer = (buffer, mimetype, originalname) => {
  if (mimetype === 'text/csv' || originalname.endsWith('.csv')) {
    const csvString = buffer.toString('utf8');
    const result = Papa.parse(csvString, { header: true, skipEmptyLines: true });
    return result.data;
  } else if (
    mimetype === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
    mimetype === 'application/vnd.ms-excel' ||
    originalname.endsWith('.xlsx') ||
    originalname.endsWith('.xls')
  ) {
    const workbook = xlsx.read(buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    return xlsx.utils.sheet_to_json(sheet, { defval: null });
  }
  throw new Error('Unsupported file type');
};

// POST /api/upload/schools
router.post('/upload/schools', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

    let rows = parseFileBuffer(req.file.buffer, req.file.mimetype, req.file.originalname);
    if (!rows || rows.length === 0) return res.status(400).json({ error: 'Empty or invalid file' });

    const bulkOps = rows.map((row) => {
      // Create a normalized object with trimmed keys to avoid header spacing issues
      const normalizedRow = {};
      for (const key in row) {
        normalizedRow[key.trim()] = row[key];
      }

      const registrationId = normalizedRow['Registration ID'] || normalizedRow['registrationId'];
      if (!registrationId) return null; // Skip rows without registration ID

      const updateDoc = {
        registrationId: String(registrationId).trim(),
        schoolName: normalizedRow['School Name'] || normalizedRow['schoolName'] || normalizedRow['School'],
        state: normalizedRow['State'] || normalizedRow['state'],
        district: normalizedRow['District'] || normalizedRow['district'],
        subDistrict: normalizedRow['Sub-district / Taluka'] || normalizedRow['Sub District'] || normalizedRow['Sub-District'] || normalizedRow['Taluka'] || normalizedRow['taluka'] || normalizedRow['Sub_District'] || normalizedRow['subDistrict'] || normalizedRow['Block'] || normalizedRow['block'],
        village: normalizedRow['Village'] || normalizedRow['village'],
        cluster: normalizedRow['Cluster'] || normalizedRow['cluster'],
        pincode: normalizedRow['Pincode'] || normalizedRow['pincode'] || normalizedRow['PIN Code'] || normalizedRow['Pin Code'],
        managementType: normalizedRow['Management Type'] || normalizedRow['managementType'] || normalizedRow['Management'],
        mediumOfInstruction: normalizedRow['Medium of Instruction'] || normalizedRow['mediumOfInstruction'] || normalizedRow['Medium'],
        schoolEmail: normalizedRow['School Official Email'] || normalizedRow['School Email'] || normalizedRow['schoolEmail'] || normalizedRow['Email'] || normalizedRow['email'],
        principalName: normalizedRow['Principal Name'] || normalizedRow['principalName'] || normalizedRow['Principal'],
        primaryCoordinatorName: normalizedRow['Primary Coordinator Name'] || normalizedRow['primaryCoordinatorName'],
        primaryCoordinatorPhone: cleanPhone(normalizedRow['Primary Coordinator Phone'] || normalizedRow['primaryCoordinatorPhone']),
        alternateCoordinatorName: normalizedRow['Alternate Coordinator Name'] || normalizedRow['alternateCoordinatorName'],
        alternateCoordinatorPhone: cleanPhone(normalizedRow['Alternate Coordinator Phone'] || normalizedRow['alternateCoordinatorPhone']),
        totalStudents: Number(normalizedRow['Total Students'] || normalizedRow['totalStudents'] || normalizedRow['Students']) || 0,
        totalBatches: Number(normalizedRow['Total Batches'] || normalizedRow['totalBatches'] || normalizedRow['Batches']) || 0,
        totalStandards: Number(normalizedRow['Total Standards Selected'] || normalizedRow['Total Standards'] || normalizedRow['totalStandards'] || normalizedRow['Standards']) || 0,
        programmeYear: normalizedRow['Programme Year'] || normalizedRow['programmeYear'] || normalizedRow['Program Year'] || normalizedRow['Year'],
        udiseCode: normalizedRow['UDISE / Registration Code'] || normalizedRow['UDISE Code'] || normalizedRow['udiseCode'] || normalizedRow['UDISE'] || normalizedRow['Udise Code'],
        jeevanvidyaRefName: normalizedRow['Jeevanvidya Reference Person Name'] || normalizedRow['Jeevanvidya Ref Name'] || normalizedRow['jeevanvidyaRefName'] || normalizedRow['Jeevanvidya Reference Name'],
        jeevanvidyaRefPhone: cleanPhone(normalizedRow['Jeevanvidya Reference Person Phone'] || normalizedRow['Jeevanvidya Ref Phone'] || normalizedRow['jeevanvidyaRefPhone'] || normalizedRow['Jeevanvidya Reference Phone'] || normalizedRow['Jeevanvidya Contact']),
        standardsSelected: normalizedRow['Standards Selected'] || normalizedRow['standardsSelected'] || normalizedRow['Selected Standards'],
        submissionDate: normalizedRow['Submission Date'] || normalizedRow['submissionDate'],
        lastUpdatedOn: normalizedRow['Last Updated On'] || normalizedRow['lastUpdatedOn'],
        updatedAt: new Date()
      };

      return {
        updateOne: {
          filter: { registrationId: updateDoc.registrationId },
          update: {
            $set: updateDoc,
            $setOnInsert: { createdAt: new Date() }
          },
          upsert: true
        }
      };
    }).filter(Boolean); // Remove nulls

    if (bulkOps.length === 0) return res.status(400).json({ error: 'No valid rows found' });

    const result = await School.bulkWrite(bulkOps);
    res.json({
      inserted: result.upsertedCount,
      updated: result.modifiedCount,
      total: bulkOps.length
    });
  } catch (err) {
    console.error('Error uploading schools:', err);
    res.status(500).json({ error: 'Failed to process school data' });
  }
});

// POST /api/upload/heads
router.post('/upload/heads', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

    let rows = parseFileBuffer(req.file.buffer, req.file.mimetype, req.file.originalname);
    if (!rows || rows.length === 0) return res.status(400).json({ error: 'Empty or invalid file' });

    const bulkOps = rows.map((row) => {
      const normalizedRow = {};
      for (const key in row) {
        normalizedRow[key.trim()] = row[key];
      }

      const phone = cleanPhone(normalizedRow['Contact No'] || normalizedRow['phone'] || normalizedRow['Contact Number']);
      if (!phone) return null;

      const name = String(normalizedRow['Name'] || normalizedRow['name'] || '').trim();

      return {
        updateOne: {
          filter: { phone },
          update: {
            $set: { name, phone, updatedAt: new Date() },
            $setOnInsert: { createdAt: new Date() }
          },
          upsert: true
        }
      };
    }).filter(Boolean);

    if (bulkOps.length === 0) return res.status(400).json({ error: 'No valid rows found' });

    const result = await SchoolHead.bulkWrite(bulkOps);
    res.json({
      inserted: result.upsertedCount,
      updated: result.modifiedCount,
      total: bulkOps.length
    });
  } catch (err) {
    console.error('Error uploading heads:', err);
    res.status(500).json({ error: 'Failed to process school heads data' });
  }
});

const generateMatchResults = async () => {
  const heads = await SchoolHead.find({}).lean();
  const schools = await School.find({}).lean();

  const results = [];

  for (const head of heads) {
    for (const school of schools) {
      let matchedAs = null;
      let nameInSchoolSheet = null;

      if (school.primaryCoordinatorPhone === head.phone) {
        matchedAs = 'Primary Coordinator';
        nameInSchoolSheet = school.primaryCoordinatorName;
      } else if (school.alternateCoordinatorPhone === head.phone) {
        matchedAs = 'Alternate Coordinator';
        nameInSchoolSheet = school.alternateCoordinatorName;
      }

      if (matchedAs) {
        const headNameSafe = (head.name || '').toLowerCase().trim();
        const schoolNameSafe = (nameInSchoolSheet || '').toLowerCase().trim();
        const nameMatchStatus = headNameSafe === schoolNameSafe ? 'Matched' : 'Mismatch - verify manually';

        results.push({
          headName: head.name,
          headPhone: head.phone,
          matchedAs,
          nameMatchStatus,
          nameInSchoolSheet,
          schoolName: school.schoolName,
          registrationId: school.registrationId,
          state: school.state,
          district: school.district,
          primaryCoordinatorName: school.primaryCoordinatorName,
          primaryCoordinatorPhone: school.primaryCoordinatorPhone,
          alternateCoordinatorName: school.alternateCoordinatorName,
          alternateCoordinatorPhone: school.alternateCoordinatorPhone
        });
      }
    }
  }

  return results;
};

// GET /api/match
router.get('/match', async (req, res) => {
  try {
    const results = await generateMatchResults();
    res.json(results);
  } catch (err) {
    console.error('Error generating match:', err);
    res.status(500).json({ error: 'Failed to generate match' });
  }
});

// GET /api/match/download
router.get('/match/download', async (req, res) => {
  try {
    const results = await generateMatchResults();
    
    // Ensure all rows have all keys
    if (results.length > 0) {
      const csv = Papa.unparse(results);
      const dateStr = new Date().toISOString().split('T')[0];
      res.header('Content-Type', 'text/csv');
      res.attachment(`matched_school_heads_${dateStr}.csv`);
      return res.send(csv);
    } else {
      // Empty CSV
      res.header('Content-Type', 'text/csv');
      res.attachment(`matched_school_heads.csv`);
      return res.send('');
    }
  } catch (err) {
    console.error('Error downloading match:', err);
    res.status(500).json({ error: 'Failed to download match data' });
  }
});

// GET /api/schools/count
router.get('/schools/count', async (req, res) => {
  try {
    const count = await School.countDocuments();
    res.json({ count });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch count' });
  }
});

// GET /api/heads/count
router.get('/heads/count', async (req, res) => {
  try {
    const count = await SchoolHead.countDocuments();
    res.json({ count });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch count' });
  }
});

// GET /api/debug/sample — returns first school document to inspect field names
router.get('/debug/sample', async (req, res) => {
  try {
    const doc = await require('../models/School').findOne({}).lean();
    res.json({ keys: doc ? Object.keys(doc) : [], sample: doc });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/debug/columns — upload a file and see its column headers
router.post('/debug/columns', upload.single('file'), (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file' });
    const rows = parseFileBuffer(req.file.buffer, req.file.mimetype, req.file.originalname);
    const headers = rows && rows.length > 0 ? Object.keys(rows[0]) : [];
    res.json({ headers, firstRow: rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
