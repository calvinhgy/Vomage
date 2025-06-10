import React from 'react';
import { SentimentAnalysis } from '@/types';

interface SentimentDisplayProps {
  sentiment: SentimentAnalysis;
  className?: string;
}

const moodEmoji: Record<string, string> = {
  happy: '😊',
  sad: '😢',
  angry: '😠',
  excited: '🤩',
  calm: '😌',
  anxious: '😰',
  neutral: '😐',
};

const moodColor: Record<string, string> = {
  happy: 'bg-yellow-50 border-yellow-200',
  sad: 'bg-blue-50 border-blue-200',
  angry: 'bg-red-50 border-red-200',
  excited: 'bg-purple-50 border-purple-200',
  calm: 'bg-green-50 border-green-200',
  anxious: 'bg-orange-50 border-orange-200',
  neutral: 'bg-neutral-50 border-neutral-200',
};

const moodDescription: Record<string, string> = {
  happy: '你现在心情很好！充满了积极和喜悦。',
  sad: '你似乎有些低落，记住每个人都会有不开心的时候。',
  angry: '你现在感到愤怒，试着深呼吸，让自己平静下来。',
  excited: '你非常兴奋！充满了热情和期待。',
  calm: '你现在很平静，保持这种平和的心态。',
  anxious: '你有些焦虑，试着放松一下，一切都会好起来的。',
  neutral: '你的心情很平稳，既不特别高兴也不特别低落。',
};

export const SentimentDisplay: React.FC<SentimentDisplayProps> = ({
  sentiment,
  className = '',
}) => {
  const { mood, confidence, details } = sentiment;

  return (
    <div className={`card p-6 ${moodColor[mood]} ${className}`}>
      <div className="text-center mb-6">
        <div className="text-4xl mb-2">{moodEmoji[mood]}</div>
        <h3 className="text-lg font-semibold capitalize mb-1">
          {mood}
        </h3>
        <p className="text-sm text-neutral-600">
          {moodDescription[mood]}
        </p>
      </div>

      {/* 情感分析详情 */}
      <div className="space-y-4">
        {/* 置信度 */}
        <div>
          <div className="flex justify-between items-center mb-1">
            <span className="text-sm text-neutral-600">置信度</span>
            <span className="text-sm font-medium">
              {Math.round(confidence * 100)}%
            </span>
          </div>
          <div className="h-2 bg-white rounded-full overflow-hidden">
            <div
              className="h-full bg-primary-500 transition-all duration-500"
              style={{ width: `${confidence * 100}%` }}
            />
          </div>
        </div>

        {/* 情感分布 */}
        <div className="grid grid-cols-3 gap-4">
          {Object.entries(details).map(([key, value]) => (
            <div
              key={key}
              className="text-center p-2 bg-white rounded-lg shadow-sm"
            >
              <div className="text-sm font-medium capitalize mb-1">
                {key}
              </div>
              <div className="text-lg font-semibold text-primary-600">
                {Math.round(value * 100)}%
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 建议 */}
      {confidence > 0.8 && (
        <div className="mt-6 p-4 bg-white rounded-lg">
          <h4 className="text-sm font-medium mb-2">建议</h4>
          <p className="text-sm text-neutral-600">
            {mood === 'happy' && '继续保持这种好心情，也许可以和朋友分享你的快乐！'}
            {mood === 'sad' && '听听音乐，或者和朋友聊聊天，会让你感觉好一些。'}
            {mood === 'angry' && '深呼吸，喝点水，给自己一些时间冷静下来。'}
            {mood === 'excited' && '享受这份兴奋，但也要记得适度放松。'}
            {mood === 'calm' && '这是很好的状态，适合思考或者做些创造性的事情。'}
            {mood === 'anxious' && '试试简单的放松练习，或者列出让你焦虑的具体原因。'}
            {mood === 'neutral' && '这是个不错的状态，适合处理日常事务。'}
          </p>
        </div>
      )}
    </div>
  );
};
