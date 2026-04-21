// components/exam/ExamAnalytics.jsx
'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import * as Icons from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
} from 'recharts';

const COLORS = [
  '#3B82F6',
  '#10B981',
  '#F59E0B',
  '#EF4444',
  '#8B5CF6',
  '#EC4899',
];

export default function ExamAnalytics({ onClose }) {
  const [loading, setLoading] = useState(true);
  const [selectedExam, setSelectedExam] = useState('all');
  const [exams, setExams] = useState([]);
  const [analytics, setAnalytics] = useState({
    overall: {},
    byExam: [],
    bySubject: [],
    trends: [],
    gradeDistribution: [],
  });

  useEffect(() => {
    fetchExams();
    fetchAnalytics();
  }, []);

  useEffect(() => {
    if (selectedExam) {
      fetchAnalytics(selectedExam);
    }
  }, [selectedExam]);

  const fetchExams = async () => {
    try {
      const response = await fetch(
        '/api/exams?status=completed,result_published'
      );
      const data = await response.json();
      setExams(data);
    } catch (error) {
      console.error('Error fetching exams:', error);
    }
  };

  const fetchAnalytics = async (examId = 'all') => {
    try {
      setLoading(true);
      const response = await fetch(`/api/analytics/exams?examId=${examId}`);
      const data = await response.json();
      setAnalytics(data);
    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const StatCard = ({ title, value, icon: Icon, color, trend }) => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-lg p-6 shadow-sm"
    >
      <div className="flex justify-between items-start">
        <div>
          <p className="text-sm text-gray-500">{title}</p>
          <p className="text-2xl font-bold mt-1">{value}</p>
          {trend && (
            <p
              className={`text-sm mt-2 ${
                trend > 0 ? 'text-green-600' : 'text-red-600'
              }`}
            >
              {trend > 0 ? '↑' : '↓'} {Math.abs(trend)}% from previous
            </p>
          )}
        </div>
        <div className={`p-3 rounded-lg bg-${color}-50`}>
          <Icon size={24} className={`text-${color}-600`} />
        </div>
      </div>
    </motion.div>
  );

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 overflow-y-auto">
        <div className="flex min-h-full items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50"
            onClick={onClose}
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="relative bg-white rounded-xl shadow-xl w-full max-w-7xl max-h-[90vh] overflow-hidden"
          >
            {/* Header */}
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-xl font-bold text-gray-900">
                    Exam Analytics Dashboard
                  </h2>
                  <p className="text-sm text-gray-500 mt-1">
                    Comprehensive analysis of examination results and student
                    performance
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  <select
                    value={selectedExam}
                    onChange={(e) => setSelectedExam(e.target.value)}
                    className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="all">All Exams</option>
                    {exams.map((exam) => (
                      <option key={exam.id} value={exam.id}>
                        {exam.name}
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={onClose}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <Icons.X size={20} />
                  </button>
                </div>
              </div>
            </div>

            {/* Content */}
            <div
              className="overflow-y-auto p-6"
              style={{ maxHeight: 'calc(90vh - 80px)' }}
            >
              {loading ? (
                <div className="flex justify-center items-center h-64">
                  <Icons.Loader2
                    size={32}
                    className="animate-spin text-blue-600"
                  />
                </div>
              ) : (
                <>
                  {/* Stats Overview */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
                    <StatCard
                      title="Average Score"
                      value={`${analytics.overall.averagePercentage?.toFixed(
                        1
                      )}%`}
                      icon={Icons.TrendingUp}
                      color="blue"
                      trend={analytics.overall.percentageTrend}
                    />
                    <StatCard
                      title="Pass Rate"
                      value={`${analytics.overall.passPercentage?.toFixed(1)}%`}
                      icon={Icons.CheckCircle}
                      color="green"
                    />
                    <StatCard
                      title="Total Students"
                      value={analytics.overall.totalStudents || 0}
                      icon={Icons.Users}
                      color="purple"
                    />
                    <StatCard
                      title="Highest Score"
                      value={`${analytics.overall.highestMarks || 0}`}
                      icon={Icons.Trophy}
                      color="yellow"
                    />
                  </div>

                  {/* Charts Grid */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Subject Performance */}
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.1 }}
                      className="bg-white rounded-lg p-6 shadow-sm"
                    >
                      <h3 className="font-semibold text-gray-900 mb-4">
                        Subject-wise Performance
                      </h3>
                      <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={analytics.bySubject}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="name" />
                          <YAxis />
                          <Tooltip />
                          <Legend />
                          <Bar
                            dataKey="averageMarks"
                            fill="#3B82F6"
                            name="Average Marks"
                          />
                          <Bar
                            dataKey="highestMarks"
                            fill="#10B981"
                            name="Highest Marks"
                          />
                        </BarChart>
                      </ResponsiveContainer>
                    </motion.div>

                    {/* Grade Distribution */}
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.2 }}
                      className="bg-white rounded-lg p-6 shadow-sm"
                    >
                      <h3 className="font-semibold text-gray-900 mb-4">
                        Grade Distribution
                      </h3>
                      <ResponsiveContainer width="100%" height={300}>
                        <PieChart>
                          <Pie
                            data={analytics.gradeDistribution}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            label={({ name, percent }) =>
                              `${name} (${(percent * 100).toFixed(0)}%)`
                            }
                            outerRadius={100}
                            fill="#8884d8"
                            dataKey="value"
                          >
                            {analytics.gradeDistribution.map((entry, index) => (
                              <Cell
                                key={`cell-${index}`}
                                fill={COLORS[index % COLORS.length]}
                              />
                            ))}
                          </Pie>
                          <Tooltip />
                        </PieChart>
                      </ResponsiveContainer>
                    </motion.div>

                    {/* Performance Trends */}
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.3 }}
                      className="bg-white rounded-lg p-6 shadow-sm lg:col-span-2"
                    >
                      <h3 className="font-semibold text-gray-900 mb-4">
                        Performance Trends Over Time
                      </h3>
                      <ResponsiveContainer width="100%" height={300}>
                        <LineChart data={analytics.trends}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="examName" />
                          <YAxis />
                          <Tooltip />
                          <Legend />
                          <Line
                            type="monotone"
                            dataKey="averagePercentage"
                            stroke="#3B82F6"
                            name="Average %"
                          />
                          <Line
                            type="monotone"
                            dataKey="passPercentage"
                            stroke="#10B981"
                            name="Pass %"
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </motion.div>

                    {/* Top Performers */}
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.4 }}
                      className="bg-white rounded-lg p-6 shadow-sm"
                    >
                      <h3 className="font-semibold text-gray-900 mb-4">
                        Top Performers
                      </h3>
                      <div className="space-y-3">
                        {analytics.topPerformers?.map((student, index) => (
                          <div
                            key={student.id}
                            className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                                <span className="text-blue-600 font-semibold">
                                  {index + 1}
                                </span>
                              </div>
                              <div>
                                <p className="font-medium text-gray-900">
                                  {student.name}
                                </p>
                                <p className="text-sm text-gray-500">
                                  Roll No: {student.rollNo}
                                </p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="font-semibold text-gray-900">
                                {student.percentage?.toFixed(1)}%
                              </p>
                              <p className="text-sm text-gray-500">
                                {student.grade}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </motion.div>

                    {/* Subject-wise Pass/Fail Analysis */}
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.5 }}
                      className="bg-white rounded-lg p-6 shadow-sm"
                    >
                      <h3 className="font-semibold text-gray-900 mb-4">
                        Subject-wise Pass/Fail Analysis
                      </h3>
                      <div className="space-y-4">
                        {analytics.bySubject?.map((subject) => (
                          <div key={subject.id}>
                            <div className="flex justify-between text-sm mb-1">
                              <span className="font-medium">
                                {subject.name}
                              </span>
                              <span className="text-gray-600">
                                {subject.passCount}/{subject.totalStudents}{' '}
                                Passed
                              </span>
                            </div>
                            <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-green-500 rounded-full"
                                style={{
                                  width: `${
                                    (subject.passCount /
                                      subject.totalStudents) *
                                    100
                                  }%`,
                                }}
                              />
                            </div>
                            <p className="text-xs text-gray-500 mt-1">
                              Pass Rate:{' '}
                              {(
                                (subject.passCount / subject.totalStudents) *
                                100
                              ).toFixed(1)}
                              %
                            </p>
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  </div>

                  {/* Detailed Statistics Table */}
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.6 }}
                    className="mt-6 bg-white rounded-lg p-6 shadow-sm"
                  >
                    <h3 className="font-semibold text-gray-900 mb-4">
                      Detailed Subject Statistics
                    </h3>
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b border-gray-200">
                            <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">
                              Subject
                            </th>
                            <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">
                              Students
                            </th>
                            <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">
                              Highest
                            </th>
                            <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">
                              Lowest
                            </th>
                            <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">
                              Average
                            </th>
                            <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">
                              Pass Rate
                            </th>
                            <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">
                              Median
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {analytics.bySubject?.map((subject) => (
                            <tr
                              key={subject.id}
                              className="border-b border-gray-100 hover:bg-gray-50"
                            >
                              <td className="py-3 px-4">
                                <p className="font-medium text-gray-900">
                                  {subject.name}
                                </p>
                                <p className="text-xs text-gray-500">
                                  {subject.code}
                                </p>
                              </td>
                              <td className="py-3 px-4 text-gray-700">
                                {subject.totalStudents}
                              </td>
                              <td className="py-3 px-4 text-green-600 font-medium">
                                {subject.highestMarks}
                              </td>
                              <td className="py-3 px-4 text-red-600">
                                {subject.lowestMarks}
                              </td>
                              <td className="py-3 px-4 text-gray-700">
                                {subject.averageMarks?.toFixed(2)}
                              </td>
                              <td className="py-3 px-4">
                                <span
                                  className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                    subject.passPercentage >= 75
                                      ? 'bg-green-100 text-green-700'
                                      : subject.passPercentage >= 50
                                      ? 'bg-yellow-100 text-yellow-700'
                                      : 'bg-red-100 text-red-700'
                                  }`}
                                >
                                  {subject.passPercentage?.toFixed(1)}%
                                </span>
                              </td>
                              <td className="py-3 px-4 text-gray-700">
                                {subject.medianMarks?.toFixed(2)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </motion.div>
                </>
              )}
            </div>
          </motion.div>
        </div>
      </div>
    </AnimatePresence>
  );
}
