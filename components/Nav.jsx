'use client';
import Link from 'next/link';

export default function Nav() {
  return (
    <nav className="relative z-10 bg-slate-900/70 backdrop-blur border-b border-slate-800">
      <div className="container mx-auto max-w-4xl px-4 md:px-8 py-4 flex items-center justify-between">
        <Link href="/" className="text-white font-bold text-lg">Mail Merge Pro</Link>
        <div className="flex items-center gap-6 text-sm">
          <Link href="/clean" className="text-gray-300 hover:text-white transition-colors">Email Cleaner</Link>
          <Link href="/templates" className="text-gray-300 hover:text-white transition-colors">Templates</Link>
          <Link href="/tutorial" className="text-gray-300 hover:text-white transition-colors">Tutorial</Link>
        </div>
      </div>
    </nav>
  );
}
