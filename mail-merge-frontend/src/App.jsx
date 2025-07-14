import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// --- Icon Components ---
const UploadCloudIcon = (props) => <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242"/><path d="M12 12v9"/><path d="m16 16-4-4-4 4"/></svg>;
const FileIcon = (props) => <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/></svg>;
const DownloadIcon = (props) => <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" x2="12" y1="15" y2="3" /></svg>;
const PlusIcon = (props) => <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="M12 5v14"/></svg>;
const EditIcon = (props) => <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/></svg>;
const TrashIcon = (props) => <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>;
const XIcon = (props) => <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>;
const LoadingSpinner = () => <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>;

// --- API Base URL ---
const API_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:5001';

// --- Helper Functions ---
const triggerDownload = (blob, filename) => {
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.style.display = 'none'; a.href = url; a.download = filename;
    document.body.appendChild(a); a.click();
    window.URL.revokeObjectURL(url); document.body.removeChild(a);
};

const handleFetchError = async (response) => {
    const contentType = response.headers.get("content-type");
    if (contentType && contentType.indexOf("application/json") !== -1) {
        const errData = await response.json();
        throw new Error(errData.error || `Request failed with status ${response.status}`);
    } else {
        const textData = await response.text();
        throw new Error(`Server returned a non-JSON error (Status: ${response.status}). Check backend logs.`);
    }
};

const downloadCSVTemplate = () => {
    const headers = ['Primary State', 'First Name', 'Last Name', 'Primary Practice Name', 'Email', 'BCRI Email:', 'Devtracker ID'];
    const csvContent = "data:text/csv;charset=utf-8," + headers.join(',');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "mail_merge_template.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};


// --- Main App Component ---
export default function App() {
    // Overall App State
    const [file, setFile] = useState(null);
    const [headers, setHeaders] = useState([]);
    const [selectedEmailColumn, setSelectedEmailColumn] = useState('');
    const [cleaningResult, setCleaningResult] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isDownloading, setIsDownloading] = useState(false);
    const [error, setError] = useState(null);
    const [currentStep, setCurrentStep] = useState(1);
    const [isTutorialOpen, setIsTutorialOpen] = useState(false);
    
    const fileInputRef = useRef(null);
    const resultsRef = useRef(null);

    const resetState = () => {
        setFile(null); setHeaders([]); setSelectedEmailColumn(''); setCleaningResult(null);
        setError(null); setCurrentStep(1); if(fileInputRef.current) fileInputRef.current.value = "";
    };

    // --- File Upload Logic ---
    const handleFileSelect = async (selectedFile) => {
        if (!selectedFile) return;
        resetState(); setFile(selectedFile); setIsLoading(true);
        const formData = new FormData(); formData.append('file', selectedFile);
        try {
            const response = await fetch(`${API_URL}/api/get_headers`, { method: 'POST', body: formData });
            if (!response.ok) await handleFetchError(response);
            const data = await response.json();
            setHeaders(data.headers); setSelectedEmailColumn(data.headers[0] || ''); setCurrentStep(1.5);
        } catch (err) { setError(err.message); setFile(null); } finally { setIsLoading(false); }
    };

    const handleAnalyzeFile = async () => {
        if (!file || !selectedEmailColumn) return;
        setIsLoading(true); setError(null);
        const formData = new FormData(); formData.append('file', file); formData.append('email_column', selectedEmailColumn);
        try {
            const response = await fetch(`${API_URL}/api/analyze_file`, { method: 'POST', body: formData });
            if (!response.ok) await handleFetchError(response);
            const data = await response.json();
            setCleaningResult(data); setCurrentStep(2);
            setTimeout(() => resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
        } catch (err) { setError(err.message); } finally { setIsLoading(false); }
    };

    const handleDownloadCleanedFile = async () => {
        if (!file || !selectedEmailColumn) return;
        setIsDownloading(true); setError(null);
        const formData = new FormData(); formData.append('file', file); formData.append('email_column', selectedEmailColumn);
        try {
            const response = await fetch(`${API_URL}/api/download_cleaned_file`, { method: 'POST', body: formData });
            if (!response.ok) await handleFetchError(response);
            const blob = await response.blob();
            triggerDownload(blob, `cleaned_${file.name.split('.')[0]}.csv`);
        } catch (err) { setError(err.message); } finally { setIsDownloading(false); }
    };

    return (
        <div className="min-h-screen w-full bg-gray-900 text-gray-200 font-sans antialiased relative overflow-hidden">
            {/* Background */}
            <div className="absolute inset-0 z-0">
                <div className="absolute inset-0 bg-gradient-to-br from-gray-900 via-slate-900 to-blue-900/50"></div>
                <div className="absolute top-0 left-0 h-96 w-96 bg-blue-500/30 rounded-full filter blur-3xl opacity-20 animate-blob"></div>
                <div className="absolute bottom-0 right-0 h-96 w-96 bg-purple-500/30 rounded-full filter blur-3xl opacity-20 animate-blob animation-delay-4000"></div>
            </div>

            <div className="relative z-10 container mx-auto max-w-4xl p-4 md:p-8">
                <header className="text-center mb-12">
                    <motion.h1 initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="text-4xl md:text-5xl font-extrabold text-white tracking-tight">Mail Merge Pro</motion.h1>
                    <motion.p initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.2 }} className="text-gray-400 mt-2">A smarter, guided workflow for your mail merge campaigns.</motion.p>
                </header>
                <motion.div className="space-y-12" layout>
                    <AnimatePresence>
                        <StepCard key="step1" step="1" title="Upload Your List">
                            <FileUploadZone isLoading={isLoading} onFileSelect={handleFileSelect} fileInputRef={fileInputRef} />
                            {file && (<motion.div initial={{opacity:0, height: 0}} animate={{opacity:1, height: 'auto'}}><FileDisplay file={file} onReset={resetState} /></motion.div>)}
                            {currentStep >= 1.5 && headers.length > 0 && (
                                <motion.div initial={{opacity:0, y: 10}} animate={{opacity:1, y: 0}}>
                                    <ColumnSelector headers={headers} selectedEmailColumn={selectedEmailColumn} setSelectedEmailColumn={setSelectedEmailColumn} />
                                    <PrimaryButton onClick={handleAnalyzeFile} isLoading={isLoading} text="Analyze My List" loadingText="Analyzing..." />
                                </motion.div>
                            )}
                            {error && <ErrorDisplay message={error} />}
                        </StepCard>

                        {currentStep >= 2 && cleaningResult && (
                            <motion.div key="step2" ref={resultsRef} initial={{opacity: 0, y: 20}} animate={{opacity: 1, y: 0}} transition={{delay: 0.2}}>
                                <StepCard step="2" title="Review Cleaning Results">
                                    <div className="grid grid-cols-3 gap-4 text-center">
                                        <Metric label="Original Rows" value={cleaningResult.metrics.original_rows} />
                                        <Metric label="Duplicates Removed" value={cleaningResult.metrics.removed_count} />
                                        <Metric label="Final Recipients" value={cleaningResult.metrics.final_rows} />
                                    </div>
                                    {cleaningResult.removed_duplicates.length > 0 && (
                                        <details className="mt-6"><summary className="cursor-pointer font-medium text-blue-400 hover:text-blue-300">View Removed Duplicates Report</summary><div className="mt-2 p-4 h-48 overflow-y-auto rounded-lg bg-gray-900/50 border border-gray-700 text-sm text-gray-400"><ul>{cleaningResult.removed_duplicates.map(email => <li key={email}>{email}</li>)}</ul></div></details>
                                    )}
                                    <PrimaryButton onClick={handleDownloadCleanedFile} isLoading={isDownloading} text="Download Cleaned List (.csv)" loadingText="Downloading..." icon={<DownloadIcon className="w-5 h-5 mr-2" />} className="bg-green-600 hover:bg-green-700 mt-6" />
                                </StepCard>
                            </motion.div>
                        )}
                        
                        {currentStep >= 2 && cleaningResult && (
                            <motion.div key="step3" initial={{opacity: 0, y: 20}} animate={{opacity: 1, y: 0}} transition={{delay: 0.4}}>
                                <StepCard step="3" title="Prepare Your Template"><TemplateManager headers={cleaningResult.headers} /></StepCard>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </motion.div>
                <footer className="text-center mt-12 text-gray-500 text-sm">
                    <p>Created by Tousif Ali</p>
                    <button onClick={() => setIsTutorialOpen(true)} className="mt-2 text-blue-400 hover:text-blue-300 underline">View Mail Merge Tutorial</button>
                </footer>
            </div>
            <AnimatePresence>
                {isTutorialOpen && <TutorialModal onClose={() => setIsTutorialOpen(false)} />}
            </AnimatePresence>
        </div>
    );
}

// --- UI Sub-Components ---
const StepCard = ({ step, title, children }) => (<motion.div layout="position" className="bg-slate-900/50 backdrop-blur-xl p-6 md:p-8 rounded-2xl border border-slate-800 shadow-2xl shadow-black/30"><div className="flex items-center gap-4 mb-6"><div className="flex-shrink-0 w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold shadow-lg shadow-blue-600/30">{step}</div><h2 className="text-2xl font-bold text-white">{title}</h2></div><div className="space-y-6">{children}</div></motion.div>);
const Metric = ({ label, value }) => (<div className="p-4 bg-gray-900/50 rounded-lg border border-gray-700"><div className="text-3xl font-bold text-white">{value}</div><div className="text-sm text-gray-400">{label}</div></div>);
const ErrorDisplay = ({ message }) => (<motion.div initial={{opacity:0}} animate={{opacity:1}} className="mt-4 p-4 text-center text-red-400 bg-red-900/50 border border-red-800 rounded-lg whitespace-pre-wrap">{message}</motion.div>);
const PrimaryButton = ({ onClick, isLoading, text, loadingText, icon = null, className = 'bg-blue-600 hover:bg-blue-700' }) => (
    <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={onClick} disabled={isLoading} className={`w-full mt-4 py-3 px-4 rounded-lg font-semibold text-white transition-all duration-200 flex items-center justify-center disabled:bg-gray-600 disabled:cursor-not-allowed ${className}`}>
        {isLoading ? <><LoadingSpinner /> {loadingText}</> : <>{icon}{text}</>}
    </motion.button>
);

const FileUploadZone = ({ isLoading, onFileSelect, fileInputRef }) => {
    const [isDragOver, setIsDragOver] = useState(false);
    return (
        <div className="space-y-4">
            <motion.div 
                className={`relative p-8 border-2 border-dashed rounded-xl text-center transition-colors duration-300 ${isDragOver ? 'border-blue-500 bg-blue-900/30' : 'border-gray-600 hover:border-blue-500'} ${isLoading ? 'cursor-wait' : 'cursor-pointer'}`}
                onDragEnter={() => setIsDragOver(true)} onDragLeave={() => setIsDragOver(false)} onDragOver={(e) => e.preventDefault()} onDrop={(e) => {e.preventDefault(); e.stopPropagation(); setIsDragOver(false); onFileSelect(e.dataTransfer.files[0]);}}
                onClick={() => !isLoading && fileInputRef.current.click()}
            >
                <div className="flex flex-col items-center justify-center text-gray-400"><UploadCloudIcon className="w-12 h-12 mb-4" /><p className="font-semibold"><span className="text-blue-400">Click to upload</span> or drag and drop</p><p className="text-sm">CSV or XLSX files supported</p></div>
                <input type="file" ref={fileInputRef} onChange={(e) => onFileSelect(e.target.files[0])} className="hidden" accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel" />
            </motion.div>
            <div className="text-center">
                <span className="text-gray-500 text-sm">Don't have a file?</span>
                <button onClick={downloadCSVTemplate} className="ml-2 text-blue-400 hover:text-blue-300 font-semibold text-sm underline">Download Template Spreadsheet</button>
            </div>
        </div>
    );
};

const FileDisplay = ({ file, onReset }) => (<div className="mt-4 p-4 rounded-lg bg-gray-800 border border-gray-700 flex items-center justify-between"><div className="flex items-center space-x-3"><FileIcon className="w-6 h-6 text-gray-400" /><span className="font-medium text-white">{file.name}</span></div><button onClick={onReset} className="text-sm text-red-400 hover:text-red-300">Start Over</button></div>);
const ColumnSelector = ({ headers, selectedEmailColumn, setSelectedEmailColumn }) => (<div><label className="block text-sm font-medium text-gray-400 mb-2">Select Email Column</label><select value={selectedEmailColumn} onChange={(e) => setSelectedEmailColumn(e.target.value)} className="w-full p-3 bg-gray-900 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500">{headers.map(h => <option key={h} value={h}>{h}</option>)}</select></div>);

// --- Template Manager and Modals ---
const TemplateManager = ({ headers }) => {
    const [templates, setTemplates] = useState([]);
    const [activeTemplate, setActiveTemplate] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isDownloading, setIsDownloading] = useState(false);
    const [error, setError] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [templateToEdit, setTemplateToEdit] = useState(null);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [templateToDelete, setTemplateToDelete] = useState(null);

    useEffect(() => { fetchTemplates(); }, []);

    const fetchTemplates = async () => {
        setIsLoading(true);
        try {
            const response = await fetch(`${API_URL}/api/templates`);
            if (!response.ok) await handleFetchError(response);
            const data = await response.json();
            setTemplates(data);
            if (data.length > 0) {
                const currentActiveId = activeTemplate ? activeTemplate.id : (templateToEdit ? templateToEdit.id : null);
                const currentActive = data.find(t => t.id === currentActiveId);
                setActiveTemplate(currentActive || data[0]);
            } else {
                setActiveTemplate(null);
            }
        } catch (err) { setError("Failed to load templates."); } finally { setIsLoading(false); }
    };
    
    const handleSaveTemplate = async (templateData) => {
        const isUpdating = !!templateData.id;
        const url = isUpdating ? `${API_URL}/api/templates/${templateData.id}` : `${API_URL}/api/templates`;
        const method = isUpdating ? 'PUT' : 'POST';
        try {
            const response = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(templateData) });
            if (!response.ok) await handleFetchError(response);
            const newOrUpdatedTemplate = await response.json();
            await fetchTemplates(); 
            setActiveTemplate(newOrUpdatedTemplate);
            setIsModalOpen(false); 
            setTemplateToEdit(null);
        } catch (err) { alert(err.message); }
    };
    
    const handleDeleteTemplate = async (id) => {
        if (!id) return;
        setTemplateToDelete(templates.find(t => t.id === id));
        setShowDeleteConfirm(true);
    };

    const confirmDelete = async () => {
        if (!templateToDelete) return;
        try {
            const response = await fetch(`${API_URL}/api/templates/${templateToDelete.id}`, { method: 'DELETE' });
            if (!response.ok) await handleFetchError(response);
            setActiveTemplate(null);
            await fetchTemplates();
        } catch (err) { alert(err.message); }
        finally {
            setShowDeleteConfirm(false);
            setTemplateToDelete(null);
        }
    }
    
    const handleDownloadWordDoc = async () => {
        if (!activeTemplate) return;
        setIsDownloading(true); setError(null);
        try {
            const response = await fetch(`${API_URL}/api/create_word_doc`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ body: activeTemplate.body }) });
            if (!response.ok) await handleFetchError(response);
            const blob = await response.blob();
            triggerDownload(blob, 'mail_merge_template.docx');
        } catch (err) { setError(err.message); } finally { setIsDownloading(false); }
    };

    if (isLoading) return <div className="text-center p-8"><LoadingSpinner /></div>;

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between gap-4">
                <select value={activeTemplate?.id || ''} onChange={(e) => setActiveTemplate(templates.find(t => t.id === parseInt(e.target.value)))} className="w-full p-3 bg-gray-900 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500">{templates.map(t => <option key={t.id} value={t.id}>{t.title}</option>)}</select>
                <div className="flex items-center space-x-2 flex-shrink-0"><motion.button whileHover={{scale:1.1}} whileTap={{scale:0.9}} onClick={() => { setTemplateToEdit(null); setIsModalOpen(true); }} className="p-2 bg-blue-600 rounded-lg hover:bg-blue-700"><PlusIcon /></motion.button><motion.button whileHover={{scale:1.1}} whileTap={{scale:0.9}} onClick={() => { if(activeTemplate) {setTemplateToEdit(activeTemplate); setIsModalOpen(true);} }} disabled={!activeTemplate} className="p-2 bg-gray-700 rounded-lg hover:bg-gray-600 disabled:bg-gray-800 disabled:cursor-not-allowed"><EditIcon /></motion.button><motion.button whileHover={{scale:1.1}} whileTap={{scale:0.9}} onClick={() => handleDeleteTemplate(activeTemplate?.id)} disabled={!activeTemplate} className="p-2 bg-red-800 rounded-lg hover:bg-red-700 disabled:bg-gray-800 disabled:cursor-not-allowed"><TrashIcon /></motion.button></div>
            </div>
            {activeTemplate ? (<div className="space-y-4"><div><label className="block text-sm font-medium text-gray-400 mb-2">Subject</label><div className="w-full p-3 bg-gray-900/50 border border-gray-700 rounded-lg">{activeTemplate.subject}</div></div><div><label className="block text-sm font-medium text-gray-400 mb-2">Body</label><div className="w-full p-3 h-48 overflow-y-auto bg-gray-900/50 border border-gray-700 rounded-lg font-mono text-sm whitespace-pre-wrap">{activeTemplate.body}</div></div></div>) : <div className="text-center text-gray-500 p-8">No template selected. Please create one.</div>}
            <PrimaryButton onClick={handleDownloadWordDoc} isLoading={isDownloading} text="Download as Word Document (.docx)" loadingText="Creating Document..." icon={<DownloadIcon className="w-5 h-5 mr-2" />} className="bg-green-600 hover:bg-green-700" disabled={!activeTemplate} />
            {error && <ErrorDisplay message={error} />}
            <AnimatePresence>{isModalOpen && (<TemplateModal headers={headers} templateToEdit={templateToEdit} onSave={handleSaveTemplate} onClose={() => setIsModalOpen(false)} />)}</AnimatePresence>
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
};

// *** REMOVED the "Insert Merge Field" section from this modal ***
const TemplateModal = ({ headers, templateToEdit, onSave, onClose }) => {
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

    return (<motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4"><motion.div initial={{scale:0.9, y:20}} animate={{scale:1, y:0}} exit={{scale:0.9, y:20}} className="bg-slate-800 rounded-xl p-8 w-full max-w-2xl border border-slate-700 max-h-full overflow-y-auto"><h3 className="text-xl font-bold mb-6">{templateToEdit ? 'Edit Template' : 'Create New Template'}</h3><form onSubmit={handleSubmit} className="space-y-4"><div><label className="block text-sm font-medium text-gray-400 mb-1">Title</label><input type="text" value={title} onChange={(e) => setTitle(e.target.value)} required className="w-full p-2 bg-gray-900 border border-gray-600 rounded-lg" /></div><div><label className="block text-sm font-medium text-gray-400 mb-1">Subject</label><input type="text" value={subject} onChange={(e) => setSubject(e.target.value)} required className="w-full p-2 bg-gray-900 border border-gray-600 rounded-lg" /></div><div><label className="block text-sm font-medium text-gray-400 mb-1">Body</label><textarea ref={bodyRef} value={body} onChange={(e) => setBody(e.target.value)} required rows="8" className="w-full p-2 bg-gray-900 border border-gray-600 rounded-lg font-mono text-sm" /></div><div className="flex justify-end gap-4 pt-4"><motion.button whileHover={{scale:1.05}} whileTap={{scale:0.95}} type="button" onClick={onClose} className="px-4 py-2 rounded-lg bg-gray-700 hover:bg-gray-600">Cancel</motion.button><motion.button whileHover={{scale:1.05}} whileTap={{scale:0.95}} type="submit" className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700">Save Template</motion.button></div></form></motion.div></motion.div>);
};

const TutorialModal = ({ onClose }) => {
    const steps = [
        { title: "Open Outlook (Classic)", description: "Open the classic desktop app version of Outlook.", imgPlaceholder: "step1_open_outlook.png" },
        { title: "Create Your Spreadsheet", description: "Create a new Excel file with your headings (e.g., 'First Name', 'BCRI Email:') and recipient rows. Save it as .xlsx or .csv.", imgPlaceholder: "step2_create_excel.png" },
        { title: "Clean Your List on This Website", description: "Use the 'List Cleaner' tab to upload your spreadsheet. Download the cleaned list it provides.", imgPlaceholder: "step3_use_website.png" },
        { title: "Open Microsoft Word", description: "Start with a blank document. Or, you can use the '.docx' file you downloaded from our 'Email Templates' tab.", imgPlaceholder: "step4_open_word.png" },
        { title: "Go to the 'Mailings' Tab", description: "In the top ribbon of Word, click on 'Mailings'.", imgPlaceholder: "step5_mailings_tab.png" },
        { title: "Select Your Recipient List", description: "Click 'Select Recipients' > 'Use an Existing List...'. Find and select the 'cleaned_...' file you downloaded from this website.", imgPlaceholder: "step6_select_list.png" },
        { title: "Write Email & Insert Fields", description: "Write your email. Click where you want personalized info (e.g., after 'Dear '), then click 'Insert Merge Field' and choose a column like 'First Name'.", imgPlaceholder: "step7_insert_fields.png" },
        { title: "Preview Your Emails (Optional)", description: "Click 'Preview Results' to see how your emails will look with real data. Use the arrows to cycle through and check for errors.", imgPlaceholder: "step8_preview.png" },
        { title: "Finish & Merge", description: "Click 'Finish & Merge' and select 'Send Email Messages...'.", imgPlaceholder: "step9_finish_merge.png" },
        { title: "Set Email Options and Send", description: "In the 'To:' dropdown, select the 'BCRI Email:' column. Type or paste your subject line and click OK. If you see the names changing in the preview, it's working!", imgPlaceholder: "step10_send.png" },
    ];

    return (
        <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
            <motion.div initial={{scale:0.9, y:20}} animate={{scale:1, y:0}} exit={{scale:0.9, y:20}} className="bg-slate-800 rounded-xl p-8 w-full max-w-3xl border border-slate-700 max-h-[90vh] flex flex-col">
                <div className="flex justify-between items-center mb-6 flex-shrink-0">
                    <h2 className="text-2xl font-bold text-white">Mail Merge Tutorial</h2>
                    <motion.button whileHover={{scale:1.1, rotate:90}} whileTap={{scale:0.9}} onClick={onClose} className="p-2 rounded-full hover:bg-gray-700"><XIcon className="w-6 h-6" /></motion.button>
                </div>
                <div className="overflow-y-auto pr-4 -mr-4 space-y-10">
                    {steps.map((step, index) => (
                        <div key={index} className="flex flex-col md:flex-row items-start gap-6">
                            <div className="flex-shrink-0 w-12 h-12 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold text-xl shadow-lg shadow-blue-600/30">{index + 1}</div>
                            <div className="flex-1">
                                <h3 className="font-bold text-lg text-white mb-1">{step.title}</h3>
                                <p className="text-gray-400 mb-4">{step.description}</p>
                                <div className="w-full h-48 bg-gray-900/50 border border-gray-700 rounded-lg flex items-center justify-center"><span className="text-gray-500 text-sm">Image: {step.imgPlaceholder}</span></div>
                            </div>
                        </div>
                    ))}
                </div>
            </motion.div>
        </motion.div>
    );
};

const ConfirmationModal = ({ title, message, onConfirm, onCancel }) => {
    return (
        <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
            <motion.div initial={{scale:0.9, y:20}} animate={{scale:1, y:0}} exit={{scale:0.9, y:20}} className="bg-slate-800 rounded-xl p-8 w-full max-w-md border border-slate-700">
                <h3 className="text-xl font-bold mb-4">{title}</h3>
                <p className="text-gray-400 mb-6">{message}</p>
                <div className="flex justify-end gap-4">
                    <motion.button whileHover={{scale:1.05}} whileTap={{scale:0.95}} onClick={onCancel} className="px-4 py-2 rounded-lg bg-gray-700 hover:bg-gray-600">Cancel</motion.button>
                    <motion.button whileHover={{scale:1.05}} whileTap={{scale:0.95}} onClick={onConfirm} className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700">Confirm</motion.button>
                </div>
            </motion.div>
        </motion.div>
    );
};
