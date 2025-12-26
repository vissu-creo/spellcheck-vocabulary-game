export class AudioManager {
    constructor() {
        this.synth = window.speechSynthesis;
        this.voice = null;

        // Load voices
        if (speechSynthesis.onvoiceschanged !== undefined) {
            speechSynthesis.onvoiceschanged = () => this.loadVoices();
        }
        this.loadVoices();
    }

    loadVoices() {
        const voices = this.synth.getVoices();
        // Prefer a clear English voice
        this.voice = voices.find(voice => voice.name.includes('Google US English')) ||
            voices.find(voice => voice.lang === 'en-US') ||
            voices[0];
    }

    speak(text) {
        this.stop();

        // Premium AI-Age Voice (Google Translate TTS)
        // This sounds much more natural than browser defaults
        const premiumUrl = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(text)}&tl=en&client=tw-ob`;

        this.currentAudio = new Audio(premiumUrl);
        this.currentAudio.play().catch(e => {
            console.warn("Premium TTS failed, falling back to browser TTS", e);

            // Fallback to browser TTS
            const utterance = new SpeechSynthesisUtterance(text);
            if (this.voice) {
                utterance.voice = this.voice;
            }
            utterance.rate = 0.85;
            utterance.pitch = 1.05;
            this.synth.speak(utterance);
        });
    }

    stop() {
        // Stop Premium Audio
        if (this.currentAudio) {
            this.currentAudio.pause();
            this.currentAudio.currentTime = 0;
        }
        // Stop Browser TTS
        if (this.synth.speaking || this.synth.pending) {
            this.synth.cancel();
        }
    }
}
