import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';

export interface ConversationMessage {
  id?: string;
  role: 'user' | 'assistant';
  content: string;
  input_type: 'text' | 'voice';
  transcript?: string | null;
  tool_calls?: any[];
  citations?: any[];
  created_at?: string;
  pending?: boolean;
}

export function useConversation(userId: string | undefined) {
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [loading, setLoading] = useState(false);

  const ensureConversation = useCallback(async (): Promise<string> => {
    if (conversationId) return conversationId;
    if (!userId) throw new Error('No user');

    const { data, error } = await supabase
      .from('ai_conversations')
      .insert({ user_id: userId, mode: 'text' })
      .select('id')
      .maybeSingle();

    if (error || !data) throw new Error('Failed to create conversation');
    setConversationId(data.id);
    return data.id;
  }, [conversationId, userId]);

  const loadMessages = useCallback(async (convId: string) => {
    const { data, error } = await supabase
      .from('ai_messages')
      .select('*')
      .eq('conversation_id', convId)
      .order('created_at', { ascending: true });

    if (error || !data) return;
    setMessages(data as ConversationMessage[]);
  }, []);

  const addMessage = useCallback((msg: ConversationMessage) => {
    setMessages(prev => [...prev, msg]);
  }, []);

  const updateLastMessage = useCallback((content: string, extra?: Partial<ConversationMessage>) => {
    setMessages(prev => {
      const copy = [...prev];
      if (copy.length > 0 && copy[copy.length - 1].role === 'assistant' && copy[copy.length - 1].pending) {
        copy[copy.length - 1] = { ...copy[copy.length - 1], content, pending: false, ...extra };
      }
      return copy;
    });
  }, []);

  const clearMessages = useCallback(() => {
    setMessages([]);
    setConversationId(null);
  }, []);

  return {
    conversationId,
    messages,
    loading,
    setLoading,
    ensureConversation,
    loadMessages,
    addMessage,
    updateLastMessage,
    clearMessages,
  };
}
