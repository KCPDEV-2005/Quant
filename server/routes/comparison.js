const express = require('express');
const router = express.Router();
const multer = require('multer');
const Papa = require('papaparse');
const xlsx = require('xlsx');

const LastYearSchool = require('../models/LastYearSchool');
const School = require('../models/School');

const upload = multer({ storage: multer.memoryStorage() });

// Helper to parse CSV/Excel buffer to JSON array of arrays
const parseFileBufferToArray = (buffer, mimetype, originalname) => {
  if (mimetype === 'text/csv' || originalname.endsWith('.csv')) {
    const csvString = buffer.toString('utf8');
    const result = Papa.parse(csvString, { header: false, skipEmptyLines: true });
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
    return xlsx.utils.sheet_to_json(sheet, { header: 1, defval: null });
  }
  throw new Error('Unsupported file type');
};

const cleanUdise = (val) => {
  if (val === null || val === undefined) return null;
  let str = String(val).trim();
  if (str === '' || str.toLowerCase() === 'nan' || str.toLowerCase() === 'undefined') return null;
  
  // Handle scientific notation from excel
  if (!isNaN(Number(str)) && str.includes('e+')) {
    str = Math.round(Number(str)).toString();
  }
  
  if (str.endsWith('.0')) {
    str = str.slice(0, -2);
  }
  return str;
};

// POST /api/upload/lastyear
router.post('/upload/lastyear', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

    const rows = parseFileBufferToArray(req.file.buffer, req.file.mimetype, req.file.originalname);
    if (!rows || rows.length === 0) return res.status(400).json({ error: 'Empty or invalid file' });

    // Find header row by "ucode" or "udise"
    let headerRowIndex = -1;
    let udiseColIndex = 5; // default fallback

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      let foundHeader = false;
      for (let j = 0; j < row.length; j++) {
        const cellStr = String(row[j] || '').toLowerCase().trim();
        if (cellStr === 'ucode' || cellStr === 'udise' || cellStr === 'udise code' || cellStr === 'registration code') {
          headerRowIndex = i;
          udiseColIndex = j;
          foundHeader = true;
          break;
        }
      }
      if (foundHeader) break;
    }

    const dataRows = headerRowIndex !== -1 ? rows.slice(headerRowIndex + 1) : rows;

    const bulkOps = dataRows.map(row => {
      // Column mappings as per requirements:
      // Col 1 (index 0): BLK
      // Col 2 (index 1): Block Name -> blockName
      // Col 3 (index 2): Cluster -> cluster
      // Col 4 (index 3): Village -> village
      // Col 5 (index 4): PinCode -> pincode
      // Col 6 (index udiseColIndex): Ucode -> udiseCode
      // Col 7 (index 6): School Name -> schoolName
      // Col 8 (index 7): Management -> management
      // Col 11 (index 10): Medium1 -> medium
      // Col 12 (index 11): Enrollment -> enrollment
      // Col 14 (index 13): HM Name -> hmName
      // Col 16 (index 15): Mobile No -> hmPhone
      // Col 17 (index 16): Email -> hmEmail

      // Note: we use index-based mapping except for UDISE which might shift
      const udiseVal = cleanUdise(row[udiseColIndex]);
      if (!udiseVal) return null;

      const doc = {
        udiseCode: udiseVal,
        blockName: String(row[1] || '').trim(),
        cluster: String(row[2] || '').trim(),
        village: String(row[3] || '').trim(),
        pincode: String(row[4] || '').trim(),
        schoolName: String(row[6] || '').trim(),
        management: String(row[7] || '').trim(),
        medium: String(row[10] || '').trim(),
        enrollment: Number(row[11]) || 0,
        hmName: String(row[13] || '').trim(),
        hmPhone: String(row[15] || '').trim(),
        hmEmail: String(row[16] || '').trim(),
        updatedAt: new Date()
      };

      return {
        updateOne: {
          filter: { udiseCode: doc.udiseCode },
          update: {
            $set: doc,
            $setOnInsert: { createdAt: new Date() }
          },
          upsert: true
        }
      };
    }).filter(Boolean);

    let skipped = dataRows.length - bulkOps.length;

    if (bulkOps.length === 0) {
      return res.status(400).json({ error: 'No valid rows found (check if UDISE column exists and has values)' });
    }

    const result = await LastYearSchool.bulkWrite(bulkOps);
    res.json({
      inserted: result.upsertedCount,
      updated: result.modifiedCount,
      skipped,
      total: dataRows.length
    });
  } catch (err) {
    console.error('Error uploading last year schools:', err);
    res.status(500).json({ error: 'Failed to process last year school data' });
  }
});

// GET /api/compare/summary
router.get('/compare/summary', async (req, res) => {
  try {
    const lastYearTotal = await LastYearSchool.countDocuments();
    const currentYearTotal = await School.countDocuments({ udiseCode: { $ne: null, $ne: '' } });

    // Registered this year (in both)
    const registeredQuery = await LastYearSchool.aggregate([
      { $lookup: { from: 'schools', localField: 'udiseCode', foreignField: 'udiseCode', as: 'currentYear' } },
      { $match: { 'currentYear.0': { $exists: true } } },
      { $count: 'count' }
    ]);
    const registeredThisYear = registeredQuery.length > 0 ? registeredQuery[0].count : 0;

    // Missing (in last year, not in current)
    const notRegisteredThisYear = lastYearTotal - registeredThisYear;

    // New (in current, not in last year)
    const newQuery = await School.aggregate([
      { $match: { udiseCode: { $ne: null, $ne: '' } } },
      { $lookup: { from: 'lastyearschools', localField: 'udiseCode', foreignField: 'udiseCode', as: 'lastYear' } },
      { $match: { 'lastYear.0': { $exists: false } } },
      { $count: 'count' }
    ]);
    const newThisYear = newQuery.length > 0 ? newQuery[0].count : 0;

    res.json({
      lastYearTotal,
      currentYearTotal,
      registeredThisYear,
      notRegisteredThisYear,
      newThisYear
    });
  } catch (err) {
    console.error('Error in compare summary:', err);
    res.status(500).json({ error: 'Failed to generate comparison summary' });
  }
});

// GET /api/compare/registered
router.get('/compare/registered', async (req, res) => {
  try {
    const results = await LastYearSchool.aggregate([
      { $lookup: { from: 'schools', localField: 'udiseCode', foreignField: 'udiseCode', as: 'currentYear' } },
      { $match: { 'currentYear.0': { $exists: true } } },
      { $unwind: '$currentYear' },
      {
        $project: {
          _id: 0,
          udiseCode: 1,
          schoolName: '$currentYear.schoolName', // show current year school name
          state: '$currentYear.state',
          district: '$currentYear.district',
          subDistrict: '$currentYear.subDistrict',
          currentYearRegistrationId: '$currentYear.registrationId',
          lastYearHmName: '$hmName',
          lastYearHmPhone: '$hmPhone',
          currentYearPrimaryCoordinator: '$currentYear.primaryCoordinatorName',
          currentYearPrimaryPhone: '$currentYear.primaryCoordinatorPhone'
        }
      }
    ]);
    res.json(results);
  } catch (err) {
    res.status(500).json({ error: 'Failed to get registered schools' });
  }
});

// GET /api/compare/missing
router.get('/compare/missing', async (req, res) => {
  try {
    const results = await LastYearSchool.aggregate([
      { $lookup: { from: 'schools', localField: 'udiseCode', foreignField: 'udiseCode', as: 'currentYear' } },
      { $match: { 'currentYear.0': { $exists: false } } },
      {
        $project: {
          _id: 0,
          udiseCode: 1,
          schoolName: 1,
          blockName: 1,
          cluster: 1,
          village: 1,
          management: 1,
          medium: 1,
          enrollment: 1,
          hmName: 1,
          hmPhone: 1,
          hmEmail: 1
        }
      }
    ]);
    res.json(results);
  } catch (err) {
    res.status(500).json({ error: 'Failed to get missing schools' });
  }
});

// GET /api/compare/new
router.get('/compare/new', async (req, res) => {
  try {
    const results = await School.aggregate([
      { $match: { udiseCode: { $ne: null, $ne: '' } } },
      { $lookup: { from: 'lastyearschools', localField: 'udiseCode', foreignField: 'udiseCode', as: 'lastYear' } },
      { $match: { 'lastYear.0': { $exists: false } } },
      {
        $project: {
          _id: 0,
          udiseCode: 1,
          schoolName: 1,
          state: 1,
          district: 1,
          subDistrict: 1,
          management: '$managementType',
          mediumOfInstruction: 1,
          primaryCoordinatorName: 1,
          primaryCoordinatorPhone: 1
        }
      }
    ]);
    res.json(results);
  } catch (err) {
    res.status(500).json({ error: 'Failed to get new schools' });
  }
});

// GET /api/compare/download?type=registered|missing|new
router.get('/compare/download', async (req, res) => {
  try {
    const { type } = req.query;
    let endpoint = '';
    if (type === 'registered') endpoint = '/api/compare/registered';
    else if (type === 'missing') endpoint = '/api/compare/missing';
    else if (type === 'new') endpoint = '/api/compare/new';
    else return res.status(400).json({ error: 'Invalid type' });

    // We can just reuse the aggregations directly
    let results = [];
    if (type === 'registered') {
      results = await LastYearSchool.aggregate([
        { $lookup: { from: 'schools', localField: 'udiseCode', foreignField: 'udiseCode', as: 'currentYear' } },
        { $match: { 'currentYear.0': { $exists: true } } },
        { $unwind: '$currentYear' },
        {
          $project: {
            _id: 0,
            'UDISE Code': '$udiseCode',
            'School Name': '$currentYear.schoolName',
            'State': '$currentYear.state',
            'District': '$currentYear.district',
            'Sub-district': '$currentYear.subDistrict',
            'Last Year HM Name': '$hmName',
            'Last Year HM Phone': '$hmPhone',
            'Current Year Primary Coordinator': '$currentYear.primaryCoordinatorName',
            'Current Year Primary Phone': '$currentYear.primaryCoordinatorPhone',
            'Current Year Registration ID': '$currentYear.registrationId'
          }
        }
      ]);
    } else if (type === 'missing') {
      results = await LastYearSchool.aggregate([
        { $lookup: { from: 'schools', localField: 'udiseCode', foreignField: 'udiseCode', as: 'currentYear' } },
        { $match: { 'currentYear.0': { $exists: false } } },
        {
          $project: {
            _id: 0,
            'UDISE Code': '$udiseCode',
            'School Name': '$schoolName',
            'Block Name': '$blockName',
            'Cluster': '$cluster',
            'Village': '$village',
            'Management': '$management',
            'Medium': '$medium',
            'Enrollment': '$enrollment',
            'HM Name': '$hmName',
            'HM Phone': '$hmPhone',
            'HM Email': '$hmEmail'
          }
        }
      ]);
    } else if (type === 'new') {
      results = await School.aggregate([
        { $match: { udiseCode: { $ne: null, $ne: '' } } },
        { $lookup: { from: 'lastyearschools', localField: 'udiseCode', foreignField: 'udiseCode', as: 'lastYear' } },
        { $match: { 'lastYear.0': { $exists: false } } },
        {
          $project: {
            _id: 0,
            'UDISE Code': '$udiseCode',
            'School Name': '$schoolName',
            'State': '$state',
            'District': '$district',
            'Sub-district': '$subDistrict',
            'Management': '$managementType',
            'Medium of Instruction': '$mediumOfInstruction',
            'Primary Coordinator': '$primaryCoordinatorName',
            'Primary Coordinator Phone': '$primaryCoordinatorPhone'
          }
        }
      ]);
    }

    if (results.length > 0) {
      const csv = Papa.unparse(results);
      const dateStr = new Date().toISOString().split('T')[0];
      res.header('Content-Type', 'text/csv');
      res.attachment(`schools_${type}_${dateStr}.csv`);
      return res.send(csv);
    } else {
      res.header('Content-Type', 'text/csv');
      res.attachment(`schools_${type}.csv`);
      return res.send('');
    }

  } catch (err) {
    console.error('Error downloading comparison:', err);
    res.status(500).json({ error: 'Failed to download comparison data' });
  }
});

module.exports = router;
