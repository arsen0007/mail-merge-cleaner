'use client';
import { motion } from 'framer-motion';
import Link from 'next/link';

export const LoadingSpinner = () => (
  <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
  </svg>
);

export const PrimaryButton = ({ onClick, isLoading, text, loadingText, icon = null, className = 'bg-blue-600 hover:bg-blue-700', disabled = false }) => (
  <motion.button
    whileHover={{ scale: 1.02 }}
    whileTap={{ scale: 0.98 }}
    onClick={onClick}
    disabled={isLoading || disabled}
    className={`w-full mt-4 py-3 px-4 rounded-lg font-semibold text-white transition-all duration-200 flex items-center justify-center disabled:bg-gray-600 disabled:cursor-not-allowed ${className}`}
  >
    {isLoading ? <><LoadingSpinner /> {loadingText}</> : <>{icon}{text}</>}
  </motion.button>
);

export const ErrorDisplay = ({ message }) => (
  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-4 p-4 text-center text-red-400 bg-red-900/50 border border-red-800 rounded-lg whitespace-pre-wrap">
    {message}
  </motion.div>
);

export const Metric = ({ label, value }) => (
  <div className="p-4 bg-gray-900/50 rounded-lg border border-gray-700">
    <div className="text-3xl font-bold text-white">{value}</div>
    <div className="text-sm text-gray-400">{label}</div>
  </div>
);

export const ToolCard = ({ href, title, description, icon }) => (
  <Link href={href} className="block h-full">
    <motion.div
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      className="bg-slate-900/50 backdrop-blur-xl p-6 rounded-2xl border border-slate-800 shadow-2xl shadow-black/30 hover:border-blue-500 transition-colors h-full"
    >
      <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white mb-4">{icon}</div>
      <h3 className="text-xl font-bold text-white mb-2">{title}</h3>
      <p className="text-gray-400 text-sm">{description}</p>
    </motion.div>
  </Link>
);
