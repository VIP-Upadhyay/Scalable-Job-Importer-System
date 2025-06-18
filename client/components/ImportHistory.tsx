'use client';

import { useState, useEffect } from 'react';
import axios from 'axios';
import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline';

interface ImportLog {
  _id: string;
  fileName: string;
  importDateTime: string;
  status: 'in_progress' | 'completed' | 'failed';
  totalFetched: number;
  totalImported: number;
  newJobs: number;
  updatedJobs: number;
  failedJobs: number;
  processingTime?: number;
  errorDetails: Array<{ message: string; timestamp: string }>;
}

interface ImportHistoryResponse {
  data: any;
  logs: ImportLog[];
  totalPages: number;
  currentPage: number;
  total: number;
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1';

export default function ImportHistory() {
  const [logs, setLogs] = useState<ImportLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedLog, setSelectedLog] = useState<ImportLog | null>(null);

  useEffect(() => {
    fetchLogs();
  }, [currentPage]);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const response = await axios.get<ImportHistoryResponse>(
        `${API_BASE}/imports/history?page=${currentPage}&limit=10`
      );
      console.log(response.data.data.logs);
      setLogs(response.data.data.logs);
      // console.log();
      setTotalPages(response.data.data.pagination.totalPages);
    } catch (error) {
      console.error('Error fetching import logs:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800';
      case 'failed': return 'bg-red-100 text-red-800';
      case 'in_progress': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDuration = (ms?: number) => {
    if (!ms) return 'N/A';
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    return minutes > 0 ? `${minutes}m ${seconds % 60}s` : `${seconds}s`;
  };

  const triggerManualImport = async () => {
    try {
      const urls = [
        'https://jobicy.com/?feed=job_feed',
        'https://jobicy.com/?feed=job_feed&job_categories=data-science'
      ];
      
      await axios.post(`${API_BASE}/imports/trigger`, { urls });
      alert('Import jobs queued successfully!');
      fetchLogs(); // Refresh the list
    } catch (error) {
      console.error('Error triggering import:', error);
      alert('Failed to trigger import');
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Manual Import Button */}
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold text-gray-900">Import History</h2>
        <button
          onClick={triggerManualImport}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md font-medium"
        >
          Trigger Manual Import
        </button>
      </div>

      {/* Import Logs Table */}
      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                File Name (URL)
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Import Date/Time
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Total
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                New
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Updated
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Failed
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              {/* <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Duration
              </th> */}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {logs && logs.map((log) => (
              <tr
                key={log._id}
                className="hover:bg-gray-50 cursor-pointer"
                onClick={() => {
                  console.error(log.errorDetails);
                  setSelectedLog(log)
                }}
              >
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  <div className="max-w-xs truncate" title={log.fileName}>
                    {log.fileName}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {new Date(log.importDateTime).toLocaleString()}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {log.totalImported}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600">
                  {log.newJobs}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-blue-600">
                  {log.updatedJobs}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-red-600">
                  {log.failedJobs}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(log.status)}`}>
                    {log.status}
                  </span>
                </td>
                {/* <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {formatDuration(log.processingTime)}
                </td> */}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between border-t border-gray-200 bg-white px-4 py-3 sm:px-6">
        <div className="flex flex-1 justify-between sm:hidden">
          <button
            onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
            disabled={currentPage === 1}
            className="relative inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Previous
          </button>
          <button
            onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
            disabled={currentPage === totalPages}
            className="relative ml-3 inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Next
          </button>
        </div>
        <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
          <div>
            <p className="text-sm text-gray-700">
              Page <span className="font-medium">{currentPage}</span> of{' '}
              <span className="font-medium">{totalPages}</span>
            </p>
          </div>
          <div>
            <nav className="isolate inline-flex -space-x-px rounded-md shadow-sm" aria-label="Pagination">
              <button
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                className="relative inline-flex items-center rounded-l-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0"
              >
                <ChevronLeftIcon className="h-5 w-5" aria-hidden="true" />
              </button>
              <button
                onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
                className="relative inline-flex items-center rounded-r-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0"
              >
                <ChevronRightIcon className="h-5 w-5" aria-hidden="true" />
              </button>
            </nav>
          </div>
        </div>
      </div>

      {/* Log Details Modal */}
      {selectedLog && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-1/2 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium text-gray-900">Import Log Details</h3>
                <button
                  onClick={() => setSelectedLog(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Source URL</label>
                  <p className="text-sm text-gray-900 break-all">{selectedLog.fileName}</p>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Total Fetched</label>
                    <p className="text-sm text-gray-900">{selectedLog.totalFetched}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Total Imported</label>
                    <p className="text-sm text-gray-900">{selectedLog.totalImported}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">New Jobs</label>
                    <p className="text-sm text-green-600">{selectedLog.newJobs}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Updated Jobs</label>
                    <p className="text-sm text-blue-600">{selectedLog.updatedJobs}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Failed Jobs</label>
                    <p className="text-sm text-red-600">{selectedLog.failedJobs}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Processing Time</label>
                    <p className="text-sm text-gray-900">{formatDuration(selectedLog.processingTime)}</p>
                    {/* <p className="text-sm text-gray-900">{selectedLog.errorsDetails.toString()}</p> */}
                  </div>
                </div>

                {selectedLog.errorDetails && selectedLog.errorDetails.length > 0 && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Errors</label>
                    <div className="max-h-40 overflow-y-auto space-y-2">
                      {selectedLog.errorDetails.map((error, index) => (
                        <div key={index} className="bg-red-50 border border-red-200 rounded p-2">
                          <p className="text-sm text-red-800">{error.message}</p>
                          <p className="text-xs text-red-600">{new Date(error.timestamp).toLocaleString()}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}