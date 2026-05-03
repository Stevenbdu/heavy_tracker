import { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Heavy Tracker',
    short_name: 'HeavyTracker',
    description: 'Ton tracker de musculation personnel',
    start_url: '/',
    display: 'standalone', // C'est CA qui force l'appli à s'ouvrir en plein écran sans l'interface Safari/Chrome
    background_color: '#000000', // Modifie avec la couleur de fond de ton app
    theme_color: '#000000',      // Couleur de la barre de statut en haut du téléphone
    icons: [
      {
        src: '/icons/icon-192x192.png',
        sizes: '192x192',
        type: 'image/png',
      },
      {
        src: '/icons/icon-512x512.png',
        sizes: '512x512',
        type: 'image/png',
      },
    ],
  };
}