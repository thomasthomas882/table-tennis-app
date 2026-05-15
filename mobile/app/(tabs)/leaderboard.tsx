import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView } from 'react-native';
import { socket } from '../../socket';

const SERVER_URL = 'http://192.168.68.179:3001';

export default function LeaderboardScreen() {
  const [players, setPlayers] = useState<any[]>([]);

  useEffect(() => {
    fetch(`${SERVER_URL}/api/leaderboard`)
      .then(res => res.json())
      .then(data => setPlayers(data.players || []))
      .catch(console.error);

    socket.on('leaderboard:updated', (newPlayers) => setPlayers(newPlayers));
    
    return () => {
      socket.off('leaderboard:updated');
    };
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text style={styles.title}>Global Rankings</Text>
        </View>

        <View style={styles.card}>
          {players.map((player, i) => (
            <View key={player.id} style={styles.row}>
              <Text style={styles.rankText}>#{i + 1}</Text>
              <Text style={styles.nameText} numberOfLines={1}>{player.name}</Text>
              <View style={styles.eloBadge}>
                <Text style={styles.eloText}>{player.elo}</Text>
              </View>
            </View>
          ))}
          {players.length === 0 && (
            <Text style={styles.emptyText}>No players ranked yet.</Text>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a1628' },
  scrollContent: { padding: 20, paddingTop: 40, gap: 15 },
  header: { marginBottom: 10 },
  title: { fontSize: 32, fontWeight: 'bold', color: '#ffffff' },
  card: { backgroundColor: '#1e293b', borderRadius: 16, padding: 15, borderWidth: 1, borderColor: '#334155' },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: '#334155' },
  rankText: { color: '#94a3b8', fontSize: 16, fontWeight: 'bold', width: 45 },
  nameText: { color: '#ffffff', fontSize: 18, fontWeight: '600', flex: 1, marginRight: 10 },
  eloBadge: { backgroundColor: '#22c55e20', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12, borderWidth: 1, borderColor: '#22c55e50' },
  eloText: { color: '#22c55e', fontSize: 16, fontWeight: '900' },
  emptyText: { color: '#64748b', fontStyle: 'italic', textAlign: 'center', padding: 20 }
});
