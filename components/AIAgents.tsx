'use client';

import React, { useState, useRef, useEffect } from 'react';
import { ThemeType } from '../types';
import { useToast } from '../contexts/ToastContext';
import { 
  Bot, 
  Send, 
  Paperclip, 
  Mic, 
  Search, 
  MoreVertical, 
  Settings,
  ChevronDown,
  Plus,
  Truck,
  Clock,
  Menu,
  X,
  Square
} from 'lucide-react';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

interface AIAgentsProps {
  theme: ThemeType;
}

const AIAgents: React.FC<AIAgentsProps> = ({ theme }) => {
  const [selectedWorkspace, setSelectedWorkspace] = useState<string>('DPR');
  const [showWorkspaceDropdown, setShowWorkspaceDropdown] = useState<boolean>(false);
  const [currentSessionId, setCurrentSessionId] = useState<string>('1');
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(false);
  const [sessions, setSessions] = useState<{ id: string; preview: string; time: string; messages: Message[] }[]>([
    {
      id: '1',
      preview: 'hello...',
      time: '01:44 AM',
      messages: [
        {
          id: '1',
          role: 'user',
          content: 'hello',
          timestamp: '01:44 AM'
        },
        {
          id: '2',
          role: 'assistant',
          content: 'Hello. I am your Supply Chain AI Agent. I am ready to assist you with demand forecasting, inventory optimization, logistics strategy, or end-to-end visibility. How can I help you optimize your operations today?',
          timestamp: '01:44 AM'
        }
      ]
    }
  ]);
  const [messages, setMessages] = useState<Message[]>(sessions[0].messages);
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
  const cardClass = isDark ? 'card-dark' : 'card-light';
  const textPrimary = isDark ? 'text-slate-100' : 'text-slate-900';
  const textSecondary = isDark ? 'text-slate-400' : 'text-slate-600';
  const bgPrimary = isDark ? 'bg-slate-900' : 'bg-white';
  const bgSecondary = isDark ? 'bg-slate-800' : 'bg-slate-50';

  const workspaceOptions = ['DPR', 'Inventory'];

  // Save current session messages when they change
  useEffect(() => {
    if (messages.length > 0 && currentSessionId) {
      setSessions(prev => {
        const updated = prev.map(session => 
          session.id === currentSessionId 
            ? { ...session, messages: messages }
            : session
        );
        return updated;
      });
    }
  }, [messages, currentSessionId]);

  const handleNewSession = () => {
    // Save current session if it has messages
    if (messages.length > 0) {
      const lastUserMessage = messages.filter(m => m.role === 'user').pop();
      const preview = lastUserMessage 
        ? (lastUserMessage.content.length > 20 ? lastUserMessage.content.substring(0, 20) + '...' : lastUserMessage.content)
        : 'New session';
      
      setSessions(prev => {
        const updated = prev.map(session => 
          session.id === currentSessionId 
            ? { ...session, messages: messages, preview: preview }
            : session
        );
        return updated;
      });
    }

    // Create new session
    const newSessionId = Date.now().toString();
    const currentTime = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
    
    const newSession = {
      id: newSessionId,
      preview: 'New session',
      time: currentTime,
      messages: []
    };

    setSessions(prev => [newSession, ...prev]);
    setCurrentSessionId(newSessionId);
    setMessages([]);
    setInputMessage('');
  };

  const handleSessionClick = (sessionId: string) => {
    // Save current session before switching
    if (messages.length > 0) {
      const lastUserMessage = messages.filter(m => m.role === 'user').pop();
      const preview = lastUserMessage 
        ? (lastUserMessage.content.length > 20 ? lastUserMessage.content.substring(0, 20) + '...' : lastUserMessage.content)
        : 'New session';
      
      setSessions(prev => {
        return prev.map(session => 
          session.id === currentSessionId 
            ? { ...session, messages: messages, preview: preview }
            : session
        );
      });
    }

    // Load selected session
    const selectedSession = sessions.find(s => s.id === sessionId);
    if (selectedSession) {
      setCurrentSessionId(sessionId);
      setMessages(selectedSession.messages);
    }
    
    // Close sidebar on mobile after selecting session
    setSidebarOpen(false);
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = () => {
    const messageContent = inputMessage.trim();
    const hasFiles = attachedFiles.length > 0;
    
    if (!messageContent && !hasFiles) return;

    const currentTime = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });

    // Create message content including file info
    let fullContent = messageContent;
    if (hasFiles) {
      const fileList = attachedFiles.map(f => `📎 ${f.name} (${(f.size / 1024).toFixed(2)} KB)`).join('\n');
      fullContent = messageContent 
        ? `${messageContent}\n\n${fileList}`
        : `Files attached:\n${fileList}`;
    }

    const newMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: fullContent,
      timestamp: currentTime
    };

    setMessages(prev => [...prev, newMessage]);
    setInputMessage('');
    setAttachedFiles([]);

    // Update session preview with the new message
    const previewText = messageContent || (hasFiles ? `${attachedFiles.length} file(s) attached` : '');
    setSessions(prev => {
      return prev.map(session => {
        if (session.id === currentSessionId) {
          const preview = previewText.length > 20 
            ? previewText.substring(0, 20) + '...' 
            : previewText || 'New session';
          return { ...session, preview, time: currentTime };
        }
        return session;
      });
    });

    // Simulate AI response with state changes
    setAiState('thinking');
    setTimeout(() => {
      // Randomly set error state (10% chance) for demo purposes
      const isError = Math.random() < 0.1;
      
      if (isError) {
        setAiState('error');
        setTimeout(() => {
          setAiState('ready');
        }, 3000);
      } else {
        const responseText = messageContent 
          ? `I understand you're asking about "${messageContent}".${hasFiles ? ' I can see you\'ve also attached some files.' : ''} Let me help you with that.`
          : `I can see you've attached ${attachedFiles.length} file(s). How can I help you with these files?`;
        
        const aiResponse: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: responseText,
          timestamp: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })
        };
        setMessages(prev => [...prev, aiResponse]);
        setAiState('ready');
      }
    }, 1000);
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
      const newFiles = Array.from(files);
      setAttachedFiles(prev => [...prev, ...newFiles]);
      
      // Show notification for each file
      newFiles.forEach(file => {
        const fileMessage: Message = {
          id: Date.now().toString() + Math.random(),
          role: 'user',
          content: `📎 Attached: ${file.name} (${(file.size / 1024).toFixed(2)} KB)`,
          timestamp: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })
        };
        setMessages(prev => [...prev, fileMessage]);
      });
    }
    // Reset input so same file can be selected again
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
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
        
        // Create audio file from blob
        const audioFile = new File([audioBlob], `voice-recording-${Date.now()}.webm`, { type: 'audio/webm' });
        
        // Add to attached files
        setAttachedFiles(prev => [...prev, audioFile]);
        
        // Create audio URL for playback
        const audioUrl = URL.createObjectURL(audioBlob);
        
        // In a real app, you would send this to a speech-to-text API
        // For now, we'll simulate transcription
        const simulatedTranscript = `🎤 Voice recording (${formatRecordingTime(recordingTime)})`;
        
        const voiceMessage: Message = {
          id: Date.now().toString(),
          role: 'user',
          content: simulatedTranscript,
          timestamp: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })
        };
        
        setMessages(prev => [...prev, voiceMessage]);
        
        // Update session preview
        setSessions(prev => {
          return prev.map(session => {
            if (session.id === currentSessionId) {
              return { ...session, preview: 'Voice message...', time: voiceMessage.timestamp };
            }
            return session;
          });
        });

        // Stop all tracks
        if (audioStreamRef.current) {
          audioStreamRef.current.getTracks().forEach(track => track.stop());
          audioStreamRef.current = null;
        }
        
        // Reset recording time
        setRecordingTime(0);
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
    <div className={`flex flex-col md:flex-row h-[calc(100vh-3.5rem-2rem)] sm:h-[calc(100vh-4rem-2rem)] md:h-[calc(100vh-3.5rem-2rem)] ${bgPrimary} rounded-xl border ${cardClass} overflow-hidden relative`}>
      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Left Sidebar */}
      <div className={`fixed md:static inset-y-0 left-0 z-50 md:z-auto w-full sm:w-80 md:w-64 border-r border-inherit flex flex-col ${bgSecondary} transform transition-transform duration-300 ease-in-out ${
        sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
      }`}>
        {/* Logo Section */}
        <div className="p-4 md:p-6 border-b border-inherit">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-[#6B8E23] rounded-lg flex items-center justify-center">
                <Bot className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className={`text-sm font-black ${textPrimary}`}>koncite</h2>
                <p className={`text-[10px] font-bold uppercase tracking-wider ${textSecondary}`}>INTELLIGENCE</p>
              </div>
            </div>
            <button
              onClick={() => setSidebarOpen(false)}
              className="md:hidden p-2 rounded-lg hover:bg-black/5 dark:hover:bg-white/5"
            >
              <X className={`w-5 h-5 ${textSecondary}`} />
            </button>
          </div>
          <button 
            onClick={handleNewSession}
            className={`w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-bold transition-all ${isDark ? 'bg-[#6B8E23] hover:bg-[#5a7a1e] text-white' : 'bg-[#6B8E23] hover:bg-[#5a7a1e] text-white'} shadow-md`}
          >
            <Plus className="w-4 h-4" /> New Session
          </button>
        </div>

        {/* Active Workspace */}
        <div className="p-3 md:p-4 border-b border-inherit">
          <p className={`text-[10px] font-bold uppercase tracking-wider mb-2 ${textSecondary}`}>ACTIVE WORKSPACE</p>
          <div className="relative">
            <button
              onClick={() => setShowWorkspaceDropdown(!showWorkspaceDropdown)}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-bold transition-all ${isDark ? 'bg-slate-700 hover:bg-slate-600 text-slate-100' : 'bg-white hover:bg-slate-50 text-slate-900'} border ${isDark ? 'border-slate-600' : 'border-slate-200'} shadow-sm`}
            >
              <div className="flex items-center gap-2">
                <Truck className="w-4 h-4" />
                <span>{selectedWorkspace}</span>
              </div>
              <ChevronDown className={`w-4 h-4 transition-transform ${showWorkspaceDropdown ? 'rotate-180' : ''}`} />
            </button>
            {showWorkspaceDropdown && (
              <div className={`absolute top-full left-0 right-0 mt-2 rounded-lg border shadow-lg z-20 ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
                <div className="py-1">
                  {workspaceOptions.map((option) => (
                    <button
                      key={option}
                      onClick={() => {
                        setSelectedWorkspace(option);
                        setShowWorkspaceDropdown(false);
                      }}
                      className={`w-full flex items-center gap-2 px-3 py-2 text-sm font-bold transition-colors text-left ${
                        selectedWorkspace === option
                          ? isDark ? 'bg-[#6B8E23]/20 text-[#6B8E23]' : 'bg-[#6B8E23]/10 text-[#6B8E23]'
                          : isDark ? 'hover:bg-slate-700 text-slate-100' : 'hover:bg-slate-50 text-slate-900'
                      }`}
                    >
                      <Truck className="w-4 h-4" />
                      {option}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Recent Sessions */}
        <div className="flex-1 overflow-y-auto p-3 md:p-4">
          <p className={`text-[10px] font-bold uppercase tracking-wider mb-3 ${textSecondary}`}>RECENT SESSIONS</p>
          <div className="space-y-2">
            {sessions.map((session) => (
              <div
                key={session.id}
                onClick={() => handleSessionClick(session.id)}
                className={`p-3 rounded-lg cursor-pointer transition-colors ${
                  session.id === currentSessionId 
                    ? isDark ? 'bg-[#6B8E23]/20 border-[#6B8E23]/50' : 'bg-[#6B8E23]/10 border-[#6B8E23]/30'
                    : isDark ? 'bg-slate-700 hover:bg-slate-600 border-slate-600' : 'bg-white hover:bg-slate-50 border-slate-200'
                } border`}
              >
                <div className="flex items-center justify-between">
                  <p className={`text-sm font-bold ${session.id === currentSessionId ? 'text-[#6B8E23]' : textPrimary} truncate`}>{session.preview}</p>
                  <span className={`text-[10px] font-bold ${textSecondary}`}>{session.time}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* AI State Indicator */}
        <div className="p-3 md:p-4 border-t border-inherit">
          <div className={`w-full flex items-center gap-2 md:gap-3 px-3 py-2 rounded-lg ${isDark ? 'bg-slate-800/50' : 'bg-slate-50'}`}>
            <div className={`w-2 h-2 md:w-2.5 md:h-2.5 rounded-full flex-shrink-0 ${
              aiState === 'thinking' 
                ? 'bg-orange-500 animate-pulse' 
                : aiState === 'ready' 
                  ? 'bg-green-500' 
                  : 'bg-red-500 animate-pulse'
            }`} />
            <div className="flex-1 min-w-0">
              <p className={`text-[10px] font-bold uppercase tracking-wider mb-0.5 ${textSecondary}`}>AI Status</p>
              <p className={`text-xs md:text-sm font-bold truncate ${
                aiState === 'thinking' 
                  ? 'text-orange-500' 
                  : aiState === 'ready' 
                    ? 'text-green-500' 
                    : 'text-red-500'
              }`}>
                {aiState === 'thinking' ? 'Thinking' : aiState === 'ready' ? 'Ready' : 'Error'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Chat Header */}
        <div className={`p-3 md:p-4 border-b border-inherit flex items-center justify-between ${bgSecondary}`}>
          <div className="flex items-center gap-2 md:gap-3 min-w-0 flex-1">
            <button
              onClick={() => setSidebarOpen(true)}
              className="md:hidden p-2 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 mr-1 flex-shrink-0"
            >
              <Menu className={`w-5 h-5 ${textSecondary}`} />
            </button>
            <div className="w-7 h-7 md:w-8 md:h-8 bg-[#6B8E23] rounded-lg flex items-center justify-center flex-shrink-0">
              <Bot className="w-4 h-4 md:w-5 md:h-5 text-white" />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className={`text-xs md:text-sm font-black truncate ${textPrimary}`}>Workspace Chat</h3>
              <p className={`text-[9px] md:text-[10px] font-bold uppercase tracking-wider ${textSecondary}`}>GLOBAL CONTEXT</p>
            </div>
          </div>
          {/* <div className="flex items-center gap-2">
            <button className={`p-2 rounded-lg transition-colors ${isDark ? 'hover:bg-slate-700' : 'hover:bg-slate-100'}`}>
              <Search className={`w-4 h-4 ${textSecondary}`} />
            </button>
            <button className={`p-2 rounded-lg transition-colors ${isDark ? 'hover:bg-slate-700' : 'hover:bg-slate-100'}`}>
              <MoreVertical className={`w-4 h-4 ${textSecondary}`} />
            </button>
            <div className="w-8 h-8 rounded-full bg-[#6B8E23] flex items-center justify-center">
              <span className="text-white text-xs font-bold">NV</span>
            </div>
          </div> */}
        </div>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto p-3 md:p-4 lg:p-6 space-y-3 md:space-y-4 custom-scrollbar">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex gap-2 md:gap-3 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {message.role === 'assistant' && (
                <div className="w-7 h-7 md:w-8 md:h-8 bg-[#6B8E23] rounded-lg flex items-center justify-center flex-shrink-0">
                  <Bot className="w-4 h-4 md:w-5 md:h-5 text-white" />
                </div>
              )}
              <div className={`max-w-[85%] sm:max-w-[75%] md:max-w-[70%] ${message.role === 'user' ? 'order-2' : ''}`}>
                <div className={`rounded-xl p-3 md:p-4 ${message.role === 'user' ? 'bg-[#6B8E23] text-white' : isDark ? 'bg-slate-800 text-slate-100' : 'bg-white text-slate-900'} border ${message.role === 'user' ? 'border-[#6B8E23]' : isDark ? 'border-slate-700' : 'border-slate-200'}`}>
                  <p className={`text-xs md:text-sm font-bold break-words ${message.role === 'user' ? 'text-white' : textPrimary}`}>
                    {message.content}
                  </p>
                </div>
                <p className={`text-[9px] md:text-[10px] font-bold mt-1 ${textSecondary} ${message.role === 'user' ? 'text-right' : 'text-left'}`}>
                  {message.timestamp}
                </p>
              </div>
              {message.role === 'user' && (
                <div className="w-7 h-7 md:w-8 md:h-8 rounded-full bg-[#6B8E23] flex items-center justify-center flex-shrink-0">
                  <span className="text-white text-[10px] md:text-xs font-bold">NV</span>
                </div>
              )}
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className={`p-3 md:p-4 border-t border-inherit ${bgSecondary}`}>
          {/* Attached Files Preview */}
          {attachedFiles.length > 0 && (
            <div className="mb-2 flex flex-wrap gap-2">
              {attachedFiles.map((file, index) => (
                <div
                  key={index}
                  className={`flex items-center gap-1.5 md:gap-2 px-2 md:px-3 py-1 md:py-1.5 rounded-lg text-[10px] md:text-xs font-bold ${isDark ? 'bg-slate-700 text-slate-100' : 'bg-slate-100 text-slate-900'}`}
                >
                  <Paperclip className="w-3 h-3 flex-shrink-0" />
                  <span className="max-w-[100px] sm:max-w-[150px] truncate">{file.name}</span>
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
          
          <div className={`flex items-center gap-1.5 md:gap-2 p-2 md:p-3 rounded-xl border-2 ${isDark ? 'bg-slate-800 border-[#6B8E23]/30' : 'bg-white border-[#6B8E23]/30'}`}>
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
              className={`p-1.5 md:p-2 rounded-lg transition-colors flex-shrink-0 ${isDark ? 'hover:bg-slate-700' : 'hover:bg-slate-100'}`}
              title="Attach file"
            >
              <Paperclip className={`w-3.5 h-3.5 md:w-4 md:h-4 ${textSecondary}`} />
            </button>
            <input
              type="text"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Type your command..."
              className={`flex-1 min-w-0 bg-transparent outline-none text-xs md:text-sm font-bold ${textPrimary} placeholder:${textSecondary}`}
            />
            <div className="flex items-center gap-1">
              {isRecording ? (
                <>
                  <button
                    onClick={stopRecording}
                    className="p-1.5 md:p-2 rounded-lg transition-colors flex-shrink-0 bg-red-500 hover:bg-red-600 text-white animate-pulse"
                    title="Stop recording"
                  >
                    <Square className="w-3.5 h-3.5 md:w-4 md:h-4 fill-white" />
                  </button>
                  <span className={`text-[10px] md:text-xs font-bold min-w-[3rem] text-center ${isDark ? 'text-red-400' : 'text-red-600'}`}>
                    {formatRecordingTime(recordingTime)}
                  </span>
                </>
              ) : (
                <button
                  onClick={handleVoiceClick}
                  className={`p-1.5 md:p-2 rounded-lg transition-colors flex-shrink-0 ${
                    isDark ? 'hover:bg-slate-700' : 'hover:bg-slate-100'
                  }`}
                  title="Start voice recording"
                >
                  <Mic className={`w-3.5 h-3.5 md:w-4 md:h-4 ${textSecondary}`} />
                </button>
              )}
              <button
                onClick={handleSendMessage}
                disabled={(!inputMessage.trim() && attachedFiles.length === 0) || isRecording}
                className={`p-1.5 md:p-2 rounded-lg transition-colors flex-shrink-0 ${
                  (inputMessage.trim() || attachedFiles.length > 0) && !isRecording
                    ? 'bg-[#6B8E23] hover:bg-[#5a7a1e] text-white' 
                    : isDark 
                      ? 'bg-slate-700 text-slate-400 cursor-not-allowed' 
                      : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                }`}
                title="Send message"
              >
                <Send className="w-3.5 h-3.5 md:w-4 md:h-4" />
              </button>
            </div>
          </div>
          {/* Recording Indicator */}
          {isRecording && (
            <div className={`mt-2 flex items-center justify-center gap-2 px-3 py-2 rounded-lg ${isDark ? 'bg-red-500/20 border border-red-500/30' : 'bg-red-50 border border-red-200'}`}>
              <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
              <span className={`text-[10px] md:text-xs font-bold ${isDark ? 'text-red-400' : 'text-red-600'}`}>
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
