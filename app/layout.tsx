import type { Metadata } from 'next';
import { AuthProvider } from '@/components/AuthProvider';
import './globals.css';

export const metadata: Metadata = {
  title: 'JotThis - AI Voice Notes',
  description: 'Transform voice notes into structured insights with AI',
  manifest: '/manifest.json',
  openGraph: {
    title: 'JotThis - AI Voice Notes',
    description: 'Transform voice notes into structured insights with AI',
    url: 'https://jotthis.app',
    siteName: 'JotThis',
    images: [
      {
        url: '/og-image.png', // Ensure this file exists or update path
        width: 1200,
        height: 630,
        alt: 'JotThis - AI Voice Notes',
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'JotThis - AI Voice Notes',
    description: 'Transform voice notes into structured insights with AI',
    images: ['/twitter-image.png'],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'JotThis',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" data-theme="jotthis">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
      </head>
      <body className="antialiased">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
