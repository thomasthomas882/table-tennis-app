import { useState, useEffect } from 'react';
import { StyleSheet, View, Text, ScrollView, SafeAreaView, ActivityIndicator } from 'react-native';
import { useApp } from './_layout';

const SERVER_URL = 'http://192.168.68.179:3001';

export default function ProfileScreen() {
  const { activePlayerId } = useApp();
  const [statsData, setStatsData] = useState<any>(null);
  const [achievements, setAchievements] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!activePlayerId) return;

    let isMounted = true;
    setLoading(true);

    const fetchData = async () => {
      try {
        const [statsRes, achievementsRes] = await Promise.all([
          fetch(`${SERVER_URL}/api/players/${activePlayerId}/stats`),
          fetch(`${SERVER_URL}/api/players/${activePlayerId}/achievements`)
        ]);

        if (!statsRes.ok || !achievementsRes.ok) throw new Error('Failed to fetch profile data');

        const stats = await statsRes.json();
        const achs = await achievementsRes.json();

        if (isMounted) {
          setStatsData(stats);
          setAchievements(achs);
          setLoading(false);
        }
      } catch (e) {
        console.error(e);
        if (isMounted) setLoading(false);
      }
    };

    fetchData();

    return () => {
      isMounted = false;
    };
  }, [activePlayerId]);

  if (!activePlayerId) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.emptyState}>
          <Text style={styles.emptyIcon}>👤</Text>
          <Text style={styles.emptyTitle}>No Profile Selected</Text>
          <Text style={styles.emptyText}>Go to the Join tab and select or create a player profile to view your stats!</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (loading || !statsData) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.emptyState}>
          <ActivityIndicator size="large" color="#22c55e" />
          <Text style={styles.loadingText}>Loading Profile...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const { player, recentMatches } = statsData;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text style={styles.title}>{player.name}'s Profile</Text>
        </View>

        {/* ELO Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Current Rating</Text>
          <Text style={styles.eloText}>{player.elo} <Text style={styles.eloSubtext}>ELO</Text></Text>
        </View>

        {/* Stats Row */}
        <View style={styles.statsRow}>
          <View style={[styles.card, styles.statCard]}>
            <Text style={styles.cardTitle}>Wins</Text>
            <Text style={styles.statValue}>{player.wins}</Text>
          </View>
          <View style={[styles.card, styles.statCard]}>
            <Text style={styles.cardTitle}>Losses</Text>
            <Text style={styles.statValue}>{player.losses}</Text>
          </View>
        </View>

        {/* Recent Matches */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Recent Matches</Text>
          {recentMatches && recentMatches.length > 0 ? (
            recentMatches.slice(0, 5).map((match: any, i: number) => {
              const onTeam1 = match.player1_id === player.id || match.player3_id === player.id;
              const team1Won = match.winner_id === match.player1_id;
              const isWin = (onTeam1 && team1Won) || (!onTeam1 && !team1Won);
              const opponentNames = onTeam1 
                ? [match.player2_name, match.player4_name].filter(Boolean).join(' & ')
                : [match.player1_name, match.player3_name].filter(Boolean).join(' & ');

              return (
                <View key={match.id} style={styles.matchItem}>
                  <Text style={styles.matchOpponent} numberOfLines={1}>vs. {opponentNames}</Text>
                  <Text style={isWin ? styles.matchWin : styles.matchLoss}>
                    {isWin ? 'W' : 'L'} {match.score_team1}-{match.score_team2}
                  </Text>
                </View>
              );
            })
          ) : (
            <Text style={styles.emptyText}>No recent matches played.</Text>
          )}
        </View>

        {/* Achievements */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Recent Achievements</Text>
          <View style={styles.achievementRow}>
            {achievements && achievements.length > 0 ? (
              achievements.slice(0, 4).map((ach) => (
                <View key={ach.id} style={styles.achievementBadge}>
                  <Text style={styles.achievementIcon}>{ach.icon}</Text>
                </View>
              ))
            ) : (
              <Text style={styles.emptyText}>No achievements unlocked yet.</Text>
            )}
          </View>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a1628',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 10,
    textAlign: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#94a3b8',
    textAlign: 'center',
    lineHeight: 24,
  },
  loadingText: {
    color: '#22c55e',
    marginTop: 20,
    fontSize: 18,
    fontWeight: 'bold',
  },
  scrollContent: {
    padding: 20,
    paddingTop: 40,
    gap: 15,
  },
  header: {
    marginBottom: 10,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  card: {
    backgroundColor: '#1e293b',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#334155',
  },
  cardTitle: {
    fontSize: 14,
    color: '#94a3b8',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 10,
    fontWeight: '600',
  },
  eloText: {
    fontSize: 48,
    fontWeight: '900',
    color: '#22c55e',
  },
  eloSubtext: {
    fontSize: 20,
    color: '#64748b',
    fontWeight: '600',
  },
  statsRow: {
    flexDirection: 'row',
    gap: 15,
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  matchItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  matchOpponent: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '500',
    flex: 1,
    marginRight: 10,
  },
  matchWin: {
    color: '#22c55e',
    fontWeight: 'bold',
    fontSize: 16,
  },
  matchLoss: {
    color: '#ef4444',
    fontWeight: 'bold',
    fontSize: 16,
  },
  achievementRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 15,
    marginTop: 5,
  },
  achievementBadge: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#0f172a',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#334155',
  },
  achievementIcon: {
    fontSize: 28,
  }
});
