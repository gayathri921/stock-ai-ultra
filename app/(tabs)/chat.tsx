import React, { useState, useRef, useCallback } from 'react';
import { View, Text, FlatList, TextInput, Pressable, StyleSheet, Platform, ActivityIndicator, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import * as Crypto from 'expo-crypto';
import { useTheme } from '@/contexts/ThemeContext';
import { streamChat, type ChatMessage } from '@/lib/api';

interface DisplayMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

export default function ChatScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [messages, setMessages] = useState<DisplayMessage[]>([]);
  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const flatListRef = useRef<FlatList>(null);
  const inputRef = useRef<TextInput>(null);
  const webTop = Platform.OS === 'web' ? 67 : 0;

  const suggestions = [
    'Analyze AAPL stock',
    'Compare NVDA vs AMD',
    'Best tech stocks to buy?',
    'Is TSLA overvalued?',
  ];

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || isStreaming) return;
    const userMsg: DisplayMessage = { id: Crypto.randomUUID(), role: 'user', content: text.trim() };
    const assistantId = Crypto.randomUUID();
    const assistantMsg: DisplayMessage = { id: assistantId, role: 'assistant', content: '' };

    setMessages(prev => [...prev, userMsg, assistantMsg]);
    setInput('');
    setIsStreaming(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    const history: ChatMessage[] = messages.map(m => ({ role: m.role, content: m.content }));
    history.push({ role: 'user', content: text.trim() });

    await streamChat(
      text.trim(),
      history.slice(0, -1),
      (chunk) => {
        setMessages(prev =>
          prev.map(m => m.id === assistantId ? { ...m, content: m.content + chunk } : m)
        );
      },
      () => {
        setIsStreaming(false);
        inputRef.current?.focus();
      },
      (err) => {
        setMessages(prev =>
          prev.map(m => m.id === assistantId ? { ...m, content: 'Sorry, I encountered an error. Please try again.' } : m)
        );
        setIsStreaming(false);
      },
    );
  }, [messages, isStreaming]);

  const renderMessage = useCallback(({ item }: { item: DisplayMessage }) => {
    const isUser = item.role === 'user';
    return (
      <View style={[styles.messageBubble, isUser ? styles.userBubble : styles.assistantBubble,
        { backgroundColor: isUser ? colors.tint : colors.surfaceElevated }
      ]}>
        {!isUser && (
          <View style={styles.aiTag}>
            <Ionicons name="sparkles" size={12} color={colors.tint} />
            <Text style={[styles.aiTagText, { color: colors.tint }]}>StockAI</Text>
          </View>
        )}
        <Text style={[styles.messageText, { color: isUser ? '#fff' : colors.text }]} selectable>{item.content}</Text>
        {!isUser && item.content === '' && isStreaming && (
          <View style={styles.typingRow}>
            <ActivityIndicator size="small" color={colors.tint} />
            <Text style={[styles.typingText, { color: colors.textTertiary }]}>Analyzing...</Text>
          </View>
        )}
      </View>
    );
  }, [colors, isStreaming]);

  const hasMessages = messages.length > 0;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding" keyboardVerticalOffset={0}>
        <View style={[styles.header, { paddingTop: insets.top + webTop + 12 }]}>
          <View style={styles.headerContent}>
            <Ionicons name="sparkles" size={20} color={colors.tint} />
            <Text style={[styles.headerTitle, { color: colors.text }]}>AI Assistant</Text>
          </View>
          {hasMessages && (
            <Pressable onPress={() => { setMessages([]); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }} hitSlop={8}>
              <Ionicons name="trash-outline" size={20} color={colors.textTertiary} />
            </Pressable>
          )}
        </View>

        {!hasMessages ? (
          <ScrollView
            contentContainerStyle={styles.emptyChatScroll}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.emptyChat}>
              <View style={[styles.emptyChatIcon, { backgroundColor: colors.tint + '15' }]}>
                <Ionicons name="analytics" size={40} color={colors.tint} />
              </View>
              <Text style={[styles.emptyChatTitle, { color: colors.text }]}>Stock Intelligence</Text>
              <Text style={[styles.emptyChatSub, { color: colors.textSecondary }]}>Ask me about any stock, market trends, or investment strategies</Text>
              <View style={styles.suggestionsGrid}>
                {suggestions.map((s, i) => (
                  <Pressable key={i} onPress={() => sendMessage(s)} style={({ pressed }) => [styles.suggestion, { backgroundColor: colors.surfaceElevated, borderColor: colors.border, opacity: pressed ? 0.7 : 1 }]}>
                    <Text style={[styles.suggestionText, { color: colors.text }]}>{s}</Text>
                    <Ionicons name="arrow-forward" size={14} color={colors.textTertiary} />
                  </Pressable>
                ))}
              </View>
            </View>
          </ScrollView>
        ) : (
          <FlatList
            ref={flatListRef}
            data={messages}
            inverted
            keyExtractor={(item) => item.id}
            renderItem={renderMessage}
            contentContainerStyle={{ flexDirection: 'column-reverse', paddingHorizontal: 16, paddingBottom: 8, paddingTop: 8 }}
            keyboardDismissMode="interactive"
            keyboardShouldPersistTaps="handled"
          />
        )}

        <View style={[styles.inputBar, { backgroundColor: colors.surface, borderTopColor: colors.border, paddingBottom: Platform.OS === 'web' ? 34 : insets.bottom || 8 }]}>
          <View style={[styles.inputWrap, { backgroundColor: colors.inputBackground, borderColor: colors.inputBorder }]}>
            <TextInput
              ref={inputRef}
              style={[styles.inputField, { color: colors.text }]}
              placeholder="Ask about stocks..."
              placeholderTextColor={colors.textTertiary}
              value={input}
              onChangeText={setInput}
              multiline
              maxLength={1000}
              editable={!isStreaming}
              onSubmitEditing={() => sendMessage(input)}
              blurOnSubmit={false}
            />
            <Pressable
              onPress={() => sendMessage(input)}
              disabled={!input.trim() || isStreaming}
              style={({ pressed }) => [styles.sendBtn, { backgroundColor: input.trim() && !isStreaming ? colors.tint : colors.inputBorder, opacity: pressed ? 0.7 : 1 }]}
            >
              <Ionicons name="arrow-up" size={18} color="#fff" />
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 16, paddingBottom: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  headerContent: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  headerTitle: { fontSize: 20, fontFamily: 'Inter_700Bold' },
  messageBubble: { maxWidth: '85%', borderRadius: 16, paddingHorizontal: 14, paddingVertical: 10, marginVertical: 3 },
  userBubble: { alignSelf: 'flex-end', borderBottomRightRadius: 4 },
  assistantBubble: { alignSelf: 'flex-start', borderBottomLeftRadius: 4 },
  aiTag: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 4 },
  aiTagText: { fontSize: 11, fontFamily: 'Inter_600SemiBold' },
  messageText: { fontSize: 15, fontFamily: 'Inter_400Regular', lineHeight: 22 },
  typingRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 },
  typingText: { fontSize: 13, fontFamily: 'Inter_400Regular' },
  emptyChatScroll: { flexGrow: 1, justifyContent: 'center' },
  emptyChat: { alignItems: 'center', paddingHorizontal: 24, paddingBottom: 40 },
  emptyChatIcon: { width: 72, height: 72, borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  emptyChatTitle: { fontSize: 22, fontFamily: 'Inter_700Bold', marginBottom: 6 },
  emptyChatSub: { fontSize: 14, fontFamily: 'Inter_400Regular', textAlign: 'center', lineHeight: 20, marginBottom: 24 },
  suggestionsGrid: { width: '100%', gap: 8 },
  suggestion: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 12, borderRadius: 12, borderWidth: 1 },
  suggestionText: { fontSize: 14, fontFamily: 'Inter_500Medium', flex: 1 },
  inputBar: { paddingHorizontal: 16, paddingTop: 10, borderTopWidth: 1 },
  inputWrap: { flexDirection: 'row', alignItems: 'flex-end', borderRadius: 24, borderWidth: 1, paddingLeft: 16, paddingRight: 6, paddingVertical: 6, gap: 8 },
  inputField: { flex: 1, fontSize: 15, fontFamily: 'Inter_400Regular', maxHeight: 100, paddingVertical: 6 },
  sendBtn: { width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
});
