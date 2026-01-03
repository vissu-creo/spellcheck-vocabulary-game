const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');
const crypto = require('crypto');

const PORT = process.env.PORT || 8095;

// Session-based word tracking to prevent repetition
const seenWords = new Set();

// User sessions: sessionId -> { username, level, score, previousRank }
const sessions = new Map();

// Leaderboards per difficulty level
const leaderboards = {
    easy: [],
    medium: [],
    hard: []
};

// Word Buffers for high-scale performance
const wordBuffers = {
    easy: [],
    medium: [],
    hard: []
};

// Thresholds for replenishment
const BUFFER_TARGET = 100;
const BUFFER_THRESHOLD = 20;

// Shuffling helper (Fisher-Yates)
function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

// Auto-cleanup inactive sessions (2-hour safety net)
const SESSION_TIMEOUT = 2 * 60 * 60 * 1000;
setInterval(() => {
    const now = Date.now();
    for (const [sid, session] of sessions.entries()) {
        if (now - session.lastSeen > SESSION_TIMEOUT) {
            console.log(`Safety-net cleanup for orphaned session: ${sid} (${session.username})`);
            sessions.delete(sid);
            removeFromLeaderboard(session.username, session.level);
        }
    }
}, 300000); // Check every 5 minutes

function removeFromLeaderboard(username, level) {
    if (!level || !leaderboards[level]) return;
    const usernameLower = username.toLowerCase();
    const board = leaderboards[level];
    const index = board.findIndex(e => e.username.toLowerCase() === usernameLower);
    if (index !== -1) {
        board.splice(index, 1);
        saveLeaderboard();
    }
}

// Leaderboard file path
const LEADERBOARD_FILE = './leaderboard.json';

const MIME_TYPES = {
    '.html': 'text/html',
    '.js': 'text/javascript',
    '.css': 'text/css',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon',
    '.txt': 'text/plain',
    '.xml': 'application/xml',
};

// Load leaderboard from file on startup
function loadLeaderboard() {
    // Disabled persistence for "Live-Only" behavior
    leaderboards.easy = [];
    leaderboards.medium = [];
    leaderboards.hard = [];
    console.log('Leaderboard initialized (Memory-only)');
}

// Save leaderboard to file
function saveLeaderboard() {
    // Disabled persistence for "Live-Only" behavior
}

// Initialize leaderboard
loadLeaderboard();

const server = http.createServer(async (req, res) => {
    console.log(`[${new Date().toISOString()}] Request: ${req.method} ${req.url}`);

    try {
        const parsedUrl = url.parse(req.url, true);

        // API Endpoint: /api/random-word
        if (parsedUrl.pathname === '/api/random-word') {
            await handleRandomWord(req, res);
            return;
        }

        // API Endpoint: /api/session/create
        if (parsedUrl.pathname === '/api/session/create' && req.method === 'POST') {
            await handleCreateSession(req, res);
            return;
        }

        // API Endpoint: /api/session/end
        if (parsedUrl.pathname === '/api/session/end' && req.method === 'POST') {
            await handleEndSession(req, res);
            return;
        }

        // API Endpoint: /api/session/submit-answer
        if (parsedUrl.pathname === '/api/session/submit-answer' && req.method === 'POST') {
            await handleSubmitAnswer(req, res);
            return;
        }

        // API Endpoint: /api/leaderboard
        if (parsedUrl.pathname === '/api/leaderboard') {
            await handleGetLeaderboard(req, res);
            return;
        }

        // API Endpoint: /api/check-username
        if (parsedUrl.pathname === '/api/check-username') {
            await handleCheckUsername(req, res);
            return;
        }

        // API Endpoint: /api/reset-session
        if (parsedUrl.pathname === '/api/reset-session') {
            seenWords.clear();
            console.log("Session reset: seenWords cleared.");
            res.writeHead(200, {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            });
            res.end(JSON.stringify({ message: "Session reset. Seen words cleared." }));
            return;
        }

        // Serve Static Files
        let filePath = '.' + parsedUrl.pathname;
        if (filePath === './') {
            filePath = './index.html';
        }

        const extname = path.extname(filePath);
        const contentType = MIME_TYPES[extname] || 'application/octet-stream';

        fs.readFile(filePath, (error, content) => {
            if (error) {
                if (error.code === 'ENOENT') {
                    res.writeHead(404);
                    res.end('404 Not Found');
                } else {
                    console.error(`File Error: ${error.code}`);
                    res.writeHead(500);
                    res.end('500 Internal Server Error: ' + error.code);
                }
            } else {
                res.writeHead(200, { 'Content-Type': contentType });
                res.end(content, 'utf-8');
            }
        });
    } catch (err) {
        console.error("Critical Server Error:", err);
        res.writeHead(500);
        res.end("Internal Server Error");
    }
});

async function getWordMetadata(word) {
    try {
        // Primary source: DictionaryAPI.dev (excellent for phonetics and examples)
        const dictUrl = `https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word)}`;
        const dictRes = await fetch(dictUrl);

        if (dictRes.ok) {
            const dictData = await dictRes.json();
            if (Array.isArray(dictData) && dictData.length > 0) {
                const entry = dictData[0];
                const meaning = entry.meanings[0];
                const definition = meaning && meaning.definitions[0] ? meaning.definitions[0].definition : null;
                const example = meaning && meaning.definitions[0] ? meaning.definitions[0].example : null;
                const phonetic = entry.phonetic || (entry.phonetics && entry.phonetics.find(p => p.text)?.text) || null;

                if (definition) {
                    return { definition, example, phonetic };
                }
            }
        }

        // Fallback: Wiktionary (if DictionaryAPI fails)
        const wiktionaryUrl = `https://en.wiktionary.org/api/rest_v1/page/definition/${encodeURIComponent(word)}`;
        const response = await fetch(wiktionaryUrl);
        if (response.ok) {
            const data = await response.json();
            const firstEntry = data.en ? data.en[0] : null;
            if (firstEntry && firstEntry.definitions && firstEntry.definitions.length > 0) {
                const defData = firstEntry.definitions[0];
                return {
                    definition: defData.definition.replace(/<[^>]*>?/gm, '').split('.')[0] + '.',
                    example: defData.examples && defData.examples.length > 0
                        ? defData.examples[0].replace(/<[^>]*>?/gm, '').split('.')[0] + '.'
                        : null,
                    phonetic: null // Wiktionary definition API rarely has simple IPA strings
                };
            }
        }
    } catch (e) {
        console.warn(`Failed to fetch metadata for ${word}: ${e.message}`);
    }
    return null;
}

// Replenish the word buffer for a specific level
let isReplenishing = { easy: false, medium: false, hard: false };

async function replenishBuffers(level = null) {
    const levels = level ? [level] : ['easy', 'medium', 'hard'];

    for (const lvl of levels) {
        if (isReplenishing[lvl]) continue;
        if (wordBuffers[lvl].length >= BUFFER_TARGET) continue;

        isReplenishing[lvl] = true;
        console.log(`[Buffer] Replenishing ${lvl} buffer... (Current: ${wordBuffers[lvl].length})`);

        try {
            const thresholds = {
                easy: { min: 50, max: 1000000 },
                medium: { min: 5, max: 50 },
                hard: { min: 0, max: 5 }
            };
            const target = thresholds[lvl];
            const alphabet = 'abcdefghijklmnopqrstuvwxyz';

            let attempts = 0;
            const maxAttempts = 10;
            const newWords = [];

            while (newWords.length < 100 && attempts < maxAttempts) {
                attempts++;
                const randomLetter = alphabet[Math.floor(Math.random() * alphabet.length)];
                const datamuseUrl = `https://api.datamuse.com/words?sp=${randomLetter}*&max=300&md=f`;

                const response = await fetch(datamuseUrl);
                if (!response.ok) continue;

                const data = await response.json();
                const candidates = data.filter(item => {
                    if (!item.word || !/^[a-zA-Z]+$/.test(item.word)) return false;
                    if (seenWords.has(item.word.toLowerCase())) return false;

                    const freqTag = (item.tags || []).find(t => t.startsWith('f:'));
                    const freq = freqTag ? parseFloat(freqTag.split(':')[1]) : 0;
                    return freq >= target.min && freq <= target.max;
                });

                // Pick a few from this batch to avoid taking everything from one letter
                const shuffledBatch = shuffleArray(candidates).slice(0, 15);

                for (const candidate of shuffledBatch) {
                    if (newWords.length >= 100) break;
                    // Check if already in buffer or seen
                    if (wordBuffers[lvl].some(w => w.term === candidate.word)) continue;

                    // Add basic data; metadata can be fetched on-demand or pre-fetched
                    newWords.push({
                        term: candidate.word,
                        origin: 'datamuse'
                    });
                }
            }

            wordBuffers[lvl].push(...newWords);
            shuffleArray(wordBuffers[lvl]);
            console.log(`[Buffer] ${lvl} replenished. New size: ${wordBuffers[lvl].length}`);
        } catch (err) {
            console.error(`[Buffer] Error replenishing ${lvl}:`, err);
        } finally {
            isReplenishing[lvl] = false;
        }
    }
}

// Initialize buffers on startup
setTimeout(() => replenishBuffers(), 1000);

async function handleRandomWord(req, res) {
    try {
        const parsedUrl = url.parse(req.url, true);
        const level = parsedUrl.query.level || 'easy';

        // Check buffer first
        if (wordBuffers[level] && wordBuffers[level].length > 0) {
            const wordData = wordBuffers[level].pop();

            // Check if we need to replenish in background
            if (wordBuffers[level].length < BUFFER_THRESHOLD) {
                replenishBuffers(level);
            }

            const metadata = await getWordMetadata(wordData.term);
            const termLower = wordData.term.toLowerCase();
            seenWords.add(termLower);

            const finalWord = {
                term: wordData.term,
                definition: metadata ? metadata.definition : "Definition not available.",
                example: metadata ? metadata.example : null,
                phonetic: metadata ? metadata.phonetic : null,
                audio: `https://ssl.gstatic.com/dictionary/static/sounds/oxford/${termLower}--_gb_1.mp3`
            };

            res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
            res.end(JSON.stringify(finalWord));
            return;
        }

        // Fallback: If buffer is empty
        console.warn(`[Buffer] ${level} buffer empty!`);
        replenishBuffers(level);

        res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
        res.end(JSON.stringify({
            term: "vocabulary",
            definition: "The body of words used in a particular language.",
            audio: "https://ssl.gstatic.com/dictionary/static/sounds/oxford/vocabulary--_gb_1.mp3"
        }));
    } catch (error) {
        console.error('Error in handleRandomWord:', error);
        res.writeHead(500, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
        res.end(JSON.stringify({ error: 'Internal server error' }));
    }
}

function sendWordResponse(res, entry, extraSynonyms = [], localEntry = null) {
    // Find audio
    let audioUrl = null;
    if (entry.phonetics) {
        const withAudio = entry.phonetics.find(p => p.audio && p.audio.length > 0);
        if (withAudio) audioUrl = withAudio.audio;
    }

    // Find definition and example
    let definition = "No definition available.";
    let example = "";
    let partOfSpeech = "word";
    let synonyms = [];

    if (entry.meanings && entry.meanings.length > 0) {
        // Find the first definition and part of speech
        const firstMeaning = entry.meanings[0];
        partOfSpeech = firstMeaning.partOfSpeech || 'word';
        if (firstMeaning.definitions && firstMeaning.definitions.length > 0) {
            definition = firstMeaning.definitions[0].definition || definition;
        }

        // Search for the first available example across ALL meanings and definitions
        for (const meaning of entry.meanings) {
            if (meaning.definitions) {
                for (const def of meaning.definitions) {
                    if (def.example && def.example.trim().length > 0) {
                        example = def.example;
                        break;
                    }
                }
            }
            if (example) break;
        }

        // Aggregate ALL unique synonyms across ALL meanings + extra synonyms
        const synonymSet = new Set();

        // Add extra synonyms first (often higher quality from Datamuse)
        extraSynonyms.forEach(s => synonymSet.add(s.toLowerCase()));

        for (const meaning of entry.meanings) {
            if (meaning.synonyms) {
                meaning.synonyms.forEach(s => synonymSet.add(s.toLowerCase()));
            }
            if (meaning.definitions) {
                for (const def of meaning.definitions) {
                    if (def.synonyms) {
                        def.synonyms.forEach(s => synonymSet.add(s.toLowerCase()));
                    }
                }
            }
        }
        synonyms = Array.from(synonymSet).slice(0, 8); // Show up to 8 synonyms
    }

    // Fallback example if none found in API
    if (!example) {
        // Try local dictionary example first
        if (localEntry && localEntry.example) {
            example = localEntry.example;
        } else {
            // Smarter template for words without any examples
            example = `Usage: "${entry.word}" is a ${partOfSpeech} used to describe something that is ${definition.toLowerCase().replace(/\.$/, '')}.`;
        }
    }

    const responseData = {
        term: entry.word,
        phonetic: entry.phonetic || '',
        audio: audioUrl,
        partOfSpeech: partOfSpeech,
        definition: definition,
        example: example,
        synonyms: synonyms,
        type: "word"
    };

    res.writeHead(200, {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
    });
    res.end(JSON.stringify(responseData));
}

// Helper to parse JSON body from request
function parseJsonBody(req) {
    return new Promise((resolve, reject) => {
        let body = '';
        req.on('data', chunk => { body += chunk.toString(); });
        req.on('end', () => {
            try {
                resolve(JSON.parse(body));
            } catch (e) {
                reject(e);
            }
        });
        req.on('error', reject);
    });
}

// Helper to get user's rank in a leaderboard
function getUserRank(leaderboard, sessionId) {
    const index = leaderboard.findIndex(entry => entry.sessionId === sessionId);
    return index === -1 ? leaderboard.length + 1 : index + 1;
}

// Helper to update leaderboard with new score
function updateLeaderboard(level, sessionId, username, score) {
    const board = leaderboards[level];

    // Remove existing entries for this USERNAME or SESSION to keep it unique per user
    const usernameLower = username.toLowerCase();
    const existingIndex = board.findIndex(entry =>
        entry.sessionId === sessionId || entry.username.toLowerCase() === usernameLower
    );

    if (existingIndex !== -1) {
        board.splice(existingIndex, 1);
    }

    // Add new entry
    board.push({ sessionId, username, score, updatedAt: Date.now() });

    // Sort by score descending
    board.sort((a, b) => b.score - a.score);

    // Keep only top 100 entries
    if (board.length > 100) {
        board.length = 100;
    }

    // Save to file
    saveLeaderboard();
    console.log(`Leaderboard updated for ${username} at ${level}: ${score} pts`);

    return getUserRank(board, sessionId);
}

// Handle POST /api/session/create
async function handleCheckUsername(req, res) {
    try {
        const parsedUrl = url.parse(req.url, true);
        const username = parsedUrl.query.username;
        const level = parsedUrl.query.level;

        if (!username) {
            res.writeHead(400, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
            res.end(JSON.stringify({ error: 'Username is required' }));
            return;
        }

        const cleanUsername = username.trim().slice(0, 20).replace(/[^a-zA-Z0-9_]/g, '');
        if (cleanUsername.length < 3) {
            res.writeHead(400, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
            res.end(JSON.stringify({ error: 'Username must be at least 3 characters' }));
            return;
        }

        const usernameLower = cleanUsername.toLowerCase();
        const currentSessionId = parsedUrl.query.sessionId;
        let isTaken = false;

        // Check if there is an ACTIVE session with this name in the same mode
        // BUT exclude the user's current session if they are refreshing/restarting
        if (level) {
            isTaken = Array.from(sessions.entries()).some(([sid, s]) =>
                sid !== currentSessionId && s.username.toLowerCase() === usernameLower && s.level === level
            );
        } else {
            isTaken = Array.from(sessions.entries()).some(([sid, s]) =>
                sid !== currentSessionId && s.username.toLowerCase() === usernameLower
            );
        }

        res.writeHead(200, {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
        });
        res.end(JSON.stringify({ available: !isTaken }));
    } catch (error) {
        console.error('Error checking username:', error);
        res.writeHead(500, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
        res.end(JSON.stringify({ error: 'Internal server error' }));
    }
}

async function handleCreateSession(req, res) {
    try {
        const body = await parseJsonBody(req);
        const { username, level } = body;

        // Validate inputs
        if (!username || typeof username !== 'string') {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Username is required' }));
            return;
        }

        if (!['easy', 'medium', 'hard'].includes(level)) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Valid level (easy, medium, hard) is required' }));
            return;
        }

        // Clean username
        const cleanUsername = username.trim().slice(0, 20).replace(/[^a-zA-Z0-9_]/g, '');
        if (cleanUsername.length < 3) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Username must be at least 3 characters' }));
            return;
        }

        const usernameLower = cleanUsername.toLowerCase();
        const incomingSessionId = body.sessionId; // Optional, if they already have one

        // Check if an ACTIVE session already exists for ANOTHER player
        const activeOther = Array.from(sessions.entries()).find(([sid, s]) =>
            sid !== incomingSessionId && s.username.toLowerCase() === usernameLower && s.level === level
        );

        if (activeOther) {
            res.writeHead(409, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Username is already active in this level' }));
            return;
        }

        // If it's the SAME player restarting, we'll replace their session logic below.

        // For a fresh start, remove any previous leaderboard entry for this name
        removeFromLeaderboard(cleanUsername, level);

        // Generate or reuse session ID
        const sessionId = incomingSessionId && sessions.has(incomingSessionId)
            ? incomingSessionId
            : crypto.randomUUID();

        // Create/Update session
        const session = {
            username: cleanUsername,
            level: level,
            score: 0, // ALWAYS start fresh at 0 as requested
            previousRank: null,
            createdAt: Date.now(),
            lastSeen: Date.now()
        };
        sessions.set(sessionId, session);
        console.log(`Live session ${incomingSessionId ? 're-started' : 'created'}: ${sessionId} for user ${cleanUsername} at level ${level}`);

        // Initial rank
        const currentRank = getUserRank(leaderboards[level], sessionId);

        res.writeHead(200, {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
        });
        res.end(JSON.stringify({
            sessionId,
            username: cleanUsername,
            level,
            score: 0,
            rank: currentRank,
            totalPlayers: leaderboards[level].length
        }));
    } catch (error) {
        console.error('Error creating session:', error);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Failed to create session' }));
    }
}

async function handleEndSession(req, res) {
    try {
        const body = await parseJsonBody(req);
        const { sessionId } = body;

        if (sessionId && sessions.has(sessionId)) {
            const session = sessions.get(sessionId);
            console.log(`Ending session: ${sessionId} (${session.username})`);

            // Remove from active sessions
            sessions.delete(sessionId);

            // Remove from leaderboard to ensure total cleanup on exit/refresh
            removeFromLeaderboard(session.username, session.level);
        }

        res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
        res.end(JSON.stringify({ success: true }));
    } catch (error) {
        console.error('Error ending session:', error);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Failed to end session' }));
    }
}

// Handle POST /api/session/submit-answer
async function handleSubmitAnswer(req, res) {
    try {
        const body = await parseJsonBody(req);
        const { sessionId, correct } = body;

        // Validate session
        if (!sessionId || !sessions.has(sessionId)) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Invalid session' }));
            return;
        }

        const session = sessions.get(sessionId);
        session.lastSeen = Date.now(); // Track activity
        const previousRank = session.previousRank;

        // Update score
        if (correct === true) {
            session.score += 10;
        } else if (correct === false) {
            // No penalty for wrong answers (could add -5 if desired)
        }

        // Update leaderboard and get new rank
        const newRank = updateLeaderboard(session.level, sessionId, session.username, session.score);

        // Determine trend
        let trend = 'same';
        if (previousRank !== null) {
            if (newRank < previousRank) trend = 'up';
            else if (newRank > previousRank) trend = 'down';
        }

        session.previousRank = newRank;

        res.writeHead(200, {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
        });
        res.end(JSON.stringify({
            score: session.score,
            rank: newRank,
            trend: trend,
            totalPlayers: leaderboards[session.level].length
        }));
    } catch (error) {
        console.error('Error submitting answer:', error);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Failed to submit answer' }));
    }
}

// Handle GET /api/leaderboard
async function handleGetLeaderboard(req, res) {
    try {
        const parsedUrl = url.parse(req.url, true);
        const level = parsedUrl.query.level || 'easy';
        const sessionId = parsedUrl.query.sessionId;

        if (!['easy', 'medium', 'hard'].includes(level)) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Valid level (easy, medium, hard) is required' }));
            return;
        }

        const board = leaderboards[level];

        // Get top 10
        const top10 = board.slice(0, 10).map((entry, index) => ({
            rank: index + 1,
            username: entry.username,
            score: entry.score
        }));

        // Get current user info if sessionId provided
        let currentUser = null;
        if (sessionId && sessions.has(sessionId)) {
            const session = sessions.get(sessionId);
            const rank = getUserRank(board, sessionId);
            currentUser = {
                rank: rank,
                username: session.username,
                score: session.score,
                trend: session.previousRank !== null ?
                    (rank < session.previousRank ? 'up' : rank > session.previousRank ? 'down' : 'same') : 'same'
            };
        }

        res.writeHead(200, {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
        });
        res.end(JSON.stringify({
            level: level,
            top10: top10,
            currentUser: currentUser,
            totalPlayers: board.length
        }));
    } catch (error) {
        console.error('Error getting leaderboard:', error);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Failed to get leaderboard' }));
    }
}

server.on('error', (e) => {
    if (e.code === 'EADDRINUSE') {
        console.error(`Port ${PORT} in use, retrying...`);
        setTimeout(() => {
            server.close();
            server.listen(PORT);
        }, 1000);
    } else {
        console.error('Server Error:', e);
    }
});

server.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running at http://0.0.0.0:${PORT}/`);
    console.log(`API Endpoint: http://0.0.0.0:${PORT}/api/random-word`);
});
