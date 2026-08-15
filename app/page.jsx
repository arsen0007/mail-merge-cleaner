import LiveStatsBanner from '@/components/LiveStatsBanner';
import { ToolCard } from '@/components/ui';
import { UploadCloudIcon, FileIcon, DownloadIcon } from '@/components/icons';

export default function HomePage() {
  return (
    <div className="space-y-12">
      <header className="text-center">
        <h1 className="text-4xl md:text-5xl font-extrabold text-white tracking-tight">Mail Merge Pro</h1>
        <p className="text-gray-400 mt-2">A smarter, guided workflow for your mail merge campaigns.</p>
      </header>

      <LiveStatsBanner />

      <div className="grid gap-6 md:grid-cols-3">
        <ToolCard
          href="/clean"
          title="Email Cleaner"
          description="Upload a list, dedupe emails, download a clean CSV."
          icon={<UploadCloudIcon className="w-5 h-5" />}
        />
        <ToolCard
          href="/templates"
          title="Template Builder"
          description="Manage your mail-merge email templates and export as Word docs."
          icon={<FileIcon className="w-5 h-5" />}
        />
        <ToolCard
          href="/tutorial"
          title="Tutorial"
          description="Step-by-step guide to running the mail merge in Outlook."
          icon={<DownloadIcon className="w-5 h-5" />}
        />
      </div>
    </div>
  );
}
