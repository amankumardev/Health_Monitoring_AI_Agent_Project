import { useEffect, useState, useCallback, useRef } from 'react';
import { createTextToSpeech, TTSState } from '@/lib/textToSpeech';

type SpeechRecognitionState = 'idle' | 'listening' | 'processing' | 'error';

export function useVoiceRecorder(lang: string = 'en-US') {
  const [sttState, setSttState] = useState<SpeechRecognitionState>('idle');
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState('');
  const [isSupported, setIsSupported] = useState(false);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  useEffect(() => {
    setIsSupported(typeof navigator !== 'undefined' && !!navigator.mediaDevices?.getUserMedia && typeof MediaRecorder !== 'undefined');
    return () => streamRef.current?.getTracks().forEach(track => track.stop());
  }, []);

  const startListening = useCallback(async () => {
    setError('');
    setTranscript('');
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
      setError('Audio recording is not supported in this browser. Please use Chrome, Edge, or another modern browser.');
      setSttState('error');
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      chunksRef.current = [];
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus') ? 'audio/webm;codecs=opus' : '';
      const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
      recorder.ondataavailable = event => { if (event.data.size > 0) chunksRef.current.push(event.data); };
      recorder.onerror = () => {
        setError('Recording failed. Please check microphone permission and try again.');
        setSttState('error');
      };
      recorder.start();
      recorderRef.current = recorder;
      setSttState('listening');
    } catch {
      setError('Microphone permission was denied or no microphone is available. Please allow microphone access and retry.');
      setSttState('error');
    }
  }, []);

  const stopListening = useCallback(async (): Promise<string> => {
    const recorder = recorderRef.current;
    if (!recorder || recorder.state === 'inactive') return '';
    setSttState('processing');
    return new Promise(resolve => {
      recorder.onstop = async () => {
        streamRef.current?.getTracks().forEach(track => track.stop());
        recorderRef.current = null;
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || 'audio/webm' });
        try {
          const form = new FormData();
          form.append('audio', blob, blob.type.includes('mp4') ? 'recording.mp4' : 'recording.webm');
          form.append('language', lang);
          const apiUrl = (import.meta.env.VITE_AGENT_API_URL as string | undefined) || 'http://localhost:8000';
          const response = await fetch(`${apiUrl}/v1/transcribe`, { method: 'POST', body: form });
          const data = await response.json() as { text?: string; detail?: string };
          if (!response.ok || !data.text?.trim()) throw new Error(data.detail || 'No speech was detected.');
          const text = data.text.trim();
          setTranscript(text);
          setSttState('idle');
          resolve(text);
        } catch (caught) {
          setError(caught instanceof Error ? caught.message : 'Audio transcription failed. Please try again.');
          setSttState('error');
          resolve('');
        }
      };
      recorder.stop();
    });
  }, [lang]);

  const cancelListening = useCallback(async () => {
    if (recorderRef.current?.state === 'recording') recorderRef.current.stop();
    streamRef.current?.getTracks().forEach(track => track.stop());
    recorderRef.current = null;
    setSttState('idle');
    setTranscript('');
  }, []);

  return {
    sttState,
    transcript,
    error,
    isSupported,
    startListening,
    stopListening,
    cancelListening,
  };
}

export function useTextToSpeech() {
  const [ttsState, setTtsState] = useState<TTSState>('idle');
  const [ttsSupported, setTtsSupported] = useState(false);
  const ttsRef = useRef(createTextToSpeech());

  useEffect(() => {
    setTtsSupported(ttsRef.current.isSupported());
    if (ttsRef.current.isSupported()) {
      const handler = () => setTtsState('idle');
      window.speechSynthesis.onvoiceschanged = handler;
      return () => {
        window.speechSynthesis.onvoiceschanged = null;
      };
    }
  }, []);

  const speak = useCallback((text: string, lang: string = 'en-US') => {
    if (!ttsRef.current.isSupported()) return;
    ttsRef.current.onStateChange = (state) => setTtsState(state);
    ttsRef.current.onEnd = () => setTtsState('idle');
    ttsRef.current.speak(text, lang);
  }, []);

  const pause = useCallback(() => {
    ttsRef.current.pause();
  }, []);

  const resume = useCallback(() => {
    ttsRef.current.resume();
  }, []);

  const stop = useCallback(() => {
    ttsRef.current.stop();
    setTtsState('idle');
  }, []);

  const setVoice = useCallback((voiceName: string) => {
    ttsRef.current.setPreferredVoice(voiceName);
  }, []);

  return {
    ttsState,
    ttsSupported,
    speak,
    pause,
    resume,
    stop,
    setVoice,
  };
}
