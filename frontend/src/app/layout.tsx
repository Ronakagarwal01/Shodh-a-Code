import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Shodh-a-Code | AI-Powered Coding Contest & Investigation Platform',
  description: 'Evidence-grounded competitive programming platform with isolated Docker code execution, multi-hop GraphRAG curriculum reasoning, and zero-hallucination AI diagnosis.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-warm-50/40 text-stone-900 antialiased selection:bg-lavender-100 selection:text-lavender-900">
        {children}
      </body>
    </html>
  );
}
