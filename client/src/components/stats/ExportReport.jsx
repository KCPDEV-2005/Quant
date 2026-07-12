import React, { useState } from 'react';
import { Download, FileSpreadsheet, Loader2 } from 'lucide-react';

const API_BASE = 'http://localhost:5005/api';

const ExportReport = () => {
  const [downloading, setDownloading] = useState(false);
  const [status, setStatus] = useState(null);

  const handleDownload = () => {
    setDownloading(true);
    setStatus(null);
    
    // Create an invisible iframe/link to trigger download without leaving page
    // Using window.open is simplest, but doesn't allow easy error handling for the stream
    // Since it's a direct file download, we can just use window.location.href or an anchor tag
    try {
      const url = `${API_BASE}/export/excel`;
      const a = document.createElement('a');
      a.href = url;
      a.download = true; // Suggests download to browser
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      
      // Simulate download time for UI feedback since we can't easily track native download finish
      setTimeout(() => {
        setDownloading(false);
        setStatus('success');
      }, 2000);
    } catch (err) {
      console.error(err);
      setDownloading(false);
      setStatus('error');
    }
  };

  return (
    <div className="flex justify-center items-center py-12">
      <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 max-w-md w-full text-center space-y-6">
        
        <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto">
          <FileSpreadsheet className="w-8 h-8" />
        </div>

        <div>
          <h2 className="text-2xl font-bold text-gray-900">Download Full Registration Report</h2>
          <p className="text-gray-500 mt-2 text-sm leading-relaxed">
            Exports all statistics and school data as a formatted Excel file with 10 sheets. This includes overall counts, timelines, drill-downs, and missing data reports.
          </p>
        </div>

        <button
          onClick={handleDownload}
          disabled={downloading}
          className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl transition-all shadow-sm flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
        >
          {downloading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Generating Report...
            </>
          ) : (
            <>
              <Download className="w-5 h-5" />
              Generate & Download Excel Report
            </>
          )}
        </button>

        {status === 'success' && (
          <div className="text-sm font-medium text-green-600 bg-green-50 p-3 rounded-lg">
            Report downloaded successfully
          </div>
        )}
        
        {status === 'error' && (
          <div className="text-sm font-medium text-red-600 bg-red-50 p-3 rounded-lg">
            Failed to generate report, please try again
          </div>
        )}
        
      </div>
    </div>
  );
};

export default ExportReport;
