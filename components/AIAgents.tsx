'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { ThemeType } from '../types';
import ChatMarkdownViewer from './ChatMarkdownViewer';
import { useToast } from '../contexts/ToastContext';
import { useUser } from '@/contexts/UserContext';
import {
  createSession,
  getSession,
  sendMessage,
  renameSession,
  extractReplyFromResponse,
  getSessionIdFromResponse,
  getDefaultDprSessionName,
  AGENT_DOC_MGMT,
  type AiSession,
} from '@/services/dmsAiService';
import { listAgentSessions, getAgentForWorkspace } from '@/services/aiAgentService';
import {
  Bot,
  Send,
  Paperclip,
  Mic,
  Plus,
  Menu,
  X,
  Square,
  Pencil,
  ChevronDown,
} from 'lucide-react';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

type AgentType = 'dpr' | 'inventory';

interface AIAgentsProps {
  theme: ThemeType;
  initialAgent?: AgentType;
}

function formatSessionTime(iso?: string): string {
  try {
    const d = iso ? new Date(iso) : new Date();
    return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
  } catch {
    return '--';
  }
}

function getUserInitial(user: { name?: string; email?: string } | null): string {
  if (!user) return 'U';
  const name = (user.name || '').trim();
  if (name.length > 0) return name.charAt(0).toUpperCase();
  const email = (user.email || '').trim();
  if (email.length > 0) return email.charAt(0).toUpperCase();
  return 'U';
}

const AIAgents: React.FC<AIAgentsProps> = ({ theme, initialAgent = 'dpr' }) => {
  const toast = useToast();
  const router = useRouter();
  const pathname = usePathname();
  const { user } = useUser();
  const userInitial = getUserInitial(user);
  const [selectedAgent, setSelectedAgent] = useState<AgentType>(initialAgent);

  // Sync selectedAgent with URL
  useEffect(() => {
    const match = pathname?.match(/^\/ai-agents\/(dpr|inventory)$/);
    const agentFromUrl = match?.[1] as AgentType | undefined;
    if (agentFromUrl && agentFromUrl !== selectedAgent) {
      setSelectedAgent(agentFromUrl);
    }
  }, [pathname]);

  const handleAgentChange = (agent: AgentType) => {
    setSelectedAgent(agent);
    router.push(`/ai-agents/${agent}`);
  };
  const [currentSessionId, setCurrentSessionId] = useState<string>('');
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(false);
  const [sessions, setSessions] = useState<{ id: string; preview: string; time: string; messages: Message[] }[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState<string>('');
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [recordingTime, setRecordingTime] = useState<number>(0);
  const [attachedFiles, setAttachedFiles] = useState<File[]>([]);
  const [aiState, setAiState] = useState<'thinking' | 'ready' | 'error'>('ready');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioStreamRef = useRef<MediaStream | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);
  
  const isDark = theme === 'dark';
  const cardClass = isDark ? 'bg-[#2d2d2d] border-[#404040]' : 'card-light';
  const textPrimary = isDark ? 'text-slate-100' : 'text-slate-900';
  const textSecondary = isDark ? 'text-slate-400' : 'text-slate-600';
  const bgPrimary = isDark ? 'bg-[#0a0a0a]' : 'bg-white';
  const bgSecondary = isDark ? 'bg-[#0a0a0a]' : 'bg-white';

  const parseSessionMessages = (
    sess: AiSession & { chat_history?: unknown[]; history?: unknown[]; conversation?: unknown[]; data?: { messages?: unknown[]; chat_history?: unknown[] } },
    sessionId: string
  ): Message[] => {
    const raw =
      sess?.messages ??
      sess?.chat_history ??
      sess?.history ??
      sess?.conversation ??
      (sess?.data && typeof sess.data === 'object'
        ? ((sess.data as { messages?: unknown[] }).messages ?? (sess.data as { chat_history?: unknown[] }).chat_history)
        : undefined) ??
      [];
    const arr = Array.isArray(raw) ? raw : [];
    return arr.map((m: unknown, i: number) => {
      const msg = m as { role?: string; sender?: string; content?: string; text?: string };
      return {
        id: `msg-${sessionId}-${i}`,
        role: ((msg.role ?? msg.sender) === 'user' ? 'user' : 'assistant') as 'user' | 'assistant',
        content: (msg.content ?? msg.text ?? '') as string,
        timestamp: formatSessionTime(),
      };
    });
  };

  // Load sessions from API - DPR sessions in DPR UI, Inventory sessions in Inventory UI
  const loadSessions = useCallback(async () => {
    try {
      const agentKey = selectedAgent === 'dpr' ? 'DPR' : 'Inventory';
      const expectedAgent = getAgentForWorkspace(agentKey);
      const rawList = await listAgentSessions(expectedAgent);
      const list = (Array.isArray(rawList) ? rawList : []).filter((s: AiSession) => {
        const sAgent = (s as { agent?: string }).agent;
        const sName = String((s as { name?: string }).name || '').trim();
        if (sAgent === AGENT_DOC_MGMT) return false;
        if (sAgent && sAgent !== expectedAgent) return false;
        if (!sAgent) {
          const isDprByName = sName.toLowerCase().startsWith('dpr-');
          const isInventoryByName =
            sName.toLowerCase().startsWith('inventory-') ||
            sName.toLowerCase().startsWith('inventory chat');
          if (selectedAgent === 'dpr') return isDprByName;
          if (selectedAgent === 'inventory') return isInventoryByName;
        }
        return true;
      });
      const mapped = list.map((s: AiSession & { chat_history?: unknown[] }) => {
        const id = String(s.session_id ?? s.id ?? '');
        const preview = (s.name as string) || 'New session';
        const time = formatSessionTime(s.created_at as string) || '--';
        const rawMessages = s.messages ?? s.chat_history ?? [];
        const msgs: Message[] = Array.isArray(rawMessages)
          ? rawMessages.map((m: { role?: string; content?: string }, i: number) => ({
              id: `msg-${id}-${i}`,
              role: (m.role === 'user' ? 'user' : 'assistant') as 'user' | 'assistant',
              content: (m.content ?? '') as string,
              timestamp: time,
            }))
          : [];
        return { id, preview, time, messages: msgs };
      });
      setSessions(mapped);
      if (mapped.length > 0) {
        const firstId = mapped[0].id;
        setCurrentSessionId(firstId);
        if (mapped[0].messages.length > 0) {
          setMessages(mapped[0].messages);
        } else {
          try {
            const res = await getSession(firstId);
            const sess = (typeof res === 'object' && res !== null && 'data' in res
              ? (res as { data: AiSession }).data
              : res) as AiSession;
            const msgs = parseSessionMessages(sess, firstId);
            setMessages(msgs);
            setSessions(prev =>
              prev.map(s => (s.id === firstId ? { ...s, messages: msgs } : s))
            );
          } catch {
            setMessages([]);
          }
        }
      } else {
        setCurrentSessionId('');
        setMessages([]);
      }
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } }; message?: string })?.response?.data?.message
        ?? (err as { message?: string })?.message ?? 'Failed to load sessions';
      toast.showError(msg);
      setSessions([]);
      setCurrentSessionId('');
      setMessages([]);
    }
  }, [toast, selectedAgent]);

  useEffect(() => {
    setCurrentSessionId('');
    setMessages([]);
    loadSessions();
  }, [loadSessions]);

  // Save current session messages when they change (for in-memory sync)
  useEffect(() => {
    if (messages.length > 0 && currentSessionId) {
      setSessions(prev =>
        prev.map(session =>
          session.id === currentSessionId ? { ...session, messages } : session
        )
      );
    }
  }, [messages, currentSessionId]);

  const getDefaultSessionName = () => {
    if (selectedAgent === 'inventory') return 'Inventory Chat';
    return getDefaultDprSessionName();
  };

  const handleNewSession = async () => {
    setAiState('thinking');
    try {
      const agent = getAgentForWorkspace(selectedAgent === 'dpr' ? 'DPR' : 'Inventory');
      const res = await createSession(getDefaultSessionName(), agent);
      const sessionId = getSessionIdFromResponse(res);
      if (!sessionId) {
        throw new Error('Could not create session');
      }
      const currentTime = formatSessionTime() || new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
      const newSession = {
        id: sessionId,
        preview: (res as { name?: string }).name ?? getDefaultSessionName(),
        time: currentTime,
        messages: [],
      };
      setSessions(prev => [newSession, ...prev]);
      setCurrentSessionId(sessionId);
      setMessages([]);
      setInputMessage('');
      setAttachedFiles([]);
      toast.showSuccess('New session created');
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } }; message?: string })?.response?.data?.message
        ?? (err as { message?: string })?.message ?? 'Failed to create session';
      toast.showError(msg);
    } finally {
      setAiState('ready');
    }
  };

  const fetchSessionHistory = useCallback(async (sessionId: string): Promise<Message[]> => {
    const res = await getSession(sessionId);
    const sess = (typeof res === 'object' && res !== null && 'data' in res
      ? (res as { data: AiSession }).data
      : res) as AiSession & { chat_history?: unknown[]; history?: unknown[]; conversation?: unknown[] };
    return parseSessionMessages(sess, sessionId);
  }, []);

  const handleRenameSession = async (e: React.MouseEvent, sessionId: string, currentName: string) => {
    e.stopPropagation();
    const newName = window.prompt('Rename session', currentName || 'New session');
    if (newName === null || newName.trim() === '' || newName.trim() === currentName) return;
    try {
      await renameSession(sessionId, newName.trim());
      setSessions(prev =>
        prev.map(s => (s.id === sessionId ? { ...s, preview: newName.trim() } : s))
      );
      toast.showSuccess('Session renamed');
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } }; message?: string })?.response?.data?.message
        ?? (err as { message?: string })?.message ?? 'Failed to rename session';
      toast.showError(msg);
    }
  };

  const handleSessionClick = async (sessionId: string) => {
    setCurrentSessionId(sessionId);
    setAiState('thinking');
    try {
      const msgs = await fetchSessionHistory(sessionId);
      setMessages(msgs);
      setSessions(prev =>
        prev.map(s => (s.id === sessionId ? { ...s, messages: msgs } : s))
      );
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } }; message?: string })?.response?.data?.message
        ?? (err as { message?: string })?.message ?? 'Failed to load chat history';
      toast.showError(msg);
      setMessages([]);
    } finally {
      setAiState('ready');
    }
    setSidebarOpen(false);
  };

  const scrollToBottom = () => {
    // Use requestAnimationFrame to ensure DOM has updated before scrolling
    requestAnimationFrame(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
    });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Auto-scroll when AI response arrives (aiState goes from thinking to ready)
  useEffect(() => {
    if (aiState === 'ready') {
      scrollToBottom();
    }
  }, [aiState]);

  const handleSendMessage = async (optionContent?: string, filesToInclude?: File[] | null) => {
    const rawContent = typeof optionContent === 'string' ? optionContent : (inputMessage ?? '');
    const messageContent = String(rawContent).trim();
    const filesFromState = typeof optionContent === 'string' ? [] : [...attachedFiles];
    const filesToSend = (filesToInclude !== undefined && filesToInclude !== null) ? filesToInclude : filesFromState;
    const hasFiles = filesToSend.length > 0;
    if (!messageContent && !hasFiles) return;

    const currentTime = formatSessionTime();
    let fullContent = messageContent;
    if (hasFiles) {
      const fileList = filesToSend.map(f => `📎 ${f.name} (${(f.size / 1024).toFixed(2)} KB)`).join('\n');
      fullContent = messageContent ? `${messageContent}\n\n${fileList}` : (filesToSend.some(f => f.name.includes('voice-recording')) ? `🎤 Voice recording` : `Files attached:\n${fileList}`);
    }

    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: fullContent,
      timestamp: currentTime,
    };
    setMessages(prev => [...prev, userMsg]);
    if (!optionContent) setInputMessage('');
    if (!optionContent && filesToInclude === undefined) setAttachedFiles([]);

    setAiState('thinking');

    let sessionId = currentSessionId;
    const agent = getAgentForWorkspace(selectedAgent === 'dpr' ? 'DPR' : 'Inventory');
    if (!sessionId || !sessions.some(s => s.id === sessionId)) {
      try {
        const res = await createSession(getDefaultSessionName(), agent);
        sessionId = getSessionIdFromResponse(res);
        if (!sessionId) throw new Error('No session ID');
        setCurrentSessionId(sessionId);
        const newSession = { id: sessionId, preview: (res as { name?: string }).name ?? getDefaultSessionName(), time: currentTime, messages: [] };
        setSessions(prev => [newSession, ...prev]);
      } catch (err: unknown) {
        const msg = (err as { response?: { data?: { message?: string } }; message?: string })?.response?.data?.message
          ?? (err as { message?: string })?.message ?? 'Failed to create session';
        toast.showError(msg);
        setAiState('ready');
        return;
      }
    }

    try {
      const response = await sendMessage(
        sessionId,
        messageContent || 'Files attached.',
        { agent, files: filesToSend.length > 0 ? filesToSend : undefined }
      );
      const replyText = extractReplyFromResponse(response);
      const aiMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: replyText || 'No response received from the AI.',
        timestamp: formatSessionTime(),
      };
      setMessages(prev => [...prev, aiMsg]);
      const previewText = messageContent || (hasFiles ? (filesToSend.some(f => f.name.includes('voice-recording')) ? 'Voice message' : `${filesToSend.length} file(s) attached`) : '');
      setSessions(prev =>
        prev.map(s => (s.id === sessionId ? { ...s, preview: previewText.slice(0, 20) + (previewText.length > 20 ? '...' : ''), time: currentTime } : s))
      );
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } }; message?: string })?.response?.data?.message
        ?? (err as { message?: string })?.message ?? 'Failed to send message';
      toast.showError(msg);
      const errorMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: `Error: ${msg}`,
        timestamp: formatSessionTime(),
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setAiState('ready');
    }
  };

  const handleEditUserMessage = (messageId: string) => {
    const idx = messages.findIndex((m) => m.id === messageId);
    if (idx < 0 || messages[idx].role !== 'user') return;
    const msg = messages[idx];
    const textOnly = msg.content.replace(/^Files attached:\s*\n?/i, '').replace(/\n?📎[^\n]+(\n|$)/g, '').trim() || msg.content;
    setInputMessage(textOnly);
    setMessages((prev) => prev.slice(0, idx));
    setAttachedFiles([]);
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleAttachClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      setAttachedFiles(prev => [...prev, ...Array.from(files)]);
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleRemoveFile = (index: number) => {
    setAttachedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioStreamRef.current = stream;
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const audioFile = new File([audioBlob], `voice-recording-${Date.now()}.webm`, { type: 'audio/webm' });

        // Stop all tracks
        if (audioStreamRef.current) {
          audioStreamRef.current.getTracks().forEach(track => track.stop());
          audioStreamRef.current = null;
        }
        setRecordingTime(0);

        // Send voice message immediately (handleSendMessage adds to UI and sends to API)
        handleSendMessage(undefined, [audioFile]);
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);
      
      // Start timer
      recordingTimerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    } catch (error) {
      console.error('Error accessing microphone:', error);
      toast.showError('Unable to access microphone. Please check your permissions.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      mediaRecorderRef.current = null;
      
      // Stop timer
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
        recordingTimerRef.current = null;
      }
    }
  };

  const formatRecordingTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
      }
    };
  }, []);

  const handleVoiceClick = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  return (
    <div className={`flex flex-col md:flex-row h-[calc(100vh-4rem)] min-h-0 max-h-[calc(100dvh-4rem)] sm:h-[calc(100vh-4.5rem)] md:h-[calc(100vh-3.5rem-2rem)] ${isDark ? 'bg-[#2d2d2d]' : 'bg-slate-50'} rounded-lg sm:rounded-xl border ${isDark ? 'border-[#404040]' : 'border-slate-200'} overflow-hidden relative`}>
      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Left Sidebar */}
      <div className={`fixed md:static inset-y-0 left-0 z-50 md:z-auto w-[min(100%,320px)] max-w-[85vw] sm:w-80 md:w-64 md:max-w-none border-r ${isDark ? 'border-[#2d2d2d]' : 'border-gray-200'} flex flex-col ${bgSecondary} transform transition-transform duration-300 ease-in-out ${
        sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
      }`}>
        {/* Logo Section */}
        <div className={`p-2.5 sm:p-3 md:p-4 border-b ${isDark ? 'border-[#404040]' : 'border-gray-200'} flex-shrink-0`}>
          <div className="flex items-center justify-between mb-2 sm:mb-3">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-6 h-6 sm:w-7 sm:h-7 bg-[#C2D642] rounded-lg flex items-center justify-center flex-shrink-0">
                <Bot className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white" />
              </div>
              <div className="min-w-0">
                <h2 className={`text-[11px] sm:text-xs font-black truncate ${textPrimary}`}>Koncite</h2>
                <p className={`text-[8px] sm:text-[9px] font-bold uppercase tracking-wider truncate ${textSecondary}`}>INTELLIGENCE</p>
              </div>
            </div>
            <button
              onClick={() => setSidebarOpen(false)}
              className="md:hidden p-2 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 flex-shrink-0 touch-manipulation"
              aria-label="Close sidebar"
            >
              <X className={`w-5 h-5 ${textSecondary}`} />
            </button>
          </div>
          {/* Agent type dropdown */}
          <div className="mb-2 sm:mb-3">
            <label htmlFor="agent-select" className={`sr-only ${textSecondary}`}>
              Select agent type
            </label>
            <div className="relative">
              <select
                id="agent-select"
                value={selectedAgent}
                onChange={(e) => handleAgentChange(e.target.value as AgentType)}
                className={`w-full appearance-none pl-2.5 pr-8 py-2 rounded-lg text-[11px] sm:text-xs font-bold cursor-pointer border-2 transition-colors ${isDark ? 'bg-[#2d2d2d] border-[#404040] text-slate-100 hover:border-[#C2D642]/50 focus:border-[#C2D642]' : 'bg-white border-gray-200 text-slate-900 hover:border-[#C2D642]/50 focus:border-[#C2D642]'} focus:outline-none`}
              >
                <option value="dpr">DPR</option>
                <option value="inventory">Inventory</option>
              </select>
              <ChevronDown className={`absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 pointer-events-none ${textSecondary}`} />
            </div>
          </div>
          <button
            onClick={handleNewSession}
            disabled={aiState === 'thinking'}
            className={`w-full flex items-center justify-center gap-1.5 px-2.5 sm:px-3 py-2 rounded-lg text-[11px] sm:text-xs font-bold transition-all touch-manipulation min-h-[38px] ${isDark ? 'bg-[#C2D642] hover:bg-[#A8B838] text-white' : 'bg-[#C2D642] hover:bg-[#A8B838] text-white'} shadow-md disabled:opacity-60 disabled:cursor-not-allowed`}
          >
            <Plus className="w-3.5 h-3.5 flex-shrink-0" /> <span className="truncate">New Session</span>
          </button>
        </div>

        {/* Recent Sessions */}
        <div className="flex-1 min-h-0 flex flex-col overflow-hidden pt-2 sm:pt-3">
          <p className={`text-[9px] font-bold uppercase tracking-wider mb-1.5 px-2 sm:px-3 flex-shrink-0 ${textSecondary}`}>RECENT SESSIONS</p>
          <div className={`flex-1 min-h-0 overflow-y-auto p-1.5 sm:p-2 md:p-3 pt-0 custom-scrollbar`}>
          <div className="space-y-1.5">
            {sessions.map((session) => (
              <div
                key={session.id}
                onClick={() => handleSessionClick(session.id)}
                className={`p-2 sm:p-2.5 rounded-lg cursor-pointer transition-colors touch-manipulation ${
                  session.id === currentSessionId 
                    ? isDark ? 'bg-[#C2D642]/20 border-[#C2D642]/50' : 'bg-[#C2D642]/10 border-[#C2D642]/30'
                    : isDark ? 'bg-[#2d2d2d] hover:bg-[#404040] border-[#404040]' : 'bg-white hover:bg-gray-50 border-gray-200'
                } border`}
              >
                <div className="flex items-center justify-between gap-1.5">
                  <p className={`text-xs font-bold flex-1 min-w-0 truncate ${session.id === currentSessionId ? 'text-[#C2D642]' : textPrimary}`}>{session.preview}</p>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button
                      onClick={(e) => handleRenameSession(e, session.id, session.preview)}
                      className={`p-1 rounded hover:opacity-80 transition-opacity min-w-[28px] min-h-[28px] flex items-center justify-center ${textSecondary} hover:text-[#C2D642] touch-manipulation`}
                      title="Rename session"
                      aria-label="Rename session"
                    >
                      <Pencil className="w-2.5 h-2.5" />
                    </button>
                    <span className={`text-[9px] font-bold ${textSecondary}`}>{session.time}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
          </div>
        </div>

        {/* AI State Indicator */}
        <div className={`p-2 sm:p-2.5 md:p-3 border-t flex-shrink-0 ${isDark ? 'border-[#404040]' : 'border-gray-200'}`}>
          <div className={`w-full flex items-center gap-1.5 md:gap-2 px-2.5 py-1.5 rounded-lg ${isDark ? 'bg-[#2d2d2d]/50' : 'bg-white'}`}>
            <div className={`w-1.5 h-1.5 md:w-2 md:h-2 rounded-full flex-shrink-0 ${
              aiState === 'thinking' 
                ? 'bg-orange-500 animate-pulse' 
                : aiState === 'ready' 
                  ? 'bg-[#C2D642]' 
                  : 'bg-red-500 animate-pulse'
            }`} />
            <div className="flex-1 min-w-0">
              <p className={`text-[9px] font-bold uppercase tracking-wider mb-0 ${textSecondary}`}>AI Status</p>
              <p className={`text-[11px] md:text-xs font-bold truncate ${
                aiState === 'thinking' 
                  ? 'text-orange-500' 
                  : aiState === 'ready' 
                    ? 'text-[#C2D642]' 
                    : 'text-red-500'
              }`}>
                {aiState === 'thinking' ? 'Thinking' : aiState === 'ready' ? 'Ready' : 'Error'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col min-w-0 min-h-0">
        {/* Chat Header */}
        <div className={`p-2 sm:p-3 md:p-4 border-b flex-shrink-0 ${isDark ? 'border-[#404040]' : 'border-gray-200'} flex items-center justify-between ${bgSecondary}`}>
          <div className="flex items-center gap-2 md:gap-3 min-w-0 flex-1">
            <button
              onClick={() => setSidebarOpen(true)}
              className="md:hidden p-2 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 mr-1 flex-shrink-0 min-w-[44px] min-h-[44px] flex items-center justify-center touch-manipulation"
              aria-label="Open sessions"
            >
              <Menu className={`w-5 h-5 ${textSecondary}`} />
            </button>
            <div className="w-8 h-8 md:w-8 md:h-8 bg-[#C2D642] rounded-lg flex items-center justify-center flex-shrink-0">
              <Bot className="w-4 h-4 md:w-5 md:h-5 text-white" />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className={`text-xs sm:text-sm font-black truncate ${textPrimary}`}>Workspace Chat</h3>
              <p className={`text-[9px] md:text-[10px] font-bold uppercase tracking-wider hidden sm:block truncate ${textSecondary}`}>
                {selectedAgent === 'dpr' ? 'DPR' : 'INVENTORY'} AGENT
              </p>
            </div>
          </div>
          {/* <div className="flex items-center gap-2">
            <button className={`p-2 rounded-lg transition-colors ${isDark ? 'hover:bg-[#2d2d2d]' : 'hover:bg-gray-100'}`}>
              <Search className={`w-4 h-4 ${textSecondary}`} />
            </button>
            <button className={`p-2 rounded-lg transition-colors ${isDark ? 'hover:bg-[#2d2d2d]' : 'hover:bg-gray-100'}`}>
              <MoreVertical className={`w-4 h-4 ${textSecondary}`} />
            </button>
            <div className="w-8 h-8 rounded-full bg-[#C2D642] flex items-center justify-center">
              <span className="text-white text-xs font-bold">NV</span>
            </div>
          </div> */}
        </div>

        {/* Messages Area */}
        <div className={`flex-1 min-h-0 overflow-y-auto overflow-x-hidden p-2 sm:p-3 md:p-4 lg:p-6 pb-6 sm:pb-8 md:pb-10 lg:pb-6 space-y-1.5 sm:space-y-2 custom-scrollbar ${isDark ? 'bg-[#1e1e1e]' : 'bg-slate-50'}`}>
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center min-h-[160px] sm:min-h-[200px] md:min-h-[280px] text-center px-3 sm:px-4">
              <div className="w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 bg-[#C2D642] rounded-xl sm:rounded-2xl flex items-center justify-center mb-3 sm:mb-4">
                <Bot className="w-6 h-6 sm:w-8 sm:h-8 md:w-9 md:h-9 text-white" />
              </div>
              <p className={`text-base sm:text-lg md:text-xl font-bold max-w-[280px] sm:max-w-md ${isDark ? 'text-[#C2D642]' : 'text-[#7c8a2e]'}`}>
                You're connected to the {selectedAgent === 'dpr' ? 'DPR' : 'Inventory'} Agent.
              </p>
              <p className={`text-[11px] sm:text-xs md:text-sm font-normal mt-1.5 sm:mt-2 max-w-[280px] sm:max-w-md ${isDark ? 'text-slate-400' : 'text-[#4B5563]'}`}>
                {selectedAgent === 'dpr' ? "Ask me to file a DPR, get stock status, or review today's work." : "Ask me about stock status, material tracking, or inventory reports."}
              </p>
            </div>
          )}
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex gap-2 md:gap-3 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {message.role === 'assistant' && (
                <div className="w-7 h-7 md:w-8 md:h-8 bg-[#C2D642] rounded-lg flex items-center justify-center flex-shrink-0">
                  <Bot className="w-4 h-4 md:w-5 md:h-5 text-white" />
                </div>
              )}
              <div className={`max-w-[85%] xs:max-w-[80%] sm:max-w-[65%] md:max-w-[60%] ${message.role === 'user' ? 'order-2' : ''}`}>
                <div className={`rounded-lg sm:rounded-xl p-2 sm:p-2.5 md:p-3 ${message.role === 'user' ? `${isDark ? 'bg-slate-700/50 text-slate-100 border border-slate-600/50' : 'bg-slate-100 text-slate-900 border border-slate-200'}` : isDark ? 'bg-[#2d2d2d] text-slate-100 border border-slate-600/50' : 'bg-white text-slate-900 border border-slate-200 shadow-sm'}`}>
                  <ChatMarkdownViewer
                    content={message.content}
                    isDark={isDark}
                    role={message.role}
                    onOptionClick={message.role === 'assistant' ? (text) => handleSendMessage(text) : undefined}
                    className={`text-xs sm:text-xs md:text-sm font-normal break-words leading-relaxed ${message.role === 'user' ? `font-chat-user ${textPrimary}` : `font-chat-ai ${textPrimary}`}`}
                  />
                </div>
                <div className={`flex items-center justify-between gap-2 mt-0.5 ${message.role === 'user' ? 'flex-row-reverse' : ''}`}>
                  <p className={`text-[9px] md:text-[10px] font-bold ${textSecondary}`}>{message.timestamp}</p>
                  {message.role === 'user' && (
                    <button
                      onClick={() => handleEditUserMessage(message.id)}
                      className={`p-1.5 rounded-lg transition-colors ${isDark ? 'hover:bg-slate-600/50 text-slate-400 hover:text-slate-200' : 'hover:bg-slate-200 text-slate-500 hover:text-slate-700'}`}
                      title="Edit and resend"
                      aria-label="Edit message"
                    >
                      <Pencil className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>
              {message.role === 'user' && (
                <div className={`w-7 h-7 md:w-8 md:h-8 rounded-full flex items-center justify-center flex-shrink-0 border-2 ${isDark ? 'bg-slate-600 border-slate-500' : 'bg-slate-500 border-slate-400'}`}>
                  <span className="text-white text-[10px] md:text-xs font-bold">{userInitial}</span>
                </div>
              )}
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className={`p-2 sm:p-3 md:p-4 border-t flex-shrink-0 ${isDark ? 'border-[#404040]' : 'border-gray-200'} ${bgSecondary}`}>
          {/* Attached Files Preview */}
          {attachedFiles.length > 0 && (
            <div className="mb-1.5 sm:mb-2 flex flex-wrap gap-1.5 sm:gap-2">
              {attachedFiles.map((file, index) => (
                <div
                  key={index}
                  className={`flex items-center gap-1 sm:gap-1.5 md:gap-2 px-2 sm:px-2.5 md:px-3 py-1 sm:py-1.5 rounded-md sm:rounded-lg text-[10px] md:text-xs font-bold ${isDark ? 'bg-[#2d2d2d] text-slate-100' : 'bg-gray-100 text-slate-900'}`}
                >
                  <Paperclip className="w-2.5 h-2.5 sm:w-3 sm:h-3 flex-shrink-0" />
                  <span className="max-w-[80px] xs:max-w-[100px] sm:max-w-[150px] truncate">{file.name}</span>
                  <button
                    onClick={() => handleRemoveFile(index)}
                    className={`ml-1 hover:opacity-70 transition-opacity ${textSecondary} flex-shrink-0`}
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}
          
          <div className={`flex items-center gap-1 sm:gap-1.5 md:gap-2 p-2 sm:p-2.5 md:p-3 rounded-lg sm:rounded-xl border-2 ${isDark ? 'bg-[#2d2d2d] border-[#C2D642]/30' : 'bg-white border-[#C2D642]/30'}`}>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/*,application/pdf,.doc,.docx,.xls,.xlsx,.txt"
              onChange={handleFileChange}
              className="hidden"
            />
            <button
              onClick={handleAttachClick}
              className={`p-2 rounded-lg transition-colors flex-shrink-0 min-w-[40px] min-h-[40px] flex items-center justify-center touch-manipulation ${isDark ? 'hover:bg-[#404040]' : 'hover:bg-gray-100'}`}
              title="Attach file"
              aria-label="Attach file"
            >
              <Paperclip className={`w-4 h-4 ${textSecondary}`} />
            </button>
            <input
              type="text"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Type your command..."
              className={`flex-1 min-w-0 bg-transparent outline-none text-xs sm:text-sm font-bold ${textPrimary} placeholder:${textSecondary}`}
            />
            <div className="flex items-center gap-0.5 sm:gap-1">
              {isRecording ? (
                <>
                  <button
                    onClick={stopRecording}
                    className="p-2 rounded-lg transition-colors flex-shrink-0 min-w-[40px] min-h-[40px] flex items-center justify-center bg-red-500 hover:bg-red-600 text-white animate-pulse touch-manipulation"
                    title="Stop recording"
                    aria-label="Stop recording"
                  >
                    <Square className="w-4 h-4 fill-white" />
                  </button>
                  <span className={`text-[9px] sm:text-[10px] md:text-xs font-bold min-w-[2.5rem] sm:min-w-[3rem] text-center self-center hidden xs:inline ${isDark ? 'text-red-400' : 'text-red-600'}`}>
                    {formatRecordingTime(recordingTime)}
                  </span>
                </>
              ) : (
                <button
                  onClick={handleVoiceClick}
                  className={`p-2 rounded-lg transition-colors flex-shrink-0 min-w-[40px] min-h-[40px] flex items-center justify-center touch-manipulation ${
                    isDark ? 'hover:bg-[#404040]' : 'hover:bg-gray-100'
                  }`}
                  title="Start voice recording"
                  aria-label="Voice recording"
                >
                  <Mic className={`w-4 h-4 ${textSecondary}`} />
                </button>
              )}
              <button
                onClick={() => handleSendMessage()}
                disabled={(!inputMessage.trim() && attachedFiles.length === 0) || isRecording || aiState === 'thinking'}
                className={`p-2 rounded-lg transition-colors flex-shrink-0 min-w-[40px] min-h-[40px] flex items-center justify-center touch-manipulation ${
                  (inputMessage.trim() || attachedFiles.length > 0) && !isRecording
                    ? 'bg-[#C2D642] hover:bg-[#A8B838] text-white' 
                    : isDark 
                    ? 'bg-[#2d2d2d] text-slate-400 cursor-not-allowed' 
                    : 'bg-gray-200 text-slate-400 cursor-not-allowed'
                }`}
                title="Send message"
                aria-label="Send message"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
          {/* Recording Indicator */}
          {isRecording && (
            <div className={`mt-1.5 sm:mt-2 flex items-center justify-center gap-2 px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg ${isDark ? 'bg-red-500/20 border border-red-500/30' : 'bg-red-50 border border-red-200'}`}>
              <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-red-500 rounded-full animate-pulse" />
              <span className={`text-[9px] sm:text-[10px] md:text-xs font-bold ${isDark ? 'text-red-400' : 'text-red-600'}`}>
                Recording: {formatRecordingTime(recordingTime)}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AIAgents;
