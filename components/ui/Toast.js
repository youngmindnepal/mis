// components/ui/Toast.js
'use client';

import { motion, AnimatePresence } from 'framer-motion';
import * as Icons from 'lucide-react';

export default function Toast({ show, message, type = 'success', onClose }) {
  const getIcon = () => {
    switch (type) {
      case 'success':
        return <Icons.CheckCircle size={20} />;
      case 'error':
        return <Icons.AlertCircle size={20} />;
      case 'warning':
        return <Icons.AlertTriangle size={20} />;
      case 'info':
        return <Icons.Info size={20} />;
      default:
        return <Icons.CheckCircle size={20} />;
    }
  };

  const getColors = () => {
    switch (type) {
      case 'success':
        return 'bg-green-100 border-green-400 text-green-700';
      case 'error':
        return 'bg-red-100 border-red-400 text-red-700';
      case 'warning':
        return 'bg-yellow-100 border-yellow-400 text-yellow-700';
      case 'info':
        return 'bg-blue-100 border-blue-400 text-blue-700';
      default:
        return 'bg-green-100 border-green-400 text-green-700';
    }
  };

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, y: -50 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -50 }}
          className={`fixed top-20 right-6 z-50 border rounded-lg shadow-lg ${getColors()}`}
        >
          <div className="px-4 py-3 flex items-center gap-3">
            {getIcon()}
            <span className="font-medium">{message}</span>
            <button
              onClick={onClose}
              className="ml-4 hover:opacity-70 transition-opacity"
            >
              <Icons.X size={16} />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
