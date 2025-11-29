'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useWebSocket } from '../hooks/useWebSocket';
import { useAuth } from '../hooks/useAuth';
import { api } from '../lib/api';
import ChatMessage from './ChatMessage';

interface ChatMessage {
  id: string;
  gameId: string;
  userId: string;
  message: string;
  createdAt: string;
  user?: {
    id: string;
    username: string;
  };
}

interface ChatPanelProps {
  gameId: string;
}

export default function ChatPanel({ gameId }: ChatPanelProps) {
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [opponentTyping, setOpponentTyping] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const { emit, on, off } = useWebSocket();
  const { user } = useAuth();

  useEffect(() => {
    const loadMessages = async () => {
      try {
        const response = await api.get(`/chat/${gameId}/messages`);
        setMessages(response.data);
      } catch (error) {
        console.error('Failed to load messages:', error);
      }
    };

    loadMessages();

    const handleChatMessage = (data: { gameId: string; message: ChatMessage }) => {
      if (data.gameId === gameId) {
        setMessages((prev) => [...prev, data.message]);
        if (isMinimized) {
          setUnreadCount((prev) => prev + 1);
        }
        scrollToBottom();
      }
    };

    const handleTyping = (data: { userId: string; username: string; isTyping: boolean }) => {
      if (data.userId !== user?.id) {
        setOpponentTyping(data.isTyping);
        if (data.isTyping) {
          if (typingTimeoutRef.current) {
            clearTimeout(typingTimeoutRef.current);
          }
          typingTimeoutRef.current = setTimeout(() => {
            setOpponentTyping(false);
          }, 3000);
        }
      }
    };

    on('chat_message', handleChatMessage);
    on('typing', handleTyping);

    return () => {
      off('chat_message', handleChatMessage);
      off('typing', handleTyping);
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, [gameId, user, on, off, isMinimized]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMessage.trim() || inputMessage.length > 200) return;

    emit('send_message', { gameId, message: inputMessage.trim() });
    setInputMessage('');
    setIsTyping(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputMessage(e.target.value);
    
    if (!isTyping) {
      setIsTyping(true);
      emit('typing', { gameId, isTyping: true });
    }
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
      emit('typing', { gameId, isTyping: false });
    }, 2000);
  };

  const handleToggleMinimize = () => {
    setIsMinimized(!isMinimized);
    if (isMinimized) {
      setUnreadCount(0);
    }
  };

  if (isMinimized) {
    return (
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={handleToggleMinimize}
        className="fixed bottom-4 right-4 bg-purple-600 text-white px-6 py-3 rounded-full shadow-lg hover:bg-purple-700 transition-all flex items-center gap-2"
      >
        <span>💬 Chat</span>
        {unreadCount > 0 && (
          <span className="bg-red-500 text-white text-xs rounded-full px-2 py-1">
            {unreadCount}
          </span>
        )}
      </motion.button>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white/10 backdrop-blur-lg rounded-xl border border-white/20 flex flex-col h-[600px]"
    >
      <div className="flex items-center justify-between p-4 border-b border-white/20">
        <h3 className="text-lg font-bold text-white">Chat</h3>
        <button
          onClick={handleToggleMinimize}
          className="text-white/70 hover:text-white transition-all"
        >
          −
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        <AnimatePresence>
          {messages.map((message) => (
            <ChatMessage
              key={message.id}
              message={message}
              isOwn={message.userId === user?.id}
            />
          ))}
        </AnimatePresence>
        {opponentTyping && (
          <div className="text-white/60 text-sm italic">Opponent is typing...</div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={handleSend} className="p-4 border-t border-white/20">
        <div className="flex gap-2">
          <input
            type="text"
            value={inputMessage}
            onChange={handleInputChange}
            placeholder="Type a message..."
            maxLength={200}
            className="flex-1 bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            type="submit"
            disabled={!inputMessage.trim()}
            className="bg-purple-600 text-white px-6 py-2 rounded-lg hover:bg-purple-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Send
          </motion.button>
        </div>
        <div className="text-white/50 text-xs mt-1 text-right">
          {inputMessage.length}/200
        </div>
      </form>
    </motion.div>
  );
}

