'use client';
import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';

export default function TemplateModal({ templateToEdit, onSave, onClose }) {
  const [title, setTitle] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const bodyRef = useRef(null);

  useEffect(() => {
    setTitle(templateToEdit?.title || '');
    setSubject(templateToEdit?.subject || '');
    setBody(templateToEdit?.body || '');
  }, [templateToEdit]);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave({ id: templateToEdit?.id, title, subject, body });
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }} className="bg-slate-800 rounded-xl p-8 w-full max-w-2xl border border-slate-700 max-h-full overflow-y-auto">
        <h3 className="text-xl font-bold mb-6">{templateToEdit ? 'Edit Template' : 'Create New Template'}</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="template-title" className="block text-sm font-medium text-gray-400 mb-1">Title</label>
            <input id="template-title" type="text" value={title} onChange={(e) => setTitle(e.target.value)} required className="w-full p-2 bg-gray-900 border border-gray-600 rounded-lg" />
          </div>
          <div>
            <label htmlFor="template-subject" className="block text-sm font-medium text-gray-400 mb-1">Subject</label>
            <input id="template-subject" type="text" value={subject} onChange={(e) => setSubject(e.target.value)} required className="w-full p-2 bg-gray-900 border border-gray-600 rounded-lg" />
          </div>
          <div>
            <label htmlFor="template-body" className="block text-sm font-medium text-gray-400 mb-1">Body</label>
            <textarea id="template-body" ref={bodyRef} value={body} onChange={(e) => setBody(e.target.value)} required rows="8" className="w-full p-2 bg-gray-900 border border-gray-600 rounded-lg font-mono text-sm" />
          </div>
          <div className="flex justify-end gap-4 pt-4">
            <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} type="button" onClick={onClose} className="px-4 py-2 rounded-lg bg-gray-700 hover:bg-gray-600">Cancel</motion.button>
            <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} type="submit" className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700">Save Template</motion.button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
}
