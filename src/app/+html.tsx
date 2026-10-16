import { ScrollViewStyleReset } from 'expo-router/html';
import type { PropsWithChildren } from 'react';

// Static document metadata only. No service worker or offline response cache.
export default function Html({ children }: PropsWithChildren) {
  return <html lang="en"><head>
    <meta charSet="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
    <link rel="manifest" href="/manifest.webmanifest" />
    <meta name="theme-color" content="#E35B3F" />
    <link rel="apple-touch-icon" href="/icons/apple-touch-icon.png" />
    <meta name="apple-mobile-web-app-capable" content="yes" />
    <meta name="apple-mobile-web-app-title" content="BStore" />
    <ScrollViewStyleReset />
    <style>{`body{background:#F7F3EC} :focus-visible{outline:2px solid #E35B3F;outline-offset:2px} input,textarea{min-width:0;max-width:100%}`}</style>
  </head><body>{children}</body></html>;
}
