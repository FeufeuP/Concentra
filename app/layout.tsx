import type {Metadata} from 'next';
import './globals.css'; // Global styles

export const metadata: Metadata = {
  title: 'Consentra - Gestão de SST',
  description: 'Sistema integrado de emissão de orçamentos, pipeline comercial e gestão regulatória de Saúde e Segurança do Trabalho (SST).',
  icons: {
    icon: [
      { url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
      { url: '/favicon-192.png', sizes: '192x192', type: 'image/png' },
    ],
    shortcut: '/favicon-32x32.png',
    apple: '/favicon-192.png',
  },
  openGraph: {
    title: 'Consentra - Gestão de SST',
    description: 'Sistema integrado de emissão de orçamentos, pipeline comercial e gestão regulatória de Saúde e Segurança do Trabalho (SST).',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Consentra - Gestão de SST',
    description: 'Sistema integrado de emissão de orçamentos, pipeline comercial e gestão regulatória de Saúde e Segurança do Trabalho (SST).',
  },
};

export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html lang="pt-BR">
      <head>
        <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png" />
        <link rel="icon" type="image/png" sizes="192x192" href="/favicon-192.png" />
        <link rel="apple-touch-icon" sizes="192x192" href="/favicon-192.png" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600;700&family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&display=swap"
          rel="stylesheet"
        />
      </head>
      <body suppressHydrationWarning className="bg-[#f8f9ff] text-[#0b1c30] antialiased">
        {children}
      </body>
    </html>
  );
}
