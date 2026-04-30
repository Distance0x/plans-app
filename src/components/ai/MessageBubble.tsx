import { motion } from 'framer-motion';
import { Bot, User, Copy, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { MarkdownRenderer } from './MarkdownRenderer';
import { ThinkingIndicator } from './ThinkingIndicator';
import { ToolCallCard } from './ToolCallCard';

interface MessageBubbleProps {
  role: 'user' | 'assistant';
  content: string;
  thinking?: string;
  toolCalls?: Array<{
    id: string;
    name: string;
    arguments: string;
    status: 'pending' | 'completed' | 'failed';
    startTime?: number;
    endTime?: number;
  }>;
  timestamp?: number;
  isStreaming?: boolean;
  onCopy?: () => void;
  onDelete?: () => void;
}

export function MessageBubble({
  role,
  content,
  thinking,
  toolCalls,
  timestamp,
  isStreaming = false,
  onCopy,
  onDelete,
}: MessageBubbleProps) {
  const [showActions, setShowActions] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    onCopy?.();
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={`flex gap-3 ${role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      <div className="flex-shrink-0">
        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
          role === 'user'
            ? 'bg-gradient-to-br from-blue-500 to-purple-500'
            : 'bg-gradient-to-br from-gray-700 to-gray-800'
        } text-white shadow-md`}>
          {role === 'user' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
        </div>
      </div>

      <div className={`flex-1 max-w-[80%] ${role === 'user' ? 'items-end' : 'items-start'} flex flex-col gap-2`}>
        {thinking && <ThinkingIndicator thinking={thinking} />}

        {toolCalls && toolCalls.length > 0 && (
          <div className="space-y-1 w-full">
            {toolCalls.map((tool) => (
              <ToolCallCard key={tool.id} toolCall={tool} />
            ))}
          </div>
        )}

        <div className="relative group">
          <div className={`rounded-2xl px-4 py-3 ${
            role === 'user'
              ? 'bg-gradient-to-br from-blue-500 to-purple-500 text-white'
              : 'bg-white dark:bg-gray-800 shadow-sm'
          }`}>
            {role === 'user' ? (
              <p className="text-sm whitespace-pre-wrap">{content}</p>
            ) : (
              <div className="relative">
                {isStreaming ? (
                  <p className="text-sm leading-relaxed whitespace-pre-wrap break-words text-gray-900 dark:text-gray-100">
                    {content}
                    <span className="inline-block w-0.5 h-4 bg-gray-900 dark:bg-gray-100 ml-1 animate-pulse align-text-bottom" />
                  </p>
                ) : (
                  <MarkdownRenderer content={content} />
                )}
              </div>
            )}
          </div>

          {showActions && (
            <div className={`absolute top-2 ${role === 'user' ? 'left-2' : 'right-2'} flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity`}>
              <button
                onClick={handleCopy}
                className="p-1.5 rounded-lg bg-gray-700/80 hover:bg-gray-600 text-white text-xs"
                title={copied ? '已复制' : '复制'}
              >
                <Copy className="w-3 h-3" />
              </button>
              {onDelete && role === 'assistant' && (
                <button
                  onClick={onDelete}
                  className="p-1.5 rounded-lg bg-gray-700/80 hover:bg-red-600 text-white text-xs"
                  title="删除"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              )}
            </div>
          )}
        </div>

        {timestamp && (
          <span className="text-xs text-gray-400 px-2">
            {new Date(timestamp).toLocaleTimeString()}
          </span>
        )}
      </div>
    </motion.div>
  );
}
