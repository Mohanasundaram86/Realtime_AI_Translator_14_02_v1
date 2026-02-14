import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Platform,
  Alert,
  ActivityIndicator,
  Switch,
} from 'react-native';
import { LogIn, LogOut, Save } from 'lucide-react-native';
import { useAuth } from '@/contexts/AuthContext';
import { LanguagePicker } from '@/components/LanguagePicker';

interface LanguageSelectorProps {
  value: string;
  onChange: (code: string) => void;
  label: string;
  showAuto?: boolean;
}
 
export default function SettingsScreen() {
  const { user, settings, signIn, signUp, signOut, updateSettings, loading } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLogin, setIsLogin] = useState(true);
  const [authLoading, setAuthLoading] = useState(false);

  const [ttsProvider, setTtsProvider] = useState<'inworld' | 'elevenlabs' | 'openai'>('openai');
  const [defaultSourceLanguage, setDefaultSourceLanguage] = useState('auto');
  const [defaultTargetLanguage, setDefaultTargetLanguage] = useState('ta');
  const [conversationModeDefault, setConversationModeDefault] = useState(true);

  React.useEffect(() => {
    if (settings) {
      setTtsProvider(settings.tts_provider);
      setDefaultSourceLanguage(settings.default_source_language);
      setDefaultTargetLanguage(settings.default_target_language);
      setConversationModeDefault(settings.conversation_mode_default);
    }
  }, [settings]);

  const handleAuth = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please enter both email and password');
      return;
    }

    setAuthLoading(true);
    try {
      if (isLogin) {
        await signIn(email, password);
        Alert.alert('Success', 'Signed in successfully');
      } else {
        await signUp(email, password);
        Alert.alert('Success', 'Account created successfully. Please check your email to verify.');
      }
      setEmail('');
      setPassword('');
    } catch (error) {
      Alert.alert('Error', error instanceof Error ? error.message : 'Authentication failed');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      Alert.alert('Success', 'Signed out successfully');
    } catch (error) {
      Alert.alert('Error', 'Failed to sign out');
    }
  };

  const handleSaveSettings = async () => {
    if (!user) {
      Alert.alert('Error', 'Please sign in to save settings');
      return;
    }

    try {
      await updateSettings({
        tts_provider: ttsProvider,
        default_source_language: defaultSourceLanguage,
        default_target_language: defaultTargetLanguage,
        conversation_mode_default: conversationModeDefault,
      });
      Alert.alert(
        'Success',
        'Settings saved successfully!'
      );
    } catch (error) {
      console.error('Settings save error:', error);
      Alert.alert('Error', 'Failed to save settings. Please try again.');
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2563eb" />
      </View>
    );
  }

  return (
    <ScrollView 
      style={styles.container} 
      contentContainerStyle={styles.contentContainer}
      // FIX: Essential for dropdowns inside ScrollViews on Android
      nestedScrollEnabled={true}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.header}>
        <Text style={styles.title}>Settings</Text>
        <Text style={styles.subtitle}>Configure your translation preferences</Text>
      </View>

      {!user ? (
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>
            {isLogin ? 'Sign In' : 'Create Account'}
          </Text>
          <Text style={styles.sectionDescription}>
            Sign in to save your translation history and settings
          </Text>

          <TextInput
            style={styles.input}
            placeholder="Email"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
          />

          <TextInput
            style={styles.input}
            placeholder="Password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />

          <TouchableOpacity
            style={styles.primaryButton}
            onPress={handleAuth}
            disabled={authLoading}>
            {authLoading ? (
              <ActivityIndicator size="small" color="#ffffff" />
            ) : (
              <>
                <LogIn size={20} color="#ffffff" />
                <Text style={styles.primaryButtonText}>
                  {isLogin ? 'Sign In' : 'Sign Up'}
                </Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity onPress={() => setIsLogin(!isLogin)}>
            <Text style={styles.linkText}>
              {isLogin ? "Don't have an account? Sign Up" : 'Already have an account? Sign In'}
            </Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Account</Text>
            <Text style={styles.userEmail}>{user.email}</Text>
            <TouchableOpacity style={styles.secondaryButton} onPress={handleSignOut}>
              <LogOut size={20} color="#ef4444" />
              <Text style={styles.secondaryButtonText}>Sign Out</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.card}>
            <Text style={styles.sectionTitle}>API Configuration</Text>
            <Text style={styles.sectionDescription}>
              API keys are now configured in the .env file for better security.
            </Text>

            {process.env.EXPO_PUBLIC_OPENAI_API_KEY && (
              <View style={styles.successInfo}>
                <Text style={styles.successIcon}>✅</Text>
                <Text style={styles.successInfoText}>
                  Ready to Translate - OpenAI API key is active. Select languages and start speaking!
                </Text>
              </View>
            )}

            <View style={styles.securityInfo}>
              <Text style={styles.securityIcon}>🔒</Text>
              <Text style={styles.securityText}>
                Add your API keys to the .env file: EXPO_PUBLIC_OPENAI_API_KEY, etc.
              </Text>
            </View>

            <Text style={styles.inputLabel}>TTS Provider</Text>
            <View style={styles.radioGroup}>
              <TouchableOpacity
                style={styles.radioOption}
                onPress={() => setTtsProvider('openai')}>
                <View style={[styles.radio, ttsProvider === 'openai' && styles.radioSelected]}>
                  {ttsProvider === 'openai' && <View style={styles.radioDot} />}
                </View>
                <Text style={styles.radioLabel}>OpenAI TTS</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.radioOption}
                onPress={() => setTtsProvider('inworld')}>
                <View style={[styles.radio, ttsProvider === 'inworld' && styles.radioSelected]}>
                  {ttsProvider === 'inworld' && <View style={styles.radioDot} />}
                </View>
                <Text style={styles.radioLabel}>Inworld AI</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.radioOption}
                onPress={() => setTtsProvider('elevenlabs')}>
                <View style={[styles.radio, ttsProvider === 'elevenlabs' && styles.radioSelected]}>
                  {ttsProvider === 'elevenlabs' && <View style={styles.radioDot} />}
                </View>
                <Text style={styles.radioLabel}>ElevenLabs</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* LANGUAGE PICKER CARD FIX */}
          <View style={[styles.card, { zIndex: 5000, elevation: 5 }]}>
            <Text style={styles.sectionTitle}>Default Languages</Text>
            
            {/* Wrapper for Source Language */}
            <View style={Platform.OS === 'ios' ? { zIndex: 3000 } : {}}>
              <LanguagePicker
                label="Default Source Language"
                selectedLanguage={defaultSourceLanguage}
                onSelectLanguage={setDefaultSourceLanguage}
                allowAuto={true}
              />
            </View>

            {/* Wrapper for Target Language */}
            <View style={Platform.OS === 'ios' ? { zIndex: 2000 } : {}}>
              <LanguagePicker
                label="Default Target Language"
                selectedLanguage={defaultTargetLanguage}
                onSelectLanguage={setDefaultTargetLanguage}
                allowAuto={false}
              />
            </View>

            <View style={styles.switchRow}>
              <View>
                <Text style={styles.switchLabel}>Auto Conversation Mode</Text>
                <Text style={styles.switchDescription}>Start in conversation mode by default</Text>
              </View>
              <Switch
                value={conversationModeDefault}
                onValueChange={setConversationModeDefault}
                trackColor={{ false: '#d1d5db', true: '#93c5fd' }}
                thumbColor={conversationModeDefault ? '#2563eb' : '#f4f3f4'}
              />
            </View>

            <TouchableOpacity
              style={styles.saveButton}
              onPress={handleSaveSettings}>
              <Save size={20} color="#ffffff" />
              <Text style={styles.saveButtonText}>Save Preferences</Text>
            </TouchableOpacity>
          </View>
        </>
      )}

      <View style={styles.footer}>
        <Text style={styles.footerText}>Realtime Modern AI Translator</Text>
        <Text style={styles.footerSubtext}>Powered by OpenAI & Advanced TTS</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  contentContainer: {
    padding: 20,
    paddingBottom: 150,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
  },
  header: {
    marginBottom: 24,
    marginTop: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#6b7280',
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
    position: 'relative',
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 8,
  },
  sectionDescription: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 16,
  },
  userEmail: {
    fontSize: 16,
    color: '#374151',
    marginBottom: 16,
  },
  secondaryButton: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#ef4444',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 14,
    borderRadius: 8,
    gap: 8,
  },
  secondaryButtonText: {
    color: '#ef4444',
    fontSize: 16,
    fontWeight: '600',
  },
  successInfo: {
    backgroundColor: '#d1fae5',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  successIcon: {
    fontSize: 20,
  },
  successInfoText: {
    fontSize: 14,
    color: '#065f46',
    flex: 1,
  },
  securityInfo: {
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  securityIcon: {
    fontSize: 20,
  },
  securityText: {
    fontSize: 14,
    color: '#4b5563',
    flex: 1,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
    marginTop: 8,
  },
  radioGroup: {
    gap: 8,
    marginBottom: 16,
  },
  radioOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#f9fafb',
    borderRadius: 8,
    gap: 12,
  },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#d1d5db',
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioSelected: {
    borderColor: '#2563eb',
  },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#2563eb',
  },
  radioLabel: {
    fontSize: 16,
    color: '#374151',
  },
  linkText: {
    color: '#2563eb',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 16,
  },
  input: {
    backgroundColor: '#f9fafb',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    fontSize: 16,
  },
  primaryButton: {
    backgroundColor: '#2563eb',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 14,
    borderRadius: 8,
    gap: 8,
  },
  primaryButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  saveButton: {
    backgroundColor: '#2563eb',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 14,
    borderRadius: 8,
    gap: 8,
    marginTop: 20,
    zIndex: -1, // Ensure it doesn't block the dropdown list
  },
  saveButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 16,
    zIndex: -1,
  },
  switchLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#111827',
  },
  switchDescription: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 4,
  },
  footer: {
    marginTop: 40,
    alignItems: 'center',
    paddingBottom: 20,
  },
  footerText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  footerSubtext: {
    fontSize: 12,
    color: '#9ca3af',
    marginTop: 4,
  },
});