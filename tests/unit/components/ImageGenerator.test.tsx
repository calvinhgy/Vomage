/**
 * ImageGenerator组件单元测试
 * 测试图片生成组件的核心功能
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { ImageGenerator } from '@/components/ImageGenerator';

// Mock Nova服务
jest.mock('@/services/nova', () => ({
  NovaService: {
    generateImage: jest.fn().mockResolvedValue({
      imageUrl: 'data:image/png;base64,mock-image-data',
      imageData: 'mock-image-data',
      metadata: {
        prompt: 'test prompt',
        style: 'abstract',
        dimensions: { width: 512, height: 512 },
        generatedAt: new Date()
      }
    })
  }
}));

describe('ImageGenerator Component', () => {
  const mockProps = {
    prompt: 'blue sky with white clouds',
    style: 'photorealistic',
    onImageGenerated: jest.fn(),
    onError: jest.fn()
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('渲染测试', () => {
    test('应该正确渲染组件', () => {
      render(<ImageGenerator {...mockProps} />);
      
      // 验证组件存在
      const container = screen.getByTestId('image-generator');
      expect(container).toBeInTheDocument();
    });

    test('应该显示生成状态', () => {
      render(<ImageGenerator {...mockProps} />);
      
      // 应该显示生成中的状态
      const generatingText = screen.getByText(/生成中|generating/i);
      expect(generatingText).toBeInTheDocument();
    });
  });

  describe('图片生成功能', () => {
    test('应该成功生成图片', async () => {
      render(<ImageGenerator {...mockProps} />);
      
      // 等待图片生成完成
      await waitFor(() => {
        const image = screen.getByRole('img');
        expect(image).toBeInTheDocument();
        expect(image).toHaveAttribute('src', 'data:image/png;base64,mock-image-data');
      });

      // 验证回调被调用
      expect(mockProps.onImageGenerated).toHaveBeenCalledWith({
        imageUrl: 'data:image/png;base64,mock-image-data',
        imageData: 'mock-image-data',
        metadata: expect.any(Object)
      });
    });

    test('应该处理生成错误', async () => {
      // Mock生成失败
      const { NovaService } = require('@/services/nova');
      NovaService.generateImage.mockRejectedValueOnce(new Error('Generation failed'));

      render(<ImageGenerator {...mockProps} />);
      
      // 等待错误处理
      await waitFor(() => {
        expect(mockProps.onError).toHaveBeenCalledWith(expect.any(Error));
      });
    });
  });

  describe('加载状态', () => {
    test('应该显示加载指示器', () => {
      render(<ImageGenerator {...mockProps} />);
      
      const loadingIndicator = screen.getByTestId('loading-indicator');
      expect(loadingIndicator).toBeInTheDocument();
    });

    test('生成完成后应该隐藏加载指示器', async () => {
      render(<ImageGenerator {...mockProps} />);
      
      await waitFor(() => {
        const loadingIndicator = screen.queryByTestId('loading-indicator');
        expect(loadingIndicator).not.toBeInTheDocument();
      });
    });
  });

  describe('错误处理', () => {
    test('应该显示错误信息', async () => {
      const { NovaService } = require('@/services/nova');
      NovaService.generateImage.mockRejectedValueOnce(new Error('Network error'));

      render(<ImageGenerator {...mockProps} />);
      
      await waitFor(() => {
        const errorMessage = screen.getByText(/错误|error/i);
        expect(errorMessage).toBeInTheDocument();
      });
    });

    test('应该提供重试选项', async () => {
      const { NovaService } = require('@/services/nova');
      NovaService.generateImage.mockRejectedValueOnce(new Error('Network error'));

      render(<ImageGenerator {...mockProps} />);
      
      await waitFor(() => {
        const retryButton = screen.getByRole('button', { name: /重试|retry/i });
        expect(retryButton).toBeInTheDocument();
      });
    });
  });

  describe('可访问性', () => {
    test('图片应该有适当的alt文本', async () => {
      render(<ImageGenerator {...mockProps} />);
      
      await waitFor(() => {
        const image = screen.getByRole('img');
        expect(image).toHaveAttribute('alt');
        expect(image.getAttribute('alt')).toContain('生成的图片');
      });
    });

    test('应该有适当的ARIA标签', () => {
      render(<ImageGenerator {...mockProps} />);
      
      const container = screen.getByTestId('image-generator');
      expect(container).toHaveAttribute('aria-label');
    });
  });
});
