# Realtime Modern AI Translator

A full-stack mobile application built with React Native and Expo that provides realtime audio translation with minimal latency using OpenAI Whisper for speech-to-text, GPT-4o-mini for translation, and multiple TTS providers including OpenAI TTS, Inworld TTS-1.5, and ElevenLabs.

## 🚀 Quick Start (5 Minutes)

**Before using the app, you need:**
1. An OpenAI API key from https://platform.openai.com/api-keys
2. A device with a working microphone

**First-time setup:**
1. Run `npm install` then `npm run dev`
2. Open the app (scan QR code or press `i` for iOS / `a` for Android)
3. Go to **Settings** tab → Create an account
4. Enter your **OpenAI API key** → Save Settings
5. Grant **microphone permission** when prompted
6. Go to **Home** tab → Select languages → Tap microphone → Speak!

**Troubleshooting:** If recording doesn't work, see [TROUBLESHOOTING.md](./TROUBLESHOOTING.md)

## Features

- **Realtime Audio Translation**: Record audio and get instant translations with low latency (<500ms where possible)
- **Comprehensive Language Support**: 50+ languages including all major Indian languages (Tamil, Telugu, Kannada, Malayalam, Hindi, Marathi, Bengali, Gujarati, Punjabi, Urdu) and international languages (Spanish, Japanese, German, Chinese, Korean, Arabic, French, and more)
- **Automatic Language Detection**: Whisper automatically detects the source language
- **Conversation Mode**: Automatically switch between languages for back-and-forth conversations
- **Multi-TTS Provider Support**: Choose between OpenAI TTS, Inworld TTS-1.5, or ElevenLabs for natural-sounding audio in all supported languages
- **Translation History**: Save and replay all your past translations
- **User Authentication**: Secure sign-in/sign-up with Supabase Auth
- **Cloud Storage**: Audio files stored securely in Supabase Storage
- **Modern UI**: Clean, intuitive interface with realtime feedback and native language display

## Tech Stack

- **Frontend**: React Native with Expo
- **Backend**: Supabase (PostgreSQL, Auth, Storage)
- **AI Services**:
  - OpenAI Whisper (Speech-to-Text)
  - OpenAI GPT-4o-mini (Translation)
  - OpenAI TTS-1 (Text-to-Speech)
  - Inworld TTS-1.5 (Optional)
  - ElevenLabs (Optional)
- **Audio**: expo-av for recording and playback
- **Navigation**: Expo Router with tab navigation

## Prerequisites

- Node.js 18+ and npm
- Expo CLI (`npm install -g expo-cli`)
- OpenAI API Key (required)
- Inworld API Key (optional, for enhanced TTS)
- ElevenLabs API Key (optional, for alternative TTS)
- iOS Simulator (for iOS development) or Android Emulator (for Android development)

## Setup Instructions

### 1. Clone and Install Dependencies

```bash
cd project
npm install
```

### 2. Environment Variables

The Supabase credentials are already configured in the `.env` file. The database is already set up with the required tables and storage buckets.

### 3. Understanding API Keys 🔑

**Why You Need Your Own API Keys:**

This app requires YOUR personal OpenAI API key because:
- ✅ **Privacy**: Your translations use YOUR OpenAI account, keeping everything private
- ✅ **Cost Control**: You pay OpenAI directly based on your usage (typically $0.01-0.05 per minute)
- ✅ **No Subscription**: No monthly fees to a third-party service
- ✅ **Transparency**: You can track all usage in your OpenAI dashboard

**Security Guarantee:**

Your API keys are 100% secure and private:
- 🔒 Stored ONLY in your personal user account
- 🔒 Protected by Row Level Security (RLS) - database-level security
- 🔒 NO other user can access your keys
- 🔒 Keys are tied to YOUR authenticated session only
- 🔒 Not visible in app code or to other users

**Important Note:**
- You do NOT need to add API keys to environment variables
- You add them through the app's Settings screen after signing up
- Each user manages their own keys securely

### 4. Get Your API Keys

#### OpenAI API Key (Required)

1. Go to [OpenAI Platform](https://platform.openai.com/api-keys)
2. Create a new API key
3. You'll enter this in the app's Settings screen

#### Inworld API Key (Optional)

1. Sign up at [Inworld AI](https://www.inworld.ai/)
2. Navigate to the API section and create a new key
3. Enter this in the app's Settings screen if you want to use Inworld TTS

#### ElevenLabs API Key (Optional)

1. Sign up at [ElevenLabs](https://elevenlabs.io/)
2. Go to your profile settings
3. Copy your API key
4. Enter this in the app's Settings screen if you want to use ElevenLabs TTS

### 4. Running the App

#### Start Development Server

```bash
npm run dev
```

This will start the Expo development server. You can then:

- Press `i` to open iOS Simulator
- Press `a` to open Android Emulator
- Scan the QR code with Expo Go app on your physical device

#### Build for Production

For iOS:
```bash
npx expo build:ios
```

For Android:
```bash
npx expo build:android
```

For Web:
```bash
npm run build:web
```

## Using the App

### First Time Setup

1. **Sign Up**: Open the app and navigate to the Settings tab
2. **Create Account**: Enter your email and password, then tap "Sign Up"
3. **Add API Keys**: Enter your OpenAI API key (required) and optionally your Inworld or ElevenLabs keys
4. **Select TTS Provider**: Choose your preferred TTS provider (OpenAI, Inworld, or ElevenLabs)
5. **Save Settings**: Tap "Save Settings"

### Translating Audio

1. **Go to Home Tab**: Navigate to the Home screen
2. **Select Languages**: Choose your source and target languages from the dropdowns
3. **Enable Conversation Mode** (Optional): Toggle this on for automatic language switching
4. **Record**: Tap the microphone button and start speaking
5. **Stop Recording**: Tap the stop button when finished
6. **View Results**: See the transcribed text and translation in realtime
7. **Listen**: The translated audio will automatically play

### Viewing History

1. **Go to History Tab**: Navigate to the History screen
2. **View Past Translations**: Scroll through your translation history
3. **Replay Audio**: Tap "Play Translation" to hear the translated audio again
4. **Delete Items**: Tap the trash icon to delete individual translations
5. **Clear All**: Tap "Clear All" to delete your entire history

## Supported Languages

**50+ languages** including all major Indian languages and international languages:

### Indian Languages (10)
- Hindi (हिन्दी)
- Tamil (தமிழ்)
- Telugu (తెలుగు)
- Kannada (ಕನ್ನಡ)
- Malayalam (മലയാളം)
- Marathi (मराठी)
- Bengali (বাংলা)
- Gujarati (ગુજરાતી)
- Punjabi (ਪੰਜਾਬੀ)
- Urdu (اردو)

### Major International Languages
- English
- Spanish (Español)
- French (Français)
- German (Deutsch)
- Japanese (日本語)
- Chinese/Mandarin (中文)
- Korean (한국어)
- Arabic (العربية)
- Russian (Русский)
- Portuguese (Português)
- Italian (Italiano)

### Additional Languages (30+)
Turkish, Polish, Dutch, Swedish, Danish, Norwegian, Finnish, Greek, Czech, Hungarian, Thai, Vietnamese, Indonesian, Malay, Filipino, Hebrew, Persian, Ukrainian, Romanian, Bulgarian, Slovak, Croatian, Serbian, Catalan, Swahili, and more

**Note on Indian Languages:**
- All Indian languages are fully supported by OpenAI Whisper for transcription
- GPT-4o-mini provides high-quality translation for all listed Indian languages
- TTS works with OpenAI TTS (uses universal voices), Inworld (language-specific voices), and ElevenLabs (multilingual support)
- The app displays language names in their native scripts (தமிழ், తెలుగు, ಕನ್ನಡ, മലയാളം, etc.) for easier selection

## Architecture

### Services

- **audioService**: Handles audio recording and playback using expo-av
- **openaiService**: Manages OpenAI API calls for Whisper STT and GPT translation
- **ttsService**: Handles text-to-speech generation with multiple providers
- **translationService**: Orchestrates the entire translation flow

### Database Schema

#### conversation_history
- Stores all translation records
- Includes source/translated text and audio URLs
- Protected by Row Level Security (RLS)

#### user_settings
- Stores user preferences and API keys
- Includes default languages and TTS provider selection
- Protected by Row Level Security (RLS)

#### storage.audio-files
- Supabase Storage bucket for audio files
- Organized by user ID
- Protected by storage policies

## Performance Optimization

- **Streaming APIs**: Uses streaming for GPT translation to reduce perceived latency
- **Parallel Processing**: Transcription and translation happen in parallel where possible
- **Efficient Audio**: Uses high-quality compression for audio files
- **Caching**: Audio files are cached locally for faster playback

## Security

- API keys are stored securely in Supabase database
- Row Level Security (RLS) ensures users can only access their own data
- Audio files are stored with user-specific paths and access policies
- HTTPS/TLS for all API communications

## Troubleshooting

### Microphone Permissions

If you're having issues with audio recording:

**iOS**:
- Go to Settings > Privacy > Microphone
- Enable microphone access for Expo Go or your app

**Android**:
- Go to Settings > Apps > Your App > Permissions
- Enable microphone permission

### API Key Issues

If translations aren't working:
- Verify your OpenAI API key is correct
- Check your OpenAI account has credits/active subscription
- Make sure you saved settings after entering the API key

### Audio Playback Issues

If audio isn't playing:
- Check your device volume
- Try restarting the app
- Verify your TTS provider API key is correct

## Development

### Project Structure

```
project/
├── app/                    # Expo Router screens
│   ├── (tabs)/            # Tab navigation screens
│   │   ├── index.tsx      # Home screen
│   │   ├── history.tsx    # History screen
│   │   └── settings.tsx   # Settings screen
│   └── _layout.tsx        # Root layout
├── components/            # Reusable components
│   └── LanguagePicker.tsx
├── contexts/              # React contexts
│   └── AuthContext.tsx
├── services/              # Business logic services
│   ├── audioService.ts
│   ├── openaiService.ts
│   ├── ttsService.ts
│   └── translationService.ts
├── lib/                   # Utilities
│   ├── supabase.ts
│   └── constants.ts
└── types/                 # TypeScript types
    └── index.ts
```

### Adding New Languages

To add support for a new language:

1. Open `lib/constants.ts`
2. Add the language to the `SUPPORTED_LANGUAGES` array:

```typescript
{ code: 'xx', name: 'Language Name', nativeName: 'Native Name' }
```

3. Update voice mappings in `services/ttsService.ts` if needed

## Contributing

This is a starter template. Feel free to customize and extend it for your needs.

## License

MIT License - feel free to use this project for personal or commercial purposes.

## Credits

- Built with [Expo](https://expo.dev/)
- Powered by [OpenAI](https://openai.com/)
- Backend by [Supabase](https://supabase.com/)
- Optional TTS by [Inworld AI](https://www.inworld.ai/) and [ElevenLabs](https://elevenlabs.io/)

## Support

For issues or questions:
1. Check the Troubleshooting section above
2. Review the [Expo Documentation](https://docs.expo.dev/)
3. Check [OpenAI API Documentation](https://platform.openai.com/docs)
4. Review [Supabase Documentation](https://supabase.com/docs)
