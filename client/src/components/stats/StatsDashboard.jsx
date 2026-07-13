import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, Dot
} from 'recharts';
import { AlertCircle } from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:5005/api';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

const StatsDashboard = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await axios.get(`${API_BASE}/stats/overview`);
        setData(res.data);
      } catch (err) {
        console.error('Failed to load stats', err);
      }
      setLoading(false);
    };
    fetchStats();
  }, []);

  if (loading) return <div className="p-8 text-center text-gray-500">Loading statistics...</div>;
  if (!data) return <div className="p-8 text-center text-red-500">Failed to load statistics.</div>;

  const { overviewCounts, missingDataFlags, coordinatorCoverage } = data;

  const coverageData = [
    { name: 'Both Coordinators', value: coordinatorCoverage.bothCoordinators, color: '#10b981' },
    { name: 'Primary Only', value: coordinatorCoverage.primaryOnly, color: '#3b82f6' },
    { name: 'Alternate Only', value: coordinatorCoverage.alternateOnly, color: '#f59e0b' },
    { name: 'Neither', value: coordinatorCoverage.neitherCoordinator, color: '#ef4444' }
  ];

  return (
    <div className="space-y-8">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard title="Total Schools" value={overviewCounts.totalSchools} color="bg-blue-50 text-blue-700" />
        <KpiCard title="Total Students" value={overviewCounts.totalStudents} color="bg-green-50 text-green-700" />
        <KpiCard title="Total Batches" value={overviewCounts.totalBatches} color="bg-purple-50 text-purple-700" />
        <KpiCard title="Total Standards" value={overviewCounts.totalStandards} color="bg-orange-50 text-orange-700" />
        
        <KpiCard title="Total States" value={overviewCounts.totalStates} color="bg-teal-50 text-teal-700" />
        <KpiCard title="Total Districts" value={overviewCounts.totalDistricts} color="bg-indigo-50 text-indigo-700" />
        <KpiCard title="Total Talukas" value={overviewCounts.totalTalukas} color="bg-pink-50 text-pink-700" />
        <KpiCard title="Total Jeevanvidya Refs" value={overviewCounts.totalJeevanvidyaRefs} color="bg-gray-100 text-gray-700" />
        
        <KpiCard title="Primary Coordinators" value={overviewCounts.totalPrimaryCoordinators} color="bg-emerald-50 text-emerald-700" />
        <KpiCard title="Alternate Coordinators" value={overviewCounts.totalAlternateCoordinators} color="bg-emerald-50 text-emerald-700" />
        <KpiCard title="Missing Primary Coord" value={overviewCounts.totalMissingPrimary} color="bg-red-50 text-red-700" />
        <KpiCard title="Missing Alternate Coord" value={overviewCounts.totalMissingAlternate} color="bg-red-50 text-red-700" />
      </div>

      {/* Missing Data Warnings */}
      {(missingDataFlags.missingEmail > 0 || missingDataFlags.missingPrincipal > 0 || missingDataFlags.missingUDISE > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {missingDataFlags.missingEmail > 0 && (
            <WarningCard message={`${missingDataFlags.missingEmail} schools missing official email`} />
          )}
          {missingDataFlags.missingPrincipal > 0 && (
            <WarningCard message={`${missingDataFlags.missingPrincipal} schools missing principal name`} />
          )}
          {missingDataFlags.missingUDISE > 0 && (
            <WarningCard message={`${missingDataFlags.missingUDISE} schools missing UDISE code`} />
          )}
        </div>
      )}

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Chart 1: Programme Year Breakdown */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h3 className="text-lg font-semibold mb-4 text-gray-800">Programme Year Breakdown</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.programmeYearBreakdown}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                <XAxis dataKey="year" axisLine={false} tickLine={false} />
                <YAxis axisLine={false} tickLine={false} />
                <Tooltip cursor={{fill: '#f3f4f6'}} />
                <Legend />
                <Bar dataKey="schoolCount" name="Schools" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                <Bar dataKey="studentCount" name="Students" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 2: Management Type */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h3 className="text-lg font-semibold mb-4 text-gray-800">Management Type</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={data.managementTypeBreakdown} dataKey="schoolCount" nameKey="type" cx="50%" cy="50%" outerRadius={90} label>
                  {data.managementTypeBreakdown.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 3: Medium of Instruction */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h3 className="text-lg font-semibold mb-4 text-gray-800">Medium of Instruction</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.mediumOfInstructionBreakdown} layout="vertical" margin={{ left: 40 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e5e7eb" />
                <XAxis type="number" axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="medium" axisLine={false} tickLine={false} />
                <Tooltip cursor={{fill: '#f3f4f6'}} />
                <Bar dataKey="schoolCount" name="Schools" fill="#8b5cf6" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 4: Submission Timeline */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h3 className="text-lg font-semibold mb-4 text-gray-800">Submission Timeline</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data.submissionTimeline}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                <XAxis dataKey="monthYear" axisLine={false} tickLine={false} />
                <YAxis axisLine={false} tickLine={false} />
                <Tooltip />
                <Line type="monotone" dataKey="schoolCount" name="Schools Registered" stroke="#0ea5e9" strokeWidth={3} dot={{r: 4}} activeDot={{r: 6}} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 5: Standards Distribution */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h3 className="text-lg font-semibold mb-4 text-gray-800">Standards Distribution</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.standardsDistribution}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                <XAxis dataKey="standard" axisLine={false} tickLine={false} />
                <YAxis axisLine={false} tickLine={false} />
                <Tooltip cursor={{fill: '#f3f4f6'}} />
                <Bar dataKey="schoolCount" name="Schools" fill="#f59e0b" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 6: Coordinator Coverage */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h3 className="text-lg font-semibold mb-4 text-gray-800">Coordinator Coverage</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={coverageData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={60} outerRadius={90}>
                  {coverageData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>
    </div>
  );
};

const KpiCard = ({ title, value, color }) => (
  <div className={`${color} p-5 rounded-xl border border-current border-opacity-10 shadow-sm`}>
    <div className="text-sm font-semibold opacity-80 uppercase tracking-wider">{title}</div>
    <div className="text-3xl font-bold mt-1">{value}</div>
  </div>
);

const WarningCard = ({ message }) => (
  <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl flex items-center gap-3 shadow-sm">
    <AlertCircle className="w-6 h-6 flex-shrink-0" />
    <span className="font-medium text-sm">{message}</span>
  </div>
);

export default StatsDashboard;
