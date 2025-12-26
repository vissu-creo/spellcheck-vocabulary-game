const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

const PORT = process.env.PORT || 8090;

// Session-based word tracking to prevent repetition
const seenWords = new Set();

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
};

const server = http.createServer(async (req, res) => {
    console.log(`[${new Date().toISOString()}] Request: ${req.method} ${req.url}`);

    try {
        const parsedUrl = url.parse(req.url, true);

        // API Endpoint: /api/random-word
        if (parsedUrl.pathname === '/api/random-word') {
            await handleRandomWord(req, res);
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

async function handleRandomWord(req, res) {
    try {
        // 1. Try to fetch from APIs first
        try {
            const alphabet = 'abcdefghijklmnopqrstuvwxyz';
            const randomLetter = alphabet[Math.floor(Math.random() * alphabet.length)];
            const datamuseUrl = `https://api.datamuse.com/words?sp=${randomLetter}*&max=100&md=f`;

            console.log(`Fetching from Datamuse: ${datamuseUrl}`);

            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 3000);

            const datamuseResponse = await fetch(datamuseUrl, { signal: controller.signal });
            clearTimeout(timeoutId);

            if (datamuseResponse.ok) {
                const datamuseData = await datamuseResponse.json();
                let candidates = datamuseData
                    .filter(item => item.word && /^[a-zA-Z]+$/.test(item.word))
                    .map(item => item.word)
                    .filter(word => !seenWords.has(word.toLowerCase()));

                if (candidates.length > 0) {
                    // Shuffle candidates
                    for (let i = candidates.length - 1; i > 0; i--) {
                        const j = Math.floor(Math.random() * (i + 1));
                        [candidates[i], candidates[j]] = [candidates[j], candidates[i]];
                    }

                    // Try to find a word with a definition
                    for (const word of candidates.slice(0, 10)) {
                        try {
                            const dictUrl = `https://api.dictionaryapi.dev/api/v2/entries/en/${word}`;
                            const dictController = new AbortController();
                            const dictTimeout = setTimeout(() => dictController.abort(), 2000);

                            const dictResponse = await fetch(dictUrl, { signal: dictController.signal });
                            clearTimeout(dictTimeout);

                            if (dictResponse.ok) {
                                const dictData = await dictResponse.json();
                                if (dictData && Array.isArray(dictData) && dictData.length > 0) {
                                    const entry = dictData[0];
                                    const term = entry.word.toLowerCase();

                                    if (!seenWords.has(term)) {
                                        seenWords.add(term);

                                        // Fetch extra synonyms from Datamuse for better coverage
                                        let extraSynonyms = [];
                                        try {
                                            const synUrl = `https://api.datamuse.com/words?rel_syn=${term}&max=10`;
                                            const synRes = await fetch(synUrl);
                                            if (synRes.ok) {
                                                const synData = await synRes.json();
                                                extraSynonyms = synData.map(s => s.word);
                                            }
                                        } catch (e) { console.warn("Datamuse syn fetch failed", e.message); }

                                        // Check local dictionary for a better example fallback
                                        let localEntry = null;
                                        try {
                                            const localData = JSON.parse(fs.readFileSync('./local-dictionary.json', 'utf8'));
                                            localEntry = localData.find(e => e.term.toLowerCase() === term);
                                        } catch (e) { console.warn("Local dict read failed", e.message); }

                                        console.log(`API Success: ${term} (Total seen: ${seenWords.size})`);
                                        return sendWordResponse(res, entry, extraSynonyms, localEntry);
                                    }
                                }
                            }
                        } catch (e) { continue; }
                    }
                }
            }
        } catch (apiError) {
            console.warn("API Fetch failed or timed out:", apiError.message);
        }

        // 2. Fallback to local dictionary
        console.log("Using local dictionary fallback...");
        const localData = JSON.parse(fs.readFileSync('./local-dictionary.json', 'utf8'));

        // Filter out seen words from local data
        let availableLocal = localData.filter(entry => !seenWords.has(entry.term.toLowerCase()));

        // If all local words are seen, reset the set (infinite loop)
        if (availableLocal.length === 0) {
            console.log("Local dictionary exhausted. Resetting seen words for this session.");
            seenWords.clear();
            availableLocal = localData;
        }

        const randomEntry = availableLocal[Math.floor(Math.random() * availableLocal.length)];
        seenWords.add(randomEntry.term.toLowerCase());

        console.log(`Local Success: ${randomEntry.term} (Total seen: ${seenWords.size})`);

        res.writeHead(200, {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
        });
        res.end(JSON.stringify(randomEntry));

    } catch (error) {
        console.error("Error in handleRandomWord:", error);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: error.message }));
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

server.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}/`);
    console.log(`API Endpoint: http://localhost:${PORT}/api/random-word`);
});
