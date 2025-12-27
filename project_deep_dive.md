# Lexicon: Technical Deep Dive

This document provides a detailed explanation of the architecture, technical decisions, and "premium" features that make Lexicon a robust and polished application.

---

## 🏗️ Architecture Overview

Lexicon follows a **Client-Server architecture** to handle complex data fetching and provide a seamless user experience.

### 1. The Backend (`server.js`)
The Node.js server acts as the "brain" of the application. It's not just serving files; it's a smart proxy.
- **API Proxying**: Instead of the browser calling external APIs directly (which often causes CORS errors), the server fetches data from `Datamuse` and `DictionaryAPI`.
- **Dual-Source Aggregation**: For every word, the server fetches synonyms from both APIs and merges them into a unique, high-quality list.
- **The Fallback Engine**: This is critical. If the internet APIs return a word without a usage example, the server automatically checks `local-dictionary.json` for a hand-crafted, real-world example.
- **Session Management**: It tracks `seenWords` in memory to ensure a user never gets the same word twice in one session.

### 2. The Frontend (`js/`)
The frontend is modularized into specialized services:
- **`audio-manager.js`**: Handles the "Premium Voice." It first tries to fetch a high-quality stream from Google Translate's TTS. If that fails (e.g., rate limiting), it seamlessly falls back to the browser's native `SpeechSynthesis`.
- **`game-controller.js`**: Manages the "Game Loop." It coordinates between the dictionary service, the spell engine, and the UI.
- **`ui-manager.js`**: Handles the "Glassmorphism" and "Animations." It ensures that transitions between words are smooth and that feedback (Correct/Incorrect) is visually clear.

---

## ✨ Key Technical Features

### 1. Premium UI (CSS Mastery)
- **Organic Background**: We used a "Mesh Gradient" technique. By overlapping four large, blurred radial gradients and animating their positions with a slow `cubic-bezier` curve, we created a background that feels "alive" but isn't distracting.
- **Glassmorphism**: By using `backdrop-filter: blur()`, we created UI cards that look like frosted glass. This allows the animated background to peek through while keeping the text perfectly readable.

### 2. Smart Vocabulary System
- **Infinite Variety**: By picking a random letter and querying the Datamuse API, we ensure the game has access to millions of words.
- **Local Fallback**: We expanded `local-dictionary.json` with 500+ "premium" words. These act as a safety net, ensuring that even if the external APIs are down or low-quality, the user always gets a great experience.

### 3. Deployment Strategy
- **Render (Singapore)**: We chose the Singapore region to minimize latency for users in India.
- **Dynamic Porting**: The server is configured to use `process.env.PORT`, allowing it to run on any cloud platform (Render, Heroku, Railway) without code changes.

---

## 🧪 Testing & Quality Assurance

We didn't just write code; we verified it at every step:
- **`verify_examples.js`**: A script we used to iterate through dozens of words to ensure the fallback logic correctly picked up local examples when API examples were missing.
- **`browser_subagent`**: We used automated browser testing to verify that the animations were smooth (60fps) and that the "Glassy" UI looked correct on different screen sizes.
- **Audio Overlap Fix**: We implemented logic to `stop()` any ongoing audio before starting a new word, preventing the "robotic overlap" bug.

---

## 💡 Useful Information for Future Updates
- **Adding Words**: To add more "guaranteed" high-quality words, simply add an entry to `local-dictionary.json`.
- **Scaling**: If the app gets thousands of users, the `seenWords` Set in `server.js` should be moved to a database (like Redis) to persist across server restarts.
- **PWA**: The next logical step is adding a `manifest.json` to make it installable on mobile devices.

Lexicon is more than a game; it's a demonstration of how **thoughtful fallbacks** and **premium aesthetics** can turn a simple idea into a high-end product.
