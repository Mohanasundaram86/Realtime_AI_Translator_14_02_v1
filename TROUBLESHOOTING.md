# Troubleshooting Guide

## 🔴 App Not Taking Input / Recording Not Working

### Quick Checklist

1. **Have you signed in?**
   - Go to Settings tab → Create an account or Sign In
   - Without an account, the app won't work

2. **Have you added your OpenAI API Key?**
   - Go to Settings tab
   - Enter your OpenAI API key in the "OpenAI API Key" field
   - Tap "Save Settings"
   - Get a key at: https://platform.openai.com/api-keys

3. **Have you granted microphone permissions?**
   - The app needs microphone access to record your voice
   - When you first tap the microphone button, you should see a permission request
   - See platform-specific instructions below

### Microphone Permission Issues

#### On iOS (iPhone/iPad)

If microphone isn't working:

1. Go to iPhone/iPad **Settings**
2. Scroll down and find **Expo Go** (or your app name)
3. Tap on it
4. Tap **Microphone**
5. Ensure it's toggled **ON** (green)
6. Return to the app and try again

Alternative method:
1. Go to iPhone/iPad **Settings**
2. Tap **Privacy & Security**
3. Tap **Microphone**
4. Find **Expo Go** or your app
5. Toggle it **ON**

#### On Android

If microphone isn't working:

1. Go to **Settings**
2. Tap **Apps** or **Applications**
3. Find and tap **Expo** or your app name
4. Tap **Permissions**
5. Tap **Microphone**
6. Select **Allow**
7. Return to the app and try again

Alternative method:
1. Long-press the app icon
2. Tap "App info" or the (i) icon
3. Tap **Permissions**
4. Enable **Microphone**

#### On Web Browser

If using the web version:

1. When you tap the microphone button, your browser will ask for permission
2. Click **Allow** when prompted
3. If you accidentally clicked "Block":
   - Click the lock icon (🔒) in the address bar
   - Find "Microphone" in the permissions list
   - Change it from "Block" to "Allow"
   - Refresh the page and try again

### Still Not Working?

Try these steps:

1. **Restart the app completely**
   - Close the app fully
   - Reopen it
   - Try recording again

2. **Check your API key is correct**
   - Go to Settings
   - Make sure your OpenAI API key starts with `sk-`
   - No extra spaces before or after
   - Click "Save Settings" after entering

3. **Test your microphone**
   - Try using your device's voice recorder or another app
   - Confirm your microphone actually works
   - Check if your device is muted

4. **Check your OpenAI account**
   - Visit https://platform.openai.com/
   - Ensure you have API credits or active billing
   - Check if your API key is valid and not expired

---

## 🔑 API Key Questions

### Why do I need to enter my own API key?

The app uses YOUR OpenAI account to:
- Keep your data private
- Let you control costs
- Avoid subscription fees to a third party
- Track your own usage

### Is my API key secure?

**YES!** Your API key is:
- Stored only in YOUR user account
- Protected by Row Level Security (RLS) in the database
- NOT visible to other users
- Only accessible by YOU when signed in
- Never shared or exposed to anyone else

### Where do I get an OpenAI API key?

1. Go to https://platform.openai.com/api-keys
2. Sign in or create an account
3. Click "Create new secret key"
4. Copy the key (starts with `sk-`)
5. Paste it in the app Settings → Save

**Important:** Keep your key private! Don't share it with anyone.

### Do I need to pay OpenAI?

Yes, OpenAI charges for API usage:
- Small cost per translation (typically $0.01-0.05 per minute of audio)
- You need to add billing info at https://platform.openai.com/account/billing
- You can set usage limits to control costs
- First-time users may get free credits

---

## 🎤 Audio Issues

### Recording starts but translation fails

**Possible causes:**

1. **Invalid API key**
   - Check your OpenAI API key in Settings
   - Make sure it's correct and saved

2. **No OpenAI credits**
   - Check your OpenAI account billing
   - Add payment method or credits

3. **Network connection**
   - Ensure you have internet connection
   - Try switching between WiFi and cellular

4. **Audio too short or too quiet**
   - Speak clearly for at least 2-3 seconds
   - Ensure you're close enough to the microphone

### Translated audio doesn't play

**Possible causes:**

1. **TTS provider issue**
   - Go to Settings
   - Try switching TTS provider (OpenAI/Inworld/ElevenLabs)
   - Make sure you have the API key for your selected provider

2. **Volume issues**
   - Check your device volume
   - Make sure media volume is up (not just ringer)

3. **Audio output**
   - Check if headphones are connected
   - Try switching to speaker or headphones

---

## 🌐 Translation Issues

### Translation is in the wrong language

1. Check your source and target language selections
2. Make sure they're not the same language
3. Try selecting languages again

### Translation quality is poor

1. Speak clearly and at a normal pace
2. Reduce background noise
3. Use a better microphone if possible
4. Try shorter phrases (10-20 seconds at a time)

### Translation takes too long

1. **Normal:** Translation typically takes 2-5 seconds
2. **Slow internet:** Check your connection speed
3. **Long audio:** Try shorter recordings
4. **Server load:** OpenAI servers may be busy, try again

---

## 👤 Account Issues

### Can't sign in

1. Check your email and password are correct
2. Check for typing errors
3. Ensure caps lock is off
4. Try the "Forgot Password" flow

### Can't sign up

1. Make sure you're using a valid email address
2. Password must be strong enough
3. Check your internet connection
4. Email might already be registered - try signing in instead

### Not receiving verification email

1. Check your spam/junk folder
2. Wait a few minutes
3. Try requesting another verification email
4. Check the email address is correct

---

## 📱 History Issues

### History not saving

1. Make sure you're signed in
2. Check you have internet connection
3. Try force-closing and reopening the app

### Can't play audio from history

1. Audio files might be loading
2. Check your internet connection
3. Try refreshing the history (pull down)

### History disappeared

1. Make sure you're signed into the same account
2. Check you didn't accidentally clear history
3. Pull down to refresh

---

## 🔧 General Issues

### App crashes or freezes

1. Close the app completely
2. Restart your device
3. Make sure you have the latest version
4. Clear app cache (in device settings)

### App is slow

1. Close other apps
2. Check your internet speed
3. Try on WiFi instead of cellular
4. Restart the app

### Features not working on Web

Some features work differently on web:
- Microphone requires browser permissions
- Audio recording may have browser compatibility issues
- Use Chrome, Safari, or Firefox for best results
- Mobile devices (iOS/Android) recommended for full features

---

## 📞 Getting More Help

### Error Messages

Take note of any error messages and:
1. Check this troubleshooting guide first
2. Try the suggested solutions
3. Take a screenshot if issue persists

### Platform-Specific Help

- **OpenAI Issues**: https://help.openai.com/
- **Expo/React Native**: https://docs.expo.dev/
- **Supabase**: https://supabase.com/docs

---

## ✅ Still Having Issues?

If none of these solutions work:

1. Note exactly what happens when you try to use the app
2. Check if there are any error messages
3. Try on a different device if possible
4. Check your OpenAI account status and billing
5. Ensure all API keys are correctly entered and saved
