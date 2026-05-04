import { StatusBar } from 'expo-status-bar';
import { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ActivityIndicator } from 'react-native';

export default function App() {
  const [dbStatus, setDbStatus] = useState("Vérification de la base de données...");
  const [loading, setLoading] = useState(true);

  // Le useEffect s'exécute automatiquement au lancement de l'application
  useEffect(() => {
    checkDatabase();
  }, []);

  const checkDatabase = async () => {
    try {
      const response = await fetch(`${process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000'}/api/hello`);
      const data = await response.json();
      setDbStatus(data.message);
    } catch (error) {
      setDbStatus("❌ Impossible de joindre le serveur");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* En-tête de l'application */}
      <View style={styles.header}>
        <Text style={styles.logoTitle}>MUSCLE <Text style={styles.logoAccent}>TRACK</Text></Text>
        {/* Placeholder pour la future icône de profil */}
        <View style={styles.profileIcon} />
      </View>

      {/* Carte d'action principale */}
      <View style={styles.mainCard}>
        <Text style={styles.cardSubtitle}>PROGRAMME ACTUEL :</Text>
        <Text style={styles.cardTitle}>FORCE ÉLITE</Text>
        
        <TouchableOpacity style={styles.primaryButton} activeOpacity={0.8}>
          <Text style={styles.primaryButtonText}>DÉMARRER SÉANCE 1: HAUT DU CORPS</Text>
        </TouchableOpacity>
        
        <Text style={styles.cardFooter}>Suivre la séance d'aujourd'hui</Text>
      </View>

      {/* Section Statut Technique (discrète en bas) */}
      <View style={styles.statusSection}>
        {loading ? (
          <ActivityIndicator size="small" color="#007BFF" />
        ) : (
          <Text style={styles.statusText}>{dbStatus}</Text>
        )}
      </View>

      <StatusBar style="light" />
    </View>
  );
}

// --- LE DESIGN SYSTEM (Dark Mode) ---
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0a', // Noir très profond
    paddingTop: 60, // Pour éviter l'encoche de l'iPhone
    paddingHorizontal: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 40,
  },
  logoTitle: {
    color: '#ffffff',
    fontSize: 24,
    fontWeight: '900',
    letterSpacing: 1,
  },
  logoAccent: {
    color: '#007BFF', // Bleu électrique
  },
  profileIcon: {
    width: 40,
    height: 40,
    backgroundColor: '#1e1e1e',
    borderRadius: 20,
  },
  mainCard: {
    backgroundColor: '#141414',
    borderRadius: 20,
    padding: 25,
    borderWidth: 1,
    borderColor: '#222',
  },
  cardSubtitle: {
    color: '#888',
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 5,
    textAlign: 'center',
  },
  cardTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 25,
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  primaryButton: {
    backgroundColor: '#007BFF',
    paddingVertical: 18,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#007BFF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: 'bold',
  },
  cardFooter: {
    color: '#666',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 15,
  },
  statusSection: {
    marginTop: 'auto', // Pousse cette section tout en bas de l'écran
    marginBottom: 30,
    alignItems: 'center',
  },
  statusText: {
    color: '#4da6ff',
    fontSize: 12,
    textAlign: 'center',
    opacity: 0.7,
  }
});