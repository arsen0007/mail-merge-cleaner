'use client';
import { useState, useEffect } from 'react';
import { AnimatePresence } from 'framer-motion';
import { fetchTemplates, createTemplate, updateTemplate, deleteTemplate } from '@/lib/templates';
import { createTemplateDocxBlob } from '@/lib/generateDocx';
import { PrimaryButton, ErrorDisplay, LoadingSpinner } from '@/components/ui';
import { PlusIcon, EditIcon, TrashIcon, DownloadIcon } from '@/components/icons';
import TemplateModal from '@/components/TemplateModal';
import ConfirmationModal from '@/components/ConfirmationModal';

// See the note above the Files block: this helper is intentionally
// duplicated from app/clean/page.jsx so each tool page stays independent.
const triggerDownload = (blob, filename) => {
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.style.display = 'none';
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  window.URL.revokeObjectURL(url);
  document.body.removeChild(a);
};

export default function TemplatesPage() {
  const [templates, setTemplates] = useState([]);
  const [activeTemplate, setActiveTemplate] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDownloading, setIsDownloading] = useState(false);
  const [error, setError] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [templateToEdit, setTemplateToEdit] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [templateToDelete, setTemplateToDelete] = useState(null);

  useEffect(() => { loadTemplates(); }, []);

  const loadTemplates = async () => {
    setIsLoading(true);
    try {
      const data = await fetchTemplates();
      setTemplates(data);
      if (data.length > 0) {
        const currentActiveId = activeTemplate?.id ?? templateToEdit?.id ?? null;
        const currentActive = data.find((t) => t.id === currentActiveId);
        setActiveTemplate(currentActive || data[0]);
      } else {
        setActiveTemplate(null);
      }
    } catch (err) {
      setError('Failed to load templates.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveTemplate = async (templateData) => {
    try {
      const saved = templateData.id
        ? await updateTemplate(templateData.id, templateData)
        : await createTemplate(templateData);
      await loadTemplates();
      setActiveTemplate(saved);
      setIsModalOpen(false);
      setTemplateToEdit(null);
    } catch (err) {
      alert(err.message);
    }
  };

  const handleDeleteTemplate = (id) => {
    if (!id) return;
    setTemplateToDelete(templates.find((t) => t.id === id));
    setShowDeleteConfirm(true);
  };

  const confirmDelete = async () => {
    if (!templateToDelete) return;
    try {
      await deleteTemplate(templateToDelete.id);
      setActiveTemplate(null);
      await loadTemplates();
    } catch (err) {
      alert(err.message);
    } finally {
      setShowDeleteConfirm(false);
      setTemplateToDelete(null);
    }
  };

  const handleDownloadWordDoc = async () => {
    if (!activeTemplate) return;
    setIsDownloading(true);
    setError(null);
    try {
      const blob = await createTemplateDocxBlob(activeTemplate.body);
      triggerDownload(blob, 'mail_merge_template.docx');
    } catch (err) {
      setError(err.message);
    } finally {
      setIsDownloading(false);
    }
  };

  if (isLoading) return <div className="text-center p-8"><LoadingSpinner /></div>;

  return (
    <div className="bg-slate-900/50 backdrop-blur-xl p-6 md:p-8 rounded-2xl border border-slate-800 shadow-2xl shadow-black/30 space-y-6">
      <h2 className="text-2xl font-bold text-white">Template Builder</h2>

      <div className="flex items-center justify-between gap-4">
        <select
          value={activeTemplate?.id || ''}
          onChange={(e) => setActiveTemplate(templates.find((t) => t.id === parseInt(e.target.value, 10)))}
          className="w-full p-3 bg-gray-900 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500"
        >
          {templates.map((t) => <option key={t.id} value={t.id}>{t.title}</option>)}
        </select>
        <div className="flex items-center space-x-2 flex-shrink-0">
          <button aria-label="Create new template" onClick={() => { setTemplateToEdit(null); setIsModalOpen(true); }} className="p-2 bg-blue-600 rounded-lg hover:bg-blue-700">
            <PlusIcon />
          </button>
          <button
            aria-label="Edit template"
            onClick={() => { if (activeTemplate) { setTemplateToEdit(activeTemplate); setIsModalOpen(true); } }}
            disabled={!activeTemplate || activeTemplate.is_default}
            title={activeTemplate?.is_default ? 'Built-in template — cannot be edited' : undefined}
            className="p-2 bg-gray-700 rounded-lg hover:bg-gray-600 disabled:bg-gray-800 disabled:cursor-not-allowed"
          >
            <EditIcon />
          </button>
          <button
            aria-label="Delete template"
            onClick={() => handleDeleteTemplate(activeTemplate?.id)}
            disabled={!activeTemplate || activeTemplate.is_default}
            title={activeTemplate?.is_default ? 'Built-in template — cannot be edited' : undefined}
            className="p-2 bg-red-800 rounded-lg hover:bg-red-700 disabled:bg-gray-800 disabled:cursor-not-allowed"
          >
            <TrashIcon />
          </button>
        </div>
      </div>

      {activeTemplate ? (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">Subject</label>
            <div className="w-full p-3 bg-gray-900/50 border border-gray-700 rounded-lg">{activeTemplate.subject}</div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">Body</label>
            <div className="w-full p-3 h-48 overflow-y-auto bg-gray-900/50 border border-gray-700 rounded-lg font-mono text-sm whitespace-pre-wrap">{activeTemplate.body}</div>
          </div>
        </div>
      ) : (
        <div className="text-center text-gray-500 p-8">No template selected. Please create one.</div>
      )}

      <PrimaryButton
        onClick={handleDownloadWordDoc}
        isLoading={isDownloading}
        text="Download as Word Document (.docx)"
        loadingText="Creating Document..."
        icon={<DownloadIcon className="w-5 h-5 mr-2" />}
        className="bg-green-600 hover:bg-green-700"
        disabled={!activeTemplate}
      />

      {error && <ErrorDisplay message={error} />}

      <AnimatePresence>
        {isModalOpen && (
          <TemplateModal templateToEdit={templateToEdit} onSave={handleSaveTemplate} onClose={() => setIsModalOpen(false)} />
        )}
      </AnimatePresence>
      <AnimatePresence>
        {showDeleteConfirm && (
          <ConfirmationModal
            title="Delete Template"
            message={`Are you sure you want to delete "${templateToDelete?.title}"? This action cannot be undone.`}
            onConfirm={confirmDelete}
            onCancel={() => setShowDeleteConfirm(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
