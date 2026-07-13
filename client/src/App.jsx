import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { UploadCloud, CheckCircle2, Download, AlertCircle, FileSpreadsheet, Users, Search, BarChart3, Layers, FileDown } from 'lucide-react';

import StatsDashboard from './components/stats/StatsDashboard';
import HierarchicalStats from './components/stats/HierarchicalStats';
import ExportReport from './components/stats/ExportReport';
import YearComparison from './components/comparison/YearComparison';
import Login from './components/auth/Login';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:5005/api';

function App() {
  const [activeTab, setActiveTab] = useState('stats'); // default to stats
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [user, setUser] = useState(null); // { token, role, username }

  const handleLogin = (userData) => {
    setUser(userData);
    setIsLoggedIn(true);
    // Redirect admin to upload, user to stats
    setActiveTab(userData.role === 'admin' ? 'upload' : 'stats');
  };

  const handleLogout = () => {
    setUser(null);
    setIsLoggedIn(false);
  };

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-gray-50 text-gray-800 font-sans">
        <Login onLogin={handleLogin} />
      </div>
    );
  }

  const isAdmin = user?.role === 'admin';

  return (
    <div className="min-h-screen bg-gray-50 text-gray-800 font-sans">

      {/* Top Navigation Bar */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10 shadow-sm">
        <div className="max-w-6xl mx-auto px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold">
              Q
            </div>
            <h1 className="text-xl font-bold text-gray-900 tracking-tight">Quant</h1>
          </div>

          <nav className="flex items-center space-x-1 bg-gray-100 p-1 rounded-lg">
            {isAdmin && (
              <TabButton
                active={activeTab === 'upload'}
                onClick={() => setActiveTab('upload')}
                icon={<Search className="w-4 h-4" />}
                label="Upload & Match"
              />
            )}
            <TabButton
              active={activeTab === 'stats'}
              onClick={() => setActiveTab('stats')}
              icon={<BarChart3 className="w-4 h-4" />}
              label="Statistics"
            />
            <TabButton
              active={activeTab === 'hierarchy'}
              onClick={() => setActiveTab('hierarchy')}
              icon={<Layers className="w-4 h-4" />}
              label="Hierarchical Stats"
            />
            <TabButton
              active={activeTab === 'export'}
              onClick={() => setActiveTab('export')}
              icon={<FileDown className="w-4 h-4" />}
              label="Export Report"
            />
            <TabButton
              active={activeTab === 'comparison'}
              onClick={() => setActiveTab('comparison')}
              icon={<Layers className="w-4 h-4" />}
              label="Year Comparison"
            />
          </nav>

          <div className="flex items-center gap-4">
            {/* <div className="text-sm font-medium text-gray-700">
              {user?.username} <span className="text-gray-400 capitalize">({user?.role})</span>
            </div> */}
            <button
              onClick={handleLogout}
              className="text-sm text-gray-500 hover:text-red-600 font-medium transition-colors"
            >
              Logout
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto p-8">
        {activeTab === 'upload' && isAdmin && <UploadAndMatchView />}
        {activeTab === 'stats' && <StatsDashboard />}
        {activeTab === 'hierarchy' && <HierarchicalStats />}
        {activeTab === 'export' && <ExportReport />}
        {activeTab === 'comparison' && <YearComparison />}
      </div>

      <footer className="bg-white border-t border-gray-200 py-8 mt-auto z-10 relative">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <div className="mx-auto mb-3 h-0.5 w-16 rounded-full bg-gradient-to-r from-blue-500 to-purple-500"></div>
          <p className="text-sm text-gray-700">
            © 2026 <span className="font-semibold">Quant </span>
          </p>
          <p className="text-sm font-medium text-gray-600 mt-1">
            A Product of <span className="font-semibold text-gray-700">Kartik Creative Production</span>.
          </p>
        </div>
      </footer>
    </div>
  );
}

function TabButton({ active, onClick, icon, label }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${active ? 'bg-white text-blue-600 shadow-sm ring-1 ring-gray-200' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200/50'
        }`}
    >
      {icon}
      {label}
    </button>
  );
}

function UploadAndMatchView() {
  const [stats, setStats] = useState({ schools: 0, heads: 0 });
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchStats = async () => {
    try {
      const schoolsRes = await axios.get(`${API_BASE}/schools/count`);
      const headsRes = await axios.get(`${API_BASE}/heads/count`);
      setStats({ schools: schoolsRes.data.count, heads: headsRes.data.count });
    } catch (err) {
      console.error('Failed to fetch stats', err);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const handleRunMatch = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API_BASE}/match`);
      setMatches(res.data);
    } catch (err) {
      console.error('Failed to run match', err);
      alert('Error running match');
    }
    setLoading(false);
  };

  const handleDownload = () => {
    window.open(`${API_BASE}/match/download`, '_blank');
  };

  return (
    <div className="space-y-8">
      {/* Stats Bar */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard icon={<FileSpreadsheet className="w-6 h-6 text-blue-500" />} label="Total Schools" value={stats.schools} />
        <StatCard icon={<Users className="w-6 h-6 text-green-500" />} label="Total School Heads" value={stats.heads} />
        <StatCard icon={<CheckCircle2 className="w-6 h-6 text-purple-500" />} label="Matches Found" value={matches.length} />
      </div>

      {/* Upload Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <UploadCard
          title="Upload School Data"
          endpoint={`${API_BASE}/upload/schools`}
          onSuccess={fetchStats}
        />
        <UploadCard
          title="Upload School Heads"
          endpoint={`${API_BASE}/upload/heads`}
          onSuccess={fetchStats}
        />
      </div>

      {/* Match Results Section */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-white">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Search className="w-5 h-5 text-gray-400" />
            Match Results
          </h2>
          <div className="space-x-3">
            <button
              onClick={handleRunMatch}
              disabled={loading}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors shadow-sm disabled:opacity-50"
            >
              {loading ? 'Running...' : 'Run Match'}
            </button>
            {matches.length > 0 && (
              <button
                onClick={handleDownload}
                className="px-4 py-2 bg-white hover:bg-gray-50 text-gray-700 border border-gray-200 font-medium rounded-lg transition-colors shadow-sm flex items-center gap-2 inline-flex"
              >
                <Download className="w-4 h-4" />
                Download CSV
              </button>
            )}
          </div>
        </div>

        <div className="overflow-x-auto">
          {matches.length > 0 ? (
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-gray-500 uppercase bg-gray-50/50">
                <tr>
                  <th className="px-6 py-4 font-semibold">Head Name</th>
                  <th className="px-6 py-4 font-semibold">Head Phone</th>
                  <th className="px-6 py-4 font-semibold">School Name</th>
                  <th className="px-6 py-4 font-semibold">District</th>
                  <th className="px-6 py-4 font-semibold">Matched As</th>
                  <th className="px-6 py-4 font-semibold">Match Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {matches.map((m, idx) => (
                  <tr key={idx} className={`hover:bg-gray-50/50 transition-colors ${m.nameMatchStatus !== 'Matched' ? 'bg-yellow-50/30' : 'bg-white'}`}>
                    <td className="px-6 py-4 font-medium text-gray-900">{m.headName}</td>
                    <td className="px-6 py-4">{m.headPhone}</td>
                    <td className="px-6 py-4">{m.schoolName}</td>
                    <td className="px-6 py-4">{m.district}</td>
                    <td className="px-6 py-4">
                      <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded text-xs font-medium">
                        {m.matchedAs}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {m.nameMatchStatus === 'Matched' ? (
                        <span className="flex items-center gap-1.5 text-green-600 font-medium">
                          <CheckCircle2 className="w-4 h-4" /> Matched
                        </span>
                      ) : (
                        <span className="flex items-center gap-1.5 text-yellow-600 font-medium">
                          <AlertCircle className="w-4 h-4" /> Verify Name
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="p-12 text-center text-gray-400">
              <Search className="w-12 h-12 mx-auto mb-3 opacity-20" />
              <p>No matches found yet. Click "Run Match" to analyze data.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon, label, value }) {
  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center gap-4">
      <div className="p-3 bg-gray-50 rounded-lg">
        {icon}
      </div>
      <div>
        <div className="text-2xl font-bold text-gray-900">{value}</div>
        <div className="text-sm font-medium text-gray-500">{label}</div>
      </div>
    </div>
  );
}

function UploadCard({ title, endpoint, onSuccess }) {
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
      const res = await axios.post(endpoint, formData, {
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
    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
      <h3 className="font-semibold text-lg text-gray-900 mb-4">{title}</h3>

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
              <p className="opacity-90 mt-0.5">Inserted: {result.data.inserted} | Updated: {result.data.updated} | Total: {result.data.total}</p>
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
          Re-uploading is safe — duplicates are handled automatically
        </p>
      </div>
    </div>
  );
}

export default App;
