'use client';
import { motion } from 'framer-motion';
import Link from 'next/link';

export const LoadingSpinner = () => (
  <svg className="animate-spin h-5 w-5 text-current" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
  </svg>
);

export const PrimaryButton = ({ onClick, isLoading, text, loadingText, icon = null, className = 'bg-stamp hover:bg-stamp-dark', disabled = false }) => (
  <motion.button
    whileHover={disabled || isLoading ? undefined : { y: -2 }}
    whileTap={disabled || isLoading ? undefined : { scale: 0.97, y: 0 }}
    transition={{ type: 'spring', stiffness: 500, damping: 30 }}
    onClick={onClick}
    disabled={isLoading || disabled}
    className={`w-full mt-4 py-3 px-5 rounded-sm font-mono font-bold uppercase tracking-wider text-sm text-paper-raised transition-colors duration-200 flex items-center justify-center gap-2 disabled:bg-line disabled:text-ink-faint disabled:cursor-not-allowed ${className}`}
  >
    {isLoading ? <><LoadingSpinner /> {loadingText}</> : <>{icon}{text}</>}
  </motion.button>
);

export const ErrorDisplay = ({ message }) => (
  <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} className="mt-4 p-4 text-sm text-stamp-dark bg-stamp-light/40 border border-stamp-light rounded-sm whitespace-pre-wrap">
    {message}
  </motion.div>
);

export const Metric = ({ label, value }) => (
  <div className="p-4">
    <div className="text-3xl font-mono font-bold text-ink tabular-nums">{value}</div>
    <div className="text-xs uppercase tracking-[0.15em] text-ink-soft mt-1">{label}</div>
  </div>
);

// A small dashed "cancellation mark" ring — the recurring postal motif used
// for icons, tool badges and tutorial step numbers.
export const PostmarkBadge = ({ children, className = '' }) => (
  <span className={`postmark-ring inline-flex items-center justify-center text-stamp shrink-0 ${className}`}>
    {children}
  </span>
);

// Shared "form" panel used across the tool pages — a hairline-bordered
// paper card with a small manila-tab label instead of a shadowed slate box.
export const Panel = ({ label, children, className = '' }) => (
  <div className={`relative bg-paper-raised p-6 md:p-8 pt-8 rounded-sm border border-line ${className}`}>
    {label && (
      <span className="absolute -top-3 left-5 bg-paper-raised px-2 py-0.5 text-[10px] font-mono uppercase tracking-[0.2em] text-ink-soft border border-line rounded-sm">
        {label}
      </span>
    )}
    {children}
  </div>
);

export const ToolCard = ({ href, title, description, icon, rotate = 0 }) => (
  <Link href={href} className="block h-full">
    <motion.div
      initial={false}
      whileHover={{ rotate: 0, y: -4 }}
      whileTap={{ scale: 0.98 }}
      style={{ rotate }}
      transition={{ type: 'spring', stiffness: 260, damping: 20 }}
      className="bg-paper-raised p-6 rounded-sm border border-line hover:border-stamp transition-colors h-full"
    >
      <PostmarkBadge className="w-10 h-10 -rotate-6 mb-4">{icon}</PostmarkBadge>
      <h3 className="font-mono font-bold text-ink mb-2">{title}</h3>
      <p className="text-ink-soft text-sm leading-relaxed">{description}</p>
    </motion.div>
  </Link>
);
