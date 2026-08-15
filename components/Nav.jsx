'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const links = [
  { href: '/clean', label: 'Email Cleaner' },
  { href: '/templates', label: 'Templates' },
  { href: '/tutorial', label: 'Tutorial' },
];

export default function Nav() {
  const pathname = usePathname();

  return (
    <nav className="relative z-10 bg-paper-raised/90 backdrop-blur border-b border-line">
      <div className="container mx-auto max-w-4xl px-4 md:px-8 py-4 flex items-center justify-between gap-3">
        <Link href="/" className="flex items-center gap-2 sm:gap-2.5 text-ink group shrink-0">
          <span className="postmark-ring w-6 h-6 sm:w-7 sm:h-7 shrink-0 flex items-center justify-center text-stamp -rotate-6 transition-transform group-hover:rotate-0">
            <span className="w-3 h-3 sm:w-3.5 sm:h-3.5 rounded-full border border-current" />
          </span>
          <span className="font-mono font-bold tracking-tight text-sm sm:text-base whitespace-nowrap">
            <span className="hidden sm:inline">Mail Merge Pro</span>
            <span className="sm:hidden">MMP</span>
          </span>
        </Link>
        <div className="flex items-center gap-0.5 sm:gap-1 text-xs sm:text-sm overflow-x-auto">
          {links.map(({ href, label }) => {
            const active = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? 'page' : undefined}
                className={`relative px-2 sm:px-3 py-1.5 rounded-full transition-colors whitespace-nowrap ${
                  active
                    ? 'text-stamp-dark font-semibold'
                    : 'text-ink-soft hover:text-ink'
                }`}
              >
                {label}
                {active && (
                  <span className="absolute left-2 right-2 sm:left-3 sm:right-3 -bottom-[1px] h-px bg-stamp" />
                )}
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
