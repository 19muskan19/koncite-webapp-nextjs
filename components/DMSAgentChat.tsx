'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { ThemeType } from '../types';
import ChatMarkdownViewer from './ChatMarkdownViewer';
import { useToast } from '../contexts/ToastContext';
import { useUser } from '@/contexts/UserContext';
import {
  getChatContext,
  createSession,
  listSessions as listDmsSessions,
  getSession as getDmsSession,
  renameSession as renameDmsSession,
  sendMessage as sendDmsAiMessage,
  getSessionIdFromResponse,
  AGENT_DOC_MGMT,
} from '../services/dmsAiService';
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
  ArrowLeft,
} from 'lucide-react';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

interface DMSAgentChatProps {
  theme: ThemeType;
  projectId?: string;
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

const DMSAgentChat: React.FC<DMSAgentChatProps> = ({ theme, projectId }) => {
  const toast = useToast();
  const router = useRouter();
  const { user } = useUser();
  const userInitial = getUserInitial(user);
  const [dmsSessionId, setDmsSessionId] = useState<string | null>(null);
  const [chatSessions, setChatSessions] = useState<{ id: string; preview: string; time: string; messages: ChatMessage[] }[]>([]);
  const [chatSessionsLoading, setChatSessionsLoading] = useState<boolean>(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      role: 'assistant',
      content: "Hello! I'm your AI assistant. How can I help you with your documents today?",
      timestamp: formatSessionTime(),
    },
  ]);
  const [chatInput, setChatInput] = useState<string>('');
  const [attachedFiles, setAttachedFiles] = useState<File[]>([]);
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [recordingTime, setRecordingTime] = useState<number>(0);
  const [chatSending, setChatSending] = useState<boolean>(false);
  const [chatCreatingSession, setChatCreatingSession] = useState<boolean>(false);
  const [chatError, setChatError] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const chatMessagesEndRef = useRef<HTMLDivElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioStreamRef = useRef<MediaStream | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);

  const isDark = theme === 'dark';
  const textPrimary = isDark ? 'text-slate-100' : 'text-slate-900';
  const textSecondary = isDark ? 'text-slate-400' : 'text-slate-600';
  const bgSecondary = isDark ? 'bg-[#0a0a0a]' : 'bg-white';
  const chatAreaBg = isDark ? 'bg-[#1e1e1e]' : 'bg-slate-50';

  const parseSessionMessages = useCallback(
    (
      sess: {
        messages?: unknown[];
        chat_history?: unknown[];
        history?: unknown[];
        conversation?: unknown[];
        data?: { messages?: unknown[]; chat_history?: unknown[] };
      },
      sessionId: string
    ): ChatMessage[] => {
      const raw =
        sess?.messages ??
        sess?.chat_history ??
        sess?.history ??
        sess?.conversation ??
        (sess?.data && typeof sess.data === 'object'
          ? ((sess.data as { messages?: unknown[] }).messages ??
            (sess.data as { chat_history?: unknown[] }).chat_history)
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
    },
    []
  );

  const loadDmsSessions = useCallback(async () => {
    setChatSessionsLoading(true);
    try {
      const rawList = await listDmsSessions();
      const list = (Array.isArray(rawList) ? rawList : []).filter(
        (s: { agent?: string }) => (s.agent ?? '') === AGENT_DOC_MGMT || !s.agent
      );
      const mapped = list.map(
        (s: {
          session_id?: string;
          id?: string;
          name?: string;
          created_at?: string;
          messages?: unknown[];
          chat_history?: unknown[];
        }) => {
          const id = String(s.session_id ?? s.id ?? '');
          const preview = (s.name as string) || 'New session';
          const time = formatSessionTime(s.created_at as string) || '--';
          const rawMessages = s.messages ?? s.chat_history ?? [];
          const msgs: ChatMessage[] = Array.isArray(rawMessages)
            ? (rawMessages as { role?: string; content?: string }[]).map((m, i) => ({
                id: `msg-${id}-${i}`,
                role: (m.role === 'user' ? 'user' : 'assistant') as 'user' | 'assistant',
                content: (m.content ?? '') as string,
                timestamp: time,
              }))
            : [];
          return { id, preview, time, messages: msgs };
        }
      );
      setChatSessions(mapped);
      if (mapped.length > 0 && !dmsSessionId) {
        const firstId = mapped[0].id;
        setDmsSessionId(firstId);
        if (mapped[0].messages.length > 0) {
          setChatMessages(mapped[0].messages);
        } else {
          try {
            const res = await getDmsSession(firstId);
            const msgs = parseSessionMessages(res, firstId);
            setChatMessages(
              msgs.length > 0
                ? msgs
                : [
                    {
                      id: '1',
                      role: 'assistant',
                      content: "Hello! I'm your AI assistant. How can I help you with your documents today?",
                      timestamp: formatSessionTime(),
                    },
                  ]
            );
            setChatSessions((prev) => prev.map((s) => (s.id === firstId ? { ...s, messages: msgs } : s)));
          } catch {
            setChatMessages([
              {
                id: '1',
                role: 'assistant',
                content: "Hello! I'm your AI assistant. How can I help you with your documents today?",
                timestamp: formatSessionTime(),
              },
            ]);
          }
        }
      } else if (mapped.length === 0) {
        setDmsSessionId(null);
        setChatMessages([
          {
            id: '1',
            role: 'assistant',
            content: "Hello! I'm your AI assistant. How can I help you with your documents today?",
            timestamp: formatSessionTime(),
          },
        ]);
      }
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } }; message?: string })?.response?.data?.message ??
        (err as { message?: string })?.message ??
        'Failed to load sessions';
      toast.showError(msg);
      setChatSessions([]);
    } finally {
      setChatSessionsLoading(false);
    }
  }, [toast, parseSessionMessages]);

  useEffect(() => {
    loadDmsSessions();
  }, [loadDmsSessions]);

  useEffect(() => {
    if (chatMessages.length > 0 && dmsSessionId) {
      setChatSessions((prev) =>
        prev.map((session) => (session.id === dmsSessionId ? { ...session, messages: chatMessages } : session))
      );
    }
  }, [chatMessages, dmsSessionId]);

  const fetchDmsSessionHistory = useCallback(async (sessionId: string): Promise<ChatMessage[]> => {
    const res = await getDmsSession(sessionId);
    return parseSessionMessages(res, sessionId);
  }, [parseSessionMessages]);

  const handleDmsSessionClick = async (sessionId: string) => {
    setDmsSessionId(sessionId);
    try {
      const msgs = await fetchDmsSessionHistory(sessionId);
      setChatMessages(
        msgs.length > 0
          ? msgs
          : [
              {
                id: '1',
                role: 'assistant',
                content: "Hello! I'm your AI assistant. How can I help you with your documents today?",
                timestamp: formatSessionTime(),
              },
            ]
      );
      setChatSessions((prev) => prev.map((s) => (s.id === sessionId ? { ...s, messages: msgs } : s)));
    } catch {
      setChatMessages([
        {
          id: '1',
          role: 'assistant',
          content: "Hello! I'm your AI assistant. How can I help you with your documents today?",
          timestamp: formatSessionTime(),
        },
      ]);
    }
  };

  const handleRenameDmsSession = async (e: React.MouseEvent, sessionId: string, currentName: string) => {
    e.stopPropagation();
    const newName = window.prompt('Rename session', currentName || 'New session');
    if (newName === null || newName.trim() === '' || newName.trim() === currentName) return;
    try {
      await renameDmsSession(sessionId, newName.trim());
      setChatSessions((prev) =>
        prev.map((s) => (s.id === sessionId ? { ...s, preview: newName.trim() } : s))
      );
      toast.showSuccess('Session renamed');
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } }; message?: string })?.response?.data?.message ??
        (err as { message?: string })?.message ??
        'Failed to rename session';
      toast.showError(msg);
    }
  };

  useEffect(() => {
    getChatContext(projectId)
      .then(() => setChatError(null))
      .catch(() => setChatError(null));
  }, [projectId]);

  const formatRecordingTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioStreamRef.current = stream;
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) audioChunksRef.current.push(event.data);
      };
      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const audioFile = new File([audioBlob], `voice-recording-${Date.now()}.webm`, { type: 'audio/webm' });
        setAttachedFiles((prev) => [...prev, audioFile]);
        if (audioStreamRef.current) {
          audioStreamRef.current.getTracks().forEach((track) => track.stop());
          audioStreamRef.current = null;
        }
        setRecordingTime(0);
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);
      recordingTimerRef.current = setInterval(() => setRecordingTime((prev) => prev + 1), 1000);
    } catch {
      toast.showError('Unable to access microphone. Please check your permissions.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      mediaRecorderRef.current = null;
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
        recordingTimerRef.current = null;
      }
    }
  };

  const handleVoiceClick = () => (isRecording ? stopRecording() : startRecording());

  const handleEditUserMessage = (messageId: string) => {
    const idx = chatMessages.findIndex((m) => m.id === messageId);
    if (idx < 0 || chatMessages[idx].role !== 'user') return;
    const msg = chatMessages[idx];
    const textOnly = msg.content.replace(/^Files attached:\s*\n?/i, '').replace(/\n?📎[^\n]+(\n|$)/g, '').trim() || msg.content;
    setChatInput(textOnly);
    setChatMessages((prev) => prev.slice(0, idx));
    setAttachedFiles([]);
    chatMessagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  };

  const handleSendChatMessage = async (optionContent?: string) => {
    const raw = optionContent ?? chatInput;
    const messageContent = (typeof raw === 'string' ? raw : '').trim();
    const hasFiles = !optionContent && attachedFiles.length > 0;
    if ((!messageContent && !hasFiles) || chatSending || isRecording) return;
    let fullContent = messageContent;
    if (hasFiles) {
      const fileList = attachedFiles
        .map((f) => `📎 ${f.name} (${(f.size / 1024).toFixed(2)} KB)`)
        .join('\n');
      fullContent = messageContent ? `${messageContent}\n\n${fileList}` : `Files attached:\n${fileList}`;
    }

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: fullContent,
      timestamp: formatSessionTime(),
    };
    const filesToSend = hasFiles ? [...attachedFiles] : undefined;
    setChatMessages((prev) => [...prev, userMessage]);
    if (!optionContent) setChatInput('');
    if (!optionContent) setAttachedFiles([]);
    setChatError(null);
    setChatSending(true);

    const placeholderId = `ai-${Date.now()}`;
    setChatMessages((prev) => [
      ...prev,
      { id: placeholderId, role: 'assistant', content: '…', timestamp: formatSessionTime() },
    ]);

    try {
      let sessionId = dmsSessionId;
      if (!sessionId) {
        const sessionRes = await createSession(undefined, AGENT_DOC_MGMT);
        sessionId = getSessionIdFromResponse(sessionRes);
        if (!sessionId) throw new Error('Could not create AI session.');
        setDmsSessionId(sessionId);
        const currentTime = formatSessionTime();
        const newSession = {
          id: sessionId,
          preview: (sessionRes as { name?: string }).name ?? `DMS Chat - ${new Date().toLocaleDateString()}`,
          time: currentTime,
          messages: [],
        };
        setChatSessions((prev) => [newSession, ...prev]);
      }

      const response = await sendDmsAiMessage(sessionId, messageContent || (hasFiles ? 'Files attached.' : ''), {
        projectId,
        files: filesToSend,
      });

      const replyText =
        response.reply ?? response.response ?? response.message ?? response.content ?? 'No response received.';
      const currentTime = formatSessionTime();
      setChatMessages((prev) =>
        prev.map((m) => (m.id === placeholderId ? { ...m, content: replyText } : m))
      );
      const previewText = messageContent || (hasFiles ? 'Files attached' : '');
      if (previewText) {
        setChatSessions((prev) =>
          prev.map((s) =>
            s.id === sessionId
              ? { ...s, preview: previewText.slice(0, 30) + (previewText.length > 30 ? '...' : ''), time: currentTime }
              : s
          )
        );
      }
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } }; message?: string })?.response?.data?.message ??
        (err as { message?: string })?.message ??
        'Failed to send message.';
      setChatMessages((prev) =>
        prev.map((m) => (m.id === placeholderId ? { ...m, content: `Error: ${msg}` } : m))
      );
      setChatError(msg);
      toast.showError(msg);
    } finally {
      setChatSending(false);
    }
  };

  const handleNewChatSession = async () => {
    setChatCreatingSession(true);
    setChatError(null);
    try {
      const sessionRes = await createSession(undefined, AGENT_DOC_MGMT);
      const sessionId = getSessionIdFromResponse(sessionRes);
      if (!sessionId) throw new Error('Could not create AI session.');
      const currentTime = formatSessionTime();
      const newSession = {
        id: sessionId,
        preview: (sessionRes as { name?: string }).name ?? `DMS Chat - ${new Date().toLocaleDateString()}`,
        time: currentTime,
        messages: [],
      };
      setChatSessions((prev) => [newSession, ...prev]);
      setDmsSessionId(sessionId);
      setChatMessages([
        {
          id: '1',
          role: 'assistant',
          content: "Hello! I'm your AI assistant. How can I help you with your documents today?",
          timestamp: currentTime,
        },
      ]);
      setChatInput('');
      setAttachedFiles([]);
      toast.showSuccess('New chat session started');
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } }; message?: string })?.response?.data?.message ??
        (err as { message?: string })?.message ??
        'Failed to create session';
      setChatError(msg);
      toast.showError(msg);
    } finally {
      setChatCreatingSession(false);
    }
  };

  const handleAttachClick = () => fileInputRef.current?.click();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      setAttachedFiles((prev) => [...prev, ...Array.from(files)]);
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleRemoveFile = (index: number) => setAttachedFiles((prev) => prev.filter((_, i) => i !== index));

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey && !isRecording) {
      e.preventDefault();
      handleSendChatMessage();
    }
  };

  useEffect(() => {
    chatMessagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [chatMessages]);

  return (
    <div
      className={`flex flex-col md:flex-row w-full flex-1 min-h-0 min-w-0 h-full max-h-full ${isDark ? 'bg-[#2d2d2d]' : 'bg-slate-50'} rounded-lg sm:rounded-xl border ${isDark ? 'border-[#404040]' : 'border-slate-200'} overflow-hidden relative`}
    >
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar - fixed width on desktop, slide-over on mobile */}
      <div
        className={`fixed md:static inset-y-0 left-0 z-50 md:z-auto w-[min(100%,320px)] max-w-[85vw] sm:w-80 md:w-64 md:max-w-none flex-shrink-0 border-r ${isDark ? 'border-[#2d2d2d]' : 'border-gray-200'} flex flex-col min-h-0 overflow-hidden ${bgSecondary} transform transition-transform duration-300 ease-in-out ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        <div className={`p-2.5 sm:p-3 md:p-4 border-b ${isDark ? 'border-[#404040]' : 'border-gray-200'} flex-shrink-0`}>
          <div className="flex items-center justify-between gap-2 mb-2 sm:mb-3">
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <div className="w-6 h-6 sm:w-7 sm:h-7 bg-[#C2D642] rounded-lg flex items-center justify-center flex-shrink-0">
                <Bot className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white" />
              </div>
              <div className="min-w-0 flex-1">
                <h2 className={`text-[11px] sm:text-xs font-black truncate ${textPrimary}`}>DMS Agent</h2>
                <p className={`text-[8px] sm:text-[9px] font-bold uppercase tracking-wider truncate ${textSecondary}`}>
                  DOCUMENT ASSISTANT
                </p>
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
          <button
            onClick={handleNewChatSession}
            disabled={chatCreatingSession}
            className={`w-full flex items-center justify-center gap-1.5 px-2.5 sm:px-3 py-2 rounded-lg text-[11px] sm:text-xs font-bold transition-all min-h-[38px] touch-manipulation ${isDark ? 'bg-[#C2D642] hover:bg-[#A8B838] text-white' : 'bg-[#C2D642] hover:bg-[#A8B838] text-white'} shadow-md disabled:opacity-60 disabled:cursor-not-allowed`}
          >
            <Plus className="w-3.5 h-3.5 flex-shrink-0" /> <span className="truncate">New Chat</span>
          </button>
        </div>

        <div className="flex-1 min-h-0 flex flex-col overflow-hidden pt-2 sm:pt-3">
          <p className={`text-[9px] font-bold uppercase tracking-wider mb-1.5 px-2 sm:px-3 flex-shrink-0 ${textSecondary}`}>RECENT SESSIONS</p>
          <div className={`flex-1 min-h-0 overflow-y-auto overflow-x-hidden p-1.5 sm:p-2 md:p-3 pt-0 custom-scrollbar ${chatSessionsLoading ? 'opacity-60' : ''}`}>
          <div className="space-y-1.5">
            {chatSessions.length === 0 && !chatSessionsLoading && (
              <p className={`text-[9px] px-2 py-1 ${textSecondary}`}>No sessions yet</p>
            )}
            {chatSessions.map((session) => (
              <div
                key={session.id}
                onClick={() => handleDmsSessionClick(session.id)}
                className={`p-2 sm:p-2.5 rounded-lg cursor-pointer transition-colors touch-manipulation ${
                  session.id === dmsSessionId
                    ? isDark
                      ? 'bg-[#C2D642]/20 border-[#C2D642]/50'
                      : 'bg-[#C2D642]/10 border-[#C2D642]/30'
                    : isDark
                    ? 'bg-[#2d2d2d] hover:bg-[#404040] border-[#404040]'
                    : 'bg-white hover:bg-gray-50 border-gray-200'
                } border`}
              >
                <div className="flex items-center justify-between gap-1.5">
                  <p
                    className={`text-xs font-bold flex-1 min-w-0 truncate ${
                      session.id === dmsSessionId ? 'text-[#C2D642]' : textPrimary
                    }`}
                  >
                    {session.preview}
                  </p>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button
                      onClick={(e) => handleRenameDmsSession(e, session.id, session.preview)}
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

        {/* AI Status Indicator */}
        <div className={`p-2 sm:p-2.5 md:p-3 border-t flex-shrink-0 ${isDark ? 'border-[#404040]' : 'border-gray-200'}`}>
          <div className={`w-full flex items-center gap-1.5 md:gap-2 px-2.5 py-1.5 rounded-lg ${isDark ? 'bg-[#2d2d2d]/50' : 'bg-white'}`}>
            <div className={`w-1.5 h-1.5 md:w-2 md:h-2 rounded-full flex-shrink-0 ${
              chatSending ? 'bg-orange-500 animate-pulse' : chatError ? 'bg-red-500 animate-pulse' : 'bg-[#C2D642]'
            }`} />
            <div className="flex-1 min-w-0">
              <p className={`text-[9px] font-bold uppercase tracking-wider mb-0 ${textSecondary}`}>AI Status</p>
              <p className={`text-[11px] md:text-xs font-bold truncate ${
                chatSending ? 'text-orange-500' : chatError ? 'text-red-500' : 'text-[#C2D642]'
              }`}>
                {chatSending ? 'Thinking' : chatError ? 'Error' : 'Ready'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Chat Area - fixed layout, own scroll for messages */}
      <div className="flex-1 flex flex-col min-w-0 min-h-0 overflow-hidden flex-shrink">
        {/* Header: Back to Documents (left), Menu (mobile), AI Assistant (center/right) */}
        <div
          className={`flex items-center gap-1.5 sm:gap-2 md:gap-3 px-2 py-2 sm:px-3 sm:py-2.5 md:px-4 md:py-4 border-b flex-shrink-0 ${isDark ? 'border-[#404040]' : 'border-gray-200'} ${bgSecondary}`}
        >
          {/* Back to Documents - left most, icon-only on xs */}
          <button
            onClick={() => router.push('/document-management/office')}
            className={`flex items-center gap-1.5 sm:gap-2 px-2 py-2 sm:px-2.5 sm:py-2 rounded-lg transition-colors flex-shrink-0 min-h-[36px] min-w-[36px] sm:min-h-[40px] sm:min-w-0 touch-manipulation ${isDark ? 'hover:bg-[#2d2d2d]' : 'hover:bg-gray-100'}`}
            title="Back to documents"
          >
            <ArrowLeft className={`w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0 ${textSecondary}`} />
            <span className={`text-xs sm:text-sm font-bold whitespace-nowrap hidden sm:inline ${textPrimary}`}>Documents</span>
          </button>
          {/* Menu - mobile only */}
          <button
            onClick={() => setSidebarOpen(true)}
            className="md:hidden p-2 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 flex-shrink-0 min-h-[44px] min-w-[44px] flex items-center justify-center touch-manipulation"
            aria-label="Open sessions"
          >
            <Menu className={`w-5 h-5 ${textSecondary}`} />
          </button>
          {/* AI Assistant title */}
          <div className="flex items-center gap-1.5 sm:gap-2 md:gap-3 min-w-0 flex-1 justify-end sm:justify-center md:justify-start md:ml-2 overflow-hidden">
            <div className="w-7 h-7 sm:w-8 sm:h-8 md:w-9 md:h-9 bg-[#C2D642] rounded-lg flex items-center justify-center flex-shrink-0">
              <Bot className="w-3.5 h-3.5 sm:w-4 sm:h-4 md:w-5 md:h-5 text-white" />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className={`text-xs sm:text-sm md:text-base font-black truncate ${textPrimary}`}>AI Assistant</h3>
              <p className={`text-[8px] sm:text-[9px] md:text-[10px] font-bold uppercase tracking-wider truncate hidden sm:block ${textSecondary}`}>
                DOCUMENT MANAGEMENT
              </p>
            </div>
          </div>
        </div>

        <div className={`flex-1 min-h-0 overflow-y-auto overflow-x-hidden px-2 py-3 sm:px-4 sm:py-5 md:px-6 md:py-6 space-y-1.5 sm:space-y-2 custom-scrollbar pb-6 sm:pb-8 md:pb-10 lg:pb-6 ${chatAreaBg}`}>
          {chatMessages.length === 1 && chatMessages[0].role === 'assistant' && chatMessages[0].content.includes("Hello! I'm your AI assistant") ? (
            <div className="flex flex-col items-center justify-center min-h-[160px] sm:min-h-[200px] md:min-h-[280px] text-center px-3 sm:px-4">
              <div className="w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 bg-[#C2D642] rounded-xl sm:rounded-2xl flex items-center justify-center mb-3 sm:mb-4">
                <Bot className="w-6 h-6 sm:w-8 sm:h-8 md:w-9 md:h-9 text-white" />
              </div>
              <p className={`text-base sm:text-lg md:text-xl font-bold max-w-[280px] sm:max-w-md ${isDark ? 'text-[#C2D642]' : 'text-[#7c8a2e]'}`}>
                You're connected to the Document Management Agent.
              </p>
              <p className={`text-[11px] sm:text-xs md:text-sm font-normal mt-1.5 sm:mt-2 max-w-[280px] sm:max-w-md ${isDark ? 'text-slate-400' : 'text-[#4B5563]'}`}>
                Ask me about documents, upload files, or get help with document workflows.
              </p>
            </div>
          ) : (
          <>
          {chatMessages.map((message) => (
            <div
              key={message.id}
              className={`flex gap-2 sm:gap-3 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {message.role === 'assistant' && (
                <div className="w-8 h-8 sm:w-9 sm:h-9 bg-[#C2D642] rounded-lg flex items-center justify-center flex-shrink-0">
                  <Bot className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                </div>
              )}
              <div className={`max-w-[85%] sm:max-w-[65%] md:max-w-[60%] lg:max-w-[55%] min-w-0 ${message.role === 'user' ? 'order-2' : ''}`}>
                <div
                  className={`rounded-lg sm:rounded-xl p-2 sm:p-2.5 md:p-3 ${
                    message.role === 'user'
                      ? isDark
                        ? 'bg-slate-700/50 text-slate-100 border border-slate-600/50'
                        : 'bg-slate-100 text-slate-900 border border-slate-200'
                      : isDark
                      ? 'bg-[#2d2d2d] text-slate-100 border border-slate-600/50'
                      : 'bg-white text-slate-900 border border-slate-200 shadow-sm'
                  }`}
                >
                  <ChatMarkdownViewer
                    content={message.content}
                    isDark={isDark}
                    role={message.role}
                    onOptionClick={message.role === 'assistant' ? (text) => handleSendChatMessage(text) : undefined}
                    className={`text-xs sm:text-xs md:text-sm font-normal break-words leading-relaxed ${
                      message.role === 'user' ? `font-chat-user ${textPrimary}` : `font-chat-ai ${textPrimary}`
                    }`}
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
                <div
                  className={`w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center flex-shrink-0 border-2 ${
                    isDark ? 'bg-slate-600 border-slate-500' : 'bg-slate-500 border-slate-400'
                  }`}
                >
                  <span className="text-white text-[10px] sm:text-xs font-bold">{userInitial}</span>
                </div>
              )}
            </div>
          ))}
          <div ref={chatMessagesEndRef} />
          </>
          )}
        </div>

        {/* Input bar - fixed at bottom, stays visible while messages scroll */}
        <div className={`sticky bottom-0 left-0 right-0 z-10 flex-shrink-0 shadow-[0_-2px_8px_rgba(0,0,0,0.08)] ${bgSecondary}`}>
        {/* Attached Files - above input, inside sticky container */}
        {attachedFiles.length > 0 && (
          <div className="px-2 sm:px-3 md:px-4 pb-1.5 flex flex-wrap gap-1.5 sm:gap-2 border-t border-transparent">
            {attachedFiles.map((file, index) => (
              <div
                key={index}
                className={`flex items-center gap-1 sm:gap-1.5 md:gap-2 px-2 sm:px-2.5 md:px-3 py-1 sm:py-1.5 rounded-md sm:rounded-lg text-[10px] md:text-xs font-bold ${
                  isDark ? 'bg-[#2d2d2d] text-slate-100' : 'bg-gray-100 text-slate-900'
                }`}
              >
                <Paperclip className="w-2.5 h-2.5 sm:w-3 sm:h-3 flex-shrink-0" />
                <span className="max-w-[100px] sm:max-w-[140px] truncate">{file.name}</span>
                <button onClick={() => handleRemoveFile(index)} className={`ml-0.5 hover:opacity-70 ${textSecondary}`}>
                  ×
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Input */}
        <div className={`px-2 sm:px-3 md:px-4 py-2.5 sm:py-3 border-t ${isDark ? 'border-[#404040]' : 'border-gray-200'}`}>
          <div
            className={`flex items-center gap-1.5 sm:gap-2 p-2 sm:p-2.5 rounded-2xl border-2 ${
              isDark ? 'bg-[#2d2d2d] border-[#C2D642]/30' : 'bg-white border-[#C2D642]/30'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="*/*"
              onChange={handleFileChange}
              className="hidden"
            />
            <button
              onClick={handleAttachClick}
              className={`p-1.5 sm:p-2 rounded-lg transition-colors flex-shrink-0 min-w-[36px] min-h-[36px] sm:min-w-[40px] sm:min-h-[40px] flex items-center justify-center touch-manipulation ${isDark ? 'hover:bg-[#404040]' : 'hover:bg-gray-100'}`}
              title="Attach file"
              aria-label="Attach file"
            >
              <Paperclip className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${textSecondary}`} />
            </button>
            <input
              type="text"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyDown={handleKeyPress}
              placeholder="Type your command..."
              className={`flex-1 min-w-0 bg-transparent outline-none text-xs sm:text-sm font-bold py-1.5 sm:py-2 ${textPrimary} placeholder:${textSecondary}`}
            />
            {isRecording ? (
              <>
                <button
                  onClick={stopRecording}
                  className="p-1.5 sm:p-2 rounded-lg bg-red-500 hover:bg-red-600 text-white animate-pulse min-w-[36px] min-h-[36px] sm:min-w-[40px] sm:min-h-[40px] flex items-center justify-center touch-manipulation"
                  title="Stop recording"
                  aria-label="Stop recording"
                >
                  <Square className="w-3.5 h-3.5 sm:w-4 sm:h-4 fill-white" />
                </button>
                <span className={`text-[9px] sm:text-[10px] font-bold min-w-[2.5rem] ${isDark ? 'text-red-400' : 'text-red-600'}`}>
                  {formatRecordingTime(recordingTime)}
                </span>
              </>
            ) : (
              <button
                onClick={handleVoiceClick}
                className={`p-1.5 sm:p-2 rounded-lg transition-colors flex-shrink-0 min-w-[36px] min-h-[36px] sm:min-w-[40px] sm:min-h-[40px] flex items-center justify-center touch-manipulation ${isDark ? 'hover:bg-[#404040]' : 'hover:bg-gray-100'}`}
                title="Voice recording"
                aria-label="Voice recording"
              >
                <Mic className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${textSecondary}`} />
              </button>
            )}
            <button
              onClick={() => handleSendChatMessage()}
              disabled={(!chatInput.trim() && attachedFiles.length === 0) || chatSending || isRecording}
              className={`p-1.5 sm:p-2 rounded-lg transition-colors flex-shrink-0 min-w-[36px] min-h-[36px] sm:min-w-[40px] sm:min-h-[40px] flex items-center justify-center touch-manipulation ${
                (chatInput.trim() || attachedFiles.length > 0) && !chatSending && !isRecording
                  ? 'bg-[#C2D642] hover:bg-[#A8B838] text-white'
                  : isDark
                  ? 'bg-[#2d2d2d] text-slate-400 cursor-not-allowed'
                  : 'bg-gray-200 text-slate-400 cursor-not-allowed'
              }`}
              title="Send message"
              aria-label="Send message"
            >
              <Send className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </button>
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
    </div>
  );
};

export default DMSAgentChat;
