import './globals.css';
import Nav from '@/components/Nav';
import SessionTracker from '@/components/SessionTracker';

export const metadata = {
  title: 'Mail Merge Pro',
  description: 'A smarter, guided workflow for your mail merge campaigns.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="min-h-screen w-full bg-gray-900 text-gray-200 font-sans antialiased relative overflow-x-hidden">
        <div className="absolute inset-0 z-0">
          <div className="absolute inset-0 bg-gradient-to-br from-gray-900 via-slate-900 to-blue-900/50"></div>
          <div className="absolute top-0 left-0 h-96 w-96 bg-blue-500/30 rounded-full filter blur-3xl opacity-20 animate-blob"></div>
          <div className="absolute bottom-0 right-0 h-96 w-96 bg-purple-500/30 rounded-full filter blur-3xl opacity-20 animate-blob animation-delay-4000"></div>
        </div>
        <Nav />
        <SessionTracker />
        <div className="relative z-10 container mx-auto max-w-4xl p-4 md:p-8">
          {children}
        </div>
      </body>
    </html>
  );
}
