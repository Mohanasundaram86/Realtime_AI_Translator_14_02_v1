import { audioService } from './audioService';
import { openaiService } from './openaiService';
import { ttsService, TTSProvider } from './ttsService';
import { Platform } from 'react-native';
import { supabase } from '@/lib/supabase';

export interface TranslationProgress {
  stage: 'recording' | 'transcribing' | 'translating' | 'generating_speech' | 'playing' | 'complete' | 'error';
  sourceText?: string;
  translatedText?: string;
  error?: string;
}

export class TranslationService {
  private onProgressCallback: ((progress: TranslationProgress) => void) | null = null;
  private stopCommandDetected = false;

  setProgressCallback(callback: (progress: TranslationProgress) => void) {
    this.onProgressCallback = callback;
  }

  private updateProgress(progress: TranslationProgress) {
    if (this.onProgressCallback) {
      this.onProgressCallback(progress);
    }
  }

  private detectStopCommand(text: string): boolean {
    const lowerText = text.toLowerCase().trim();
    const stopKeywords = ['stop', 'end', 'over', 'stop recording', 'end recording'];

    for (const keyword of stopKeywords) {
      if (lowerText.endsWith(keyword) || lowerText === keyword ||
          lowerText.includes(` ${keyword} `) || lowerText.startsWith(`${keyword} `)) {
        console.log(`Stop command detected: "${keyword}" in "${text}"`);
        return true;
      }
    }
    return false;
  }

  resetStopCommand() {
    this.stopCommandDetected = false;
  }

  isStopCommandDetected(): boolean {
    return this.stopCommandDetected;
  }

  private async translate(
    text: string,
    sourceLanguage: string,
    targetLanguage: string,
    onChunk: (chunk: string) => void
  ): Promise<string> {
    const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
    const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
    const apiUrl = `${SUPABASE_URL}/functions/v1/translate`;

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text,
        sourceLanguage,
        targetLanguage,
        stream: true,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Translation failed');
    }

    let fullTranslation = '';
    const reader = response.body?.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    if (reader) {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              const content = data.choices?.[0]?.delta?.content || '';
              if (content) {
                fullTranslation += content;
                onChunk(content);
              }
            } catch (e) {
              // Ignore parsing errors for incomplete chunks
            }
          }
        }
      }
    }

    return fullTranslation;
  }

  async startRecording(): Promise<void> {
    try {
      this.updateProgress({ stage: 'recording' });
      await audioService.startRecording();
    } catch (error) {
      console.error('Error starting recording:', error);
      this.updateProgress({
        stage: 'error',
        error: error instanceof Error ? error.message : 'Failed to start recording',
      });
      throw error;
    }
  }

  async stopRecordingAndTranslate(
    sourceLanguage: string,
    targetLanguage: string,
    ttsProvider: TTSProvider = 'openai',
    userId?: string
  ): Promise<void> {
    try {
      const audioUri = await audioService.stopRecording();
      if (!audioUri) {
        throw new Error('No audio recorded');
      }

      this.updateProgress({ stage: 'transcribing' });
      const { text: sourceText, detectedLanguage } = await openaiService.transcribe(
        audioUri,
        sourceLanguage
      );

      this.updateProgress({ stage: 'transcribing', sourceText });

      if (this.detectStopCommand(sourceText)) {
        this.stopCommandDetected = true;
        console.log('Stop command detected - ending translation');
        this.updateProgress({ stage: 'complete', sourceText, translatedText: 'Recording stopped by voice command' });
        return;
      }

      this.updateProgress({ stage: 'translating', sourceText });
      let translatedText = '';

      const effectiveSourceLang = detectedLanguage || sourceLanguage;
      await this.translate(
        sourceText,
        effectiveSourceLang,
        targetLanguage,
        (chunk) => {
          translatedText += chunk;
          this.updateProgress({
            stage: 'translating',
            sourceText,
            translatedText,
          });
        }
      );

      this.updateProgress({ stage: 'generating_speech', sourceText, translatedText });
      const translatedAudioUri = await ttsService.generateSpeech(
        translatedText,
        targetLanguage,
        ttsProvider
      );

      this.updateProgress({ stage: 'playing', sourceText, translatedText });
      await audioService.playAudio(translatedAudioUri);

      if (userId) {
        await this.saveToHistory(
          userId,
          sourceLanguage,
          targetLanguage,
          sourceText,
          translatedText,
          audioUri,
          translatedAudioUri
        );
      }

      this.updateProgress({ stage: 'complete', sourceText, translatedText });
    } catch (error) {
      console.error('Error in translation process:', error);
      this.updateProgress({
        stage: 'error',
        error: error instanceof Error ? error.message : 'Translation failed',
      });
      throw error;
    }
  }

  async translateFromAudioUri(
    audioUri: string,
    sourceLanguage: string,
    targetLanguage: string,
    ttsProvider: TTSProvider = 'openai',
    userId?: string
  ): Promise<void> {
    try {
      this.updateProgress({ stage: 'transcribing' });
      const { text: sourceText, detectedLanguage } = await openaiService.transcribe(
        audioUri,
        sourceLanguage
      );

      this.updateProgress({ stage: 'transcribing', sourceText });

      if (this.detectStopCommand(sourceText)) {
        this.stopCommandDetected = true;
        console.log('Stop command detected - ending translation');
        this.updateProgress({ stage: 'complete', sourceText, translatedText: 'Recording stopped by voice command' });
        return;
      }

      this.updateProgress({ stage: 'translating', sourceText });
      let translatedText = '';

      const effectiveSourceLang = detectedLanguage || sourceLanguage;
      await this.translate(
        sourceText,
        effectiveSourceLang,
        targetLanguage,
        (chunk) => {
          translatedText += chunk;
          this.updateProgress({
            stage: 'translating',
            sourceText,
            translatedText,
          });
        }
      );

      this.updateProgress({ stage: 'generating_speech', sourceText, translatedText });
      const translatedAudioUri = await ttsService.generateSpeech(
        translatedText,
        targetLanguage,
        ttsProvider
      );

      this.updateProgress({ stage: 'playing', sourceText, translatedText });
      await audioService.playAudio(translatedAudioUri);

      if (userId) {
        await this.saveToHistory(
          userId,
          sourceLanguage,
          targetLanguage,
          sourceText,
          translatedText,
          audioUri,
          translatedAudioUri
        );
      }

      this.updateProgress({ stage: 'complete', sourceText, translatedText });
    } catch (error) {
      console.error('Error in translation process:', error);
      this.updateProgress({
        stage: 'error',
        error: error instanceof Error ? error.message : 'Translation failed',
      });
      throw error;
    }
  }

  private async saveToHistory(
    userId: string,
    sourceLanguage: string,
    targetLanguage: string,
    sourceText: string,
    translatedText: string,
    sourceAudioUri: string,
    translatedAudioUri: string
  ): Promise<void> {
    try {
      let sourceAudioUrl: string | undefined;
      let translatedAudioUrl: string | undefined;

      try {
        sourceAudioUrl = await this.uploadAudioToStorage(userId, sourceAudioUri, 'source');
        translatedAudioUrl = await this.uploadAudioToStorage(
          userId,
          translatedAudioUri,
          'translated'
        );
      } catch (uploadError) {
        console.error('Error uploading audio files:', uploadError);
      }

      const { error } = await supabase.from('conversation_history').insert({
        user_id: userId,
        timestamp: new Date().toISOString(),
        source_language: sourceLanguage,
        target_language: targetLanguage,
        source_text: sourceText,
        translated_text: translatedText,
        source_audio_url: sourceAudioUrl,
        translated_audio_url: translatedAudioUrl,
        conversation_mode: false,
      });

      if (error) {
        console.error('Error saving to history:', error);
      }
    } catch (error) {
      console.error('Error in saveToHistory:', error);
    }
  }

  private async uploadAudioToStorage(
    userId: string,
    audioUri: string,
    type: 'source' | 'translated'
  ): Promise<string> {
    const response = await fetch(audioUri);
    const blob = await response.blob();

    const mimeType = blob.type || 'audio/webm';
    const extension = this.getExtensionFromMimeType(mimeType);
    const fileName = `${userId}/${type}_${Date.now()}.${extension}`;

    console.log('Uploading audio to storage:', { fileName, mimeType, size: blob.size });

    const { data, error } = await supabase.storage
      .from('audio-files')
      .upload(fileName, blob, {
        contentType: mimeType,
        upsert: false,
      });

    if (error) {
      console.error('Error uploading to storage:', error);
      throw error;
    }

    const { data: urlData } = supabase.storage
      .from('audio-files')
      .getPublicUrl(data.path);

    return urlData.publicUrl;
  }

  private getExtensionFromMimeType(mimeType: string): string {
    const mimeToExtension: Record<string, string> = {
      'audio/webm': 'webm',
      'audio/webm;codecs=opus': 'webm',
      'audio/ogg': 'ogg',
      'audio/ogg;codecs=opus': 'ogg',
      'audio/mp4': 'm4a',
      'audio/m4a': 'm4a',
      'audio/x-m4a': 'm4a',
      'audio/mpeg': 'mp3',
      'audio/mp3': 'mp3',
      'audio/wav': 'wav',
      'audio/wave': 'wav',
      'audio/x-wav': 'wav',
    };

    const normalizedMime = mimeType.split(';')[0].toLowerCase();
    return mimeToExtension[normalizedMime] || mimeToExtension[mimeType.toLowerCase()] || 'webm';
  }

  async cleanup(): Promise<void> {
    await audioService.cleanup();
  }
}

export const translationService = new TranslationService();
