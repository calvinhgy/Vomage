import React, { useState } from 'react';
import Image from 'next/image';
import { 
  HeartIcon, 
  ShareIcon, 
  ArrowDownTrayIcon,
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
    setIsLoading(false);
    setHasError(false);
  };

  // 处理图片加载错误
  const handleImageError = () => {
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
  const handleShare = async () => {
    try {
      if (navigator.share) {
        await navigator.share({
          title: 'Vomage - 我的心情图片',
          text: '看看我的心情图片！',
          url: image.url,
        });
      } else {
        // 复制链接到剪贴板
        await navigator.clipboard.writeText(image.url);
        addNotification({
          type: 'success',
          message: '图片链接已复制到剪贴板',
          duration: 2000,
        });
      }
    } catch (error) {
      addNotification({
        type: 'error',
        message: '分享失败',
        duration: 2000,
      });
    }
  };

  // 下载功能
  const handleDownload = async () => {
    try {
      const response = await fetch(image.url);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = url;
      link.download = `vomage-mood-${Date.now()}.jpg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      window.URL.revokeObjectURL(url);
      
      addNotification({
        type: 'success',
        message: '图片已下载',
        duration: 2000,
      });
    } catch (error) {
      addNotification({
        type: 'error',
        message: '下载失败',
        duration: 2000,
      });
    }
  };

  return (
    <div className={`card overflow-hidden ${className}`}>
      {/* 图片标题 */}
      <div className="p-4 pb-0">
        <h3 className="text-lg font-semibold mb-2">你的心情图片</h3>
        <p className="text-sm text-neutral-600">
          基于你的语音内容生成的个性化图片
        </p>
      </div>

      {/* 图片容器 */}
      <div className="relative aspect-square bg-neutral-100">
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="loading-spinner w-8 h-8" />
          </div>
        )}

        {hasError ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-neutral-500">
            <PhotoIcon className="w-12 h-12 mb-2" />
            <p className="text-sm">图片加载失败</p>
          </div>
        ) : (
          <Image
            src={image.url}
            alt="Generated mood image"
            fill
            className="object-cover"
            onLoad={handleImageLoad}
            onError={handleImageError}
            priority
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
      <div className="p-4">
        {/* 生成提示词 */}
        <div className="mb-4">
          <h4 className="text-sm font-medium mb-1">生成提示</h4>
          <p className="text-xs text-neutral-600 bg-neutral-50 p-2 rounded">
            {image.prompt}
          </p>
        </div>

        {/* 操作按钮 */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            {/* 点赞 */}
            <button
              onClick={handleLike}
              className={`flex items-center space-x-1 transition-colors ${
                isLiked 
                  ? 'text-red-500' 
                  : 'text-neutral-500 hover:text-red-500'
              }`}
            >
              <HeartIcon 
                className={`w-5 h-5 ${isLiked ? 'fill-current' : ''}`} 
              />
              <span className="text-sm">
                {isLiked ? '已喜欢' : '喜欢'}
              </span>
            </button>

            {/* 分享 */}
            <button
              onClick={handleShare}
              className="flex items-center space-x-1 text-neutral-500 hover:text-primary-500 transition-colors"
            >
              <ShareIcon className="w-5 h-5" />
              <span className="text-sm">分享</span>
            </button>
          </div>

          {/* 下载 */}
          <button
            onClick={handleDownload}
            className="flex items-center space-x-1 text-neutral-500 hover:text-primary-500 transition-colors"
          >
            <ArrowDownTrayIcon className="w-5 h-5" />
            <span className="text-sm">下载</span>
          </button>
        </div>

        {/* 生成时间 */}
        <div className="mt-3 pt-3 border-t border-neutral-100">
          <p className="text-xs text-neutral-500">
            生成于 {new Date(image.createdAt).toLocaleString('zh-CN')}
          </p>
        </div>
      </div>
    </div>
  );
};
