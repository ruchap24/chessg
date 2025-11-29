'use client';

import { motion } from 'framer-motion';
import { formatDistanceToNow } from 'date-fns';

interface ChatMessageProps {
  message: {
    id: string;
    userId: string;
    message: string;
    createdAt: string;
    user?: {
      id: string;
      username: string;
    };
  };
  isOwn: boolean;
}

export default function ChatMessage({ message, isOwn }: ChatMessageProps) {
  const formatTime = (dateString: string) => {
    try {
      return formatDistanceToNow(new Date(dateString), { addSuffix: true });
    } catch {
      return 'just now';
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}
    >
      <div
        className={`max-w-[70%] rounded-lg px-4 py-2 ${
          isOwn
            ? 'bg-purple-600 text-white'
            : 'bg-white/10 text-white border border-white/20'
        }`}
      >
        {!isOwn && (
          <div className="text-xs font-semibold mb-1 opacity-80">
            {message.user?.username || 'Opponent'}
          </div>
        )}
        <div className="text-sm">{message.message}</div>
        <div className="text-xs opacity-60 mt-1">
          {formatTime(message.createdAt)}
        </div>
      </div>
    </motion.div>
  );
}

