import { dictionary } from './data/dictionary-data.js?v=2';
import { SpellEngine } from './core/spell-engine.js?v=2';
import { GameState } from './core/game-state.js?v=2';
import { UIManager } from './ui/ui-manager.js?v=2';
import { AudioManager } from './core/audio-manager.js?v=2';
import { GameController } from './core/game-controller.js?v=2';
import { DictionaryService } from './services/dictionary-service.js?v=2';

// Initialize Components
const dictionaryService = new DictionaryService(dictionary);
const spellEngine = new SpellEngine(dictionary);
const gameState = new GameState();
const uiManager = new UIManager();
const audioManager = new AudioManager();
const sessionService = new SessionService();
const gameController = new GameController(dictionaryService, audioManager, spellEngine, gameState, uiManager);
gameController.setSessionService(sessionService);

// DOM Elements
const inputElement = document.getElementById('word-input');
const playAudioBtn = document.getElementById('play-audio-btn');
const hintBtn = document.getElementById('hint-btn');
const resultsContainer = document.getElementById('results-container');
const startScreen = document.getElementById('start-screen');
const gameArea = document.getElementById('game-area');
const startBtn = document.getElementById('start-game-btn');
const startSessionBtn = document.getElementById('start-session-btn');
const usernameInput = document.getElementById('username-input');
const levelButtons = document.querySelectorAll('.level-btn');

// Helper to start the actual game
async function startGame() {
    const username = usernameInput.value.trim();
    const level = Array.from(levelButtons).find(btn => btn.classList.contains('active'))?.dataset.level || 'easy';

    if (username.length < 3) {
        uiManager.showUsernameModal();
        return;
    }

    try {
        uiManager.showLoading(true);
        // Create the session in backend
        const sessionData = await sessionService.createSession(username, level);

        // Set state and start
        gameState.setLevel(level);
        gameState.score = sessionData.score || 0;
        uiManager.updateStats(gameState.getStats());

        uiManager.showStartScreen(false);
        uiManager.showGameArea(true);

        // Fetch initial leaderboard
        const lbData = await sessionService.getLeaderboard();
        uiManager.updateLeaderboard(lbData);

        await gameController.startRound();
        inputElement.focus();
    } catch (err) {
        console.error('Start Game Error:', err);
        uiManager.showUsernameModal();
        uiManager.showUsernameError(err.message || "Failed to start session");
    } finally {
        uiManager.showLoading(false);
    }
}

// Start Game Flow
// 1. Initial Start Button -> Show Name Modal OR Start Game
startBtn.addEventListener('click', () => {
    const username = usernameInput.value.trim();
    if (username.length < 3) {
        uiManager.showUsernameModal();
        usernameInput.focus();
    } else {
        startGame();
    }
});

// 2. Name Modal -> Check Name -> Start Game immediately
startSessionBtn.addEventListener('click', async () => {
    const username = usernameInput.value.trim();
    const level = uiManager.getSelectedLevel();

    if (username.length < 3) {
        uiManager.showUsernameError("Username must be at least 3 characters");
        return;
    }

    try {
        uiManager.showLoading(true);
        // Level-aware check with current session ID (to allow refresh/restart)
        const sid = sessionStorage.getItem('spellcheck_sessionId');
        const response = await fetch(`/api/check-username?username=${encodeURIComponent(username)}&level=${level}&sessionId=${sid || ''}`);

        if (response.status === 409) {
            uiManager.showUsernameError("This name is currently being used in this level. Try another!");
            return;
        }

        if (!response.ok) throw new Error(`Server returned ${response.status}`);

        const data = await response.json();

        if (data.available === false) {
            uiManager.showUsernameError("Username already being used. Try another!");
            return;
        }

        // Available, proceed to start
        uiManager.showUsernameError("");
        uiManager.hideUsernameModal();

        // Start game immediately
        await startGame();

    } catch (err) {
        console.error('Continue Click Error:', err);
        uiManager.showUsernameError("Failed to verify username. Check connection.");
    } finally {
        uiManager.showLoading(false);
    }
});

// 3. Level Button Click (Dashboard behavior)
levelButtons.forEach(btn => {
    btn.addEventListener('click', async () => {
        const isInGame = !gameArea.classList.contains('hidden');

        levelButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        // If explicitly in game, we might want to prevent switching or handle it.
        // For now, if they click a level on the leaderboard panel header (which we'll add), it should refresh that view.
    });
});

// 4. Input Element Enter Key
inputElement.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
        const input = inputElement.value.trim();
        if (input) {
            gameController.checkAnswer(input);
        }
    }
});

// Robust Hint Mode Logic using state-based sync
let lastHintValue = '';

inputElement.addEventListener('input', (e) => {
    if (!inputElement.classList.contains('hint-mode')) return;

    const term = gameController.currentWord.term;
    const currentVal = inputElement.value;
    const cursor = inputElement.selectionStart;

    // Helper to check if a position is a "revealed" character (fixed)
    const isRevealed = (pos) => {
        if (pos < 0 || pos >= term.length) return true;
        return (pos === 0) ||
            (term.length > 4 && pos === term.length - 1) ||
            (term[pos] === ' ' || term[pos] === '-');
    };

    // Case 1: Length increased (Character added)
    if (currentVal.length > term.length) {
        const addedChar = currentVal[cursor - 1];
        let posToFill = cursor - 1;

        // Find the next available underscore to fill
        // If the user typed at a revealed position, move to the next underscore
        while (posToFill < term.length && isRevealed(posToFill)) {
            posToFill++;
        }

        if (posToFill < term.length) {
            const newVal = lastHintValue.substring(0, posToFill) + addedChar + lastHintValue.substring(posToFill + 1);
            inputElement.value = newVal;
            lastHintValue = newVal;

            // Move cursor to the next available slot
            let nextPos = posToFill + 1;
            while (nextPos < term.length && isRevealed(nextPos)) {
                nextPos++;
            }
            inputElement.setSelectionRange(nextPos, nextPos);
        } else {
            // No more underscores to fill, restore last value
            inputElement.value = lastHintValue;
            inputElement.setSelectionRange(lastHintValue.length, lastHintValue.length);
        }
    }
    // Case 2: Length decreased (Character deleted)
    else if (currentVal.length < term.length) {
        let posToClear = cursor; // The position where the char was removed

        // Find the previous non-revealed position to clear
        while (posToClear >= 0 && isRevealed(posToClear)) {
            posToClear--;
        }

        if (posToClear >= 0) {
            const newVal = lastHintValue.substring(0, posToClear) + '_' + lastHintValue.substring(posToClear + 1);
            inputElement.value = newVal;
            lastHintValue = newVal;
            inputElement.setSelectionRange(posToClear, posToClear);
        } else {
            // Cannot clear revealed chars, restore last value
            inputElement.value = lastHintValue;
            inputElement.setSelectionRange(cursor, cursor);
        }
    }
    // Case 3: Length is same (e.g., replacement or selection change)
    else {
        lastHintValue = currentVal;
    }
});

playAudioBtn.addEventListener('click', () => {
    gameController.playAudio();
});

hintBtn.addEventListener('click', () => {
    gameController.handleHint();
    // Initialize lastHintValue immediately after UI update
    lastHintValue = inputElement.value;
});

// Delegate event for dynamic "Next Word" button
resultsContainer.addEventListener('click', (e) => {
    if (e.target && e.target.id === 'next-word-btn') {
        gameController.startRound();
    }
});

// 5. Session Lifecycle Management
// Cleanup on exit (Tab close)
window.addEventListener('beforeunload', () => {
    if (sessionService.isActive()) {
        sessionService.endSession();
    }
});

// Lexicon initialization
(() => {
    // Note: We no longer call endSession on load to avoid clearing names during refresh.
    // Uniqueness is handled by sessionId matching in the backend.
    console.log('Lexicon initialized. Waiting for user to start.');
})();
