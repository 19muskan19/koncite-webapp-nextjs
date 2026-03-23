'use client';

import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 dark:bg-slate-900 px-4">
      <h1 className="text-6xl font-black text-slate-900 dark:text-white">404</h1>
      <p className="mt-2 text-lg text-slate-600 dark:text-slate-400">Page not found</p>
      <Link
        href="/"
        className="mt-6 rounded-lg bg-[#C2D642] px-6 py-3 font-bold text-slate-900 hover:opacity-90 transition-opacity"
      >
        Go to Home
      </Link>
    </div>
  );
}
