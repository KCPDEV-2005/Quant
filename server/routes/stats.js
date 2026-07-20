const express = require('express');
const router = express.Router();
const excel = require('exceljs');
const School = require('../models/School');

// Helper to calculate common aggregations
const getOverviewStats = async () => {
  const [result] = await School.aggregate([
    // Step 1: Compute standardCount from standardsSelected string (comma-separated)
    {
      $addFields: {
        computedStandardCount: {
          $cond: [
            { $and: [{ $ne: ['$standardsSelected', null] }, { $ne: ['$standardsSelected', ''] }] },
            {
              $size: {
                $filter: {
                  input: { $split: ['$standardsSelected', ','] },
                  as: 'item',
                  cond: { $ne: [{ $trim: { input: '$$item' } }, ''] }
                }
              }
            },
            { $ifNull: ['$totalStandards', 0] }
          ]
        }
      }
    },
    // Step 2: Group to accumulate totals
    {
      $group: {
        _id: null,
        totalSchools: { $sum: 1 },
        totalStudents: { $sum: '$totalStudents' },
        totalBatches: { $sum: '$totalBatches' },
        totalStandards: { $sum: '$computedStandardCount' },
        states: { $addToSet: '$state' },
        districts: { $addToSet: '$district' },
        talukas: { $addToSet: '$subDistrict' },
        totalPrimaryCoordinators: {
          $sum: { $cond: [{ $ne: [{ $ifNull: ['$primaryCoordinatorName', ''] }, ''] }, 1, 0] }
        },
        totalAlternateCoordinators: {
          $sum: { $cond: [{ $ne: [{ $ifNull: ['$alternateCoordinatorName', ''] }, ''] }, 1, 0] }
        },
        totalBothCoordinators: {
          $sum: {
            $cond: [
              {
                $and: [
                  { $ne: [{ $ifNull: ['$primaryCoordinatorName', ''] }, ''] },
                  { $ne: [{ $ifNull: ['$alternateCoordinatorName', ''] }, ''] }
                ]
              }, 1, 0
            ]
          }
        },
        totalMissingPrimary: {
          $sum: { $cond: [{ $eq: [{ $ifNull: ['$primaryCoordinatorName', ''] }, ''] }, 1, 0] }
        },
        totalMissingAlternate: {
          $sum: { $cond: [{ $eq: [{ $ifNull: ['$alternateCoordinatorName', ''] }, ''] }, 1, 0] }
        },
        jeevanvidyaRefs: { $addToSet: '$jeevanvidyaRefPhone' },
        missingEmail: {
          $sum: { $cond: [{ $eq: [{ $ifNull: ['$schoolEmail', ''] }, ''] }, 1, 0] }
        },
        missingPrincipal: {
          $sum: { $cond: [{ $eq: [{ $ifNull: ['$principalName', ''] }, ''] }, 1, 0] }
        },
        missingUDISE: {
          $sum: { $cond: [{ $eq: [{ $ifNull: ['$udiseCode', ''] }, ''] }, 1, 0] }
        }
      }
    },
    // Step 3: Project final shape, computing distinct counts from sets
    {
      $project: {
        _id: 0,
        totalSchools: 1,
        totalStudents: 1,
        totalBatches: 1,
        totalStandards: 1,
        totalStates: { $size: { $filter: { input: '$states', as: 's', cond: { $and: [{ $ne: ['$$s', null] }, { $ne: ['$$s', ''] }] } } } },
        totalDistricts: { $size: { $filter: { input: '$districts', as: 'd', cond: { $and: [{ $ne: ['$$d', null] }, { $ne: ['$$d', ''] }] } } } },
        totalTalukas: { $size: { $filter: { input: '$talukas', as: 't', cond: { $and: [{ $ne: ['$$t', null] }, { $ne: ['$$t', ''] }] } } } },
        totalPrimaryCoordinators: 1,
        totalAlternateCoordinators: 1,
        totalBothCoordinators: 1,
        totalMissingPrimary: 1,
        totalMissingAlternate: 1,
        totalJeevanvidyaRefs: { $size: { $filter: { input: '$jeevanvidyaRefs', as: 'j', cond: { $and: [{ $ne: ['$$j', null] }, { $ne: ['$$j', ''] }] } } } },
        missingEmail: 1,
        missingPrincipal: 1,
        missingUDISE: 1
      }
    }
  ]);

  const defaultResult = {
    totalSchools: 0, totalStudents: 0, totalBatches: 0, totalStandards: 0,
    totalStates: 0, totalDistricts: 0, totalTalukas: 0,
    totalPrimaryCoordinators: 0, totalAlternateCoordinators: 0, totalBothCoordinators: 0,
    totalMissingPrimary: 0, totalMissingAlternate: 0, totalJeevanvidyaRefs: 0,
    missingEmail: 0, missingPrincipal: 0, missingUDISE: 0
  };

  const overviewCounts = result || defaultResult;

  const programmeYearBreakdown = await School.aggregate([
    { $group: { _id: '$programmeYear', schoolCount: { $sum: 1 }, studentCount: { $sum: '$totalStudents' }, batchCount: { $sum: '$totalBatches' } } },
    { $project: { _id: 0, year: { $ifNull: ['$_id', 'N/A'] }, schoolCount: 1, studentCount: 1, batchCount: 1 } },
    { $sort: { year: -1 } }
  ]);

  const managementTypeBreakdown = await School.aggregate([
    { $group: { _id: '$managementType', schoolCount: { $sum: 1 }, studentCount: { $sum: '$totalStudents' } } },
    { $project: { _id: 0, type: { $ifNull: ['$_id', 'Unknown'] }, schoolCount: 1, studentCount: 1 } },
    { $sort: { schoolCount: -1 } }
  ]);

  const mediumOfInstructionBreakdown = await School.aggregate([
    { $group: { _id: '$mediumOfInstruction', schoolCount: { $sum: 1 } } },
    { $project: { _id: 0, medium: { $ifNull: ['$_id', 'Unknown'] }, schoolCount: 1 } },
    { $sort: { schoolCount: -1 } }
  ]);

  const standardsDistribution = await School.aggregate([
    { $match: { standardsSelected: { $ne: null, $ne: '' } } },
    { $project: { standardsArray: { $split: ['$standardsSelected', ','] } } },
    { $unwind: '$standardsArray' },
    { $project: { standard: { $trim: { input: '$standardsArray' } } } },
    { $match: { standard: { $ne: '' } } },
    { $group: { _id: '$standard', schoolCount: { $sum: 1 } } },
    { $project: { _id: 0, standard: '$_id', schoolCount: 1 } },
    { $sort: { schoolCount: -1 } }
  ]);

  const submissionTimelineRaw = await School.aggregate([
    {
      $project: {
        parsedDate: {
          $dateFromString: {
            dateString: '$submissionDate',
            format: '%d/%m/%Y',
            onError: null,
            onNull: null
          }
        }
      }
    },
    { $match: { parsedDate: { $ne: null } } },
    {
      $group: {
        _id: {
          year: { $year: '$parsedDate' },
          month: { $month: '$parsedDate' }
        },
        schoolCount: { $sum: 1 }
      }
    },
    { $sort: { '_id.year': 1, '_id.month': 1 } }
  ]);

  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const submissionTimeline = submissionTimelineRaw.map(item => ({
    monthYear: `${monthNames[item._id.month - 1]} ${item._id.year}`,
    schoolCount: item.schoolCount
  }));

  const coordinatorCoverage = {
    bothCoordinators: overviewCounts.totalBothCoordinators,
    primaryOnly: overviewCounts.totalPrimaryCoordinators - overviewCounts.totalBothCoordinators,
    alternateOnly: overviewCounts.totalAlternateCoordinators - overviewCounts.totalBothCoordinators,
    neitherCoordinator: overviewCounts.totalSchools - (overviewCounts.totalPrimaryCoordinators + overviewCounts.totalAlternateCoordinators - overviewCounts.totalBothCoordinators)
  };

  return {
    overviewCounts,
    programmeYearBreakdown,
    managementTypeBreakdown,
    mediumOfInstructionBreakdown,
    standardsDistribution,
    submissionTimeline,
    missingDataFlags: {
      missingEmail: overviewCounts.missingEmail,
      missingPrincipal: overviewCounts.missingPrincipal,
      missingUDISE: overviewCounts.missingUDISE
    },
    coordinatorCoverage
  };
};

// GET /api/stats/overview
router.get('/stats/overview', async (req, res) => {
  try {
    const data = await getOverviewStats();
    res.json(data);
  } catch (err) {
    console.error('Error in /stats/overview:', err);
    res.status(500).json({ error: 'Failed to generate overview statistics' });
  }
});

// GET /api/stats/hierarchy
router.get('/stats/hierarchy', async (req, res) => {
  try {
    const rawHierarchy = await School.aggregate([
      {
        $group: {
          _id: { state: '$state', district: '$district', taluka: '$subDistrict' },
          schoolCount: { $sum: 1 },
          studentCount: { $sum: '$totalStudents' },
          batchCount: { $sum: '$totalBatches' }
        }
      }
    ]);

    // Restructure in memory
    const stateMap = {};

    rawHierarchy.forEach(row => {
      const stateName = row._id.state || 'Unknown';
      const districtName = row._id.district || 'Unknown';
      const talukaName = row._id.taluka || 'Unknown';

      if (!stateMap[stateName]) {
        stateMap[stateName] = { state: stateName, schoolCount: 0, studentCount: 0, batchCount: 0, districtsMap: {} };
      }

      stateMap[stateName].schoolCount += row.schoolCount;
      stateMap[stateName].studentCount += row.studentCount;
      stateMap[stateName].batchCount += row.batchCount;

      if (!stateMap[stateName].districtsMap[districtName]) {
        stateMap[stateName].districtsMap[districtName] = { district: districtName, schoolCount: 0, studentCount: 0, batchCount: 0, talukas: [] };
      }

      stateMap[stateName].districtsMap[districtName].schoolCount += row.schoolCount;
      stateMap[stateName].districtsMap[districtName].studentCount += row.studentCount;
      stateMap[stateName].districtsMap[districtName].batchCount += row.batchCount;

      stateMap[stateName].districtsMap[districtName].talukas.push({
        taluka: talukaName,
        schoolCount: row.schoolCount,
        studentCount: row.studentCount,
        batchCount: row.batchCount
      });
    });

    const result = Object.values(stateMap).map(state => {
      const districts = Object.values(state.districtsMap).map(dist => {
        dist.talukas.sort((a, b) => b.schoolCount - a.schoolCount);
        return dist;
      });
      districts.sort((a, b) => b.schoolCount - a.schoolCount);
      return {
        state: state.state,
        schoolCount: state.schoolCount,
        studentCount: state.studentCount,
        batchCount: state.batchCount,
        districts
      };
    });

    result.sort((a, b) => b.schoolCount - a.schoolCount);
    res.json(result);
  } catch (err) {
    console.error('Error in /stats/hierarchy:', err);
    res.status(500).json({ error: 'Failed to generate hierarchical statistics' });
  }
});

// GET /api/export/excel
router.get('/export/excel', async (req, res) => {
  try {
    const workbook = new excel.stream.xlsx.WorkbookWriter({
      stream: res,
      useStyles: true,
      useSharedStrings: true
    });
    const dateStr = new Date().toISOString().split('T')[0];
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=school_registration_report_${dateStr}.xlsx`);

    // Styling helper
    const applyHeaderStyle = (sheet, columns) => {
      sheet.columns = columns;
      sheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
      sheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1F3864' } };
      sheet.views = [{ state: 'frozen', ySplit: 1 }];
    };
    const applyAlternatingRows = (sheet) => {
      sheet.eachRow((row, rowNumber) => {
        if (rowNumber > 1) {
          row.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: rowNumber % 2 === 0 ? 'FFF2F2F2' : 'FFFFFFFF' }
          };
        }
      });
    };

    // Prepare data
    const overview = await getOverviewStats();

    // Sheet 1: Summary
    const sheet1 = workbook.addWorksheet('Summary', { properties: { tabColor: { argb: 'FF0000FF' } } });
    applyHeaderStyle(sheet1, [
      { header: 'Metric', key: 'metric', width: 40 },
      { header: 'Value', key: 'value', width: 20 }
    ]);
    const counts = overview.overviewCounts;
    const summaryData = [
      { metric: 'Total Schools', value: counts.totalSchools },
      { metric: 'Total Students', value: counts.totalStudents },
      { metric: 'Total Batches', value: counts.totalBatches },
      { metric: 'Total Standards', value: counts.totalStandards },
      { metric: 'Total States', value: counts.totalStates },
      { metric: 'Total Districts', value: counts.totalDistricts },
      { metric: 'Total Talukas', value: counts.totalTalukas },
      { metric: 'Total Primary Coordinators', value: counts.totalPrimaryCoordinators },
      { metric: 'Total Alternate Coordinators', value: counts.totalAlternateCoordinators },
      { metric: 'Total Both Coordinators', value: counts.totalBothCoordinators },
      { metric: 'Total Missing Primary', value: counts.totalMissingPrimary },
      { metric: 'Total Missing Alternate', value: counts.totalMissingAlternate },
      { metric: 'Total Jeevanvidya Refs', value: counts.totalJeevanvidyaRefs }
    ];
    summaryData.forEach(r => sheet1.addRow(r).commit());
    applyAlternatingRows(sheet1);
    sheet1.commit();

    // Sheet 2: Programme Year
    const sheet2 = workbook.addWorksheet('Programme Year', { properties: { tabColor: { argb: 'FF00FF00' } } });
    applyHeaderStyle(sheet2, [
      { header: 'Programme Year', key: 'year', width: 20 },
      { header: 'School Count', key: 'schoolCount', width: 15 },
      { header: 'Student Count', key: 'studentCount', width: 15 },
      { header: 'Batch Count', key: 'batchCount', width: 15 }
    ]);
    overview.programmeYearBreakdown.forEach(r => sheet2.addRow(r).commit());
    applyAlternatingRows(sheet2);
    sheet2.commit();

    // Sheet 3: Management Type
    const sheet3 = workbook.addWorksheet('Management Type', { properties: { tabColor: { argb: 'FF00FF00' } } });
    applyHeaderStyle(sheet3, [
      { header: 'Management Type', key: 'type', width: 30 },
      { header: 'School Count', key: 'schoolCount', width: 15 },
      { header: 'Student Count', key: 'studentCount', width: 15 }
    ]);
    overview.managementTypeBreakdown.forEach(r => sheet3.addRow(r).commit());
    applyAlternatingRows(sheet3);
    sheet3.commit();

    // Sheet 4: Medium of Instruction
    const sheet4 = workbook.addWorksheet('Medium of Instruction', { properties: { tabColor: { argb: 'FF00FF00' } } });
    applyHeaderStyle(sheet4, [
      { header: 'Medium', key: 'medium', width: 30 },
      { header: 'School Count', key: 'schoolCount', width: 15 }
    ]);
    overview.mediumOfInstructionBreakdown.forEach(r => sheet4.addRow(r).commit());
    applyAlternatingRows(sheet4);
    sheet4.commit();

    // Sheet 5: Submission Timeline
    const sheet5 = workbook.addWorksheet('Submission Timeline', { properties: { tabColor: { argb: 'FF00FF00' } } });
    applyHeaderStyle(sheet5, [
      { header: 'Month-Year', key: 'monthYear', width: 20 },
      { header: 'Schools Registered', key: 'schoolCount', width: 20 }
    ]);
    overview.submissionTimeline.forEach(r => sheet5.addRow(r).commit());
    applyAlternatingRows(sheet5);
    sheet5.commit();

    // Hierarchy data for Sheets 6, 7, 8
    const hierarchyRaw = await School.aggregate([
      {
        $group: {
          _id: { state: '$state', district: '$district', taluka: '$subDistrict' },
          schoolCount: { $sum: 1 },
          studentCount: { $sum: '$totalStudents' },
          batchCount: { $sum: '$totalBatches' }
        }
      }
    ]);

    const stateMap = {};
    const districtMap = {};
    const talukaArr = [];

    hierarchyRaw.forEach(row => {
      const s = row._id.state || 'Unknown';
      const d = row._id.district || 'Unknown';
      const t = row._id.taluka || 'Unknown';

      if (!stateMap[s]) stateMap[s] = { State: s, Schools: 0, Students: 0, Batches: 0, districtSet: new Set(), talukaSet: new Set() };
      stateMap[s].Schools += row.schoolCount;
      stateMap[s].Students += row.studentCount;
      stateMap[s].Batches += row.batchCount;
      stateMap[s].districtSet.add(d);
      stateMap[s].talukaSet.add(`${d}-${t}`);

      const sdKey = `${s}-${d}`;
      if (!districtMap[sdKey]) districtMap[sdKey] = { State: s, District: d, Schools: 0, Students: 0, Batches: 0, talukaSet: new Set() };
      districtMap[sdKey].Schools += row.schoolCount;
      districtMap[sdKey].Students += row.studentCount;
      districtMap[sdKey].Batches += row.batchCount;
      districtMap[sdKey].talukaSet.add(t);

      talukaArr.push({
        State: s, District: d, Taluka: t,
        Schools: row.schoolCount, Students: row.studentCount, Batches: row.batchCount
      });
    });

    // Sheet 6: State Wise
    const sheet6 = workbook.addWorksheet('State Wise', { properties: { tabColor: { argb: 'FFFFA500' } } });
    applyHeaderStyle(sheet6, [
      { header: 'State', key: 'State', width: 25 },
      { header: 'Schools', key: 'Schools', width: 12 },
      { header: 'Students', key: 'Students', width: 12 },
      { header: 'Batches', key: 'Batches', width: 12 },
      { header: 'Districts', key: 'Districts', width: 12 },
      { header: 'Talukas', key: 'Talukas', width: 12 }
    ]);
    const stateData = Object.values(stateMap).map(s => ({
      ...s, Districts: s.districtSet.size, Talukas: s.talukaSet.size
    }));
    stateData.forEach(r => sheet6.addRow(r).commit());
    applyAlternatingRows(sheet6);
    sheet6.commit();

    // Sheet 7: District Wise
    const sheet7 = workbook.addWorksheet('District Wise', { properties: { tabColor: { argb: 'FFFFA500' } } });
    applyHeaderStyle(sheet7, [
      { header: 'State', key: 'State', width: 25 },
      { header: 'District', key: 'District', width: 25 },
      { header: 'Schools', key: 'Schools', width: 12 },
      { header: 'Students', key: 'Students', width: 12 },
      { header: 'Batches', key: 'Batches', width: 12 },
      { header: 'Talukas', key: 'Talukas', width: 12 }
    ]);
    const districtData = Object.values(districtMap).map(d => ({
      ...d, Talukas: d.talukaSet.size
    }));
    districtData.forEach(r => sheet7.addRow(r).commit());
    applyAlternatingRows(sheet7);
    sheet7.commit();

    // Sheet 8: Taluka Wise
    const sheet8 = workbook.addWorksheet('Taluka Wise', { properties: { tabColor: { argb: 'FFFFA500' } } });
    applyHeaderStyle(sheet8, [
      { header: 'State', key: 'State', width: 25 },
      { header: 'District', key: 'District', width: 25 },
      { header: 'Taluka', key: 'Taluka', width: 25 },
      { header: 'Schools', key: 'Schools', width: 12 },
      { header: 'Students', key: 'Students', width: 12 },
      { header: 'Batches', key: 'Batches', width: 12 }
    ]);
    talukaArr.forEach(r => sheet8.addRow(r).commit());
    applyAlternatingRows(sheet8);
    sheet8.commit();

    // Sheets 9 and 10 need cursor stream
    const sheet9 = workbook.addWorksheet('Coordinator Coverage', { properties: { tabColor: { argb: 'FFFF0000' } } });
    applyHeaderStyle(sheet9, [
      { header: 'School Name', key: 'schoolName', width: 30 },
      { header: 'Registration ID', key: 'regId', width: 20 },
      { header: 'State', key: 'state', width: 20 },
      { header: 'District', key: 'district', width: 20 },
      { header: 'Primary Coordinator Name', key: 'priName', width: 25 },
      { header: 'Primary Coordinator Phone', key: 'priPhone', width: 20 },
      { header: 'Alternate Coordinator Name', key: 'altName', width: 25 },
      { header: 'Alternate Coordinator Phone', key: 'altPhone', width: 20 },
      { header: 'Coverage Status', key: 'coverage', width: 20 }
    ]);

    const sheet10 = workbook.addWorksheet('Missing Data', { properties: { tabColor: { argb: 'FFFF0000' } } });
    applyHeaderStyle(sheet10, [
      { header: 'School Name', key: 'schoolName', width: 30 },
      { header: 'Registration ID', key: 'regId', width: 20 },
      { header: 'State', key: 'state', width: 20 },
      { header: 'District', key: 'district', width: 20 },
      { header: 'Missing Email', key: 'missEmail', width: 15 },
      { header: 'Missing Principal', key: 'missPrin', width: 15 },
      { header: 'Missing UDISE', key: 'missUDISE', width: 15 }
    ]);

    const cursor = School.find({}).cursor();
    let rowNum9 = 2;
    let rowNum10 = 2;

    for (let doc = await cursor.next(); doc != null; doc = await cursor.next()) {
      const hasPri = !!doc.primaryCoordinatorName;
      const hasAlt = !!doc.alternateCoordinatorName;
      let coverage = 'None';
      if (hasPri && hasAlt) coverage = 'Both';
      else if (hasPri) coverage = 'Primary Only';
      else if (hasAlt) coverage = 'Alternate Only';

      sheet9.addRow({
        schoolName: doc.schoolName, regId: doc.registrationId, state: doc.state, district: doc.district,
        priName: doc.primaryCoordinatorName, priPhone: doc.primaryCoordinatorPhone,
        altName: doc.alternateCoordinatorName, altPhone: doc.alternateCoordinatorPhone,
        coverage
      }).commit();
      
      const missEmail = !doc.schoolEmail;
      const missPrin = !doc.principalName;
      const missUDISE = !doc.udiseCode;

      if (missEmail || missPrin || missUDISE) {
        sheet10.addRow({
          schoolName: doc.schoolName, regId: doc.registrationId, state: doc.state, district: doc.district,
          missEmail: missEmail ? 'Yes' : 'No',
          missPrin: missPrin ? 'Yes' : 'No',
          missUDISE: missUDISE ? 'Yes' : 'No'
        }).commit();
      }
    }
    
    sheet9.commit();
    sheet10.commit();

    await workbook.commit();
    
  } catch (err) {
    console.error('Error generating Excel:', err);
    res.status(500).json({ error: 'Failed to generate Excel report' });
  }
});

module.exports = router;
