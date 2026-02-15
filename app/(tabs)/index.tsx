import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Keyboard,
  Switch
} from 'react-native';
import { Mic, Square, Users, User } from 'lucide-react-native';
import { useAuth } from '@/contexts/AuthContext';
import { LanguagePicker } from '@/components/LanguagePicker';
import {
  realtimeTranslationService,
  TranslationProgress,
} from '@/services/RealtimeTranslationService';
import { audioService } from '@/services/audioService';
import { openaiService } from '@/services/openaiService';
import { ttsService } from '@/services/ttsService';
import { SUPPORTED_LANGUAGES } from '@/lib/constants';

export default function HomeScreen() {
  const { user, settings } = useAuth();

  const [sourceLanguage, setSourceLanguage] = useState('auto');
  const [targetLanguage, setTargetLanguage] = useState('ta');
  const [conversationMode, setConversationMode] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isConversationRunning, setIsConversationRunning] = useState(false);
  const [progress, setProgress] = useState<TranslationProgress | null>(null);
  const [isButtonDisabled, setIsButtonDisabled] = useState(false);

  // 1. Initialize Services
  useEffect(() => {
    const openaiKey = process.env.EXPO_PUBLIC_OPENAI_API_KEY?.trim();
    if (openaiKey) {
      openaiService.initialize(openaiKey);
      ttsService.initializeOpenAI(openaiKey);
    }

    if (settings) {
      setSourceLanguage(settings.default_source_language || 'auto');
      setTargetLanguage(settings.default_target_language || 'ta');
      setConversationMode(settings.conversation_mode_default);
    }
  }, [settings]);

  // 2. Permission Check on Load
  useEffect(() => {
    realtimeTranslationService.setProgressCallback(setProgress);

    const checkPerms = async () => {
      const hasPerm = await audioService.requestPermissions();
      if (!hasPerm) {
        console.warn('Microphone permission not granted on startup');
      }
    };
    checkPerms();

    return () => {
      realtimeTranslationService.cleanup();
    };
  }, []);

  const handleToggleRecording = async () => {
    if (isButtonDisabled) return;
    setIsButtonDisabled(true);
    Keyboard.dismiss();

    try {
      if (conversationMode) {
        // CONVERSATION MODE: toggle the conversation loop
        if (isConversationRunning) {
          await handleStopConversation();
        } else {
          await handleStartConversation();
        }
      } else {
        // SINGLE MODE: manual start/stop
        if (isRecording) {
          await handleStopRecording();
        } else {
          await handleStartRecording();
        }
      }
    } finally {
      setTimeout(() => setIsButtonDisabled(false), 800);
    }
  };

  // ── Single Translation Mode ──

  const handleStartRecording = async () => {
    if (!user) {
      Alert.alert('Sign In Required', 'Please sign in to use the translator.');
      return;
    }

    try {
      await realtimeTranslationService.startRealtimeRecording(
        sourceLanguage,
        targetLanguage,
        settings?.tts_provider || 'openai',
        user?.id,
      );
      setIsRecording(true);
    } catch (error: any) {
      setIsRecording(false);
      await realtimeTranslationService.forceReset();
      Alert.alert('Error', error.message || 'Failed to start');
    }
  };

  const handleStopRecording = async () => {
    setIsRecording(false);
    try {
      await realtimeTranslationService.stopRealtimeRecording();
    } catch (error) {
      await realtimeTranslationService.forceReset();
    }
  };

  // ── Conversation Mode ──

  const handleStartConversation = () => {
    if (!user) {
      Alert.alert('Sign In Required', 'Please sign in to use the translator.');
      return;
    }

    setIsConversationRunning(true);

    // Fire-and-forget: don't await so the button re-enables and can be tapped to stop
    realtimeTranslationService.startConversation(
      sourceLanguage,
      targetLanguage,
      settings?.tts_provider || 'openai',
      user?.id,
    ).then(() => {
      // Loop ended naturally or user pressed stop
      setIsConversationRunning(false);
    }).catch((error: any) => {
      setIsConversationRunning(false);
      realtimeTranslationService.forceReset();
      Alert.alert('Error', error.message || 'Conversation failed');
    });
  };

  const handleStopConversation = async () => {
    realtimeTranslationService.stopConversation();
    setIsConversationRunning(false);
  };

  const getLanguageName = (code: string) => {
    const lang = SUPPORTED_LANGUAGES.find(l => l.code === code);
    return lang ? lang.name : code.toUpperCase();
  };

  const getStatusText = () => {
    if (!progress) return 'Tap to start speaking';

    if (progress.stage === 'recording') {
      const person = progress.currentPerson || 'A';
      const from = getLanguageName(progress.currentSourceLanguage || sourceLanguage);
      const to = getLanguageName(progress.currentTargetLanguage || targetLanguage);
      if (conversationMode) {
        return `Person ${person}: Listening... (${from} → ${to})`;
      }
      return `Listening... (${from} → ${to})`;
    }
    if (progress.stage === 'error') return `Error: ${progress.error}`;
    if (progress.stage === 'waiting') {
      if (conversationMode) {
        const nextPerson = progress.currentPerson === 'A' ? 'B' : 'A';
        return `Ready for Person ${nextPerson}...`;
      }
      return 'Processing...';
    }
    if (progress.stage === 'transcribing') return 'Transcribing speech...';
    if (progress.stage === 'translating') return 'Translating...';
    if (progress.stage === 'generating_speech') return 'Generating speech...';
    if (progress.stage === 'playing') return 'Playing translation...';
    if (progress.stage === 'complete') {
      if (conversationMode && isConversationRunning) return 'Turn complete';
      return 'Translation complete';
    }
    return progress.stage.replace('_', ' ');
  };

  const isActive = isRecording || isConversationRunning;

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.contentContainer}
        keyboardShouldPersistTaps="handled"
        nestedScrollEnabled={true}
      >
        <View style={styles.header}>
          <Text style={styles.title}>AI Translator</Text>
          <Text style={styles.subtitle}>Real-time voice translation</Text>
        </View>

        <View style={styles.pickerSection}>
          <LanguagePicker
            label="Source Language"
            selectedLanguage={sourceLanguage}
            onSelectLanguage={setSourceLanguage}
            disabled={isActive}
          />
          <LanguagePicker
            label="Target Language"
            selectedLanguage={targetLanguage}
            onSelectLanguage={setTargetLanguage}
            disabled={isActive}
          />
        </View>

        {/* Conversation Mode Toggle */}
        <View style={[
          styles.conversationToggle,
          conversationMode && styles.conversationToggleActive
        ]}>
          <View style={styles.conversationToggleLeft}>
            {conversationMode ? (
              <Users color="#2563eb" size={24} />
            ) : (
              <User color="#6b7280" size={24} />
            )}
            <View style={styles.conversationToggleText}>
              <Text style={styles.conversationToggleTitle}>
                {conversationMode ? 'Conversation Mode' : 'Single Translation'}
              </Text>
              <Text style={styles.conversationToggleSubtitle}>
                {conversationMode
                  ? 'Auto-detects silence, swaps speakers'
                  : 'One-time translation only'}
              </Text>
            </View>
          </View>
          <Switch
            value={conversationMode}
            onValueChange={setConversationMode}
            disabled={isActive}
            trackColor={{ false: '#d1d5db', true: '#93c5fd' }}
            thumbColor={conversationMode ? '#2563eb' : '#f3f4f6'}
          />
        </View>

        {/* Conversation mode hint */}
        {conversationMode && !isConversationRunning && (
          <View style={styles.hintBox}>
            <Text style={styles.hintText}>
              Tap the mic to start. Each person gets 10 seconds to speak. Tap stop to end conversation.
            </Text>
          </View>
        )}

        <View style={styles.controls}>
          <TouchableOpacity
            style={[styles.micButton, isActive && styles.micButtonActive]}
            onPress={handleToggleRecording}
            disabled={isButtonDisabled}
          >
            {isActive ? (
              <Square color="white" size={32} fill="white" />
            ) : (
              <Mic color="white" size={32} />
            )}
          </TouchableOpacity>
          <Text style={[styles.statusText, { color: isActive ? '#ef4444' : '#6b7280' }]}>
            {getStatusText()}
          </Text>
        </View>

        {/* Display Translation Results */}
        {progress && (progress.sourceText || progress.translatedText) && (
          <View style={styles.resultsContainer}>
            {/* Person A/B badge in conversation mode */}
            {conversationMode && progress.currentPerson && (
              <View style={styles.personBadge}>
                <Text style={styles.personBadgeText}>
                  Person {progress.currentPerson}
                </Text>
                <Text style={styles.personBadgeSubtext}>
                  {getLanguageName(progress.currentSourceLanguage || sourceLanguage)} → {getLanguageName(progress.currentTargetLanguage || targetLanguage)}
                </Text>
              </View>
            )}

            {progress.sourceText && (
              <View style={styles.textBox}>
                <Text style={styles.textBoxLabel}>
                  {conversationMode && progress.currentPerson ? `Person ${progress.currentPerson}: ` : ''}
                  {getLanguageName(progress.currentSourceLanguage || sourceLanguage)}
                </Text>
                <Text style={styles.textBoxContent}>{progress.sourceText}</Text>
              </View>
            )}
            {progress.translatedText && (
              <View style={[styles.textBox, styles.translatedBox]}>
                <Text style={styles.textBoxLabel}>
                  Translation → {getLanguageName(progress.currentTargetLanguage || targetLanguage)}
                </Text>
                <Text style={styles.textBoxContent}>{progress.translatedText}</Text>
              </View>
            )}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  scrollView: { flex: 1 },
  contentContainer: { padding: 20, paddingBottom: 40 },
  header: { marginBottom: 30, alignItems: 'center' },
  title: { fontSize: 28, fontWeight: 'bold', color: '#111827' },
  subtitle: { fontSize: 16, color: '#6b7280', marginTop: 4 },
  pickerSection: {
    marginBottom: 30,
    zIndex: 5000,
    position: 'relative'
  },
  controls: { alignItems: 'center', marginTop: 20, zIndex: 1 },
  micButton: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: '#2563eb', justifyContent: 'center', alignItems: 'center',
    elevation: 5, shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 3
  },
  micButtonActive: { backgroundColor: '#ef4444' },
  statusText: { marginTop: 15, fontSize: 16, fontWeight: '500', textTransform: 'capitalize' },
  resultsContainer: { marginTop: 30, width: '100%' },
  textBox: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderLeftWidth: 4,
    borderLeftColor: '#6b7280',
  },
  translatedBox: {
    borderLeftColor: '#2563eb',
    backgroundColor: '#eff6ff',
  },
  conversationToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 2,
    borderColor: '#e5e7eb',
  },
  conversationToggleActive: {
    borderColor: '#93c5fd',
  },
  conversationToggleLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 12,
  },
  conversationToggleText: {
    marginLeft: 12,
    flex: 1,
  },
  conversationToggleTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 2,
  },
  conversationToggleSubtitle: {
    fontSize: 13,
    color: '#6b7280',
    lineHeight: 18,
  },
  personBadge: {
    backgroundColor: '#2563eb',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 16,
    marginBottom: 12,
    alignSelf: 'flex-start',
  },
  personBadgeText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#ffffff',
  },
  personBadgeSubtext: {
    fontSize: 13,
    color: '#dbeafe',
    marginTop: 2,
  },
  hintBox: {
    backgroundColor: '#eff6ff',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginBottom: 16,
    borderLeftWidth: 3,
    borderLeftColor: '#2563eb',
  },
  hintText: {
    fontSize: 13,
    color: '#1e40af',
    fontWeight: '500',
  },
  textBoxLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#374151',
    marginBottom: 8,
  },
  textBoxContent: {
    fontSize: 16,
    color: '#111827',
    lineHeight: 24,
  }
});
