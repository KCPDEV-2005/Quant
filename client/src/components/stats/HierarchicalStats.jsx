import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Treemap, LabelList } from 'recharts';
import { ChevronRight, LayoutList, Search, ChevronUp, ChevronDown } from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:5005/api';

const blueScale = (value, max) => {
  return `rgb(30, ${Math.round(80 + (value/max)*100)}, ${Math.round(180 + (value/max)*60)})`;
};

const greenScale = (value, max) => {
  return `rgb(${Math.round(80 + (value/max)*100)}, ${Math.round(180 + (value/max)*60)}, 30)`;
};

const ToggleButtonGroup = ({ activeView, setActiveView }) => {
  const views = ['barchart', 'treemap', 'table'];
  return (
    <div style={{ display: 'flex', borderRadius: 6, overflow: 'hidden', border: '1px solid #d1d5db' }}>
      {views.map(v => (
        <button
          key={v}
          onClick={() => setActiveView(v)}
          style={{
            padding: '0 12px', height: 32, fontSize: 13, border: 'none',
            borderRight: v !== 'table' ? '1px solid #d1d5db' : 'none',
            background: activeView === v ? '#1a3a5c' : 'white',
            color: activeView === v ? 'white' : '#374151',
            cursor: 'pointer',
            outline: 'none'
          }}
        >
          {v === 'barchart' ? 'Bar Chart' : v === 'treemap' ? 'Treemap' : 'Table'}
        </button>
      ))}
    </div>
  );
};

const CustomTreemapContent = (props) => {
  const { x, y, width, height, name, value, depth, onClickItem, fill } = props;
  
  if (!name) return null;

  return (
    <g>
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        style={{
          fill: fill,
          stroke: '#fff',
          strokeWidth: 2 / (depth + 1e-10),
          strokeOpacity: 1 / (depth + 1e-10),
          cursor: onClickItem ? 'pointer' : 'default'
        }}
        onClick={() => {
          if (onClickItem) onClickItem(name);
        }}
      />
      {width > 60 && height > 30 ? (
        <text x={x + width / 2} y={y + height / 2} textAnchor="middle" fill="#fff" fontSize={12} style={{ pointerEvents: 'none' }}>
          <tspan x={x + width / 2} dy="-0.5em" fontWeight="bold">{name.length > 15 ? name.slice(0, 13) + '...' : name}</tspan>
          <tspan x={x + width / 2} dy="1.2em" fontSize={11}>{value}</tspan>
        </text>
      ) : null}
    </g>
  );
};

const CustomTooltip = ({ active, payload }) => {
  if (active && payload && payload.length) {
    const d = payload[0].payload;
    return (
      <div className="bg-white p-2 border border-gray-200 shadow-sm rounded text-sm">
        <div className="font-bold">{d.name}</div>
        <div>Schools: {d.schools}</div>
        <div>Students: {d.students}</div>
        {d.talukas !== undefined && <div>Talukas: {d.talukas}</div>}
      </div>
    );
  }
  return null;
};

const DistrictTalukaTreemap = ({ data, level, onDrillDown }) => {
  const max = Math.max(...data.map(d => d.value));
  const colorScale = level === 'district' ? blueScale : greenScale;
  
  const treeData = data.map(d => ({
    ...d,
    fill: colorScale(d.value, max)
  }));

  return (
    <ResponsiveContainer width="100%" height={420}>
      <Treemap
        data={treeData}
        dataKey="value"
        aspectRatio={4/3}
        stroke="#fff"
        content={<CustomTreemapContent onClickItem={level !== 'taluka' ? onDrillDown : null} />}
      >
        <Tooltip content={<CustomTooltip />} />
      </Treemap>
    </ResponsiveContainer>
  );
};

const ScrollableBarChart = ({ data, level }) => {
  const chartHeight = Math.max(300, data.length * 44 + 60);
  const barColor = level === 'district' ? '#2563EB' : '#16A34A';
  
  return (
    <div style={{ overflowY: 'auto', maxHeight: '520px' }}>
      <ResponsiveContainer width="100%" height={chartHeight}>
        <BarChart data={data} layout="vertical" margin={{ left: 20, right: 60 }}>
          <XAxis type="number" tick={{ fontSize: 11 }} />
          <YAxis type="category" dataKey="name" width={140} tick={{ fontSize: 12 }} />
          <Tooltip cursor={{fill: '#f3f4f6'}} />
          <Bar dataKey="value" name="Schools" barSize={28} fill={barColor} radius={[0,4,4,0]}>
            <LabelList dataKey="value" position="right" style={{ fontSize: 11 }} />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

const PaginatedTable = ({ data, level, onDrillDown }) => {
  const [page, setPage] = useState(1);
  const [sortCol, setSortCol] = useState('value');
  const [sortDesc, setSortDesc] = useState(true);
  const [search, setSearch] = useState('');
  
  const maxVal = Math.max(...data.map(d => d.value)) || 1;
  const rowsPerPage = 15;

  const filteredData = data.filter(d => d.name.toLowerCase().includes(search.toLowerCase()));
  
  const sortedData = [...filteredData].sort((a, b) => {
    let valA = a[sortCol];
    let valB = b[sortCol];
    if (valA < valB) return sortDesc ? 1 : -1;
    if (valA > valB) return sortDesc ? -1 : 1;
    return 0;
  });

  const isSearching = search.length > 0;
  const displayData = isSearching ? sortedData.slice(0, 50) : sortedData.slice((page - 1) * rowsPerPage, page * rowsPerPage);
  
  const totalPages = Math.ceil(sortedData.length / rowsPerPage);

  const handleSort = (col) => {
    if (sortCol === col) setSortDesc(!sortDesc);
    else { setSortCol(col); setSortDesc(true); }
  };

  const SortIcon = ({ col }) => {
    if (sortCol !== col) return null;
    return sortDesc ? <ChevronDown className="w-3 h-3 inline ml-1" /> : <ChevronUp className="w-3 h-3 inline ml-1" />;
  };

  return (
    <div>
      <div className="mb-4 relative w-64">
        <Search className="w-4 h-4 absolute left-3 top-2.5 text-gray-400" />
        <input 
          type="text" 
          placeholder={`Search ${level}s...`}
          value={search}
          onChange={e => { setSearch(e.target.value); setPage(1); }}
          className="w-full pl-9 pr-8 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
        {search && (
          <button onClick={() => setSearch('')} className="absolute right-3 top-2 text-gray-400 hover:text-gray-600">×</button>
        )}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead className="text-xs text-gray-500 uppercase bg-gray-50 border-b border-gray-100">
            <tr>
              <th className="px-4 py-3 font-semibold w-10 text-center">Rank</th>
              <th className="px-4 py-3 font-semibold cursor-pointer w-48" onClick={() => handleSort('name')}>
                Name <SortIcon col="name" />
              </th>
              <th className="px-4 py-3 font-semibold cursor-pointer w-[140px]" onClick={() => handleSort('value')}>
                Relative Size <SortIcon col="value" />
              </th>
              <th className="px-4 py-3 font-semibold cursor-pointer text-center w-20" onClick={() => handleSort('schools')}>
                Schools <SortIcon col="schools" />
              </th>
              <th className="px-4 py-3 font-semibold cursor-pointer text-center w-20" onClick={() => handleSort('students')}>
                Students <SortIcon col="students" />
              </th>
              <th className="px-4 py-3 font-semibold cursor-pointer text-center w-20" onClick={() => handleSort('batches')}>
                Batches <SortIcon col="batches" />
              </th>
              {level === 'district' && (
                <th className="px-4 py-3 font-semibold cursor-pointer text-center w-20" onClick={() => handleSort('talukas')}>
                  Talukas <SortIcon col="talukas" />
                </th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {displayData.map((row, idx) => {
              const rank = sortedData.findIndex(d => d.name === row.name) + 1;
              return (
                <tr 
                  key={idx} 
                  className={`hover:bg-[#f0f4f8] transition-colors bg-white ${level !== 'taluka' ? 'cursor-pointer' : ''}`}
                  onClick={() => { if (level !== 'taluka' && onDrillDown) onDrillDown(row.name); }}
                >
                  <td className="px-4 py-3 text-gray-400 text-center">{rank}</td>
                  <td className="px-4 py-3 font-medium text-gray-900">{row.name}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center">
                      <div className="w-[120px] bg-gray-100 h-2 rounded flex-shrink-0">
                        <div 
                          className="h-2 rounded" 
                          style={{ 
                            width: `${(row.value / maxVal) * 100}%`,
                            backgroundColor: level === 'district' ? '#2563EB' : '#16A34A'
                          }} 
                        />
                      </div>
                      <span className="ml-2 text-xs text-gray-500">{row.value}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center">{row.schools}</td>
                  <td className="px-4 py-3 text-center">{row.students}</td>
                  <td className="px-4 py-3 text-center">{row.batches}</td>
                  {level === 'district' && <td className="px-4 py-3 text-center">{row.talukas}</td>}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {!isSearching && totalPages > 1 && (
        <div className="flex justify-between items-center mt-4 text-sm text-gray-600">
          <div>Showing {(page - 1) * rowsPerPage + 1}–{Math.min(page * rowsPerPage, sortedData.length)} of {sortedData.length} {level}s</div>
          <div className="flex gap-2">
            <button 
              disabled={page === 1} 
              onClick={() => setPage(page - 1)}
              className="px-3 py-1 border rounded disabled:opacity-50 hover:bg-gray-50"
            >
              Prev
            </button>
            <button 
              disabled={page === totalPages} 
              onClick={() => setPage(page + 1)}
              className="px-3 py-1 border rounded disabled:opacity-50 hover:bg-gray-50"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
};


const HierarchicalStats = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Breadcrumb path: empty = all states, length 1 = specific state, length 2 = specific district
  const [path, setPath] = useState([]);
  
  const [districtView, setDistrictView] = useState('barchart');
  const [talukaView, setTalukaView] = useState('barchart');

  useEffect(() => {
    const fetchHierarchy = async () => {
      try {
        const res = await axios.get(`${API_BASE}/stats/hierarchy`);
        setData(res.data);
      } catch (err) {
        console.error('Failed to load hierarchy', err);
      }
      setLoading(false);
    };
    fetchHierarchy();
  }, []);

  if (loading) return <div className="p-8 text-center text-gray-500">Loading hierarchical data...</div>;
  if (!data || data.length === 0) return <div className="p-8 text-center text-gray-500">No data available.</div>;

  const navigateTo = (index) => {
    setPath(path.slice(0, index));
  };

  const handleDrillDown = (name) => {
    if (path.length === 1) {
      setTalukaView('barchart'); // Reset taluka view when drilling into district
    } else if (path.length === 0) {
      setDistrictView('barchart'); // Reset district view when drilling into state
    }
    setPath([...path, { name }]);
  };

  let currentLevel = 'state'; // 'state' | 'district' | 'taluka'
  let currentData = data;
  let title = 'All States';
  let chartData = [];
  let tableData = [];

  if (path.length === 0) {
    currentLevel = 'state';
    title = 'All States';
    chartData = currentData.slice(0, 15).map(d => ({ name: d.state, value: d.schoolCount }));
    tableData = currentData;
  } else if (path.length === 1) {
    currentLevel = 'district';
    const stateObj = currentData.find(s => s.state === path[0].name);
    title = `Districts in ${stateObj.state}`;
    chartData = stateObj.districts.map(d => ({ 
      name: d.district, 
      value: d.schoolCount,
      schools: d.schoolCount,
      students: d.studentCount,
      batches: d.batchCount,
      talukas: d.talukas?.length || 0
    }));
    tableData = stateObj.districts;
  } else if (path.length === 2) {
    currentLevel = 'taluka';
    const stateObj = currentData.find(s => s.state === path[0].name);
    const districtObj = stateObj.districts.find(d => d.district === path[1].name);
    title = `Talukas in ${districtObj.district}, ${stateObj.state}`;
    chartData = districtObj.talukas.map(t => ({ 
      name: t.taluka, 
      value: t.schoolCount,
      schools: t.schoolCount,
      students: t.studentCount,
      batches: t.batchCount
    }));
    tableData = districtObj.talukas;
  }

  const renderDrillDownContent = () => {
    const activeView = currentLevel === 'district' ? districtView : talukaView;
    const setActiveView = currentLevel === 'district' ? setDistrictView : setTalukaView;

    return (
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
            <LayoutList className="w-5 h-5 text-gray-400" />
            {title}
          </h3>
          <ToggleButtonGroup activeView={activeView} setActiveView={setActiveView} />
        </div>
        
        {activeView === 'barchart' && <ScrollableBarChart data={chartData} level={currentLevel} />}
        {activeView === 'treemap' && <DistrictTalukaTreemap data={chartData} level={currentLevel} onDrillDown={handleDrillDown} />}
        {activeView === 'table' && <PaginatedTable data={chartData} level={currentLevel} onDrillDown={handleDrillDown} />}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      
      {/* Breadcrumb Navigation */}
      <nav className="flex text-sm font-medium text-gray-600 bg-white p-4 rounded-xl shadow-sm border border-gray-100">
        <ol className="flex items-center space-x-2">
          <li>
            <button onClick={() => navigateTo(0)} className="hover:text-blue-600 transition-colors">
              All States
            </button>
          </li>
          {path.map((step, idx) => (
            <li key={idx} className="flex items-center space-x-2">
              <ChevronRight className="w-4 h-4 text-gray-400" />
              <button 
                onClick={() => navigateTo(idx + 1)} 
                className={`hover:text-blue-600 transition-colors ${idx === path.length - 1 ? 'text-gray-900 font-semibold cursor-default' : ''}`}
                disabled={idx === path.length - 1}
              >
                {step.name}
              </button>
            </li>
          ))}
        </ol>
      </nav>

      {/* Conditional Rendering for Level */}
      {currentLevel === 'state' ? (
        <>
          {/* State Level: Original Static Bar Chart */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <h3 className="text-lg font-semibold mb-4 text-gray-800 flex items-center gap-2">
              <LayoutList className="w-5 h-5 text-gray-400" />
              {title}
            </h3>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} layout="vertical" margin={{ left: 80 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e5e7eb" />
                  <XAxis type="number" axisLine={false} tickLine={false} />
                  <YAxis type="category" dataKey="name" axisLine={false} tickLine={false} width={100} />
                  <Tooltip cursor={{fill: '#f3f4f6'}} />
                  <Bar dataKey="value" name="Schools" fill="#3b82f6" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* State Level: Original Table */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-gray-500 uppercase bg-gray-50 border-b border-gray-100">
                  <tr>
                    <th className="px-6 py-4 font-semibold">{currentLevel.charAt(0).toUpperCase() + currentLevel.slice(1)}</th>
                    <th className="px-6 py-4 font-semibold">Schools</th>
                    <th className="px-6 py-4 font-semibold">Students</th>
                    <th className="px-6 py-4 font-semibold">Batches</th>
                    {currentLevel === 'state' && <th className="px-6 py-4 font-semibold">Districts</th>}
                    {currentLevel === 'district' && <th className="px-6 py-4 font-semibold">Talukas</th>}
                    {currentLevel !== 'taluka' && <th className="px-6 py-4 font-semibold text-right">Action</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {tableData.map((row, idx) => (
                    <tr key={idx} className="hover:bg-gray-50/50 transition-colors bg-white">
                      <td className="px-6 py-4 font-medium text-gray-900">{row[currentLevel]}</td>
                      <td className="px-6 py-4">{row.schoolCount}</td>
                      <td className="px-6 py-4">{row.studentCount}</td>
                      <td className="px-6 py-4">{row.batchCount}</td>
                      
                      {currentLevel === 'state' && <td className="px-6 py-4">{row.districts?.length || 0}</td>}
                      {currentLevel === 'district' && <td className="px-6 py-4">{row.talukas?.length || 0}</td>}
                      
                      {currentLevel !== 'taluka' && (
                        <td className="px-6 py-4 text-right">
                          <button 
                            onClick={() => handleDrillDown(row[currentLevel])}
                            className="text-blue-600 hover:text-blue-800 font-medium text-xs px-3 py-1.5 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors inline-flex items-center gap-1"
                          >
                            View <ChevronRight className="w-3 h-3" />
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : (
        /* District & Taluka Level: New Dynamic View */
        renderDrillDownContent()
      )}

    </div>
  );
};

export default HierarchicalStats;
