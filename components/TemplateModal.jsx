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
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-ink/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <motion.div initial={{ scale: 0.95, y: 16 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 16 }} transition={{ type: 'spring', stiffness: 320, damping: 28 }} className="bg-paper-raised rounded-sm p-8 w-full max-w-2xl border border-line max-h-full overflow-y-auto">
        <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-ink-faint mb-1">Form 02-A</p>
        <h3 className="text-xl font-mono font-bold text-ink mb-6">{templateToEdit ? 'Edit Template' : 'Create New Template'}</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="template-title" className="block text-xs font-mono uppercase tracking-[0.15em] text-ink-soft mb-1">Title</label>
            <input id="template-title" type="text" value={title} onChange={(e) => setTitle(e.target.value)} required className="w-full p-2 bg-paper border border-line rounded-sm text-ink focus:ring-2 focus:ring-stamp/40 focus:border-stamp" />
          </div>
          <div>
            <label htmlFor="template-subject" className="block text-xs font-mono uppercase tracking-[0.15em] text-ink-soft mb-1">Subject</label>
            <input id="template-subject" type="text" value={subject} onChange={(e) => setSubject(e.target.value)} required className="w-full p-2 bg-paper border border-line rounded-sm text-ink focus:ring-2 focus:ring-stamp/40 focus:border-stamp" />
          </div>
          <div>
            <label htmlFor="template-body" className="block text-xs font-mono uppercase tracking-[0.15em] text-ink-soft mb-1">Body</label>
            <textarea id="template-body" ref={bodyRef} value={body} onChange={(e) => setBody(e.target.value)} required rows="8" className="w-full p-2 bg-paper border border-line rounded-sm font-mono text-sm text-ink focus:ring-2 focus:ring-stamp/40 focus:border-stamp" />
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <motion.button whileHover={{ y: -1 }} whileTap={{ scale: 0.97 }} type="button" onClick={onClose} className="px-4 py-2 rounded-sm border border-line text-ink-soft hover:text-ink hover:border-ink-soft transition-colors text-sm font-medium">Cancel</motion.button>
            <motion.button whileHover={{ y: -1 }} whileTap={{ scale: 0.97 }} type="submit" className="px-4 py-2 rounded-sm bg-stamp hover:bg-stamp-dark text-paper-raised font-mono font-bold uppercase tracking-wider text-xs transition-colors">Save Template</motion.button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
}
