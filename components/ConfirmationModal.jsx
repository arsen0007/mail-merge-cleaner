'use client';
import { motion } from 'framer-motion';

export default function ConfirmationModal({ title, message, onConfirm, onCancel }) {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-ink/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <motion.div initial={{ scale: 0.95, y: 16 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 16 }} transition={{ type: 'spring', stiffness: 320, damping: 28 }} className="bg-paper-raised rounded-sm p-8 w-full max-w-md border border-line">
        <h3 className="text-xl font-mono font-bold text-ink mb-4">{title}</h3>
        <p className="text-ink-soft mb-6 text-sm leading-relaxed">{message}</p>
        <div className="flex justify-end gap-3">
          <motion.button whileHover={{ y: -1 }} whileTap={{ scale: 0.97 }} onClick={onCancel} className="px-4 py-2 rounded-sm border border-line text-ink-soft hover:text-ink hover:border-ink-soft transition-colors text-sm font-medium">Cancel</motion.button>
          <motion.button whileHover={{ y: -1 }} whileTap={{ scale: 0.97 }} onClick={onConfirm} className="px-4 py-2 rounded-sm bg-stamp-dark hover:bg-stamp text-paper-raised font-mono font-bold uppercase tracking-wider text-xs transition-colors">Confirm</motion.button>
        </div>
      </motion.div>
    </motion.div>
  );
}
