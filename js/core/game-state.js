export class GameState {
    constructor() {
        this.score = 0;
        this.correctCount = 0;
        this.level = 'easy';
    }

    setLevel(level) {
        this.level = level;
    }

    addScore(points) {
        // Simple scoring: 10 points per correct word
        this.score += 10;
        this.correctCount++;
    }

    getStats() {
        return {
            score: this.score,
            correctCount: this.correctCount
        };
    }
}
