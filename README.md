# Lexicon: Premium Spelling & Vocabulary Game

Lexicon is a polished, interactive web application designed to help children (and adults!) master spelling and expand their vocabulary in a calm, futuristic environment.

![Lexicon Preview](https://raw.githubusercontent.com/vissu-creo/spellcheck-vocabulary-game/main/preview.png) *(Note: Add your own screenshot here!)*

## ✨ Features

- **Premium Audio**: High-quality text-to-speech using Google Translate TTS with browser fallback.
- **Rich Word Examples**: Real-world usage examples for every word, using a smart fallback system (External APIs + Local Dictionary).
- **Comprehensive Synonyms**: Aggregated synonyms from multiple sources (Dictionary API + Datamuse) to provide deep context.
- **Organic UI**: A subtle, wavering animated background with glassmorphism effects for a premium, non-distracting experience.
- **Session Tracking**: Intelligent word selection that prevents repetition during a single session.

## 🚀 Getting Started

### Prerequisites
- [Node.js](https://nodejs.org/) (v18 or higher)

### Installation
1. Clone the repository:
   ```bash
   git clone https://github.com/vissu-creo/spellcheck-vocabulary-game.git
   cd spellcheck-vocabulary-game
   ```
2. Install dependencies (optional, as we use native fetch):
   ```bash
   npm install
   ```

### Running Locally
1. Start the server:
   ```bash
   npm start
   ```
2. Open your browser to `http://localhost:8090`.

## 🛠️ Tech Stack
- **Frontend**: Vanilla HTML5, CSS3 (Custom Animations & Glassmorphism), JavaScript (ES6+).
- **Backend**: Node.js (Native HTTP module).
- **APIs**: Free Dictionary API, Datamuse API, Google Translate TTS.

## 📝 License
This project is licensed under the ISC License.
