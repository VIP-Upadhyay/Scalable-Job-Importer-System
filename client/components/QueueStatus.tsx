'use client';

import { useState, useEffect } from 'react';
import axios from 'axios';

interface QueueStats {
  waiting: number;
  active: number;
  completed: number;
  failed: number;
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1';

export default function QueueStatus() {
  const [stats, setStats] = useState<QueueStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, 5000); // Update every 5 seconds
    return () => clearInterval(interval);
  }, []);

  const fetchStats = async () => {
    try {
      console.log("having....")
      const response = await axios.get<QueueStats>(`${API_BASE}/queue/stats`);
      console.log(response.data);
      setStats(response.data.data);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching queue stats:', error);
      setLoading(false);
    }
  };

  const clearQueue = async () => {
    if (confirm('Are you sure you want to clear the queue? This will remove all pending jobs.')) {
      try {
        await axios.post(`${API_BASE}/queue/clear`);
        alert('Queue cleared successfully!');
        fetchStats();
      } catch (error) {
        console.error('Error clearing queue:', error);
        alert('Failed to clear queue');
      }
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
      {/* Header */}
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold text-gray-900">Queue Status</h2>
        <button
          onClick={clearQueue}
          className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md font-medium"
        >
          Clear Queue
        </button>
      </div>

      {/* Queue Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-yellow-500 rounded-md flex items-center justify-center">
                  <span className="text-white font-bold">⏳</span>
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Waiting</dt>
                  <dd className="text-lg font-medium text-gray-900">{stats?.waiting || 0}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-blue-500 rounded-md flex items-center justify-center">
                  <span className="text-white font-bold">🔄</span>
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Active</dt>
                  <dd className="text-lg font-medium text-gray-900">{stats?.active || 0}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-green-500 rounded-md flex items-center justify-center">
                  <span className="text-white font-bold">✅</span>
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Completed</dt>
                  <dd className="text-lg font-medium text-gray-900">{stats?.completed || 0}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-red-500 rounded-md flex items-center justify-center">
                  <span className="text-white font-bold">❌</span>
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Failed</dt>
                  <dd className="text-lg font-medium text-gray-900">{stats?.failed || 0}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Queue Health Status */}
      <div className="bg-white shadow rounded-lg p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Queue Health</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-500">Total Jobs in Queue</span>
            <span className="text-sm text-gray-900">
              {(stats?.waiting || 0) + (stats?.active || 0)}
            </span>
          </div>
          
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-500">Success Rate</span>
            <span className="text-sm text-gray-900">
              {stats?.completed && stats?.failed 
                ? `${((stats.completed / (stats.completed + stats.failed)) * 100).toFixed(1)}%`
                : 'N/A'
              }
            </span>
          </div>
          
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-500">Queue Status</span>
            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
              (stats?.active || 0) > 0 
                ? 'bg-green-100 text-green-800' 
                : 'bg-gray-100 text-gray-800'
            }`}>
              {(stats?.active || 0) > 0 ? 'Processing' : 'Idle'}
            </span>
          </div>
        </div>
      </div>

      {/* Real-time Updates Notice */}
      <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <span className="text-blue-400">ℹ️</span>
          </div>
          <div className="ml-3">
            <p className="text-sm text-blue-700">
              Queue statistics are updated every 5 seconds automatically.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}