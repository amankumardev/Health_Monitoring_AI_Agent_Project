export type TTSState = 'idle' | 'speaking' | 'paused';

export interface TextToSpeechService {
  speak(text: string, lang?: string): Promise<void>;
  pause(): void;
  resume(): void;
  stop(): void;
  isSupported(): boolean;
  setPreferredVoice(voiceName: string | null): void;
  onStateChange?: (state: TTSState) => void;
  onEnd?: () => void;
}

export class BrowserTextToSpeech implements TextToSpeechService {
  private utterance: SpeechSynthesisUtterance | null = null;
  private preferredVoice: string | null = null;

  onStateChange?: (state: TTSState) => void;
  onEnd?: () => void;

  isSupported(): boolean {
    return typeof window !== 'undefined' && 'speechSynthesis' in window;
  }

  setPreferredVoice(voiceName: string | null) {
    this.preferredVoice = voiceName;
  }

  private stripMarkdown(text: string): string {
    return text
      .replace(/\*\*(.+?)\*\*/g, '$1')
      .replace(/\*(.+?)\*/g, '$1')
      .replace(/⚠️/g, 'Warning: ')
      .replace(/📋/g, '')
      .replace(/🩺/g, '')
      .replace(/❤️/g, '')
      .replace(/•/g, '-')
      .replace(/#{1,6}\s/g, '')
      .replace(/\[.+?\]\(.+?\)/g, '')
      .replace(/Source:.*$/gm, '')
      .trim();
  }

  async speak(text: string, lang: string = 'en-US'): Promise<void> {
    if (!this.isSupported()) {
      this.onEnd?.();
      return;
    }

    this.stop();

    const cleanText = this.stripMarkdown(text);
    if (!cleanText) {
      this.onEnd?.();
      return;
    }

    this.utterance = new SpeechSynthesisUtterance(cleanText);
    this.utterance.lang = lang;
    this.utterance.rate = 1.0;
    this.utterance.pitch = 1.0;

    const voices = window.speechSynthesis.getVoices();
    if (this.preferredVoice) {
      const voice = voices.find(v => v.name === this.preferredVoice);
      if (voice) this.utterance.voice = voice;
    } else {
      const languageCode = lang.split('-')[0];
      const langVoice = voices.find(v => v.lang === lang) || voices.find(v => v.lang.split('-')[0] === languageCode);
      if (langVoice) this.utterance.voice = langVoice;
    }

    this.utterance.onstart = () => {
      this.onStateChange?.('speaking');
    };

    this.utterance.onend = () => {
      this.onStateChange?.('idle');
      this.onEnd?.();
    };

    this.utterance.onerror = () => {
      this.onStateChange?.('idle');
      this.onEnd?.();
    };

    this.utterance.onpause = () => {
      this.onStateChange?.('paused');
    };

    this.utterance.onresume = () => {
      this.onStateChange?.('speaking');
    };

    window.speechSynthesis.speak(this.utterance);
  }

  pause(): void {
    if (this.isSupported() && window.speechSynthesis.speaking) {
      window.speechSynthesis.pause();
    }
  }

  resume(): void {
    if (this.isSupported() && window.speechSynthesis.paused) {
      window.speechSynthesis.resume();
    }
  }

  stop(): void {
    if (this.isSupported()) {
      window.speechSynthesis.cancel();
      this.onStateChange?.('idle');
    }
  }

  getAvailableVoices(): SpeechSynthesisVoice[] {
    if (!this.isSupported()) return [];
    return window.speechSynthesis.getVoices();
  }
}

export function createTextToSpeech(): TextToSpeechService {
  return new BrowserTextToSpeech();
}

export const supportedLanguages = [
  { code: 'en-US', label: 'English (US)' },
  { code: 'en-GB', label: 'English (UK)' },
  { code: 'hi-IN', label: 'Hindi' },
  { code: 'ne-NP', label: 'Nepali' },
  { code: 'es-ES', label: 'Spanish' },
  { code: 'fr-FR', label: 'French' },
  { code: 'de-DE', label: 'German' },
  { code: 'ja-JP', label: 'Japanese' },
  { code: 'zh-CN', label: 'Chinese (Mandarin)' },
];
