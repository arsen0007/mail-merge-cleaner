'use client';
import { useState, useEffect } from 'react';
import { AnimatePresence } from 'framer-motion';
import { fetchTemplates, createTemplate, updateTemplate, deleteTemplate } from '@/lib/templates';
import { createTemplateDocxBlob } from '@/lib/generateDocx';
import { PrimaryButton, ErrorDisplay, LoadingSpinner, Panel } from '@/components/ui';
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

  if (isLoading) return <div className="text-center p-8 text-stamp-dark"><LoadingSpinner /></div>;

  return (
    <Panel label="Form 02 — Template Builder" className="space-y-6">
      <h2 className="text-xl font-mono font-bold text-ink">Template Builder</h2>

      <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
        <select
          value={activeTemplate?.id || ''}
          onChange={(e) => setActiveTemplate(templates.find((t) => t.id === parseInt(e.target.value, 10)))}
          className="w-full p-3 bg-paper border border-line rounded-sm text-ink focus:ring-2 focus:ring-stamp/40 focus:border-stamp"
        >
          {templates.map((t) => <option key={t.id} value={t.id}>{t.title}</option>)}
        </select>
        <div className="flex items-center space-x-2 flex-shrink-0 self-end sm:self-auto">
          <button aria-label="Create new template" onClick={() => { setTemplateToEdit(null); setIsModalOpen(true); }} className="p-2 bg-stamp text-paper-raised rounded-sm hover:bg-stamp-dark transition-colors">
            <PlusIcon className="w-5 h-5" />
          </button>
          <button
            aria-label="Edit template"
            onClick={() => { if (activeTemplate) { setTemplateToEdit(activeTemplate); setIsModalOpen(true); } }}
            disabled={!activeTemplate || activeTemplate.is_default}
            title={activeTemplate?.is_default ? 'Built-in template — cannot be edited' : undefined}
            className="p-2 bg-paper-sunken text-ink rounded-sm border border-line hover:border-stamp disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <EditIcon className="w-5 h-5" />
          </button>
          <button
            aria-label="Delete template"
            onClick={() => handleDeleteTemplate(activeTemplate?.id)}
            disabled={!activeTemplate || activeTemplate.is_default}
            title={activeTemplate?.is_default ? 'Built-in template — cannot be edited' : undefined}
            className="p-2 bg-paper-sunken text-stamp-dark rounded-sm border border-line hover:border-stamp disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <TrashIcon className="w-5 h-5" />
          </button>
        </div>
      </div>

      {activeTemplate ? (
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-mono uppercase tracking-[0.15em] text-ink-soft mb-1">Subject</label>
            <div className="w-full p-3 bg-paper-sunken/40 border border-line rounded-sm text-ink text-sm">{activeTemplate.subject}</div>
          </div>
          <div>
            <label className="block text-xs font-mono uppercase tracking-[0.15em] text-ink-soft mb-1">Body</label>
            <div className="w-full p-3 h-48 overflow-y-auto bg-paper-sunken/40 border border-line rounded-sm font-mono text-sm text-ink whitespace-pre-wrap">{activeTemplate.body}</div>
          </div>
        </div>
      ) : (
        <div className="text-center text-ink-faint p-8 text-sm">No template selected. Please create one.</div>
      )}

      <PrimaryButton
        onClick={handleDownloadWordDoc}
        isLoading={isDownloading}
        text="Download as Word Document (.docx)"
        loadingText="Creating Document..."
        icon={<DownloadIcon className="w-5 h-5" />}
        className="bg-seal hover:bg-seal-dark"
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
    </Panel>
  );
}
