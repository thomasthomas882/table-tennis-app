import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, ScrollView, Alert } from 'react-native';
import { socket } from '../../socket';

const SERVER_URL = 'http://192.168.68.179:3001';

export default function MatchesScreen() {
  const [activeMatches, setActiveMatches] = useState<any[]>([]);

  useEffect(() => {
    // Initial fetch
    fetch(`${SERVER_URL}/api/matches?status=in_progress`)
      .then(res => res.json())
      .then(setActiveMatches)
      .catch(console.error);

    socket.on('match:started', (match) => {
      setActiveMatches(prev => [match, ...prev]);
    });
    
    socket.on('match:scoreUpdated', (updatedMatch) => {
      setActiveMatches(prev => prev.map(m => m.id === updatedMatch.id ? updatedMatch : m));
    });

    socket.on('match:completed', (completedMatch) => {
      setActiveMatches(prev => prev.filter(m => m.id !== completedMatch.id));
    });

    return () => {
      socket.off('match:started');
      socket.off('match:scoreUpdated');
      socket.off('match:completed');
    };
  }, []);

  const handleUpdateScore = async (matchId: number, team1Delta: number, team2Delta: number) => {
    const match = activeMatches.find(m => m.id === matchId);
    if (!match) return;
    
    const newTeam1 = Math.max(0, match.player1_score + team1Delta);
    const newTeam2 = Math.max(0, match.player2_score + team2Delta);
    
    try {
      await fetch(`${SERVER_URL}/api/matches/${matchId}/score`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ score_team1: newTeam1, score_team2: newTeam2 })
      });
    } catch (e) {
      console.error(e);
    }
  };

  const handleCompleteMatch = async (matchId: number) => {
    const match = activeMatches.find(m => m.id === matchId);
    if (!match) return;
    
    let winnerId = null;
    if (match.player1_score > match.player2_score) winnerId = match.player1_id;
    else if (match.player2_score > match.player1_score) winnerId = match.player2_id;
    else {
      Alert.alert('Tie Game', 'Matches cannot end in a tie right now!');
      return;
    }

    try {
      await fetch(`${SERVER_URL}/api/matches/${matchId}/complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ winner_id: winnerId })
      });
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text style={styles.title}>Scoreboard</Text>
        </View>

        {activeMatches.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>🏓</Text>
            <Text style={styles.emptyText}>No active matches right now.</Text>
          </View>
        ) : (
          activeMatches.map((match) => {
             const t1Name = match.player3_id ? `${match.player1_name} & ${match.player3_name}` : match.player1_name;
             const t2Name = match.player4_id ? `${match.player2_name} & ${match.player4_name}` : match.player2_name;
             
             return (
              <View key={match.id} style={styles.card}>
                <Text style={styles.tableText}>{match.table_name || `Table ${match.table_id}`}</Text>
                
                <View style={styles.scoreRow}>
                  {/* Team 1 */}
                  <View style={styles.teamContainer}>
                    <Text style={styles.teamName} numberOfLines={1}>{t1Name}</Text>
                    <Text style={styles.scoreText}>{match.player1_score}</Text>
                    <View style={styles.buttonRow}>
                      <TouchableOpacity style={styles.scoreBtn} onPress={() => handleUpdateScore(match.id, -1, 0)}>
                        <Text style={styles.scoreBtnText}>-</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={[styles.scoreBtn, styles.scoreBtnAdd]} onPress={() => handleUpdateScore(match.id, 1, 0)}>
                        <Text style={styles.scoreBtnText}>+</Text>
                      </TouchableOpacity>
                    </View>
                  </View>

                  <Text style={styles.vsText}>VS</Text>

                  {/* Team 2 */}
                  <View style={styles.teamContainer}>
                    <Text style={styles.teamName} numberOfLines={1}>{t2Name}</Text>
                    <Text style={styles.scoreText}>{match.player2_score}</Text>
                    <View style={styles.buttonRow}>
                      <TouchableOpacity style={styles.scoreBtn} onPress={() => handleUpdateScore(match.id, 0, -1)}>
                        <Text style={styles.scoreBtnText}>-</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={[styles.scoreBtn, styles.scoreBtnAdd]} onPress={() => handleUpdateScore(match.id, 0, 1)}>
                        <Text style={styles.scoreBtnText}>+</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>

                <TouchableOpacity style={styles.endMatchBtn} onPress={() => handleCompleteMatch(match.id)}>
                  <Text style={styles.endMatchBtnText}>END MATCH</Text>
                </TouchableOpacity>
              </View>
            );
          })
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a1628' },
  scrollContent: { padding: 20, paddingTop: 40, gap: 15 },
  header: { marginBottom: 10 },
  title: { fontSize: 32, fontWeight: 'bold', color: '#ffffff' },
  emptyState: { alignItems: 'center', marginTop: 50 },
  emptyIcon: { fontSize: 48, marginBottom: 10 },
  emptyText: { color: '#64748b', fontSize: 16 },
  card: { backgroundColor: '#1e293b', borderRadius: 16, padding: 20, borderWidth: 1, borderColor: '#334155' },
  tableText: { color: '#94a3b8', fontSize: 14, fontWeight: 'bold', textTransform: 'uppercase', marginBottom: 15, textAlign: 'center' },
  scoreRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  teamContainer: { flex: 1, alignItems: 'center' },
  teamName: { color: '#ffffff', fontSize: 16, fontWeight: '600', marginBottom: 10 },
  scoreText: { color: '#22c55e', fontSize: 64, fontWeight: '900', marginBottom: 10 },
  vsText: { color: '#64748b', fontSize: 20, fontWeight: 'bold', marginHorizontal: 10 },
  buttonRow: { flexDirection: 'row', gap: 10 },
  scoreBtn: { backgroundColor: '#334155', width: 45, height: 45, borderRadius: 22.5, justifyContent: 'center', alignItems: 'center' },
  scoreBtnAdd: { backgroundColor: '#3b82f6' },
  scoreBtnText: { color: '#ffffff', fontSize: 24, fontWeight: 'bold' },
  endMatchBtn: { backgroundColor: '#ef4444', marginTop: 20, padding: 15, borderRadius: 10, alignItems: 'center' },
  endMatchBtnText: { color: '#ffffff', fontSize: 16, fontWeight: 'bold', letterSpacing: 1 }
});
