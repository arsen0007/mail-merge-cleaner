'use client';
import { motion } from 'framer-motion';
import LiveStatsBanner from '@/components/LiveStatsBanner';
import { ToolCard } from '@/components/ui';
import { UploadCloudIcon, FileIcon, DownloadIcon } from '@/components/icons';

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.05 } },
};

const item = {
  hidden: { opacity: 0, y: 8 },
  show: { opacity: 1, y: 0, transition: { duration: 0.25, ease: 'easeOut' } },
};

export default function HomePage() {
  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-14">
      <motion.header variants={item} className="max-w-xl">
        <p className="font-mono text-xs uppercase tracking-[0.25em] text-stamp-dark mb-3">A guided workflow</p>
        <h1 className="text-4xl md:text-5xl font-bold text-ink tracking-tight leading-[1.05]">Mail Merge Pro</h1>
        <div className="rule-double mt-5 mb-5 max-w-xs" />
        <p className="text-ink-soft leading-relaxed">
          Clean a recipient list, prepare a template, and send it off — three
          small tools built for the letter-writing part of the job, not the
          spreadsheet wrangling.
        </p>
      </motion.header>

      <motion.div variants={item}>
        <LiveStatsBanner />
      </motion.div>

      <motion.div variants={item} className="grid gap-6 md:grid-cols-3">
        <ToolCard
          href="/clean"
          title="Email Cleaner"
          description="Upload a list, dedupe emails, download a clean CSV."
          icon={<UploadCloudIcon className="w-5 h-5" />}
          rotate={-1.2}
        />
        <ToolCard
          href="/templates"
          title="Template Builder"
          description="Manage your mail-merge email templates and export as Word docs."
          icon={<FileIcon className="w-5 h-5" />}
          rotate={0.6}
        />
        <ToolCard
          href="/tutorial"
          title="Tutorial"
          description="Step-by-step guide to running the mail merge in Outlook."
          icon={<DownloadIcon className="w-5 h-5" />}
          rotate={-0.6}
        />
      </motion.div>
    </motion.div>
  );
}
