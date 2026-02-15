import { audioService } from './audioService';
import { openaiService } from './openaiService';
import { ttsService, TTSProvider } from './ttsService';
import { Platform, Alert } from 'react-native';

export interface TranslationProgress {
  stage:
    | 'recording'
    | 'transcribing'
    | 'translating'
    | 'generating_speech'
    | 'playing'
    | 'complete'
    | 'waiting'
    | 'error';
  sourceText?: string;
  translatedText?: string;
  error?: string;
  isRealtime?: boolean;
  currentPerson?: 'A' | 'B';
  currentSourceLanguage?: string;
  currentTargetLanguage?: string;
}

export class RealtimeTranslationService {
  private onProgressCallback: ((progress: TranslationProgress) => void) | null = null;
  private isActive = false;
  private autoContinueEnabled = false;
  private currentSourceLanguage = '';
  private currentTargetLanguage = '';
  private currentTtsProvider: TTSProvider = 'openai';
  private currentUserId: string | undefined;
  private isPersonATurn = true;
  private originalSourceLanguage = '';
  private originalTargetLanguage = '';

  setProgressCallback(callback: (progress: TranslationProgress) => void) {
    this.onProgressCallback = callback;
  }

  private updateProgress(progress: TranslationProgress) {
    if (this.onProgressCallback) {
      this.onProgressCallback({
        ...progress,
        currentPerson: this.isPersonATurn ? 'A' : 'B',
        currentSourceLanguage: this.currentSourceLanguage,
        currentTargetLanguage: this.currentTargetLanguage,
      });
    }
  }

  // ────────────────────────────────────────────────────────────────
  // Language Mapping: Whisper returns full names, app uses ISO codes
  // ────────────────────────────────────────────────────────────────

  private static readonly LANG_CODE_TO_NAME: Record<string, string> = {
    'auto': 'the detected language',
    'en': 'English', 'hi': 'Hindi', 'ta': 'Tamil', 'te': 'Telugu',
    'kn': 'Kannada', 'ml': 'Malayalam', 'mr': 'Marathi', 'bn': 'Bengali',
    'gu': 'Gujarati', 'pa': 'Punjabi', 'ur': 'Urdu', 'es': 'Spanish',
    'fr': 'French', 'de': 'German', 'it': 'Italian', 'pt': 'Portuguese',
    'ru': 'Russian', 'ja': 'Japanese', 'ko': 'Korean', 'zh': 'Chinese',
    'ar': 'Arabic', 'tr': 'Turkish', 'th': 'Thai', 'vi': 'Vietnamese',
    'id': 'Indonesian', 'nl': 'Dutch', 'pl': 'Polish', 'uk': 'Ukrainian',
    'cs': 'Czech', 'fil': 'Filipino', 'sv': 'Swedish', 'da': 'Danish',
    'no': 'Norwegian', 'fi': 'Finnish', 'el': 'Greek', 'hu': 'Hungarian',
    'ro': 'Romanian', 'sk': 'Slovak', 'bg': 'Bulgarian', 'sr': 'Serbian',
    'he': 'Hebrew', 'ca': 'Catalan',
  };

  private static readonly LANG_NAME_TO_CODE: Record<string, string> = (() => {
    const map: Record<string, string> = {};
    for (const [code, name] of Object.entries(RealtimeTranslationService.LANG_CODE_TO_NAME)) {
      if (code !== 'auto') {
        map[name.toLowerCase()] = code;
      }
    }
    return map;
  })();

  private whisperLanguageToCode(whisperLang: string): string {
    if (!whisperLang) return 'en';
    const lower = whisperLang.toLowerCase();
    if (RealtimeTranslationService.LANG_CODE_TO_NAME[lower]) return lower;
    return RealtimeTranslationService.LANG_NAME_TO_CODE[lower] || whisperLang;
  }

  private getLanguageNameFromCode(code: string): string {
    if (!code) return 'Unknown';
    const lower = code.toLowerCase();
    if (RealtimeTranslationService.LANG_NAME_TO_CODE[lower]) {
      return lower.charAt(0).toUpperCase() + lower.slice(1);
    }
    return RealtimeTranslationService.LANG_CODE_TO_NAME[code] || code.toUpperCase();
  }

  // ────────────────────────────────────────────────────────────────
  // Translation (Direct OpenAI)
  // ────────────────────────────────────────────────────────────────

  private async translate(
    text: string,
    sourceLanguage: string,
    targetLanguage: string,
    onChunk: (chunk: string) => void
  ): Promise<string> {
    console.log('🔄 Using DIRECT OpenAI translation');
    return await this.translateDirectOpenAI(text, sourceLanguage, targetLanguage, onChunk);
  }

  private async translateDirectOpenAI(
    text: string,
    sourceLanguage: string,
    targetLanguage: string,
    onChunk: (chunk: string) => void
  ): Promise<string> {
    const OPENAI_API_KEY = process.env.EXPO_PUBLIC_OPENAI_API_KEY;
    if (!OPENAI_API_KEY) {
      throw new Error('OpenAI API key not configured');
    }

    const sourceLangName = this.getLanguageNameFromCode(sourceLanguage);
    const targetLangName = this.getLanguageNameFromCode(targetLanguage);

    console.log(`📞 OpenAI translate: ${sourceLanguage} (${sourceLangName}) → ${targetLanguage} (${targetLangName})`);

    const systemPrompt = `Translate to ${targetLangName}. Output ONLY in ${targetLangName} language using its native script. No explanations.`;
    const userPrompt = `Translate this to ${targetLangName}: ${text}`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.1,
        max_tokens: 100,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`OpenAI API error: ${errorData.error?.message || response.status}`);
    }

    const data = await response.json();
    const translation = data.choices[0]?.message?.content || '';

    console.log(`✅ Translation (${targetLangName}): ${translation.substring(0, 100)}`);
    onChunk(translation);
    return translation.trim();
  }

  // ────────────────────────────────────────────────────────────────
  // SINGLE TRANSLATION MODE (conversation toggle OFF)
  // User presses start → speaks → presses stop → processes → done
  // ────────────────────────────────────────────────────────────────

  async startRealtimeRecording(
    sourceLanguage: string,
    targetLanguage: string,
    ttsProvider: TTSProvider = 'openai',
    userId?: string,
  ): Promise<void> {
    this.isActive = true;
    this.autoContinueEnabled = false;
    this.currentTtsProvider = ttsProvider;
    this.currentUserId = userId;
    this.isPersonATurn = true;
    this.currentSourceLanguage = sourceLanguage;
    this.currentTargetLanguage = targetLanguage;
    this.originalSourceLanguage = sourceLanguage;
    this.originalTargetLanguage = targetLanguage;

    console.log(`🎤 Single mode: ${sourceLanguage} → ${targetLanguage}`);
    this.updateProgress({ stage: 'recording', isRealtime: true });
    await audioService.startRecording();
  }

  async stopRealtimeRecording(): Promise<void> {
    try {
      console.log('=== SINGLE TRANSLATION FLOW ===');
      const audioUri = await audioService.stopRecording();

      if (!audioUri) {
        this.updateProgress({ stage: 'error', error: 'No audio recorded' });
        this.isActive = false;
        return;
      }

      // Transcribe
      this.updateProgress({ stage: 'transcribing', isRealtime: true });
      const { text: sourceText, detectedLanguage: rawDetected } = await openaiService.transcribe(
        audioUri, this.currentSourceLanguage
      );

      const detectedLanguage = rawDetected ? this.whisperLanguageToCode(rawDetected) : undefined;
      console.log(`📝 Transcribed: "${sourceText?.substring(0, 80)}" (detected: ${detectedLanguage})`);

      // Use detected language if source was auto
      if (this.currentSourceLanguage === 'auto' && detectedLanguage) {
        this.currentSourceLanguage = detectedLanguage;
        console.log(`✅ Auto-detected: ${detectedLanguage} (${this.getLanguageNameFromCode(detectedLanguage)})`);
      } else if (this.currentSourceLanguage === 'auto') {
        this.currentSourceLanguage = 'en';
        console.warn('⚠️ No language detected, defaulting to English');
      }

      const actualText = (typeof sourceText === 'string' ? sourceText : '').trim();
      if (!actualText || actualText.length < 3) {
        this.updateProgress({ stage: 'error', error: 'No speech detected' });
        this.isActive = false;
        return;
      }

      // Translate
      console.log(`📝 Translating: ${this.currentSourceLanguage} → ${this.currentTargetLanguage}`);
      this.updateProgress({
        stage: 'translating',
        sourceText: actualText,
        isRealtime: true,
      });

      let translatedText = '';
      await this.translate(
        actualText,
        this.currentSourceLanguage,
        this.currentTargetLanguage,
        (chunk) => {
          translatedText += chunk;
          this.updateProgress({
            stage: 'translating',
            sourceText: actualText,
            translatedText,
            isRealtime: true,
          });
        }
      );

      if (!translatedText.trim()) {
        throw new Error('Translation returned empty result');
      }

      // Generate TTS
      this.updateProgress({
        stage: 'generating_speech',
        sourceText: actualText,
        translatedText,
        isRealtime: true,
      });

      const ttsUri = await ttsService.generateSpeech(
        translatedText, this.currentTargetLanguage, this.currentTtsProvider
      );

      // Play audio
      await audioService.forceCleanup();
      this.updateProgress({
        stage: 'playing',
        sourceText: actualText,
        translatedText,
        isRealtime: true,
      });

      try {
        await audioService.playAudio(ttsUri);
        console.log('✅ Audio playback complete');
      } catch (playError) {
        console.error('❌ Audio playback failed:', playError);
      }

      // Done
      this.updateProgress({
        stage: 'complete',
        sourceText: actualText,
        translatedText,
        isRealtime: true,
      });
      this.isActive = false;

    } catch (error) {
      console.error('❌ Single translation error:', error);
      this.isActive = false;
      this.updateProgress({
        stage: 'error',
        error: error instanceof Error ? error.message : 'Translation failed',
      });
      await audioService.cleanup();
    }
  }

  // ────────────────────────────────────────────────────────────────
  // CONVERSATION MODE (conversation toggle ON)
  // Fully automatic: record → transcribe → translate → TTS → play → swap → repeat
  // User presses start once, presses stop to end.
  // ────────────────────────────────────────────────────────────────

  async startConversation(
    sourceLanguage: string,
    targetLanguage: string,
    ttsProvider: TTSProvider = 'openai',
    userId?: string
  ): Promise<void> {
    this.isActive = true;
    this.autoContinueEnabled = true;
    this.isPersonATurn = true;
    this.originalSourceLanguage = sourceLanguage;
    this.originalTargetLanguage = targetLanguage;
    this.currentSourceLanguage = sourceLanguage;
    this.currentTargetLanguage = targetLanguage;
    this.currentTtsProvider = ttsProvider;
    this.currentUserId = userId;

    console.log('🗣️ ═══════════════════════════════════');
    console.log(`🗣️ CONVERSATION STARTED: ${sourceLanguage} ↔ ${targetLanguage}`);
    console.log('🗣️ ═══════════════════════════════════');

    // Run the conversation loop (blocks until stopped)
    await this.conversationLoop();
  }

  stopConversation(): void {
    console.log('🛑 CONVERSATION STOPPED by user');
    this.isActive = false;
    this.autoContinueEnabled = false;
    // Stop any in-progress recording or playback immediately
    audioService.forceCleanup().catch(() => {});
  }

  private async conversationLoop(): Promise<void> {
    let consecutiveErrors = 0;
    const MAX_ERRORS = 3;

    while (this.isActive && this.autoContinueEnabled) {
      const person = this.isPersonATurn ? 'A' : 'B';

      try {
        console.log(`\n═══ Person ${person}'s turn ═══`);
        console.log(`   ${this.currentSourceLanguage} → ${this.currentTargetLanguage}`);

        // ── STEP 1: RECORD ──
        this.updateProgress({ stage: 'recording', isRealtime: true });
        console.log(`🎤 Recording for 10 seconds...`);
        await audioService.startRecording();

        // Wait 10 seconds or until user stops
        await new Promise<void>((resolve) => {
          const timer = setTimeout(resolve, 10000);
          const checker = setInterval(() => {
            if (!this.isActive || !this.autoContinueEnabled) {
              clearTimeout(timer);
              clearInterval(checker);
              resolve();
            }
          }, 500);
          setTimeout(() => clearInterval(checker), 10500);
        });

        const audioUri = await audioService.stopRecording();
        console.log(`🎤 Recording: ${audioUri ? 'OK' : 'null'}`);

        if (!this.isActive || !this.autoContinueEnabled) break;

        if (!audioUri) {
          consecutiveErrors++;
          if (consecutiveErrors >= MAX_ERRORS) {
            this.updateProgress({ stage: 'error', error: 'Recording failed. Please restart.', isRealtime: true });
            break;
          }
          await new Promise(r => setTimeout(r, 500));
          continue;
        }

        // ── STEP 2: PROCESS (transcribe → translate → TTS → play) ──
        const success = await this.processConversationTurn(audioUri);

        if (!this.isActive || !this.autoContinueEnabled) break;

        if (success) {
          consecutiveErrors = 0;

          // ── STEP 3: SWAP languages ──
          this.isPersonATurn = !this.isPersonATurn;
          if (this.isPersonATurn) {
            this.currentSourceLanguage = this.originalSourceLanguage;
            this.currentTargetLanguage = this.originalTargetLanguage;
          } else {
            this.currentSourceLanguage = this.originalTargetLanguage;
            this.currentTargetLanguage = this.originalSourceLanguage;
          }
          console.log(`🔄 Next → Person ${this.isPersonATurn ? 'A' : 'B'}: ${this.currentSourceLanguage} → ${this.currentTargetLanguage}`);

          // Brief pause, then ensure audio resources are released before next recording
          this.updateProgress({ stage: 'waiting', isRealtime: true });
          await new Promise(r => setTimeout(r, 1000));
          await audioService.forceCleanup();
          await new Promise(r => setTimeout(r, 200));
        } else {
          consecutiveErrors++;
          if (consecutiveErrors >= MAX_ERRORS) {
            this.updateProgress({ stage: 'error', error: 'No speech detected. Please restart.', isRealtime: true });
            break;
          }
          await new Promise(r => setTimeout(r, 500));
        }

      } catch (error) {
        consecutiveErrors++;
        console.error(`❌ Turn error (${consecutiveErrors}/${MAX_ERRORS}):`, error);
        // Ensure we clean up any leftover audio state
        await audioService.forceCleanup().catch(() => {});

        if (consecutiveErrors >= MAX_ERRORS) {
          this.updateProgress({
            stage: 'error',
            error: error instanceof Error ? error.message : 'Conversation failed.',
            isRealtime: true,
          });
          break;
        }
        this.updateProgress({
          stage: 'error',
          error: error instanceof Error ? error.message : 'Error, retrying...',
          isRealtime: true,
        });
        await new Promise(r => setTimeout(r, 1000));
      }
    }

    console.log('🗣️ Conversation loop ended');
    this.isActive = false;
    this.autoContinueEnabled = false;
    await audioService.forceCleanup().catch(() => {});
  }

  /**
   * Process one conversation turn: transcribe → translate → TTS → play audio.
   * Returns true if turn was successful (should swap), false to retry same person.
   */
  private async processConversationTurn(audioUri: string): Promise<boolean> {
    // ── 1. TRANSCRIBE ──
    this.updateProgress({ stage: 'transcribing', isRealtime: true });

    const { text: sourceText, detectedLanguage: rawDetected } = await openaiService.transcribe(
      audioUri, this.currentSourceLanguage
    );

    const detectedLanguage = rawDetected ? this.whisperLanguageToCode(rawDetected) : undefined;
    const actualText = (typeof sourceText === 'string' ? sourceText : '').trim();

    console.log(`📝 Transcribed: "${actualText.substring(0, 80)}" | Detected: ${detectedLanguage}`);

    // Skip if no valid speech
    if (!actualText || actualText.length < 3) {
      console.log('⚠️ No valid speech, will retry');
      this.updateProgress({ stage: 'waiting', isRealtime: true });
      return false;
    }

    // ── Update source language from Whisper detection ──
    // ONLY use detection for the very first turn when source is 'auto'
    // After that, trust the pre-set languages from the swap logic
    if (detectedLanguage && this.isPersonATurn && this.originalSourceLanguage === 'auto') {
      // First turn: lock Person A's language from detection
      this.originalSourceLanguage = detectedLanguage;
      this.currentSourceLanguage = detectedLanguage;
      console.log(`🔒 Locked Person A's language: ${detectedLanguage} (${this.getLanguageNameFromCode(detectedLanguage)})`);
    }
    // After first turn, currentSourceLanguage/currentTargetLanguage are already
    // correctly set by the swap logic in conversationLoop — don't override them

    console.log(`📝 Translation: ${this.currentSourceLanguage} (${this.getLanguageNameFromCode(this.currentSourceLanguage)}) → ${this.currentTargetLanguage} (${this.getLanguageNameFromCode(this.currentTargetLanguage)})`);

    // ── 2. TRANSLATE ──
    this.updateProgress({
      stage: 'translating',
      sourceText: actualText,
      isRealtime: true,
    });

    let translatedText = '';
    await this.translate(
      actualText,
      this.currentSourceLanguage,
      this.currentTargetLanguage,
      (chunk) => {
        translatedText += chunk;
        this.updateProgress({
          stage: 'translating',
          sourceText: actualText,
          translatedText,
          isRealtime: true,
        });
      }
    );

    if (!translatedText.trim()) {
      console.error('❌ Empty translation result');
      return false;
    }

    console.log(`✅ Translated: "${translatedText.substring(0, 80)}"`);

    // ── 3. GENERATE TTS ──
    this.updateProgress({
      stage: 'generating_speech',
      sourceText: actualText,
      translatedText,
      isRealtime: true,
    });

    const ttsUri = await ttsService.generateSpeech(
      translatedText, this.currentTargetLanguage, this.currentTtsProvider
    );
    console.log(`✅ TTS generated`);

    // ── 4. PLAY AUDIO (MUST complete before next turn) ──
    // Recording is already stopped (stopRecording was called in conversationLoop).
    // Just play the TTS audio.
    this.updateProgress({
      stage: 'playing',
      sourceText: actualText,
      translatedText,
      isRealtime: true,
    });

    try {
      await audioService.playAudio(ttsUri);
      console.log('✅ Audio playback complete');
    } catch (playError) {
      console.error('❌ Audio playback failed (translation was successful):', playError);
    }

    // Turn processed successfully — don't set 'complete' here
    // (the conversation loop will set 'waiting' before the next turn,
    //  and forceCleanup at the top of the next iteration handles resource release)
    return true;
  }

  // ────────────────────────────────────────────────────────────────
  // Utility methods
  // ────────────────────────────────────────────────────────────────

  getCurrentPerson(): 'A' | 'B' {
    return this.isPersonATurn ? 'A' : 'B';
  }

  getCurrentDirection(): { source: string; target: string } {
    return {
      source: this.currentSourceLanguage,
      target: this.currentTargetLanguage,
    };
  }

  isConversationActive(): boolean {
    return this.isActive && this.autoContinueEnabled;
  }

  async forceReset(): Promise<void> {
    console.log('Force resetting translation service...');
    this.isActive = false;
    this.autoContinueEnabled = false;
    this.isPersonATurn = true;
    await audioService.cleanup();
    this.updateProgress({ stage: 'complete' });
  }

  async cleanup(): Promise<void> {
    this.isActive = false;
    this.autoContinueEnabled = false;
    await audioService.cleanup();
  }
}

export const realtimeTranslationService = new RealtimeTranslationService();
