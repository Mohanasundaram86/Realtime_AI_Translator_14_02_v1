import { Audio } from 'expo-av';
import { Platform } from 'react-native';

export class AudioService {
  private recording: Audio.Recording | null = null;
  private sound: Audio.Sound | null = null;
  private isChunkedRecording = false;
  private chunkTimer: any = null;
  private onChunkReady: ((uri: string) => void) | null = null;

  async requestPermissions(): Promise<boolean> {
    try {
      const { status } = await Audio.requestPermissionsAsync();
      return status === 'granted';
    } catch (error) {
      return false;
    }
  }

  async startRecording(): Promise<void> {
    try {
      // 🔧 FIX: Force cleanup any existing audio objects first
      await this.forceCleanup();

      const hasPermission = await this.requestPermissions();
      if (!hasPermission) {
        throw new Error('Microphone permission not granted');
      }

      console.log('🎤 Setting audio mode for recording...');
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false,
      });

      // 🔧 OPTIMIZED: Better recording settings for clearer transcription
      const recordingOptions = {
        isMeteringEnabled: true,
        android: {
          extension: '.m4a',
          outputFormat: Audio.AndroidOutputFormat.MPEG_4,
          audioEncoder: Audio.AndroidAudioEncoder.AAC,
          sampleRate: 44100,
          numberOfChannels: 1, // Mono for better voice clarity
          bitRate: 128000,
        },
        ios: {
          extension: '.m4a',
          outputFormat: Audio.IOSOutputFormat.MPEG4AAC,
          audioQuality: Audio.IOSAudioQuality.MAX,
          sampleRate: 44100,
          numberOfChannels: 1, // Mono for better voice clarity
          bitRate: 128000,
          linearPCMBitDepth: 16,
          linearPCMIsBigEndian: false,
          linearPCMIsFloat: false,
        },
        web: {
          mimeType: 'audio/webm',
          bitsPerSecond: 128000,
        },
      };

      console.log('🎤 Creating recording object...');
      const { recording } = await Audio.Recording.createAsync(recordingOptions);
      this.recording = recording;
      console.log('✅ Recording started successfully (mono, 44.1kHz, 128kbps)');
    } catch (error) {
      console.error('❌ Start Recording Error:', error);
      throw error;
    }
  }

  // Ensure these names match your previous code exactly
  async stopRecording(): Promise<string | null> {
    try {
      if (!this.recording) return null;
      await this.recording.stopAndUnloadAsync();
      const uri = this.recording.getURI();
      this.recording = null;
      return uri;
    } catch (error) {
      return null;
    }
  }

  // Alias for your translation service
  async cleanup(): Promise<void> {
    await this.forceCleanup();
  }

  async forceCleanup(): Promise<void> {
    console.log('🧹 Force cleaning up audio objects...');

    // Clean up recording
    if (this.recording) {
      try {
        await this.recording.stopAndUnloadAsync();
        console.log('✅ Recording cleaned up');
      } catch (e) {
        console.warn('Warning cleaning recording:', e);
      }
      this.recording = null;
    }

    // Clean up sound
    if (this.sound) {
      try {
        await this.sound.stopAsync();
        await this.sound.unloadAsync();
        console.log('✅ Sound cleaned up');
      } catch (e) {
        console.warn('Warning cleaning sound:', e);
      }
      this.sound = null;
    }

    // Small delay to ensure cleanup completes
    await new Promise(resolve => setTimeout(resolve, 100));
    console.log('✅ Audio cleanup complete');
  }

  // --- AUDIO PLAYBACK ---
  async playAudio(audioUrl: string): Promise<void> {
    try {
      console.log('🔊 Setting up audio playback...');

      // 1. Unload any existing sound
      if (this.sound) {
        try { await this.sound.unloadAsync(); } catch (e) {}
        this.sound = null;
      }

      // 2. CRITICAL: Switch audio mode from recording to playback
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,     // Must be false for playback!
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
        shouldDuckAndroid: false,
        playThroughEarpieceAndroid: false, // Use speaker
      });
      console.log('🔊 Audio mode set for playback');

      // 3. Load AND play in one step (recommended by Expo docs)
      console.log(`🔊 Loading: ${audioUrl}`);
      const { sound, status } = await Audio.Sound.createAsync(
        { uri: audioUrl },
        { shouldPlay: true, volume: 1.0, progressUpdateIntervalMillis: 500 }
      );
      this.sound = sound;

      if (status.isLoaded) {
        console.log(`🔊 Loaded & playing! Duration: ${status.durationMillis}ms`);
      } else {
        console.error('❌ Sound failed to load');
        return;
      }

      // 4. Wait for playback to finish
      await new Promise<void>((resolve) => {
        let resolved = false;

        sound.setOnPlaybackStatusUpdate(async (playStatus) => {
          if (resolved) return;

          if (playStatus.isLoaded) {
            if (playStatus.didJustFinish) {
              resolved = true;
              console.log('✅ Audio playback finished');
              try {
                await sound.unloadAsync();
                this.sound = null;
              } catch (e) {}
              resolve();
            }
          }
        });

        // Safety timeout: resolve after expected duration + 2 seconds
        const duration = status.isLoaded ? (status.durationMillis || 5000) : 5000;
        setTimeout(() => {
          if (!resolved) {
            resolved = true;
            console.warn(`⚠️ Audio timeout after ${duration + 2000}ms, continuing...`);
            try { sound.unloadAsync(); } catch (e) {}
            this.sound = null;
            resolve();
          }
        }, duration + 2000);
      });

    } catch (error) {
      console.error('❌ Playback Error:', error);
      // Don't throw - let conversation continue even if audio fails
    }
  }
  
  /**
   * Record with automatic stop on silence detection.
   * Falls back to a fixed timer if metering is not available on the device.
   * Similar to Google Translate / iTranslate conversation mode.
   */
  async startRecordingWithAutoStop(
    fixedDurationMs: number = 10000,
    silenceThresholdDb: number = -45,
    silenceDurationMs: number = 3000,
    minRecordingMs: number = 2000
  ): Promise<string | null> {
    console.log(`🎤 [AutoStop] Starting recording (max ${fixedDurationMs / 1000}s, silence ${silenceDurationMs / 1000}s)`);

    await this.startRecording();
    if (!this.recording) {
      console.error('🎤 [AutoStop] Recording failed to start');
      return null;
    }

    const recording = this.recording;
    const recordingStart = Date.now();

    // Wait briefly for recording to stabilize before attaching listeners
    await new Promise(r => setTimeout(r, 300));

    // If recording was stopped externally during the wait
    if (this.recording !== recording) {
      console.log('🎤 [AutoStop] Recording stopped during startup');
      return null;
    }

    return new Promise<string | null>((resolve) => {
      let silenceStart: number | null = null;
      let hasSpeech = false;
      let resolved = false;

      const finish = async () => {
        if (resolved) return;
        resolved = true;
        clearTimeout(fallbackTimer);
        console.log(`🎤 [AutoStop] Finishing recording (hasSpeech=${hasSpeech})`);
        if (this.recording === recording) {
          const uri = await this.stopRecording();
          resolve(uri);
        } else {
          resolve(null);
        }
      };

      // Fallback: fixed duration timer (always works, even without metering)
      const fallbackTimer = setTimeout(() => {
        console.log(`⏱️ [AutoStop] Fixed timer ${fixedDurationMs / 1000}s reached`);
        finish();
      }, fixedDurationMs);

      // Try to use metering for smarter silence detection
      try {
        recording.setOnRecordingStatusUpdate((status: any) => {
          if (resolved) return;

          // GUARD: Ignore status updates during first 1 second
          // (some devices fire !isRecording briefly on startup)
          const elapsed = Date.now() - recordingStart;
          if (elapsed < 1000) return;

          if (!status.isRecording) {
            console.log('🎤 [AutoStop] Recording stopped externally');
            if (!resolved) {
              resolved = true;
              clearTimeout(fallbackTimer);
              resolve(null);
            }
            return;
          }

          if (elapsed < minRecordingMs) return;

          const metering: number | undefined = status.metering;
          if (metering !== undefined) {
            if (metering >= silenceThresholdDb) {
              hasSpeech = true;
              silenceStart = null;
            } else if (hasSpeech) {
              if (!silenceStart) {
                silenceStart = Date.now();
              } else if (Date.now() - silenceStart >= silenceDurationMs) {
                console.log(`🔇 [AutoStop] ${silenceDurationMs / 1000}s silence after speech`);
                finish();
              }
            }
          }
        });

        recording.setProgressUpdateInterval(250);
        console.log('🎤 [AutoStop] Metering listener attached');
      } catch (e) {
        console.warn('⚠️ [AutoStop] Metering not supported, using fixed timer only');
      }
    });
  }

  isRecording(): boolean { return this.recording !== null; }
}

export const audioService = new AudioService();
