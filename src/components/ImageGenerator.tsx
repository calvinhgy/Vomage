import React, { useState } from 'react';
import Image from 'next/image';
import { 
  HeartIcon, 
  ShareIcon, 
  PhotoIcon 
} from '@heroicons/react/24/outline';
import { GeneratedImage } from '@/types';
import { useAppStore } from '@/store/useAppStore';

interface ImageGeneratorProps {
  image: GeneratedImage;
  className?: string;
}

export const ImageGenerator: React.FC<ImageGeneratorProps> = ({
  image,
  className = '',
}) => {
  const { addNotification } = useAppStore();
  const [isLiked, setIsLiked] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  // 处理图片加载完成
  const handleImageLoad = () => {
    console.log('图片加载成功:', image.url);
    setIsLoading(false);
    setHasError(false);
  };

  // 处理图片加载错误
  const handleImageError = () => {
    console.error('图片加载失败:', image.url);
    setIsLoading(false);
    setHasError(true);
  };

  // 点赞功能
  const handleLike = () => {
    setIsLiked(!isLiked);
    addNotification({
      type: 'success',
      message: isLiked ? '取消点赞' : '已点赞',
      duration: 1500,
    });
  };

  // 分享功能
  const handleShare = () => {
    addNotification({
      type: 'info',
      message: '分享功能开发中',
      duration: 2000,
    });
  };

  console.log('ImageGenerator渲染:', image);

  return (
    <div className={`overflow-hidden ${className}`}>
      {/* 图片容器 */}
      <div className="relative aspect-square bg-neutral-100 rounded-lg overflow-hidden">
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
          </div>
        )}

        {hasError ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-neutral-500">
            <PhotoIcon className="w-12 h-12 mb-2" />
            <p className="text-sm">图片加载失败</p>
            <p className="text-xs text-gray-400 mt-1">{image.url}</p>
          </div>
        ) : (
          <Image
            src={image.url}
            alt={`${image.style} mood image`}
            fill
            className="object-cover"
            onLoad={handleImageLoad}
            onError={handleImageError}
            priority
            unoptimized={image.url.endsWith('.svg')} // SVG文件不需要优化
          />
        )}

        {/* 图片样式标签 */}
        <div className="absolute top-2 left-2">
          <span className="px-2 py-1 bg-black/50 text-white text-xs rounded-full backdrop-blur-sm">
            {image.style}
          </span>
        </div>
      </div>

      {/* 图片信息和操作 */}
      <div className="mt-4">
        {/* 生成提示词 */}
        <div className="mb-4">
          <h4 className="text-sm font-medium mb-1">生成提示</h4>
          <p className="text-xs text-neutral-600 bg-neutral-50 p-2 rounded">
            {image.prompt}
          </p>
        </div>

        {/* 操作按钮 */}
        <div className="flex items-center justify-between">
          <button
            onClick={handleLike}
            className={`flex items-center space-x-1 px-3 py-1 rounded-full text-sm transition-colors ${
              isLiked 
                ? 'bg-red-100 text-red-600' 
                : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
            }`}
          >
            <HeartIcon className={`w-4 h-4 ${isLiked ? 'fill-current' : ''}`} />
            <span>{isLiked ? '已点赞' : '点赞'}</span>
          </button>

          <div className="flex items-center space-x-2">
            <button
              onClick={handleShare}
              className="flex items-center space-x-1 px-3 py-1 rounded-full text-sm bg-neutral-100 text-neutral-600 hover:bg-neutral-200 transition-colors"
            >
              <ShareIcon className="w-4 h-4" />
              <span>分享</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
