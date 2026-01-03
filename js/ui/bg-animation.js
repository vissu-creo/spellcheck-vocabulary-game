/**
 * SLOW-MOTION FALLING LETTERS BACKGROUND
 * Spawns random letters with randomized slow-motion falling animations.
 */

class BackgroundAnimation {
    constructor() {
        this.container = document.getElementById('letters-bg');
        this.letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
        this.maxLetters = 60; // Increased for more "eye candy" density
        this.currentLetterCount = 0;

        if (this.container) {
            this.init();
        }
    }

    init() {
        // Initial burst
        for (let i = 0; i < 15; i++) {
            setTimeout(() => this.createLetter(), Math.random() * 5000);
        }

        // Continuous cycle
        setInterval(() => {
            if (this.currentLetterCount < this.maxLetters) {
                this.createLetter();
            }
        }, 800); // Slightly faster spawn for better density
    }

    createLetter() {
        const letter = document.createElement('div');
        const char = this.letters[Math.floor(Math.random() * this.letters.length)];

        letter.className = 'falling-letter';
        letter.textContent = char;

        // Randomize Properties
        const left = Math.random() * 100;
        const size = Math.random() * (60 - 20) + 20; // Increased: 20px to 60px
        const duration = Math.random() * (25 - 15) + 15; // 15s to 25s (SLOW MOTION)
        const delay = Math.random() * 10;

        // Random Vibrant subtle colors - Increased Opacity for "Eye Candy"
        const colors = [
            'rgba(129, 140, 248, 0.2)', // Indigo
            'rgba(16, 185, 129, 0.2)',  // Emerald
            'rgba(239, 44, 44, 0.2)',   // Red
            'rgba(245, 158, 11, 0.2)',  // Amber
            'rgba(6, 182, 212, 0.2)',   // Cyan
            'rgba(139, 92, 246, 0.2)'    // Violet
        ];
        const randomColor = colors[Math.floor(Math.random() * colors.length)];

        letter.style.left = `${left}%`;
        letter.style.fontSize = `${size}px`;
        letter.style.color = randomColor;
        // Add a very subtle glow using the same color
        letter.style.textShadow = `0 0 10px ${randomColor.replace('0.2', '0.1')}`;

        letter.style.animationDuration = `${duration}s`;
        letter.style.animationDelay = `-${delay}s`; // Start at random progress

        this.container.appendChild(letter);
        this.currentLetterCount++;

        // Cleanup
        letter.addEventListener('animationend', () => {
            letter.remove();
            this.currentLetterCount--;
        });
    }
}

// Start when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    new BackgroundAnimation();
});
