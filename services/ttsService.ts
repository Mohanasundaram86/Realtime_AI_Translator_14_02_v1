import * as FileSystem from 'expo-file-system/legacy';
import { Platform } from 'react-native';
import base64 from 'react-native-base64';

export type TTSProvider = 'inworld' | 'elevenlabs' | 'openai';

export class TTSService {
  private inworldApiKey: string | null = null;
  private elevenlabsApiKey: string | null = null;
  private openaiApiKey: string | null = null;

  initializeInworld(apiKey: string) {
    this.inworldApiKey = apiKey;
  }

  initializeElevenLabs(apiKey: string) {
    this.elevenlabsApiKey = apiKey;
  }

  initializeOpenAI(apiKey: string) {
    this.openaiApiKey = apiKey;
  }

  async generateSpeech(
    text: string,
    language: string,
    provider: TTSProvider = 'openai'
  ): Promise<string> {
    // Validate and truncate text if needed
    if (!text || text.trim().length === 0) {
      throw new Error('Cannot generate speech: text is empty');
    }

    const MAX_CHARS = 4000; // OpenAI limit is 4096, leaving buffer
    let processedText = text.trim();

    if (processedText.length > MAX_CHARS) {
      console.warn(`Text too long (${processedText.length} chars), truncating to ${MAX_CHARS} chars`);
      processedText = processedText.substring(0, MAX_CHARS) + '...';
    }

    console.log(`TTS text length: ${processedText.length} chars`);

    try {
      switch (provider) {
        case 'inworld':
          return await this.generateWithInworld(processedText, language);
        case 'elevenlabs':
          return await this.generateWithElevenLabs(processedText, language);
        case 'openai':
          return await this.generateWithOpenAI(processedText, language);
        default:
          throw new Error(`Unknown TTS provider: ${provider}`);
      }
    } catch (error) {
      console.error(`Failed with ${provider}, falling back to OpenAI TTS:`, error);

      if (provider !== 'openai') {
        console.log('Attempting fallback to OpenAI TTS...');
        return await this.generateWithOpenAI(processedText, language);
      }

      throw error;
    }
  }

  private async generateWithOpenAI(text: string, language: string): Promise<string> {
    if (!this.openaiApiKey) {
      throw new Error('OpenAI API key not set. Please add it in settings.');
    }

    console.log('🎙️ Attempting OpenAI TTS generation...');
    console.log(`📝 Text to speak: "${text.substring(0, 100)}..."`);
    console.log(`🌍 Target language: ${language}`);

    const voice = this.getOpenAIVoiceForLanguage(language);
    console.log(`🔊 Using OpenAI voice: ${voice} for language: ${language}`);
    console.log('⚠️ NOTE: OpenAI TTS auto-detects language from text. Voice name is just a personality.');

    try {
      const response = await fetch('https://api.openai.com/v1/audio/speech', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.openaiApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'tts-1',
          voice,
          input: text,
          speed: 1.0,
        }),
      });

      if (!response.ok) {
        throw new Error(`OpenAI TTS failed with status ${response.status}`);
      }

      // Save audio to file
      const fileUri = await this.saveAudioResponseToFile(response, 'openai_tts');
      console.log('OpenAI TTS audio saved to:', fileUri);
      return fileUri;
    } catch (error) {
      console.error('OpenAI TTS error:', error);
      throw new Error(`OpenAI TTS failed: ${error}`);
    }
  }

  private async generateWithInworld(text: string, language: string): Promise<string> {
    if (!this.inworldApiKey) {
      throw new Error('Inworld API key not set.');
    }

    console.log('Attempting Inworld TTS generation...');

    try {
      const response = await fetch('https://api.inworld.ai/v1/text-to-speech', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.inworldApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text,
          language,
          voice: this.getInworldVoiceForLanguage(language),
          format: 'mp3',
        }),
      });

      if (!response.ok) {
        throw new Error(`Inworld TTS failed with status ${response.status}`);
      }

      const fileUri = await this.saveAudioResponseToFile(response, 'inworld_tts');
      console.log('Inworld TTS audio saved to:', fileUri);
      return fileUri;
    } catch (error) {
      console.error('Inworld TTS error:', error);
      throw new Error(`Inworld TTS failed: ${error}`);
    }
  }

  private async generateWithElevenLabs(text: string, language: string): Promise<string> {
    if (!this.elevenlabsApiKey) {
      throw new Error('ElevenLabs API key not set.');
    }

    console.log('Attempting ElevenLabs TTS generation...');

    const voiceId = this.getElevenLabsVoiceForLanguage(language);

    try {
      const response = await fetch(
        `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
        {
          method: 'POST',
          headers: {
            'xi-api-key': this.elevenlabsApiKey,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            text,
            model_id: 'eleven_multilingual_v2',
            voice_settings: {
              stability: 0.5,
              similarity_boost: 0.75,
            },
          }),
        }
      );

      if (!response.ok) {
        throw new Error(`ElevenLabs TTS failed with status ${response.status}`);
      }

      const fileUri = await this.saveAudioResponseToFile(response, 'elevenlabs_tts');
      console.log('ElevenLabs TTS audio saved to:', fileUri);
      return fileUri;
    } catch (error) {
      console.error('ElevenLabs TTS error:', error);
      throw new Error(`ElevenLabs TTS failed: ${error}`);
    }
  }

  private async saveAudioResponseToFile(response: Response, prefix: string): Promise<string> {
    try {
      // Read response as blob
      const blob = await response.blob();
      console.log('Audio blob size:', blob.size);

      // Convert blob to ArrayBuffer (more reliable than FileReader)
      const arrayBuffer = await new Promise<ArrayBuffer>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as ArrayBuffer);
        reader.onerror = reject;
        reader.readAsArrayBuffer(blob);
      });

      // Convert ArrayBuffer to base64 string
      const bytes = new Uint8Array(arrayBuffer);
      let binaryString = '';

      // Process in chunks to avoid stack overflow
      const chunkSize = 8192;
      for (let i = 0; i < bytes.length; i += chunkSize) {
        const chunk = bytes.subarray(i, i + chunkSize);
        binaryString += String.fromCharCode.apply(null, Array.from(chunk));
      }

      // Use the base64 library we installed
      const base64String = base64.encode(binaryString);

      // Save to file using 'base64' string instead of enum
      const fileName = `${prefix}_${Date.now()}.mp3`;
      const fileUri = (FileSystem.cacheDirectory || '') + fileName;

      await FileSystem.writeAsStringAsync(fileUri, base64String, {
        encoding: 'base64', // Use string directly, not enum
      });

      console.log('✅ Audio saved successfully to:', fileUri);
      return fileUri;
    } catch (error) {
      console.error('❌ Error saving audio to file:', error);
      throw new Error(`Failed to save audio: ${error}`);
    }
  }

  private getOpenAIVoiceForLanguage(language: string): string {
    const voiceMap: Record<string, string> = {
      en: 'alloy',
      hi: 'nova',
      ta: 'shimmer',
      te: 'echo',
      kn: 'fable',
      ml: 'onyx',
      mr: 'alloy',
      bn: 'nova',
      gu: 'shimmer',
      pa: 'echo',
      ur: 'fable',
      es: 'nova',
      fr: 'shimmer',
      de: 'echo',
      it: 'fable',
      pt: 'onyx',
      ru: 'alloy',
      ja: 'shimmer',
      ko: 'nova',
      zh: 'alloy',
      ar: 'fable',
      tr: 'echo',
    };
    return voiceMap[language] || 'alloy';
  }

  private getInworldVoiceForLanguage(language: string): string {
    const voiceMap: Record<string, string> = {
      en: 'en-US-Standard-A',
      hi: 'hi-IN-Standard-A',
      ta: 'ta-IN-Standard-A',
      te: 'te-IN-Standard-A',
      kn: 'kn-IN-Standard-A',
      ml: 'ml-IN-Standard-A',
      mr: 'mr-IN-Standard-A',
      bn: 'bn-IN-Standard-A',
      gu: 'gu-IN-Standard-A',
      pa: 'pa-IN-Standard-A',
      ur: 'ur-IN-Standard-A',
      es: 'es-ES-Standard-A',
      fr: 'fr-FR-Standard-A',
      de: 'de-DE-Standard-A',
      it: 'it-IT-Standard-A',
      pt: 'pt-BR-Standard-A',
      ru: 'ru-RU-Standard-A',
      ja: 'ja-JP-Standard-A',
      ko: 'ko-KR-Standard-A',
      zh: 'cmn-CN-Standard-A',
      ar: 'ar-XA-Standard-A',
      tr: 'tr-TR-Standard-A',
      th: 'th-TH-Standard-A',
      vi: 'vi-VN-Standard-A',
      id: 'id-ID-Standard-A',
      nl: 'nl-NL-Standard-A',
      pl: 'pl-PL-Standard-A',
      uk: 'uk-UA-Standard-A',
      cs: 'cs-CZ-Standard-A',
      fil: 'fil-PH-Standard-A',
      sv: 'sv-SE-Standard-A',
      da: 'da-DK-Standard-A',
      no: 'nb-NO-Standard-A',
      fi: 'fi-FI-Standard-A',
      el: 'el-GR-Standard-A',
      hu: 'hu-HU-Standard-A',
      ro: 'ro-RO-Standard-A',
      sk: 'sk-SK-Standard-A',
      bg: 'bg-BG-Standard-A',
      sr: 'sr-RS-Standard-A',
      he: 'he-IL-Standard-A',
      ca: 'ca-ES-Standard-A',
    };
    return voiceMap[language] || 'en-US-Standard-A';
  }

  /**
   * Regional voice selection for ElevenLabs eleven_multilingual_v2.
   *
   * The multilingual v2 model speaks any supported language with any voice,
   * but certain voices produce clearer, more natural results for specific
   * language families. Voices are grouped by region:
   *
   * - Indian languages: Voices with warm, clear articulation
   * - European languages: Voices matched to tonal expectations
   * - East Asian languages: Neutral, crisp voices
   * - Middle Eastern: Deeper, expressive voices
   *
   * All IDs below are ElevenLabs default/premade voices available to every user.
   */
  private getElevenLabsVoiceForLanguage(language: string): string {
    // ── Indian regional languages ──
    // Warm, clear voices that pair well with Indic scripts in multilingual v2
    const indianVoices: Record<string, string> = {
      hi: 'EXAVITQu4vr4xnSDxMaL', // Sarah  – clear female, good for Hindi
      ta: 'jsCqWAovK2LkecY7zXl4', // Freya  – warm female, good for Tamil
      te: 'XrExE9yKIg1WjnnlVkGX', // Matilda – smooth female, good for Telugu
      kn: 'oWAxZDx7w5VEj9dCyTzz', // Grace  – gentle female, good for Kannada
      ml: 'pFZP5JQG7iQjIQuC4Bku', // Lily   – soft female, good for Malayalam
      mr: 'ThT5KcBeYPX3keUQqHPh', // Dorothy – warm female, good for Marathi
      bn: 'MF3mGyEYCl7XYWbV9V6O', // Elli   – clear female, good for Bengali
      gu: 'XrExE9yKIg1WjnnlVkGX', // Matilda – smooth, works for Gujarati
      pa: 'EXAVITQu4vr4xnSDxMaL', // Sarah  – clear, works for Punjabi
      ur: 'onwK4e9ZLuTAKqWW03F9', // Daniel – expressive male, good for Urdu
    };

    // ── European languages ──
    const europeanVoices: Record<string, string> = {
      en: '21m00Tcm4TlvDq8ikWAM', // Rachel – classic English female
      es: 'EXAVITQu4vr4xnSDxMaL', // Sarah  – works well for Spanish
      fr: 'jsCqWAovK2LkecY7zXl4', // Freya  – suits French tonality
      de: 'onwK4e9ZLuTAKqWW03F9', // Daniel – suits German precision
      it: 'ErXwobaYiN019PkySvjV', // Antoni – expressive, suits Italian
      pt: 'ThT5KcBeYPX3keUQqHPh', // Dorothy – warm for Portuguese
      ru: 'VR6AewLTigWG4xSOukaG', // Arnold – deep, suits Russian
      nl: 'TxGEqnHWrfWFTfGW9XjX', // Josh   – clear male for Dutch
      pl: 'onwK4e9ZLuTAKqWW03F9', // Daniel – clear for Polish
      uk: 'VR6AewLTigWG4xSOukaG', // Arnold – deep for Ukrainian
      cs: 'TxGEqnHWrfWFTfGW9XjX', // Josh   – neutral for Czech
      sv: 'TxGEqnHWrfWFTfGW9XjX', // Josh   – clear for Swedish
      da: 'TxGEqnHWrfWFTfGW9XjX', // Josh   – clear for Danish
      no: 'TxGEqnHWrfWFTfGW9XjX', // Josh   – clear for Norwegian
      fi: 'pNInz6obpgDQGcFmaJgB', // Adam   – neutral for Finnish
      el: 'ErXwobaYiN019PkySvjV', // Antoni – expressive for Greek
      hu: 'onwK4e9ZLuTAKqWW03F9', // Daniel – clear for Hungarian
      ro: 'ErXwobaYiN019PkySvjV', // Antoni – for Romanian
      sk: 'TxGEqnHWrfWFTfGW9XjX', // Josh   – for Slovak
      bg: 'VR6AewLTigWG4xSOukaG', // Arnold – for Bulgarian
      sr: 'VR6AewLTigWG4xSOukaG', // Arnold – for Serbian
      ca: 'ErXwobaYiN019PkySvjV', // Antoni – for Catalan
      fil: 'EXAVITQu4vr4xnSDxMaL',// Sarah  – for Filipino
    };

    // ── East Asian languages ──
    const asianVoices: Record<string, string> = {
      ja: 'MF3mGyEYCl7XYWbV9V6O', // Elli   – crisp, suits Japanese
      ko: 'jsCqWAovK2LkecY7zXl4', // Freya  – gentle, suits Korean
      zh: 'pFZP5JQG7iQjIQuC4Bku', // Lily   – soft, suits Chinese
      th: 'oWAxZDx7w5VEj9dCyTzz', // Grace  – gentle for Thai
      vi: 'MF3mGyEYCl7XYWbV9V6O', // Elli   – clear for Vietnamese
      id: 'EXAVITQu4vr4xnSDxMaL', // Sarah  – clear for Indonesian
    };

    // ── Middle Eastern / Semitic ──
    const middleEastVoices: Record<string, string> = {
      ar: 'pNInz6obpgDQGcFmaJgB', // Adam   – deep male, suits Arabic
      tr: 'onwK4e9ZLuTAKqWW03F9', // Daniel – expressive for Turkish
      he: 'pNInz6obpgDQGcFmaJgB', // Adam   – suits Hebrew
    };

    // Check all maps in priority order
    return indianVoices[language]
      || europeanVoices[language]
      || asianVoices[language]
      || middleEastVoices[language]
      || '21m00Tcm4TlvDq8ikWAM'; // Default: Rachel
  }
}

export const ttsService = new TTSService();
