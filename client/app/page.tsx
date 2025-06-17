'use client';

import { useState, useEffect } from 'react';
import axios from 'axios';
import ImportHistory from '@/components/ImportHistory';
import JobStats from '@/components/JobStats';
import QueueStatus from '@/components/QueueStatus';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1';

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState('history');

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Job Importer Dashboard</h1>
          <p className="mt-2 text-gray-600">Monitor and manage job imports from external APIs</p>
        </div>

        {/* Navigation Tabs */}
        <div className="border-b border-gray-200 mb-6">
          <nav className="-mb-px flex space-x-8">
            {[
              { id: 'history', name: 'Import History' },
              { id: 'stats', name: 'Job Statistics' },
              { id: 'queue', name: 'Queue Status' }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab.name}
              </button>
            ))}
          </nav>
        </div>

        {/* Tab Content */}
        <div className="mt-6">
          {activeTab === 'history' && <ImportHistory />}
          {activeTab === 'stats' && <JobStats />}
          {activeTab === 'queue' && <QueueStatus />}
        </div>
      </div>
    </div>
  );
}