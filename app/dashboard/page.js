'use client';

import { useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function Dashboard() {
  const searchParams = useSearchParams();
  const error = searchParams.get('error');
  const [showError, setShowError] = useState(false);

  useEffect(() => {
    if (error === 'unauthorized') {
      setShowError(true);
      // Auto-hide error after 5 seconds
      const timer = setTimeout(() => setShowError(false), 5000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  const videos = [
    { title: 'Next.js Full Course' },
    { title: 'Prisma + PostgreSQL Guide' },
    { title: 'React Advanced Patterns' },
    { title: 'Build SaaS with Next.js' },
  ];

  return (
    <div className="p-6">
      {showError && (
        <div className="mb-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg">
          You don't have permission to access this page. Please contact your
          administrator.
        </div>
      )}
      <div className="grid md:grid-cols-3 lg:grid-cols-4 gap-6">
        {videos.map((video, i) => (
          <div
            key={i}
            className="bg-white rounded-xl shadow hover:shadow-lg transition"
          >
            <div className="bg-gray-300 h-40 rounded-t-xl"></div>
            <div className="p-4">
              <h3 className="font-semibold">{video.title}</h3>
              <p className="text-sm text-gray-500">Channel Name</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
