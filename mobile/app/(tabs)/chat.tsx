/**
 * Chat tab — placeholder for Phase 2 AI Chat.
 */
import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

export default function ChatScreen() {
  return (
    <SafeAreaView style={styles.container} edges={['left', 'right']}>
      <View style={styles.center}>
        <Ionicons name="chatbubble-outline" size={48} color="#44403c" />
        <Text style={styles.title}>AI Chat</Text>
        <Text style={styles.subtitle}>Coming in Phase 2</Text>
        <Text style={styles.hint}>
          Ask anything about your knowledge base.{'\n'}
          Chat and Agent modes with streaming responses.
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1a1917' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12, padding: 32 },
  title: { fontSize: 20, fontWeight: '700', color: '#fafaf9' },
  subtitle: { fontSize: 14, color: '#c8873a', fontWeight: '500' },
  hint: { fontSize: 14, color: '#78716c', textAlign: 'center', lineHeight: 22, marginTop: 8 },
});
