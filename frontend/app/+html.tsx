import { ScrollViewStyleReset } from 'expo-router/html';

export default function Root({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no"
        />
        <meta name="theme-color" content="#00AA22" />
        <meta name="description" content="Suivi d'entraînement musculaire" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="HeavyTracker" />
        <link rel="manifest" href="/manifest.json" />
        <link rel="apple-touch-icon" href="/assets/icon.png" />
        <ScrollViewStyleReset />
      </head>
      <body>{children}</body>
    </html>
  );
}
