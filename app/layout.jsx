import { Space_Mono, Libre_Franklin } from 'next/font/google';
import './globals.css';
import Nav from '@/components/Nav';
import Footer from '@/components/Footer';
import SessionTracker from '@/components/SessionTracker';
import MotionProvider from '@/components/MotionProvider';

const displayFont = Space_Mono({
  subsets: ['latin'],
  weight: ['400', '700'],
  variable: '--font-display',
  display: 'swap',
});

const bodyFont = Libre_Franklin({
  subsets: ['latin'],
  variable: '--font-body',
  display: 'swap',
});

export const metadata = {
  title: 'Mail Merge Pro',
  description: 'A smarter, guided workflow for your mail merge campaigns.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${displayFont.variable} ${bodyFont.variable}`}>
      <body className="min-h-screen w-full bg-paper text-ink font-sans antialiased relative overflow-x-hidden">
        <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-0 paper-texture paper-vignette" />
        <MotionProvider>
          <Nav />
          <SessionTracker />
          <div className="relative z-10 container mx-auto max-w-4xl p-4 md:p-8">
            {children}
          </div>
          <Footer />
        </MotionProvider>
      </body>
    </html>
  );
}
