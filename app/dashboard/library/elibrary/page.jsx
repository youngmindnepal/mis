// app/dashboard/library/elibrary/page.jsx
'use client';

import { useState } from 'react';
import ELibrarySearch from '@/components/library/ELibrarySearch';

export default function ELibraryPage() {
  const [isOpen, setIsOpen] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('books');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState('All');

  const handleCategoryClick = (categoryName) => {
    setSearchQuery(categoryName);
    setActiveTab('books');
    setSelectedCategoryFilter('All');
    setIsOpen(true);
  };

  const handleSemesterClick = (semesterName) => {
    setSearchQuery('');
    setActiveTab('books');
    setSelectedCategoryFilter(semesterName);
    setIsOpen(true);
  };

  const handleResourceClick = (resourceType) => {
    setSearchQuery(resourceType);
    setActiveTab('books');
    setSelectedCategoryFilter('All');
    setIsOpen(true);
  };

  const handleQuickLink = (url) => {
    window.open(url, '_blank', 'noopener noreferrer');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-slate-100">
      {/* Page Header */}
      <div className="bg-white border-b border-gray-200 shadow-sm px-6 py-5">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-md">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="white"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
                <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
              </svg>
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">E-Library</h1>
              <p className="text-sm text-gray-500 mt-0.5">
                Access 280+ curated technical books & 22+ free e-book websites
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                setSearchQuery('');
                setActiveTab('sites');
                setSelectedCategoryFilter('All');
                setIsOpen(true);
              }}
              className="px-4 py-2.5 bg-white border-2 border-emerald-600 text-emerald-600 rounded-xl text-sm font-semibold hover:bg-emerald-50 transition-all flex items-center gap-2"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="12" cy="12" r="10" />
                <line x1="2" y1="12" x2="22" y2="12" />
                <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
              </svg>
              Browse Websites
            </button>
            <button
              onClick={() => {
                setSearchQuery('');
                setActiveTab('books');
                setSelectedCategoryFilter('All');
                setIsOpen(true);
              }}
              className="px-5 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-semibold hover:bg-emerald-700 transition-all flex items-center gap-2 shadow-md shadow-emerald-200"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
                <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
              </svg>
              Open E-Library
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Stats Overview */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div
            onClick={() => {
              setSearchQuery('');
              setActiveTab('books');
              setSelectedCategoryFilter('All');
              setIsOpen(true);
            }}
            className="bg-white rounded-2xl border border-gray-200 p-5 cursor-pointer hover:shadow-lg hover:border-emerald-300 transition-all group"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-emerald-100 flex items-center justify-center group-hover:bg-emerald-200 transition-colors">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="text-emerald-600"
                >
                  <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
                  <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
                </svg>
              </div>
              <div>
                <p className="text-3xl font-bold text-gray-900">280+</p>
                <p className="text-xs text-gray-500 font-medium">
                  Curated Books
                </p>
              </div>
            </div>
          </div>

          <div
            onClick={() => {
              setSearchQuery('');
              setActiveTab('sites');
              setSelectedCategoryFilter('All');
              setIsOpen(true);
            }}
            className="bg-white rounded-2xl border border-gray-200 p-5 cursor-pointer hover:shadow-lg hover:border-blue-300 transition-all group"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center group-hover:bg-blue-200 transition-colors">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="text-blue-600"
                >
                  <circle cx="12" cy="12" r="10" />
                  <line x1="2" y1="12" x2="22" y2="12" />
                  <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
                </svg>
              </div>
              <div>
                <p className="text-3xl font-bold text-gray-900">22+</p>
                <p className="text-xs text-gray-500 font-medium">
                  Free E-Book Sites
                </p>
              </div>
            </div>
          </div>

          <div
            onClick={() => handleCategoryClick('Nepali Resource')}
            className="bg-white rounded-2xl border border-gray-200 p-5 cursor-pointer hover:shadow-lg hover:border-amber-300 transition-all group"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-amber-100 flex items-center justify-center group-hover:bg-amber-200 transition-colors">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="text-amber-600"
                >
                  <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
                  <path d="M6 12v5c0 2 6 3 10 3s10-1 10-3v-5" />
                </svg>
              </div>
              <div>
                <p className="text-3xl font-bold text-gray-900">50+</p>
                <p className="text-xs text-gray-500 font-medium">
                  CSIT TU Resources
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-200 p-5">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-purple-100 flex items-center justify-center">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="text-purple-600"
                >
                  <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
                  <path d="M6 12v5c0 2 6 3 10 3s10-1 10-3v-5" />
                </svg>
              </div>
              <div>
                <p className="text-3xl font-bold text-gray-900">8</p>
                <p className="text-xs text-gray-500 font-medium">Semesters</p>
              </div>
            </div>
          </div>
        </div>

        {/* Welcome Banner */}
        <div className="bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-600 rounded-2xl p-8 mb-8 shadow-lg shadow-emerald-200">
          <div className="flex items-start justify-between flex-wrap gap-6">
            <div className="max-w-2xl">
              <h2 className="text-2xl font-bold text-white mb-3">
                📚 Welcome to the E-Library
              </h2>
              <p className="text-emerald-50 text-sm leading-relaxed mb-4">
                Explore a comprehensive collection of 280+ technical books,
                programming resources, and complete B.Sc. CSIT TU Nepal
                curriculum materials. All resources are free, open source, and
                accessible with a single click.
              </p>
              <div className="flex flex-wrap gap-2">
                <span className="px-3 py-1.5 bg-white/20 backdrop-blur-sm rounded-full text-xs font-medium text-white border border-white/20">
                  📖 280+ Curated Books
                </span>
                <span className="px-3 py-1.5 bg-white/20 backdrop-blur-sm rounded-full text-xs font-medium text-white border border-white/20">
                  🌐 22+ E-Book Websites
                </span>
                <span className="px-3 py-1.5 bg-white/20 backdrop-blur-sm rounded-full text-xs font-medium text-white border border-white/20">
                  🇳🇵 CSIT TU Nepal Curriculum
                </span>
                <span className="px-3 py-1.5 bg-white/20 backdrop-blur-sm rounded-full text-xs font-medium text-white border border-white/20">
                  🎥 Video Lectures in Nepali
                </span>
                <span className="px-3 py-1.5 bg-white/20 backdrop-blur-sm rounded-full text-xs font-medium text-white border border-white/20">
                  🔓 100% Free & Open Source
                </span>
              </div>
            </div>
            <div className="hidden lg:block">
              <div className="w-32 h-32 rounded-2xl bg-white/10 backdrop-blur-sm flex items-center justify-center">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="64"
                  height="64"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="white"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="opacity-80"
                >
                  <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
                  <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* Technology Categories */}
        <div className="mb-8">
          <h3 className="text-base font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <span className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="text-blue-600"
              >
                <polyline points="16 18 22 12 16 6" />
                <polyline points="8 6 2 12 8 18" />
              </svg>
            </span>
            Browse by Technology
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2.5">
            {[
              {
                name: 'Python',
                icon: '🐍',
                color:
                  'bg-yellow-50 border-yellow-200 text-yellow-700 hover:bg-yellow-100 hover:border-yellow-300',
              },
              {
                name: 'JavaScript',
                icon: '📜',
                color:
                  'bg-amber-50 border-amber-200 text-amber-700 hover:bg-amber-100 hover:border-amber-300',
              },
              {
                name: 'C Programming',
                icon: '🇨',
                color:
                  'bg-sky-50 border-sky-200 text-sky-700 hover:bg-sky-100 hover:border-sky-300',
              },
              {
                name: 'Java',
                icon: '☕',
                color:
                  'bg-red-50 border-red-200 text-red-700 hover:bg-red-100 hover:border-red-300',
              },
              {
                name: 'C++',
                icon: '🔧',
                color:
                  'bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100 hover:border-blue-300',
              },
              {
                name: 'TypeScript',
                icon: '🔷',
                color:
                  'bg-indigo-50 border-indigo-200 text-indigo-700 hover:bg-indigo-100 hover:border-indigo-300',
              },
              {
                name: 'Rust',
                icon: '🦀',
                color:
                  'bg-orange-50 border-orange-200 text-orange-700 hover:bg-orange-100 hover:border-orange-300',
              },
              {
                name: 'Go',
                icon: '🔵',
                color:
                  'bg-cyan-50 border-cyan-200 text-cyan-700 hover:bg-cyan-100 hover:border-cyan-300',
              },
              {
                name: 'React',
                icon: '⚛️',
                color:
                  'bg-sky-50 border-sky-200 text-sky-700 hover:bg-sky-100 hover:border-sky-300',
              },
              {
                name: 'Vue.js',
                icon: '💚',
                color:
                  'bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100 hover:border-emerald-300',
              },
              {
                name: 'Next.js',
                icon: '▲',
                color:
                  'bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100 hover:border-gray-300',
              },
              {
                name: 'Node.js',
                icon: '💚',
                color:
                  'bg-green-50 border-green-200 text-green-700 hover:bg-green-100 hover:border-green-300',
              },
              {
                name: 'Docker',
                icon: '🐳',
                color:
                  'bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100 hover:border-blue-300',
              },
              {
                name: 'Kubernetes',
                icon: '☸️',
                color:
                  'bg-indigo-50 border-indigo-200 text-indigo-700 hover:bg-indigo-100 hover:border-indigo-300',
              },
              {
                name: 'Git',
                icon: '📦',
                color:
                  'bg-orange-50 border-orange-200 text-orange-700 hover:bg-orange-100 hover:border-orange-300',
              },
              {
                name: 'Linux',
                icon: '🐧',
                color:
                  'bg-yellow-50 border-yellow-200 text-yellow-700 hover:bg-yellow-100 hover:border-yellow-300',
              },
            ].map((cat) => (
              <button
                key={cat.name}
                onClick={() => handleCategoryClick(cat.name)}
                className={`px-3 py-3 rounded-xl border ${cat.color} text-xs font-semibold text-center transition-all hover:shadow-md flex items-center justify-center gap-2`}
              >
                <span className="text-base">{cat.icon}</span>
                {cat.name}
              </button>
            ))}
          </div>
        </div>

        {/* Subject Categories */}
        <div className="mb-8">
          <h3 className="text-base font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <span className="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="text-purple-600"
              >
                <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
                <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
              </svg>
            </span>
            Browse by Subject
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2.5">
            {[
              {
                name: 'Computer Science',
                icon: '💻',
                color:
                  'bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100 hover:border-blue-300',
              },
              {
                name: 'Algorithms',
                icon: '🧮',
                color:
                  'bg-purple-50 border-purple-200 text-purple-700 hover:bg-purple-100 hover:border-purple-300',
              },
              {
                name: 'Data Structures',
                icon: '🌳',
                color:
                  'bg-green-50 border-green-200 text-green-700 hover:bg-green-100 hover:border-green-300',
              },
              {
                name: 'Machine Learning',
                icon: '🤖',
                color:
                  'bg-pink-50 border-pink-200 text-pink-700 hover:bg-pink-100 hover:border-pink-300',
              },
              {
                name: 'Deep Learning',
                icon: '🧠',
                color:
                  'bg-fuchsia-50 border-fuchsia-200 text-fuchsia-700 hover:bg-fuchsia-100 hover:border-fuchsia-300',
              },
              {
                name: 'AI',
                icon: '✨',
                color:
                  'bg-violet-50 border-violet-200 text-violet-700 hover:bg-violet-100 hover:border-violet-300',
              },
              {
                name: 'Database',
                icon: '🗄️',
                color:
                  'bg-indigo-50 border-indigo-200 text-indigo-700 hover:bg-indigo-100 hover:border-indigo-300',
              },
              {
                name: 'SQL',
                icon: '📊',
                color:
                  'bg-cyan-50 border-cyan-200 text-cyan-700 hover:bg-cyan-100 hover:border-cyan-300',
              },
              {
                name: 'Operating Systems',
                icon: '⚙️',
                color:
                  'bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100 hover:border-gray-300',
              },
              {
                name: 'Computer Networks',
                icon: '🌐',
                color:
                  'bg-teal-50 border-teal-200 text-teal-700 hover:bg-teal-100 hover:border-teal-300',
              },
              {
                name: 'Web Development',
                icon: '🕸️',
                color:
                  'bg-amber-50 border-amber-200 text-amber-700 hover:bg-amber-100 hover:border-amber-300',
              },
              {
                name: 'DevOps',
                icon: '🔄',
                color:
                  'bg-orange-50 border-orange-200 text-orange-700 hover:bg-orange-100 hover:border-orange-300',
              },
              {
                name: 'Software Engineering',
                icon: '🏗️',
                color:
                  'bg-lime-50 border-lime-200 text-lime-700 hover:bg-lime-100 hover:border-lime-300',
              },
              {
                name: 'Data Science',
                icon: '📈',
                color:
                  'bg-rose-50 border-rose-200 text-rose-700 hover:bg-rose-100 hover:border-rose-300',
              },
              {
                name: 'Security',
                icon: '🔒',
                color:
                  'bg-red-50 border-red-200 text-red-700 hover:bg-red-100 hover:border-red-300',
              },
              {
                name: 'Computer Graphics',
                icon: '🎨',
                color:
                  'bg-purple-50 border-purple-200 text-purple-700 hover:bg-purple-100 hover:border-purple-300',
              },
              {
                name: 'Compiler Design',
                icon: '⚡',
                color:
                  'bg-yellow-50 border-yellow-200 text-yellow-700 hover:bg-yellow-100 hover:border-yellow-300',
              },
              {
                name: 'Mobile Development',
                icon: '📱',
                color:
                  'bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100 hover:border-emerald-300',
              },
            ].map((cat) => (
              <button
                key={cat.name}
                onClick={() => handleCategoryClick(cat.name)}
                className={`px-3 py-3 rounded-xl border ${cat.color} text-xs font-semibold text-center transition-all hover:shadow-md flex items-center justify-center gap-2`}
              >
                <span className="text-base">{cat.icon}</span>
                {cat.name}
              </button>
            ))}
          </div>
        </div>

        {/* CSIT Semester Categories */}
        <div className="mb-8">
          <h3 className="text-base font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <span className="w-8 h-8 rounded-lg bg-green-100 flex items-center justify-center">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="text-green-600"
              >
                <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
                <path d="M6 12v5c0 2 6 3 10 3s10-1 10-3v-5" />
              </svg>
            </span>
            B.Sc. CSIT TU Nepal - Semester-wise Resources
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            {[
              {
                name: 'CSIT 1st Sem',
                icon: '1️⃣',
                subtitle: 'IIT, C, Digital Logic, Math I, Physics',
                color:
                  'bg-green-50 border-green-200 text-green-700 hover:bg-green-100 hover:border-green-300',
              },
              {
                name: 'CSIT 2nd Sem',
                icon: '2️⃣',
                subtitle: 'Discrete, OOP, Microprocessor, Stats I, Math II',
                color:
                  'bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100 hover:border-emerald-300',
              },
              {
                name: 'CSIT 3rd Sem',
                icon: '3️⃣',
                subtitle: 'DSA, Architecture, OS, Numerical, Stats II',
                color:
                  'bg-teal-50 border-teal-200 text-teal-700 hover:bg-teal-100 hover:border-teal-300',
              },
              {
                name: 'CSIT 4th Sem',
                icon: '4️⃣',
                subtitle: 'DBMS, CG, AI, TOC, SAD',
                color:
                  'bg-cyan-50 border-cyan-200 text-cyan-700 hover:bg-cyan-100 hover:border-cyan-300',
              },
              {
                name: 'CSIT 5th Sem',
                icon: '5️⃣',
                subtitle: 'CN, SE, Web Tech, Crypto, Multimedia, Java',
                color:
                  'bg-sky-50 border-sky-200 text-sky-700 hover:bg-sky-100 hover:border-sky-300',
              },
              {
                name: 'CSIT 6th Sem',
                icon: '6️⃣',
                subtitle: 'Compiler, E-Commerce, NCC, TW, Image, .NET',
                color:
                  'bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100 hover:border-blue-300',
              },
              {
                name: 'CSIT 7th Sem',
                icon: '7️⃣',
                subtitle: 'Cloud, DM, Testing, IoT, InfoSec, Simulation',
                color:
                  'bg-indigo-50 border-indigo-200 text-indigo-700 hover:bg-indigo-100 hover:border-indigo-300',
              },
              {
                name: 'CSIT 8th Sem',
                icon: '8️⃣',
                subtitle: 'PM, E-Gov, Big Data, ML, GIS, RT, KM',
                color:
                  'bg-purple-50 border-purple-200 text-purple-700 hover:bg-purple-100 hover:border-purple-300',
              },
            ].map((cat) => (
              <button
                key={cat.name}
                onClick={() => handleSemesterClick(cat.name)}
                className={`px-4 py-4 rounded-xl border ${cat.color} text-sm font-semibold text-left transition-all hover:shadow-md`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-lg">{cat.icon}</span>
                  <span>{cat.name}</span>
                </div>
                <p className="text-[10px] opacity-70 leading-tight">
                  {cat.subtitle}
                </p>
              </button>
            ))}
          </div>
        </div>

        {/* Resource Types */}
        <div className="mb-8">
          <h3 className="text-base font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <span className="w-8 h-8 rounded-lg bg-orange-100 flex items-center justify-center">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="text-orange-600"
              >
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="16" y1="13" x2="8" y2="13" />
                <line x1="16" y1="17" x2="8" y2="17" />
                <polyline points="10 9 9 9 8 9" />
              </svg>
            </span>
            Browse by Resource Type
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            {[
              {
                name: 'Nepali Resource',
                icon: '🇳🇵',
                color:
                  'bg-red-50 border-red-200 text-red-700 hover:bg-red-100 hover:border-red-300',
              },
              {
                name: 'Video Lectures',
                icon: '🎥',
                color:
                  'bg-orange-50 border-orange-200 text-orange-700 hover:bg-orange-100 hover:border-orange-300',
              },
              {
                name: 'Old Questions',
                icon: '📋',
                color:
                  'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100 hover:border-slate-300',
              },
              {
                name: 'Syllabus',
                icon: '📑',
                color:
                  'bg-stone-50 border-stone-200 text-stone-700 hover:bg-stone-100 hover:border-stone-300',
              },
              {
                name: 'Lab Manual',
                icon: '🔬',
                color:
                  'bg-amber-50 border-amber-200 text-amber-700 hover:bg-amber-100 hover:border-amber-300',
              },
              {
                name: 'Notes',
                icon: '📝',
                color:
                  'bg-violet-50 border-violet-200 text-violet-700 hover:bg-violet-100 hover:border-violet-300',
              },
              {
                name: 'Solutions',
                icon: '✅',
                color:
                  'bg-green-50 border-green-200 text-green-700 hover:bg-green-100 hover:border-green-300',
              },
              {
                name: 'Textbooks',
                icon: '📚',
                color:
                  'bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100 hover:border-blue-300',
              },
            ].map((cat) => (
              <button
                key={cat.name}
                onClick={() => handleResourceClick(cat.name)}
                className={`px-3 py-3 rounded-xl border ${cat.color} text-xs font-semibold text-center transition-all hover:shadow-md flex items-center justify-center gap-2`}
              >
                <span className="text-base">{cat.icon}</span>
                {cat.name}
              </button>
            ))}
          </div>
        </div>

        {/* Nepali CSIT Quick Links */}
        <div>
          <h3 className="text-base font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <span className="w-8 h-8 rounded-lg bg-red-100 flex items-center justify-center">
              <span className="text-lg">🇳🇵</span>
            </span>
            Nepali CSIT Resources - Quick Links
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              {
                name: 'Hamro CSIT',
                description: 'Notes, syllabus, old questions & solutions',
                url: 'https://hamrocsit.com',
                icon: '📚',
                color: 'bg-emerald-100 group-hover:bg-emerald-200',
              },
              {
                name: 'CSIT Tutor',
                description: 'Complete reference materials & solutions',
                url: 'https://ictsolved.github.io/csit',
                icon: '🎓',
                color: 'bg-blue-100 group-hover:bg-blue-200',
              },
              {
                name: 'Study Notes Nepal',
                description: 'Syllabus-based complete CSIT notes',
                url: 'https://studynotesnepal.com/notes-bsc-csit',
                icon: '📝',
                color: 'bg-purple-100 group-hover:bg-purple-200',
              },
              {
                name: 'CSIT Notes Hub',
                description: 'Free notes, questions & syllabus',
                url: 'https://csitnoteshub.com',
                icon: '📖',
                color: 'bg-orange-100 group-hover:bg-orange-200',
              },
            ].map((link) => (
              <button
                key={link.name}
                onClick={() => handleQuickLink(link.url)}
                className="bg-white border border-gray-200 rounded-xl p-5 hover:shadow-lg transition-all flex items-start gap-4 text-left group"
              >
                <div
                  className={`w-12 h-12 rounded-xl ${link.color} flex items-center justify-center flex-shrink-0 transition-colors`}
                >
                  <span className="text-xl">{link.icon}</span>
                </div>
                <div>
                  <p className="font-semibold text-sm text-gray-900 group-hover:text-emerald-600 transition-colors">
                    {link.name}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    {link.description}
                  </p>
                  <div className="flex items-center gap-1 mt-2 text-xs text-emerald-600 font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                    Visit Site
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="12"
                      height="12"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <line x1="7" y1="17" x2="17" y2="7" />
                      <polyline points="7 7 17 7 17 17" />
                    </svg>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* E-Library Modal */}
      <ELibrarySearch
        isOpen={isOpen}
        onClose={() => {
          setIsOpen(false);
          setSearchQuery('');
          setSelectedCategoryFilter('All');
        }}
        initialSearchQuery={searchQuery}
        initialTab={activeTab}
        initialCategory={selectedCategoryFilter}
      />
    </div>
  );
}
