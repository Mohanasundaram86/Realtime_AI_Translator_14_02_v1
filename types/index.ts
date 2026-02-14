export interface ConversationHistory {
  id: string;
  user_id: string;
  timestamp: string;
  source_language: string;
  target_language: string;
  source_text: string;
  translated_text: string;
  source_audio_url?: string;
  translated_audio_url?: string;
  conversation_mode: boolean;
  created_at: string;
}

export interface UserSettings {
  user_id: string;
  default_source_language: string;
  default_target_language: string;
  openai_api_key?: string;
  inworld_api_key?: string;
  elevenlabs_api_key?: string;
  tts_provider: 'inworld' | 'elevenlabs' | 'openai';
  conversation_mode_default: boolean;
  updated_at: string;
}

export interface Language {
  code: string;
  name: string;
  nativeName: string;
}

export interface TranslationRequest {
  audioUri: string;
  sourceLanguage: string;
  targetLanguage: string;
}

export interface TranslationResult {
  sourceText: string;
  translatedText: string;
  translatedAudioUrl?: string;
}
