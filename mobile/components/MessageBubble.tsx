/**
 * MessageBubble — Renders a single chat message with Markdown and tool calls.
 */

import { View, Text as RNText, StyleSheet, ActivityIndicator } from 'react-native';
import Markdown from 'react-native-markdown-display';
import { Ionicons } from '@expo/vector-icons';
import type { Message, ToolCallPart } from '@/lib/types';

interface MessageBubbleProps {
  message: Message;
}

export default function MessageBubble({ message }: MessageBubbleProps) {
  const isUser = message.role === 'user';
  const toolCalls = message.parts?.filter((p) => p.type === 'tool-call') as ToolCallPart[] | undefined;

  return (
    <View style={[styles.bubbleContainer, isUser && styles.bubbleContainerUser]}>
      <View style={[styles.bubble, isUser && styles.bubbleUser]}>
        {/* Main content */}
        {message.content ? (
          isUser ? (
            <RNText style={styles.userText}>{message.content}</RNText>
          ) : (
            <Markdown style={markdownStyles}>{message.content}</Markdown>
          )
        ) : null}

        {/* Tool calls */}
        {toolCalls && toolCalls.length > 0 && (
          <View style={styles.toolsSection}>
            <RNText style={styles.toolsLabel}>Tools</RNText>
            {toolCalls.map((tc, i) => (
              <View
                key={tc.toolCallId || i}
                style={[styles.toolCard, tc.state === 'error' && styles.toolCardError]}
              >
                <View style={styles.toolHeader}>
                  {tc.state === 'running' ? (
                    <ActivityIndicator size={12} color="#c8873a" />
                  ) : (
                    <Ionicons
                      name={tc.state === 'error' ? 'close-circle-outline' : 'checkmark-circle-outline'}
                      size={14}
                      color={tc.state === 'error' ? '#ef4444' : '#22c55e'}
                    />
                  )}
                  <RNText style={styles.toolName}>{tc.toolName}</RNText>
                </View>
                {tc.output ? (
                  <RNText style={styles.toolOutput} numberOfLines={3}>
                    {tc.output}
                  </RNText>
                ) : null}
              </View>
            ))}
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bubbleContainer: {
    flexDirection: 'row',
    marginVertical: 6,
    paddingHorizontal: 16,
    justifyContent: 'flex-start',
  },
  bubbleContainerUser: {
    justifyContent: 'flex-end',
  },
  bubble: {
    maxWidth: '85%',
    backgroundColor: '#292524',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#44403c',
  },
  bubbleUser: {
    backgroundColor: '#c8873a',
    borderColor: '#c8873a',
  },
  userText: {
    color: '#fff',
    fontSize: 14,
    lineHeight: 20,
  },
  toolsSection: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#44403c',
    gap: 8,
  },
  toolsLabel: {
    fontSize: 11,
    color: '#78716c',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  toolCard: {
    backgroundColor: 'rgba(200, 135, 58, 0.08)',
    borderRadius: 8,
    padding: 8,
    borderWidth: 1,
    borderColor: 'rgba(200, 135, 58, 0.2)',
  },
  toolCardError: {
    backgroundColor: 'rgba(239, 68, 68, 0.08)',
    borderColor: 'rgba(239, 68, 68, 0.2)',
  },
  toolHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  toolName: {
    flex: 1,
    fontSize: 12,
    color: '#d6d3d1',
    fontWeight: '500',
  },
  toolOutput: {
    fontSize: 11,
    color: '#a8a29e',
    marginTop: 4,
    fontFamily: 'monospace',
  },
});

const markdownStyles = {
  body: { color: '#d6d3d1', fontSize: 14, lineHeight: 20 },
  strong: { color: '#fafaf9', fontWeight: '600' as const },
  em: { fontStyle: 'italic' as const },
  code_inline: {
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    color: '#fbbf24',
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 4,
    fontFamily: 'monospace',
    fontSize: 12,
  },
  link: { color: '#c8873a' },
  list_item: { marginBottom: 4 },
  bullet_list: { marginLeft: 8 },
};
