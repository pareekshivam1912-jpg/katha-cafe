import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Katha Cafe — Dialogues • Chai • Stories | Pure Vegetarian Café, Jaipur',
  description:
    'Katha Cafe is a pure vegetarian café in Murlipura, Jaipur offering handcrafted chai, freshly brewed coffee, gourmet sandwiches, pizzas, and comforting food.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="scroll-smooth">
      <body className="min-h-screen flex flex-col bg-surface-ivory text-kathaText-primary selection:bg-brand-gold selection:text-white">
        {children}
      </body>
    </html>
  );
}
