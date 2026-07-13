import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import { UploadCloud, CheckCircle2, Download, AlertCircle, FileSpreadsheet, Layers, PieChart as PieChartIcon, Search, ChevronLeft, ChevronRight, ArrowUpDown } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:5005/api';

const YearComparison = () => {
  const [summary, setSummary] = useState(null);
  const [loadingSummary, setLoadingSummary] = useState(false);
  const [activeTab, setActiveTab] = useState('registered'); // registered, missing, new

  const fetchSummary = async () => {
    setLoadingSummary(true);
    try {
      const res = await axios.get(`${API_BASE}/compare/summary`);
      setSummary(res.data);
    } catch (err) {
      console.error('Failed to fetch summary', err);
    }
    setLoadingSummary(false);
  };

  useEffect(() => {
    fetchSummary();
  }, []);

  return (
    <div className="space-y-8">
      {/* Upload Section */}
      <UploadLastYear onSuccess={fetchSummary} />

      {/* Summary Cards and Donut Chart */}
      {summary && (
        <>
          <ComparisonSummary summary={summary} />
          
          {/* Results Tabs */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="border-b border-gray-100 p-4">
              <nav className="flex space-x-4">
                <button
                  onClick={() => setActiveTab('registered')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${activeTab === 'registered' ? 'bg-green-50 text-green-700' : 'text-gray-600 hover:bg-gray-50'}`}
                >
                  <CheckCircle2 className="w-4 h-4" />
                  Registered ({summary.registeredThisYear})
                </button>
                <button
                  onClick={() => setActiveTab('missing')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${activeTab === 'missing' ? 'bg-red-50 text-red-700' : 'text-gray-600 hover:bg-gray-50'}`}
                >
                  <AlertCircle className="w-4 h-4" />
                  Missing ({summary.notRegisteredThisYear})
                </button>
                <button
                  onClick={() => setActiveTab('new')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${activeTab === 'new' ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:bg-gray-50'}`}
                >
                  <Layers className="w-4 h-4" />
                  New ({summary.newThisYear})
                </button>
              </nav>
            </div>

            <div className="p-6">
              {activeTab === 'registered' && <ResultsTab type="registered" />}
              {activeTab === 'missing' && <ResultsTab type="missing" />}
              {activeTab === 'new' && <ResultsTab type="new" />}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

const UploadLastYear = ({ onSuccess }) => {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState(null);
  const fileInputRef = useRef();

  const handleUpload = async () => {
    if (!file) return;
    setUploading(true);
    setResult(null);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await axios.post(`${API_BASE}/upload/lastyear`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setResult({ type: 'success', data: res.data });
      setFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      onSuccess();
    } catch (err) {
      setResult({ type: 'error', message: err.response?.data?.error || 'Upload failed' });
    }
    setUploading(false);
  };

  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 max-w-2xl">
      <h3 className="font-semibold text-lg text-gray-900 mb-4 flex items-center gap-2">
        <FileSpreadsheet className="w-5 h-5 text-gray-500" />
        Upload Last Year School List
      </h3>
      
      <div className="space-y-4">
        <div className="flex items-center justify-center w-full">
          <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-200 rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100 transition-colors">
            <div className="flex flex-col items-center justify-center pt-5 pb-6">
              <UploadCloud className="w-8 h-8 text-gray-400 mb-2" />
              <p className="text-sm text-gray-500">
                <span className="font-medium text-blue-600">Click to browse</span> or drag and drop
              </p>
              <p className="text-xs text-gray-400 mt-1">CSV or Excel (xlsx)</p>
            </div>
            <input 
              ref={fileInputRef}
              type="file" 
              className="hidden" 
              accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel"
              onChange={(e) => setFile(e.target.files[0])}
            />
          </label>
        </div>

        {file && (
          <div className="flex items-center justify-between bg-blue-50/50 px-4 py-2 rounded-lg border border-blue-100">
            <span className="text-sm text-blue-800 font-medium truncate max-w-[200px]">{file.name}</span>
            <button 
              onClick={handleUpload}
              disabled={uploading}
              className="text-xs bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded font-medium disabled:opacity-50 transition-colors"
            >
              {uploading ? 'Uploading...' : 'Upload'}
            </button>
          </div>
        )}

        {result && result.type === 'success' && (
          <div className="text-sm bg-green-50 text-green-700 p-3 rounded-lg border border-green-100 flex gap-2">
            <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
            <div>
              <p className="font-medium">Upload successful!</p>
              <p className="opacity-90 mt-0.5">{result.data.inserted} inserted, {result.data.updated} updated, {result.data.skipped} skipped (no UDISE)</p>
            </div>
          </div>
        )}

        {result && result.type === 'error' && (
          <div className="text-sm bg-red-50 text-red-700 p-3 rounded-lg border border-red-100 flex items-center gap-2">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <span className="font-medium">{result.message}</span>
          </div>
        )}

        <p className="text-xs text-gray-400 text-center flex items-center justify-center gap-1 mt-4">
          <AlertCircle className="w-3.5 h-3.5" />
          Match is done using UDISE code only
        </p>
      </div>
    </div>
  );
};

const ComparisonSummary = ({ summary }) => {
  const retentionRate = summary.lastYearTotal > 0 ? ((summary.registeredThisYear / summary.lastYearTotal) * 100).toFixed(1) : 0;
  
  const chartData = [
    { name: 'Returned', value: summary.registeredThisYear, color: '#22c55e' }, // green-500
    { name: 'Missing', value: summary.notRegisteredThisYear, color: '#ef4444' }, // red-500
    { name: 'New', value: summary.newThisYear, color: '#3b82f6' } // blue-500
  ].filter(d => d.value > 0);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <div className="text-gray-500 text-sm font-medium mb-1">Last Year Total</div>
          <div className="text-3xl font-bold text-gray-900">{summary.lastYearTotal}</div>
          <div className="text-xs text-gray-400 mt-2">schools in last year's list</div>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-green-100">
          <div className="text-green-600 text-sm font-medium mb-1 flex items-center gap-1"><CheckCircle2 className="w-4 h-4"/> Registered This Year</div>
          <div className="text-3xl font-bold text-gray-900">{summary.registeredThisYear}</div>
          <div className="text-xs text-green-600 mt-2 font-medium">{retentionRate}% retention rate</div>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-red-100">
          <div className="text-red-600 text-sm font-medium mb-1 flex items-center gap-1"><AlertCircle className="w-4 h-4"/> Not Registered This Year</div>
          <div className="text-3xl font-bold text-gray-900">{summary.notRegisteredThisYear}</div>
          <div className="text-xs text-red-600 mt-2 font-medium">Need follow-up</div>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-blue-100">
          <div className="text-blue-600 text-sm font-medium mb-1 flex items-center gap-1"><Layers className="w-4 h-4"/> New This Year</div>
          <div className="text-3xl font-bold text-gray-900">{summary.newThisYear}</div>
          <div className="text-xs text-blue-600 mt-2 font-medium">First time registration</div>
        </div>
      </div>

      {chartData.length > 0 && (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center justify-center">
          <div className="w-full h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
};

const ResultsTab = ({ type }) => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [sortCol, setSortCol] = useState('schoolName');
  const [sortDesc, setSortDesc] = useState(false);

  const rowsPerPage = 20;

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const res = await axios.get(`${API_BASE}/compare/${type}`);
        setData(res.data);
      } catch (err) {
        console.error(`Failed to fetch ${type} data`, err);
      }
      setLoading(false);
    };
    fetchData();
  }, [type]);

  const handleDownload = () => {
    window.open(`${API_BASE}/compare/download?type=${type}`, '_blank');
  };

  const handleSort = (col) => {
    if (sortCol === col) setSortDesc(!sortDesc);
    else { setSortCol(col); setSortDesc(false); }
  };

  const filteredData = data.filter(d => {
    const s = search.toLowerCase();
    const nameMatch = (d.schoolName || '').toLowerCase().includes(s);
    const udiseMatch = (d.udiseCode || '').toLowerCase().includes(s);
    const blockMatch = type === 'missing' && (d.blockName || '').toLowerCase().includes(s);
    return nameMatch || udiseMatch || blockMatch;
  });

  const sortedData = [...filteredData].sort((a, b) => {
    let valA = a[sortCol] || '';
    let valB = b[sortCol] || '';
    if (typeof valA === 'string') valA = valA.toLowerCase();
    if (typeof valB === 'string') valB = valB.toLowerCase();
    if (valA < valB) return sortDesc ? 1 : -1;
    if (valA > valB) return sortDesc ? -1 : 1;
    return 0;
  });

  const totalPages = Math.ceil(sortedData.length / rowsPerPage);
  const displayData = sortedData.slice((page - 1) * rowsPerPage, page * rowsPerPage);

  const columnsConfig = {
    registered: [
      { key: 'udiseCode', label: 'UDISE' },
      { key: 'schoolName', label: 'School Name' },
      { key: 'district', label: 'District' },
      { key: 'lastYearHmName', label: 'Last Year HM' },
      { key: 'currentYearPrimaryCoordinator', label: 'Current Coordinator' },
      { key: 'currentYearPrimaryPhone', label: 'Phone' }
    ],
    missing: [
      { key: 'udiseCode', label: 'UDISE' },
      { key: 'schoolName', label: 'School Name' },
      { key: 'blockName', label: 'Block' },
      { key: 'village', label: 'Village' },
      { key: 'hmName', label: 'HM Name' },
      { key: 'hmPhone', label: 'Phone' },
      { key: 'hmEmail', label: 'Email' }
    ],
    new: [
      { key: 'udiseCode', label: 'UDISE' },
      { key: 'schoolName', label: 'School Name' },
      { key: 'district', label: 'District' },
      { key: 'subDistrict', label: 'Sub-district' },
      { key: 'primaryCoordinatorName', label: 'Coordinator' },
      { key: 'primaryCoordinatorPhone', label: 'Phone' }
    ]
  };

  const columns = columnsConfig[type];

  if (loading) return <div className="text-center p-8 text-gray-500">Loading data...</div>;

  return (
    <div className="space-y-4">
      {type === 'missing' && (
        <div className="bg-red-50 text-red-800 p-3 rounded-lg text-sm border border-red-100 flex gap-2">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          These schools registered last year but have not registered this year. Use HM contact details to follow up.
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="relative w-full max-w-sm">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-gray-400" />
          <input 
            type="text" 
            placeholder={type === 'missing' ? "Search by name, UDISE, or block..." : "Search by name or UDISE..."}
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
            className="w-full pl-9 pr-8 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
        <button 
          onClick={handleDownload}
          className="px-4 py-2 bg-white hover:bg-gray-50 text-gray-700 border border-gray-200 font-medium rounded-lg transition-colors shadow-sm flex items-center gap-2"
        >
          <Download className="w-4 h-4"/>
          {type === 'missing' ? 'Download Missing Schools CSV' : 'Download CSV'}
        </button>
      </div>

      <div className="text-sm text-gray-500">
        Showing {sortedData.length > 0 ? (page - 1) * rowsPerPage + 1 : 0}–{Math.min(page * rowsPerPage, sortedData.length)} of {sortedData.length} schools
      </div>

      <div className="overflow-x-auto rounded-lg border border-gray-200">
        <table className="w-full text-sm text-left">
          <thead className="text-xs text-gray-500 uppercase bg-gray-50 border-b border-gray-200">
            <tr>
              {columns.map(col => (
                <th key={col.key} className="px-4 py-3 font-semibold cursor-pointer hover:bg-gray-100 transition-colors" onClick={() => handleSort(col.key)}>
                  <div className="flex items-center gap-1">
                    {col.label}
                    {sortCol === col.key && <ArrowUpDown className="w-3 h-3 text-gray-400" />}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {displayData.map((row, idx) => (
              <tr key={idx} className={`${type === 'missing' ? 'bg-[#fef2f2] hover:bg-red-100' : 'bg-white hover:bg-gray-50'} transition-colors`}>
                {columns.map(col => (
                  <td key={col.key} className="px-4 py-3 text-gray-800">
                    {col.key === 'schoolName' ? <span className="font-medium">{row[col.key]}</span> : row[col.key]}
                  </td>
                ))}
              </tr>
            ))}
            {displayData.length === 0 && (
              <tr>
                <td colSpan={columns.length} className="px-4 py-8 text-center text-gray-500">
                  No schools found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex justify-between items-center mt-4 text-sm text-gray-600">
          <div>Page {page} of {totalPages}</div>
          <div className="flex gap-2">
            <button 
              disabled={page === 1} 
              onClick={() => setPage(page - 1)}
              className="px-3 py-1.5 border rounded disabled:opacity-50 hover:bg-gray-50 flex items-center gap-1"
            >
              <ChevronLeft className="w-4 h-4"/> Prev
            </button>
            <button 
              disabled={page === totalPages} 
              onClick={() => setPage(page + 1)}
              className="px-3 py-1.5 border rounded disabled:opacity-50 hover:bg-gray-50 flex items-center gap-1"
            >
              Next <ChevronRight className="w-4 h-4"/>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default YearComparison;
