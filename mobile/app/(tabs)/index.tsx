import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, Dimensions, Alert, ScrollView, Modal, TextInput } from 'react-native';
import { socket } from '../../socket';
import { useApp } from './_layout';

const { width } = Dimensions.get('window');
const SERVER_URL = 'http://192.168.68.179:3001';

export default function JoinRoomScreen() {
  const [pin, setPin] = useState('');
  const [hasJoined, setHasJoined] = useState(false);
  const [queue, setQueue] = useState<any[]>([]);
  const [activeMatches, setActiveMatches] = useState<any[]>([]);
  const [players, setPlayers] = useState<any[]>([]);
  const [showPlayerModal, setShowPlayerModal] = useState(false);
  const [newPlayerName, setNewPlayerName] = useState('');
  const { setActivePlayerId } = useApp();
  const PIN_LENGTH = 6;

  useEffect(() => {
    // Fetch initial state to avoid missing socket 'init' events
    fetch(`${SERVER_URL}/api/players`)
      .then(res => res.json())
      .then(setPlayers)
      .catch(console.error);

    fetch(`${SERVER_URL}/api/queue`)
      .then(res => res.json())
      .then(setQueue)
      .catch(console.error);

    fetch(`${SERVER_URL}/api/matches?status=in_progress`)
      .then(res => res.json())
      .then(setActiveMatches)
      .catch(console.error);

    // Listen for real-time updates from the server
    socket.on('init', (data) => {
      if (data.players) setPlayers(data.players);
      if (data.queue) setQueue(data.queue);
      if (data.matches) setActiveMatches(data.matches);
    });
    socket.on('players:updated', setPlayers);
    socket.on('queue:updated', setQueue);
    socket.on('match:started', (match) => setActiveMatches(prev => [match, ...prev]));
    socket.on('match:completed', (completedMatch) => {
      setActiveMatches(prev => prev.filter(m => m.id !== completedMatch.id));
    });

    return () => {
      socket.off('init');
      socket.off('players:updated');
      socket.off('queue:updated');
      socket.off('match:started');
      socket.off('match:completed');
    };
  }, []);

  const handlePress = (num: string) => {
    if (pin.length < PIN_LENGTH) {
      setPin(prev => prev + num);
    }
  };

  const handleDelete = () => {
    setPin(prev => prev.slice(0, -1));
  };

  const handleJoin = () => {
    if (pin.length === PIN_LENGTH) {
      socket.emit('join_room', pin, (response: any) => {
        if (response?.success) {
          setHasJoined(true);
        } else {
          Alert.alert("Error", response?.message || "Failed to join room");
          setPin('');
        }
      });
    }
  };

  const handleJoinQueue = async (playerId: number) => {
    try {
      const res = await fetch(`${SERVER_URL}/api/queue`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ player_id: playerId })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to join queue');
      
      setActivePlayerId(playerId);
      setShowPlayerModal(false);
      Alert.alert("Success", "You've been added to the queue!");
    } catch (e: any) {
      Alert.alert("Error", e.message);
    }
  };

  const handleLeaveQueue = async () => {
    if (!activePlayerId) return;
    try {
      const res = await fetch(`${SERVER_URL}/api/queue/${activePlayerId}`, {
        method: 'DELETE'
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to leave queue');
      
      Alert.alert("Success", "You've left the queue.");
    } catch (e: any) {
      Alert.alert("Error", e.message);
    }
  };

  const handleCreateAndJoin = async () => {
    if (!newPlayerName.trim()) return;
    try {
      const res = await fetch(`${SERVER_URL}/api/players`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newPlayerName.trim() })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create player');
      
      setNewPlayerName('');
      handleJoinQueue(data.id);
    } catch (e: any) {
      Alert.alert("Error", e.message);
    }
  };

  if (hasJoined) {
    return (
      <SafeAreaView style={styles.container}>
        <ScrollView contentContainerStyle={{ padding: 20, paddingTop: 40, gap: 20 }}>
          <View style={styles.header}>
            <Text style={styles.title}>PING<Text style={styles.titleHighlight}>TRACK</Text></Text>
            <Text style={[styles.subtitle, { color: '#22c55e', fontWeight: 'bold' }]}>Connected to Club</Text>
          </View>

          <View style={styles.dashboardCard}>
            <Text style={styles.cardHeader}>Active Matches</Text>
            {activeMatches.length === 0 ? (
              <Text style={styles.emptyText}>No matches currently being played.</Text>
            ) : (
              activeMatches.map((match, i) => (
                <View key={i} style={styles.listItem}>
                  <Text style={styles.listText}>Table {match.table_id || i+1}</Text>
                  <Text style={styles.listTextAccent}>In Progress</Text>
                </View>
              ))
            )}
          </View>

          <View style={styles.dashboardCard}>
            <Text style={styles.cardHeader}>The Queue</Text>
            {queue.length === 0 ? (
              <Text style={styles.emptyText}>The queue is empty.</Text>
            ) : (
              queue.map((entry, i) => (
                <View key={i} style={styles.listItem}>
                  <Text style={styles.listText}>{i + 1}. {entry.name}</Text>
                </View>
              ))
            )}
          </View>

          {queue.some(q => q.player_id === activePlayerId) ? (
            <TouchableOpacity style={[styles.primaryButton, { backgroundColor: '#ef4444' }]} onPress={handleLeaveQueue}>
              <Text style={[styles.primaryButtonText, { color: '#ffffff' }]}>LEAVE QUEUE</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={styles.primaryButton} onPress={() => setShowPlayerModal(true)}>
              <Text style={styles.primaryButtonText}>JOIN QUEUE</Text>
            </TouchableOpacity>
          )}
        </ScrollView>

        {/* Player Selection Modal */}
        <Modal visible={showPlayerModal} animationType="slide" transparent={true}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Who are you?</Text>
                <TouchableOpacity onPress={() => setShowPlayerModal(false)}>
                  <Text style={styles.closeButton}>✕</Text>
                </TouchableOpacity>
              </View>

              {/* Create New Player */}
              <View style={styles.createPlayerContainer}>
                <TextInput
                  style={styles.input}
                  placeholder="Enter new player name..."
                  placeholderTextColor="#64748b"
                  value={newPlayerName}
                  onChangeText={setNewPlayerName}
                />
                <TouchableOpacity style={styles.createButton} onPress={handleCreateAndJoin}>
                  <Text style={styles.createButtonText}>Create & Join</Text>
                </TouchableOpacity>
              </View>

              <Text style={styles.orText}>— OR SELECT EXISTING —</Text>

              {/* Player List */}
              <ScrollView style={styles.playerList}>
                {players.map(player => (
                  <TouchableOpacity 
                    key={player.id} 
                    style={styles.playerButton}
                    onPress={() => handleJoinQueue(player.id)}
                  >
                    <Text style={styles.playerButtonText}>{player.name}</Text>
                    <Text style={styles.playerEloText}>{player.elo} ELO</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </View>
        </Modal>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>PING<Text style={styles.titleHighlight}>TRACK</Text></Text>
        <Text style={styles.subtitle}>Enter Club Room Code</Text>
      </View>

      <View style={styles.pinContainer}>
        {Array.from({ length: PIN_LENGTH }).map((_, i) => (
          <View key={i} style={[styles.pinDot, pin[i] && styles.pinDotActive]}>
            <Text style={styles.pinText}>{pin[i] || ''}</Text>
          </View>
        ))}
      </View>

      <View style={styles.keypad}>
        {[['1', '2', '3'], ['4', '5', '6'], ['7', '8', '9'], ['clear', '0', 'join']].map((row, i) => (
          <View key={i} style={styles.row}>
            {row.map(key => {
              if (key === 'clear') {
                return (
                  <TouchableOpacity key={key} style={styles.key} onPress={handleDelete}>
                    <Text style={styles.keyText}>⌫</Text>
                  </TouchableOpacity>
                );
              }
              if (key === 'join') {
                const isActive = pin.length === PIN_LENGTH;
                return (
                  <TouchableOpacity 
                    key={key} 
                    style={[styles.key, isActive && styles.joinKeyActive]} 
                    onPress={handleJoin} 
                    disabled={!isActive}
                  >
                    <Text style={[styles.keyText, isActive && styles.joinKeyTextActive, { fontSize: 18 }]}>JOIN</Text>
                  </TouchableOpacity>
                );
              }
              return (
                <TouchableOpacity key={key} style={styles.key} onPress={() => handlePress(key)}>
                  <Text style={styles.keyText}>{key}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        ))}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a1628',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 40,
  },
  header: {
    alignItems: 'center',
    marginTop: 60,
  },
  title: {
    fontSize: 42,
    fontWeight: '900',
    color: '#ffffff',
    letterSpacing: 2,
  },
  titleHighlight: {
    color: '#22c55e', // Desktop app green
  },
  subtitle: {
    fontSize: 16,
    color: '#888888',
    marginTop: 10,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  pinContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 10,
    marginVertical: 40,
  },
  pinDot: {
    width: 42,
    height: 55,
    borderRadius: 8,
    backgroundColor: '#1e293b',
    borderWidth: 2,
    borderColor: '#334155',
    justifyContent: 'center',
    alignItems: 'center',
  },
  pinDotActive: {
    borderColor: '#22c55e',
    backgroundColor: '#0f172a',
  },
  pinText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  keypad: {
    width: '100%',
    paddingHorizontal: 25,
    paddingBottom: 20,
    gap: 15,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  key: {
    width: (width - 50 - 30) / 3, // dynamic width based on screen size
    height: 75,
    borderRadius: 38,
    backgroundColor: '#1e293b',
    justifyContent: 'center',
    alignItems: 'center',
  },
  keyText: {
    fontSize: 28,
    fontWeight: '600',
    color: '#ffffff',
  },
  joinKeyActive: {
    backgroundColor: '#22c55e',
  },
  joinKeyTextActive: {
    color: '#000000',
    fontWeight: '800',
  },
  dashboardCard: {
    backgroundColor: '#1e293b',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#334155',
    width: width - 40,
  },
  cardHeader: {
    fontSize: 16,
    color: '#94a3b8',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 15,
    fontWeight: '700',
  },
  emptyText: {
    color: '#64748b',
    fontStyle: 'italic',
  },
  listItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  listText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '500',
  },
  listTextAccent: {
    color: '#22c55e',
    fontWeight: 'bold',
  },
  primaryButton: {
    backgroundColor: '#22c55e',
    borderRadius: 12,
    paddingVertical: 18,
    alignItems: 'center',
    marginTop: 10,
  },
  primaryButtonText: {
    color: '#000000',
    fontSize: 20,
    fontWeight: '900',
    letterSpacing: 1,
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#0f172a',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    maxHeight: '80%',
    borderTopWidth: 1,
    borderColor: '#334155',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    color: '#ffffff',
    fontSize: 24,
    fontWeight: 'bold',
  },
  closeButton: {
    color: '#94a3b8',
    fontSize: 24,
    fontWeight: 'bold',
  },
  createPlayerContainer: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 20,
  },
  input: {
    flex: 1,
    backgroundColor: '#1e293b',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 10,
    paddingHorizontal: 15,
    color: '#ffffff',
    fontSize: 16,
  },
  createButton: {
    backgroundColor: '#3b82f6',
    paddingHorizontal: 15,
    justifyContent: 'center',
    borderRadius: 10,
  },
  createButtonText: {
    color: '#ffffff',
    fontWeight: 'bold',
  },
  orText: {
    color: '#64748b',
    textAlign: 'center',
    fontSize: 12,
    fontWeight: 'bold',
    marginVertical: 10,
    letterSpacing: 1,
  },
  playerList: {
    marginTop: 10,
  },
  playerButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#1e293b',
    padding: 15,
    borderRadius: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#334155',
  },
  playerButtonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '600',
  },
  playerEloText: {
    color: '#22c55e',
    fontWeight: 'bold',
    fontSize: 16,
  }
});
