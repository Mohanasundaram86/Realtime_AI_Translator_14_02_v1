# Setup Checklist ✅

Use this checklist to ensure everything is configured correctly.

## Initial Setup

- [ ] **Install dependencies**
  ```bash
  npm install
  ```

- [ ] **Get OpenAI API Key**
  - Go to https://platform.openai.com/api-keys
  - Click "Create new secret key"
  - Copy the key (starts with `sk-`)
  - Keep it somewhere safe temporarily

- [ ] **(Optional) Get Inworld API Key**
  - Visit https://www.inworld.ai/
  - Sign up and get API key

- [ ] **(Optional) Get ElevenLabs API Key**
  - Visit https://elevenlabs.io/
  - Sign up and get API key

## Running the App

- [ ] **Start development server**
  ```bash
  npm run dev
  ```

- [ ] **Open the app on your device**
  - iOS: Press `i` in terminal (opens simulator)
  - Android: Press `a` in terminal (opens emulator)
  - Physical device: Scan QR code with Expo Go app

## In-App Configuration

### Step 1: Create Account

- [ ] Open the app
- [ ] Navigate to **Settings** tab (bottom right)
- [ ] You should see "Sign In" or "Create Account" section
- [ ] Enter your email address
- [ ] Enter a strong password
- [ ] Tap **Sign Up**
- [ ] Wait for confirmation

**Expected result:** "Account created successfully" message appears

### Step 2: Add API Keys

- [ ] Still in Settings tab
- [ ] Find "API Keys" section
- [ ] Paste your **OpenAI API key** in the first field
  - Key should start with `sk-`
  - No spaces before or after
- [ ] (Optional) Add Inworld API key
- [ ] (Optional) Add ElevenLabs API key
- [ ] Select your preferred TTS provider (OpenAI recommended to start)
- [ ] Tap **Save Settings** button at the bottom
- [ ] Wait for "Settings saved successfully" message

**Expected result:** Green "Success" alert with "Settings saved successfully"

### Step 3: Set Default Languages (Optional)

- [ ] In Settings, scroll to "Default Languages" section
- [ ] Choose your preferred source language
- [ ] Choose your preferred target language
- [ ] Tap **Save Settings**

**Expected result:** These languages will be pre-selected on the Home screen

## Testing the Translation

### Step 4: Grant Microphone Permission

- [ ] Navigate to **Home** tab (bottom left)
- [ ] You should see "AI Translator" at the top
- [ ] Tap the large blue **microphone button**
- [ ] A permission dialog should appear

**On iOS:**
- [ ] Dialog says "Allow [App] to access your microphone?"
- [ ] Tap **Allow**

**On Android:**
- [ ] Dialog asks for microphone permission
- [ ] Tap **Allow** or **While using the app**

**On Web:**
- [ ] Browser asks for microphone access
- [ ] Click **Allow**

**Expected result:** Permission granted, no error appears

### Step 5: Make Your First Translation

- [ ] On Home screen, select your **Source Language**
- [ ] Select your **Target Language** (must be different)
- [ ] (Optional) Toggle **Conversation Mode** on/off
- [ ] Tap and hold the **microphone button**
- [ ] Speak clearly for 3-5 seconds in your source language
  - Example: "Hello, how are you today?"
- [ ] Release the button or tap **stop**
- [ ] Wait 2-5 seconds

**Expected results:**
1. "Transcribing audio..." appears
2. Your original text appears in the "Original Text" box
3. "Translating..." appears
4. Translated text appears in the "Translated Text" box
5. "Playing translation..." appears
6. You hear the translated audio playing

**Success!** ✅ Your app is working correctly!

## Common Issues

### ❌ "API Key Required" alert appears

**Problem:** You haven't added your OpenAI API key yet

**Solution:**
- [ ] Go to Settings tab
- [ ] Add your OpenAI API key
- [ ] Tap Save Settings
- [ ] Return to Home tab and try again

### ❌ "Sign In Required" alert appears

**Problem:** You're not signed in

**Solution:**
- [ ] Go to Settings tab
- [ ] Sign up for an account or sign in
- [ ] Return to Home tab and try again

### ❌ "Microphone Permission Required" alert appears

**Problem:** Microphone permissions not granted

**Solution:**
- [ ] Go to your device Settings
- [ ] Find the app permissions
- [ ] Enable Microphone permission
- [ ] Return to app and try again

### ❌ Recording starts but translation fails

**Problem:** Invalid API key or no OpenAI credits

**Solution:**
- [ ] Check your OpenAI API key is correct
- [ ] Go to https://platform.openai.com/account/billing
- [ ] Ensure you have credits or billing enabled
- [ ] Update API key in Settings if needed
- [ ] Try again

### ❌ Audio doesn't play

**Problem:** TTS provider issue or volume

**Solution:**
- [ ] Check your device volume is up
- [ ] Try a different TTS provider in Settings
- [ ] Make sure you have the right API key for selected provider
- [ ] Try OpenAI TTS (most reliable)

## Verification Checklist

After setup, verify everything works:

- [ ] Can sign in/out successfully
- [ ] Can save settings without errors
- [ ] Can select different languages
- [ ] Microphone button responds to taps
- [ ] Can record audio (button turns red, "Recording..." appears)
- [ ] Transcription shows original text
- [ ] Translation shows translated text
- [ ] Audio plays automatically after translation
- [ ] Translations appear in History tab
- [ ] Can play audio from history
- [ ] Can delete history items

## You're All Set! 🎉

If all items are checked, your app is fully configured and ready to use!

**Next Steps:**
- Try different language combinations
- Test conversation mode
- Save your favorite translations
- Adjust TTS provider for voice quality

**Need Help?**
- See [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) for detailed solutions
- See [README.md](./README.md) for full documentation
