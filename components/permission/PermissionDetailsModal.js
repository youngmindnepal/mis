// components/PermissionDetailsModal.js
'use client';

import { motion, AnimatePresence } from 'framer-motion';
import * as Icons from 'lucide-react';

export default function PermissionDetailsModal({
  isOpen,
  onClose,
  permission,
  onEdit,
}) {
  if (!permission) return null;

  const getActionBadgeColor = (action) => {
    const colors = {
      create: 'bg-green-100 text-green-800',
      read: 'bg-blue-100 text-blue-800',
      update: 'bg-yellow-100 text-yellow-800',
      delete: 'bg-red-100 text-red-800',
      manage: 'bg-purple-100 text-purple-800',
    };
    return colors[action?.toLowerCase()] || 'bg-gray-100 text-gray-800';
  };

  const getActionIcon = (action) => {
    switch (action?.toLowerCase()) {
      case 'create':
        return Icons.PlusCircle;
      case 'read':
        return Icons.Eye;
      case 'update':
        return Icons.Edit;
      case 'delete':
        return Icons.Trash2;
      case 'manage':
        return Icons.Settings;
      default:
        return Icons.Key;
    }
  };

  const ActionIcon = getActionIcon(permission.action);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center">
              <h2 className="text-xl font-bold text-gray-800">
                Permission Details
              </h2>
              <button
                onClick={onClose}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <Icons.X size={20} />
              </button>
            </div>

            <div className="p-6">
              {/* Header */}
              <div className="flex items-start gap-4 mb-6">
                <div
                  className={`p-3 rounded-xl ${getActionBadgeColor(
                    permission.action
                  )}`}
                >
                  <ActionIcon size={32} />
                </div>
                <div className="flex-1">
                  <h3 className="text-2xl font-bold text-gray-800">
                    {permission.name}
                  </h3>
                  {permission.description && (
                    <p className="text-gray-600 mt-1">
                      {permission.description}
                    </p>
                  )}
                </div>
                <button
                  onClick={onEdit}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors flex items-center gap-2"
                >
                  <Icons.Edit size={18} />
                  Edit
                </button>
              </div>

              {/* Details Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="flex items-center gap-2 text-gray-600 mb-2">
                    <Icons.Database size={16} />
                    <span className="text-sm font-medium">Resource</span>
                  </div>
                  <p className="text-gray-800 font-mono">
                    {permission.resource || '-'}
                  </p>
                </div>

                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="flex items-center gap-2 text-gray-600 mb-2">
                    <Icons.Zap size={16} />
                    <span className="text-sm font-medium">Action</span>
                  </div>
                  <span
                    className={`inline-flex px-2 py-1 rounded text-sm font-medium ${getActionBadgeColor(
                      permission.action
                    )}`}
                  >
                    {permission.action || '-'}
                  </span>
                </div>

                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="flex items-center gap-2 text-gray-600 mb-2">
                    <Icons.Tag size={16} />
                    <span className="text-sm font-medium">Category</span>
                  </div>
                  <p className="text-gray-800">{permission.category || '-'}</p>
                </div>

                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="flex items-center gap-2 text-gray-600 mb-2">
                    <Icons.Calendar size={16} />
                    <span className="text-sm font-medium">Created</span>
                  </div>
                  <p className="text-gray-800">
                    {new Date(permission.createdAt).toLocaleString()}
                  </p>
                </div>
              </div>

              {/* Roles using this permission */}
              {permission.roles && permission.roles.length > 0 && (
                <div className="border-t pt-6">
                  <h4 className="text-lg font-semibold text-gray-800 mb-3 flex items-center gap-2">
                    <Icons.Shield size={20} />
                    Roles with this permission
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {permission.roles.map((role) => (
                      <span
                        key={role.id}
                        className="px-3 py-1 bg-indigo-50 text-indigo-700 rounded-full text-sm"
                      >
                        {role.name}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Metadata */}
              <div className="border-t pt-6 mt-6">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-500">ID</span>
                    <p className="text-gray-800 font-mono text-xs mt-1">
                      {permission.id}
                    </p>
                  </div>
                  <div>
                    <span className="text-gray-500">Last Updated</span>
                    <p className="text-gray-800 mt-1">
                      {new Date(permission.updatedAt).toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
