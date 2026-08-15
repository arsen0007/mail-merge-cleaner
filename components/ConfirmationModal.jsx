'use client';
import { motion } from 'framer-motion';

export default function ConfirmationModal({ title, message, onConfirm, onCancel }) {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }} className="bg-slate-800 rounded-xl p-8 w-full max-w-md border border-slate-700">
        <h3 className="text-xl font-bold mb-4">{title}</h3>
        <p className="text-gray-400 mb-6">{message}</p>
        <div className="flex justify-end gap-4">
          <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={onCancel} className="px-4 py-2 rounded-lg bg-gray-700 hover:bg-gray-600">Cancel</motion.button>
          <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={onConfirm} className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700">Confirm</motion.button>
        </div>
      </motion.div>
    </motion.div>
  );
}
