import { useState, useRef, useEffect, useCallback } from 'react';
import { MessageSquare, Mic, Volume2, VolumeX, Send, Trash2, StopCircle, Play, Pause, RefreshCw, ExternalLink, Stethoscope, AlertTriangle } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useConversation, ConversationMessage } from '@/hooks/useConversation';
import { useVoiceRecorder, useTextToSpeech } from '@/hooks/useVoice';
import { processMessage, saveMessage } from '@/lib/agent';
import { supportedLanguages } from '@/lib/textToSpeech';
import MicrophoneButton from '@/components/MicrophoneButton';
import VoiceWaveform from '@/components/VoiceWaveform';
import { supabase } from '@/lib/supabase';

type Mode = 'text' | 'voice';

export default function AIAssistant() {
  const { user, profile } = useAuth();
  const {
    conversationId,
    messages,
    addMessage,
    updateLastMessage,
    clearMessages,
    ensureConversation,
    loadMessages,
  } = useConversation(user?.id);

  const [mode, setMode] = useState<Mode>('text');
  const [input, setInput] = useState('');
  const [processing, setProcessing] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(profile?.voice_enabled ?? true);
  const [autoPlay, setAutoPlay] = useState(profile?.auto_play_responses ?? false);
  const [language, setLanguage] = useState(profile?.preferred_language || 'en-US');
  const [showTranscript, setShowTranscript] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const autoStopInProgress = useRef(false);

  const { sttState, transcript, error: sttError, isSupported: sttSupported, startListening, stopListening, cancelListening } = useVoiceRecorder(language);
  const { ttsState, ttsSupported, speak, pause, resume, stop: stopTTS } = useTextToSpeech();

  // Keep the active assistant controls in sync when preferences are changed on Profile.
  useEffect(() => {
    if (!profile) return;
    setVoiceEnabled(profile.voice_enabled ?? true);
    setAutoPlay(profile.auto_play_responses ?? false);
    setLanguage(profile.preferred_language || 'en-US');
  }, [profile]);

  const changeLanguage = useCallback(async (nextLanguage: string) => {
    setLanguage(nextLanguage);
    if (!user) return;
    const { error } = await supabase
      .from('profiles')
      .update({ preferred_language: nextLanguage, updated_at: new Date().toISOString() })
      .eq('id', user.id);
    if (error) console.error('Could not save language preference:', error);
  }, [user]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (transcript) setShowTranscript(transcript);
  }, [transcript]);

  const handleSendMessage = useCallback(async (text: string, inputType: 'text' | 'voice' = 'text', transcript?: string) => {
    if (!text.trim() || !user || processing) return;

    setProcessing(true);
    setInput('');

    const userMsg: ConversationMessage = {
      role: 'user',
      content: text,
      input_type: inputType,
      transcript: transcript || null,
    };
    addMessage(userMsg);

    const pendingMsg: ConversationMessage = {
      role: 'assistant',
      content: '',
      pending: true,
      input_type: 'text',
    };
    addMessage(pendingMsg);

    try {
      const convId = await ensureConversation();
      const history = messages.filter(m => !m.pending);

      await saveMessage(convId, user.id, 'user', text, inputType, transcript || undefined);

      const response = await processMessage(text, user.id, history, language);

      await saveMessage(convId, user.id, 'assistant', response.content, 'text', undefined, response.toolCalls, response.citations);

      updateLastMessage(response.content, {
        tool_calls: response.toolCalls,
        citations: response.citations,
      });

      if (voiceEnabled && ttsSupported && (inputType === 'voice' || autoPlay)) {
        speak(response.content, language);
      }
    } catch (e: any) {
      updateLastMessage('I encountered an error while processing your request. Please try again.');
      console.error('Agent error:', e);
    } finally {
      setProcessing(false);
      setShowTranscript('');
    }
  }, [user, processing, messages, addMessage, updateLastMessage, ensureConversation, voiceEnabled, ttsSupported, autoPlay, speak, language]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSendMessage(input, 'text');
  };

  // Do not leave an open microphone indefinitely. After 30 seconds, capture
  // whatever was said, transcribe it, and submit it just like a manual stop.
  useEffect(() => {
    if (sttState !== 'listening') return;
    const timeout = window.setTimeout(() => {
      if (autoStopInProgress.current) return;
      autoStopInProgress.current = true;
      void stopListening().then(result => {
        if (result.trim()) return handleSendMessage(result, 'voice', result);
        return undefined;
      }).finally(() => { autoStopInProgress.current = false; });
    }, 30_000);
    return () => window.clearTimeout(timeout);
  }, [sttState, stopListening, handleSendMessage]);

  const handleMicClick = async () => {
    if (sttState === 'listening') {
      const result = await stopListening();
      autoStopInProgress.current = false;
      if (result.trim()) {
        await handleSendMessage(result, 'voice', result);
      }
    } else if (sttState === 'idle') {
      stopTTS();
      setShowTranscript('');
      await startListening();
    } else if (sttState === 'error') {
      setShowTranscript('');
      await startListening();
    }
  };

  const handleStopTTS = () => {
    stopTTS();
  };

  const handlePauseTTS = () => {
    if (ttsState === 'speaking') pause();
    else if (ttsState === 'paused') resume();
  };

  const handleNewConversation = () => {
    clearMessages();
    setShowTranscript('');
    stopTTS();
  };

  const voiceState: 'idle' | 'listening' | 'processing' | 'speaking' =
    processing ? 'processing' :
    ttsState === 'speaking' || ttsState === 'paused' ? 'speaking' :
    sttState === 'listening' ? 'listening' :
    sttState === 'error' ? 'idle' : 'idle';

  return (
    <div className="flex h-screen flex-col">
      <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-8 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-600 text-white">
            <Stethoscope size={22} />
          </div>
          <div>
            <h1 className="text-lg font-bold text-slate-900 dark:text-slate-100">Health AI Assistant</h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">Your health data. Your AI assistant. One conversation.</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex rounded-lg border border-slate-200 dark:border-slate-700 p-0.5">
            <button
              onClick={() => setMode('text')}
              className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition ${
                mode === 'text' ? 'bg-teal-600 text-white' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700'
              }`}
            >
              <MessageSquare size={15} />
              Text
            </button>
            <button
              onClick={() => setMode('voice')}
              className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition ${
                mode === 'voice' ? 'bg-teal-600 text-white' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700'
              }`}
            >
              <Mic size={15} />
              Voice
            </button>
          </div>

          <button
            onClick={handleNewConversation}
            className="flex items-center gap-1.5 rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-1.5 text-sm font-medium text-slate-600 dark:text-slate-300 transition hover:bg-slate-50 dark:hover:bg-slate-700"
            title="New conversation"
          >
            <Trash2 size={15} />
          </button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        <div className={`flex-1 flex flex-col ${mode === 'voice' ? 'max-w-2xl mx-auto' : ''}`}>
          {mode === 'voice' && (
            <div className="border-b border-slate-200 dark:border-slate-700 bg-gradient-to-b from-slate-50 to-white dark:from-slate-800 dark:to-slate-900 px-8 py-8">
              <div className="flex flex-col items-center gap-4">
                <MicrophoneButton
                  state={voiceState}
                  onClick={handleMicClick}
                  disabled={processing}
                  size={96}
                />
                <VoiceWaveform state={voiceState} />

                {!sttSupported && (
                  <div className="rounded-lg bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-800 px-4 py-2 text-sm text-amber-700 dark:text-amber-300">
                    Voice input is not supported in this browser. Try Chrome or Edge.
                  </div>
                )}

                {sttError && (
                  <div className="flex items-center gap-2 rounded-lg bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 px-4 py-2 text-sm text-red-700 dark:text-red-300 max-w-md text-center">
                    <AlertTriangle size={16} className="shrink-0" />
                    {sttError}
                    <button onClick={() => startListening()} className="ml-1 text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 underline">
                      Retry
                    </button>
                  </div>
                )}

                {showTranscript && (
                  <div className="max-w-lg rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-5 py-3 text-center shadow-sm">
                    <p className="text-xs text-slate-400 dark:text-slate-500 mb-1">You said:</p>
                    <p className="text-sm text-slate-700 dark:text-slate-200">"{showTranscript}"</p>
                  </div>
                )}

                {sttState === 'listening' && (
                  <p className="text-xs text-slate-400">Listening… recording stops automatically after 30 seconds.</p>
                )}

                {ttsState === 'speaking' || ttsState === 'paused' ? (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handlePauseTTS}
                      className="flex items-center gap-1.5 rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-1.5 text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700"
                    >
                      {ttsState === 'speaking' ? <Pause size={14} /> : <Play size={14} />}
                      {ttsState === 'speaking' ? 'Pause' : 'Resume'}
                    </button>
                    <button
                      onClick={handleStopTTS}
                      className="flex items-center gap-1.5 rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-1.5 text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700"
                    >
                      <StopCircle size={14} />
                      Stop
                    </button>
                  </div>
                ) : null}
              </div>
            </div>
          )}

          <div className="flex-1 overflow-y-auto px-8 py-6">
            {messages.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center text-center">
                <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-teal-50 dark:bg-teal-900/30 text-teal-500">
                  <Stethoscope size={32} />
                </div>
                <h3 className="text-base font-semibold text-slate-700 dark:text-slate-200">How can I help you today?</h3>
                <p className="mt-1 max-w-md text-sm text-slate-500 dark:text-slate-400">
                  Ask about your sleep, heart rate, blood pressure, activity, hydration, or any health question.
                  {mode === 'voice' ? ' Tap the microphone and start speaking.' : ' Type your question below.'}
                </p>
                <div className="mt-6 flex flex-wrap justify-center gap-2">
                  {['How has my sleep changed this week?', 'What is my average heart rate?', 'Give me a health summary', 'Explain what affects sleep quality'].map(s => (
                    <button
                      key={s}
                      onClick={() => handleSendMessage(s, 'text')}
                      disabled={processing}
                      className="rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-300 transition hover:border-teal-300 dark:hover:border-teal-700 hover:bg-teal-50 dark:hover:bg-teal-900/30 hover:text-teal-700 dark:hover:text-teal-300 disabled:opacity-50"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="mx-auto max-w-3xl space-y-4">
                {messages.map((msg, i) => (
                  <MessageBubble key={i} message={msg} />
                ))}
                <div ref={messagesEndRef} />
              </div>
            )}
          </div>

          {mode === 'text' && (
            <div className="border-t border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-8 py-4">
              <form onSubmit={handleSubmit} className="mx-auto flex max-w-3xl items-end gap-3">
                <div className="flex-1 relative">
                  <textarea
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSubmit(e);
                      }
                    }}
                    rows={1}
                    placeholder="Type your health question..."
                    disabled={processing}
                    className="w-full resize-none rounded-xl border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 px-4 py-3 pr-12 text-sm outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 disabled:opacity-50"
                    style={{ minHeight: 48, maxHeight: 120 }}
                  />
                  <button
                    type="button"
                    onClick={() => setMode('voice')}
                    className="absolute right-3 bottom-3 text-slate-400 hover:text-teal-600 transition"
                    title="Switch to voice mode"
                  >
                    <Mic size={18} />
                  </button>
                </div>
                <button
                  type="submit"
                  disabled={processing || !input.trim()}
                  className="flex h-12 w-12 items-center justify-center rounded-xl bg-teal-600 text-white transition hover:bg-teal-700 disabled:opacity-50"
                >
                  <Send size={18} />
                </button>
              </form>
            </div>
          )}

          {mode === 'voice' && (
            <div className="border-t border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-8 py-3">
              <div className="mx-auto flex max-w-3xl items-center justify-between">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setVoiceEnabled(!voiceEnabled)}
                    className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                      voiceEnabled ? 'bg-teal-50 dark:bg-teal-900/30 text-teal-700 dark:text-teal-300' : 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400'
                    }`}
                  >
                    {voiceEnabled ? <Volume2 size={14} /> : <VolumeX size={14} />}
                    Voice {voiceEnabled ? 'On' : 'Off'}
                  </button>
                  <label className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                    <input
                      type="checkbox"
                      checked={autoPlay}
                      onChange={(e) => setAutoPlay(e.target.checked)}
                      className="rounded border-slate-300 dark:border-slate-600"
                    />
                    Auto-play
                  </label>
                </div>
                
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function MessageBubble({ message }: { message: ConversationMessage }) {
  const isUser = message.role === 'user';

  if (isUser) {
    return (
      <div className="flex justify-end">
        <div className="max-w-[80%]">
          <div className="rounded-2xl rounded-tr-sm bg-teal-600 px-4 py-3 text-sm text-white">
            {message.content}
          </div>
          {message.input_type === 'voice' && message.transcript && (
            <p className="mt-1 text-right text-[11px] text-slate-400">Voice input</p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex justify-start">
      <div className="max-w-[85%]">
        <div className="rounded-2xl rounded-tl-sm bg-white border border-slate-200 px-4 py-3 text-sm text-slate-700 shadow-sm">
          {message.pending ? (
            <div className="flex items-center gap-2 py-1">
              <div className="flex gap-1">
                <span className="h-2 w-2 animate-bounce rounded-full bg-teal-400" style={{ animationDelay: '0ms' }} />
                <span className="h-2 w-2 animate-bounce rounded-full bg-teal-400" style={{ animationDelay: '150ms' }} />
                <span className="h-2 w-2 animate-bounce rounded-full bg-teal-400" style={{ animationDelay: '300ms' }} />
              </div>
              <span className="text-xs text-slate-400">Analyzing your health data...</span>
            </div>
          ) : (
            <FormattedContent content={message.content} />
          )}
        </div>
        {message.tool_calls && message.tool_calls.length > 0 && (
          <div className="mt-1.5 flex flex-wrap gap-1">
            {message.tool_calls.map((tc, i) => (
              <span key={i} className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-500">
                {tc.tool}
              </span>
            ))}
          </div>
        )}
        {message.citations && message.citations.length > 0 && (
          <div className="mt-2 space-y-1">
            <p className="text-[11px] font-medium text-slate-400">Sources:</p>
            {message.citations.map((c, i) => (
              <div key={i} className="flex items-center gap-1 text-[11px] text-teal-600">
                <ExternalLink size={10} />
                {c.url ? (
                  <a href={c.url} target="_blank" rel="noopener noreferrer" className="hover:underline">
                    {c.title} — {c.source}
                  </a>
                ) : (
                  <span>{c.title} — {c.source}</span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function FormattedContent({ content }: { content: string }) {
  const lines = content.split('\n');
  return (
    <div className="space-y-1.5 whitespace-pre-wrap">
      {lines.map((line, i) => {
        if (line.startsWith('• ') || line.startsWith('- ')) {
          return (
            <div key={i} className="flex gap-2">
              <span className="text-teal-500 mt-0.5">•</span>
              <span dangerouslySetInnerHTML={{ __html: formatInline(line.slice(2)) }} />
            </div>
          );
        }
        return <p key={i} dangerouslySetInnerHTML={{ __html: formatInline(line) }} className={line.trim() === '' ? 'h-1' : ''} />;
      })}
    </div>
  );
}

function formatInline(text: string): string {
  const escaped = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
  return escaped
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/⚠️/g, '<span class="text-amber-600 font-medium">⚠️</span>')
    .replace(/📋/g, '<span class="text-blue-600">📋</span>');
}
