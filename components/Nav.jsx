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
      <div className="container mx-auto max-w-4xl px-4 md:px-8 py-3 flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
        <Link href="/" className="flex items-center text-ink group shrink-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/images/logo.png"
            alt="Mail Merge Pro"
            className="h-14 sm:h-20 md:h-24 w-auto"
          />
        </Link>
        <div className="flex items-center gap-0.5 sm:gap-1 text-xs sm:text-sm md:text-base overflow-x-auto">
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
