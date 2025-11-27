# Voice Notes

A voice-powered note-taking PWA with AI transcription.

## Features

- 🎙️ **Voice Input** - Record and transcribe notes using OpenAI Whisper
- 📝 **Multiple Lists** - Organize items in customizable lists (Inbox, To-Do, Shopping, Ideas)
- ✅ **Task Management** - Add, edit, complete, and delete items
- 📱 **PWA** - Install on your home screen for quick access
- 🔒 **Local Storage** - All data stored locally using IndexedDB
- 🌙 **Dark Mode** - Beautiful dark theme optimized for mobile

## Setup

### Prerequisites

- Node.js 18+
- OpenAI API key (for voice transcription)

### Installation

```bash
# Clone the repository
git clone https://github.com/michoest/notes.git
cd notes

# Install dependencies
npm install

# Generate PWA icons
node generate-icons.js

# Start development server
npm run dev
```

### Configuration

1. Open the app in your browser
2. Go to Settings
3. Enter your OpenAI API key
4. Start using voice input!

## Deployment

The app automatically deploys to GitHub Pages when you push to the `main` branch.

### Custom Domain

The app is configured for `notes.michoest.com`. To use your own domain:

1. Update `base` in `vite.config.js` to match your path (or `'/'` for root)
2. Update the URLs in the PWA manifest
3. Set up your CNAME record pointing to `<username>.github.io`

## iOS Quick Access

### Add to Home Screen

1. Open Safari and navigate to your app URL
2. Tap the Share button
3. Select "Add to Home Screen"

### Siri Shortcuts

Create shortcuts using these URLs:

- **Open app**: `https://notes.michoest.com/`
- **Quick voice add**: `https://notes.michoest.com/#/quick-add`
- **Open specific list**: `https://notes.michoest.com/#/list/shopping`

## Tech Stack

- **Vue 3** - Composition API with `<script setup>`
- **Vite** - Fast build tool with PWA plugin
- **Pinia** - State management
- **Dexie.js** - IndexedDB wrapper for offline storage
- **Tailwind CSS** - Utility-first styling
- **OpenAI Whisper** - Speech-to-text API

## License

MIT
