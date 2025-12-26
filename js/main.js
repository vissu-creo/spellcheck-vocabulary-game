import { dictionary } from './data/dictionary-data.js?v=2';
import { SpellEngine } from './core/spell-engine.js?v=2';
import { GameState } from './core/game-state.js?v=2';
import { UIManager } from './ui/ui-manager.js?v=2';
import { AudioManager } from './core/audio-manager.js?v=2';
import { GameController } from './core/game-controller.js?v=2';
import { DictionaryService } from './services/dictionary-service.js?v=2';

// Initialize Components
const dictionaryService = new DictionaryService(dictionary);
const spellEngine = new SpellEngine(dictionary); // Keep for fallback or analysis
const gameState = new GameState();
const uiManager = new UIManager();
const audioManager = new AudioManager();
const gameController = new GameController(dictionaryService, audioManager, spellEngine, gameState, uiManager);

// DOM Elements
const inputElement = document.getElementById('word-input');
const playAudioBtn = document.getElementById('play-audio-btn');
const resultsContainer = document.getElementById('results-container');
const startScreen = document.getElementById('start-screen');
const gameArea = document.getElementById('game-area');
const startBtn = document.getElementById('start-game-btn');

// Start Game Flow
startBtn.addEventListener('click', () => {
    // 1. Hide Start Screen
    startScreen.classList.add('hidden');
    gameArea.classList.remove('hidden');

    // 2. Initialize Audio (Unlock AudioContext)
    // Just playing a silent sound or resuming context if we had one
    // The AudioManager uses speechSynthesis which is usually unlocked by click

    // 3. Start the Game
    gameController.startRound();
    inputElement.focus();
});

// Event Listeners
inputElement.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
        const input = inputElement.value.trim();
        if (input) {
            gameController.checkAnswer(input);
        }
    }
});

playAudioBtn.addEventListener('click', () => {
    gameController.playAudio();
});

// Delegate event for dynamic "Next Word" button
resultsContainer.addEventListener('click', (e) => {
    if (e.target && e.target.id === 'next-word-btn') {
        gameController.startRound();
    }
});

console.log('Lexicon initialized. Waiting for user to start.');
