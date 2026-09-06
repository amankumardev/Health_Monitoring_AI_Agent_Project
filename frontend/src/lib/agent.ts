import { supabase } from './supabase';
import { detectIntent } from './intentRouter';
import { executeTool, ToolResult } from './tools';
import { generateToolResponse } from './responseGenerator';
import { classifyInput, validateResponse, addSafetyDisclaimer, buildEscalationResponse } from './safetyLayer';
import { AIMessage } from '@/types';

export interface AgentResponse {
  content: string;
  toolCalls: { tool: string; summary: string }[];
  citations: { title: string; source: string; url?: string }[];
  urgency: 'normal' | 'attention' | 'urgent';
}

export interface ConversationHistoryEntry {
  role: string;
  content: string;
}

export async function processMessage(
  message: string,
  userId: string,
  conversationHistory: ConversationHistoryEntry[],
  language: string = 'en-US',
): Promise<AgentResponse> {
  const safetyCheck = classifyInput(message);

  if (safetyCheck.escalation) {
    return {
      content: buildEscalationResponse(),
      toolCalls: [],
      citations: [],
      urgency: 'urgent',
    };
  }

  const intent = detectIntent(message);
  const urgency = intent.urgency;

  if (urgency === 'urgent') {
    return {
      content: buildEscalationResponse(),
      toolCalls: [],
      citations: [],
      urgency: 'urgent',
    };
  }

  const toolCalls: { tool: string; summary: string }[] = [];
  const citations: { title: string; source: string; url?: string }[] = [];
  const responseParts: string[] = [];

  for (const toolName of intent.tools) {
    const args: any[] = [];
    if (toolName === 'searchHealthKnowledge') {
      args.push(intent.toolArgs.query || message);
    } else if (intent.toolArgs.days && toolName !== 'getUserProfile' && toolName !== 'getMedicationSchedule' && toolName !== 'getGoals' && toolName !== 'createHealthSummary') {
      args.push(intent.toolArgs.days);
    }

    const result: ToolResult | null = await executeTool(toolName, userId, ...args);
    if (result) {
      toolCalls.push({ tool: toolName, summary: result.summary });

      if (toolName === 'searchHealthKnowledge' && Array.isArray(result.data)) {
        result.data.forEach((doc: any) => {
          citations.push({ title: doc.title, source: doc.source, url: doc.source_url || undefined });
        });
      }

      const response = generateToolResponse(toolName, result, intent.toolArgs.query || message);
      responseParts.push(response);
    }
  }

  if (responseParts.length === 0) {
    responseParts.push("I'm here to help with your health questions. You can ask me about your sleep, heart rate, blood pressure, activity, hydration, nutrition, medications, or goals. I can also provide educational information about health topics. What would you like to know?");
  }

  let finalResponse = responseParts.join('\n\n');

  // The local tools retrieve only this user's records; the LLM receives the
  // resulting summaries rather than browser credentials or database access.
  const agentUrl = (import.meta.env.VITE_AGENT_API_URL as string | undefined) || 'http://localhost:8000';
  try {
    const response = await fetch(`${agentUrl}/v1/respond`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message,
        language,
        history: conversationHistory.slice(-12).map(({ role, content }) => ({ role: role === 'assistant' ? 'assistant' : 'user', content })),
        health_context: toolCalls.map(call => call.summary),
      }),
    });
    if (response.ok) {
      const data = await response.json() as { content?: string };
      if (data.content?.trim()) finalResponse = data.content.trim();
    } else {
      console.warn('AI service unavailable; using local health response.');
    }
  } catch {
    console.warn('AI service unavailable; using local health response.');
  }

  const validation = validateResponse(finalResponse);
  if (!validation.passed) {
    finalResponse = "Based on your health data, I've compiled the relevant information. However, I want to make sure I'm giving you accurate guidance — please consult your healthcare provider for specific medical advice.";
  }

  finalResponse = addSafetyDisclaimer(finalResponse, urgency);

  return {
    content: finalResponse,
    toolCalls,
    citations,
    urgency,
  };
}

export async function createConversation(userId: string, mode: string = 'text'): Promise<string> {
  const { data, error } = await supabase
    .from('ai_conversations')
    .insert({ user_id: userId, mode })
    .select('id')
    .maybeSingle();

  if (error || !data) throw new Error('Failed to create conversation');
  return data.id;
}

export async function saveMessage(
  conversationId: string,
  userId: string,
  role: string,
  content: string,
  inputType: string = 'text',
  transcript?: string,
  toolCalls: any[] = [],
  citations: any[] = []
): Promise<void> {
  await supabase.from('ai_messages').insert({
    conversation_id: conversationId,
    user_id: userId,
    role,
    content,
    input_type: inputType,
    transcript: transcript || null,
    tool_calls: toolCalls,
    citations,
  });

  await supabase.from('ai_conversations').update({ updated_at: new Date().toISOString() }).eq('id', conversationId);
}

export async function loadConversationMessages(conversationId: string): Promise<AIMessage[]> {
  const { data, error } = await supabase
    .from('ai_messages')
    .select('*')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true });

  if (error || !data) return [];
  return data as AIMessage[];
}

export async function loadConversations(userId: string) {
  const { data, error } = await supabase
    .from('ai_conversations')
    .select('*')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false });

  if (error || !data) return [];
  return data;
}
