// SessionService - Handles user sessions and leaderboard interactions
class SessionService {
    constructor() {
        this.sessionId = null;
        this.username = null;
        this.level = null;
        this.score = 0;
        this.rank = null;
    }

    // Create a new session
    async createSession(username, level) {
        try {
            const sid = sessionStorage.getItem('spellcheck_sessionId');
            const response = await fetch('/api/session/create', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, level, sessionId: sid })
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Failed to create session');
            }

            const data = await response.json();
            this.sessionId = data.sessionId;
            this.username = data.username;
            this.level = data.level;
            this.score = data.score;
            this.rank = data.rank;

            // Store session ID in sessionStorage for persistence
            sessionStorage.setItem('spellcheck_sessionId', this.sessionId);
            sessionStorage.setItem('spellcheck_username', this.username);
            sessionStorage.setItem('spellcheck_level', this.level);

            return data;
        } catch (error) {
            console.error('Error creating session:', error);
            throw error;
        }
    }

    // Submit an answer and update score
    async submitAnswer(correct) {
        if (!this.sessionId) {
            console.warn('No active session');
            return null;
        }

        try {
            const response = await fetch('/api/session/submit-answer', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ sessionId: this.sessionId, correct })
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Failed to submit answer');
            }

            const data = await response.json();
            this.score = data.score;
            this.rank = data.rank;

            return data;
        } catch (error) {
            console.error('Error submitting answer:', error);
            return null;
        }
    }

    // Get leaderboard data
    async getLeaderboard(level) {
        const targetLevel = level || this.level;
        if (!targetLevel) {
            console.warn('No level specified for leaderboard');
            return null;
        }

        try {
            const url = `/api/leaderboard?level=${targetLevel}${this.sessionId ? `&sessionId=${this.sessionId}` : ''}`;
            const response = await fetch(url);

            if (!response.ok) {
                throw new Error('Failed to fetch leaderboard');
            }

            return await response.json();
        } catch (error) {
            console.error('Error fetching leaderboard:', error);
            return null;
        }
    }

    // Get current session info
    getSessionInfo() {
        return {
            sessionId: this.sessionId,
            username: this.username,
            level: this.level,
            score: this.score,
            rank: this.rank
        };
    }

    // Check if session is active
    isActive() {
        return this.sessionId !== null;
    }

    // End current session
    async endSession() {
        const sid = this.sessionId || sessionStorage.getItem('spellcheck_sessionId');
        if (sid) {
            try {
                fetch('/api/session/end', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ sessionId: sid }),
                    keepalive: true // CRITICAL: Allows request to finish after tab close
                });
            } catch (error) {
                console.warn('Failed to notify server of session end:', error);
            }
        }

        this.sessionId = null;
        this.username = null;
        this.level = null;
        this.score = 0;
        this.rank = null;
        sessionStorage.removeItem('spellcheck_sessionId');
        sessionStorage.removeItem('spellcheck_username');
        sessionStorage.removeItem('spellcheck_level');
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = SessionService;
}
