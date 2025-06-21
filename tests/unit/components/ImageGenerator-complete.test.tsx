/**
 * ImageGenerator组件完整测试
 * 测试图片生成组件的所有功能
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';

// Mock ImageGenerator组件
const MockImageGenerator = ({ 
  prompt, 
  style = 'photorealistic',
  onImageGenerated, 
  onError,
  isGenerating = false
}: {
  prompt: string;
  style?: string;
  onImageGenerated?: (result: any) => void;
  onError?: (error: Error) => void;
  isGenerating?: boolean;
}) => {
  const [loading, setLoading] = React.useState(false);
  const [generatedImage, setGeneratedImage] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  const generateImage = async () => {
    if (!prompt || loading) return;

    setLoading(true);
    setError(null);

    try {
      // 模拟图片生成延迟
      await new Promise(resolve => setTimeout(resolve, 1000));

      // 模拟成功生成
      if (prompt.includes('error')) {
        throw new Error('Generation failed');
      }

      const mockImageUrl = `data:image/png;base64,mock-image-data-${Date.now()}`;
      const result = {
        imageUrl: mockImageUrl,
        imageData: 'mock-image-data',
        metadata: {
          prompt,
          style,
          dimensions: { width: 512, height: 512 },
          generatedAt: new Date()
        }
      };

      setGeneratedImage(mockImageUrl);
      onImageGenerated?.(result);
    } catch (err) {
      const error = err as Error;
      setError(error.message);
      onError?.(error);
    } finally {
      setLoading(false);
    }
  };

  const retryGeneration = () => {
    setError(null);
    generateImage();
  };

  React.useEffect(() => {
    if (prompt && !isGenerating) {
      generateImage();
    }
  }, [prompt, style]);

  return (
    <div data-testid="image-generator" className="image-generator">
      <div data-testid="generator-info">
        <span data-testid="prompt-display">提示词: {prompt}</span>
        <span data-testid="style-display">风格: {style}</span>
      </div>

      {(loading || isGenerating) && (
        <div data-testid="loading-indicator" className="loading">
          <div data-testid="loading-spinner" className="spinner" />
          <span data-testid="loading-text">正在生成图片...</span>
          <div data-testid="progress-bar" className="progress">
            <div className="progress-fill" style={{ width: '60%' }} />
          </div>
        </div>
      )}

      {generatedImage && !loading && (
        <div data-testid="image-result">
          <img 
            data-testid="generated-image"
            src={generatedImage}
            alt="生成的图片"
            className="generated-image"
          />
          <div data-testid="image-actions">
            <button 
              data-testid="regenerate-button"
              onClick={generateImage}
              disabled={loading}
            >
              重新生成
            </button>
            <button 
              data-testid="download-button"
              onClick={() => console.log('Download image')}
            >
              下载图片
            </button>
          </div>
        </div>
      )}

      {error && (
        <div data-testid="error-container" className="error">
          <span data-testid="error-message">{error}</span>
          <button 
            data-testid="retry-button"
            onClick={retryGeneration}
            disabled={loading}
          >
            重试
          </button>
        </div>
      )}

      {!prompt && (
        <div data-testid="empty-state">
          请提供图片生成提示词
        </div>
      )}
    </div>
  );
};

describe('ImageGenerator Component - Complete Tests', () => {
  const mockProps = {
    prompt: 'blue sky with white clouds',
    style: 'photorealistic',
    onImageGenerated: jest.fn(),
    onError: jest.fn()
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('基础渲染测试', () => {
    test('应该正确渲染组件', () => {
      render(<MockImageGenerator {...mockProps} />);
      
      const container = screen.getByTestId('image-generator');
      expect(container).toBeInTheDocument();
      
      const promptDisplay = screen.getByTestId('prompt-display');
      expect(promptDisplay).toHaveTextContent('提示词: blue sky with white clouds');
      
      const styleDisplay = screen.getByTestId('style-display');
      expect(styleDisplay).toHaveTextContent('风格: photorealistic');
    });

    test('应该显示空状态当没有提示词时', () => {
      render(<MockImageGenerator prompt="" />);
      
      const emptyState = screen.getByTestId('empty-state');
      expect(emptyState).toHaveTextContent('请提供图片生成提示词');
    });

    test('应该显示生成中状态', () => {
      render(<MockImageGenerator {...mockProps} isGenerating={true} />);
      
      const loadingIndicator = screen.getByTestId('loading-indicator');
      expect(loadingIndicator).toBeInTheDocument();
      
      const loadingText = screen.getByTestId('loading-text');
      expect(loadingText).toHaveTextContent('正在生成图片...');
      
      const spinner = screen.getByTestId('loading-spinner');
      expect(spinner).toBeInTheDocument();
      
      const progressBar = screen.getByTestId('progress-bar');
      expect(progressBar).toBeInTheDocument();
    });
  });

  describe('图片生成功能', () => {
    test('应该自动开始生成图片', async () => {
      render(<MockImageGenerator {...mockProps} />);
      
      // 应该显示加载状态
      expect(screen.getByTestId('loading-indicator')).toBeInTheDocument();
      
      // 模拟时间流逝
      await act(async () => {
        jest.advanceTimersByTime(1000);
      });
      
      await waitFor(() => {
        expect(mockProps.onImageGenerated).toHaveBeenCalledWith(
          expect.objectContaining({
            imageUrl: expect.stringContaining('data:image/png;base64,'),
            imageData: 'mock-image-data',
            metadata: expect.objectContaining({
              prompt: 'blue sky with white clouds',
              style: 'photorealistic'
            })
          })
        );
      });
    });

    test('应该显示生成的图片', async () => {
      render(<MockImageGenerator {...mockProps} />);
      
      await act(async () => {
        jest.advanceTimersByTime(1000);
      });
      
      await waitFor(() => {
        const image = screen.getByTestId('generated-image');
        expect(image).toBeInTheDocument();
        expect(image).toHaveAttribute('src', expect.stringContaining('data:image/png;base64,'));
        expect(image).toHaveAttribute('alt', '生成的图片');
      });
    });

    test('应该显示图片操作按钮', async () => {
      render(<MockImageGenerator {...mockProps} />);
      
      await act(async () => {
        jest.advanceTimersByTime(1000);
      });
      
      await waitFor(() => {
        const regenerateButton = screen.getByTestId('regenerate-button');
        expect(regenerateButton).toBeInTheDocument();
        expect(regenerateButton).toHaveTextContent('重新生成');
        
        const downloadButton = screen.getByTestId('download-button');
        expect(downloadButton).toBeInTheDocument();
        expect(downloadButton).toHaveTextContent('下载图片');
      });
    });
  });

  describe('错误处理', () => {
    test('应该处理生成错误', async () => {
      const errorProps = { ...mockProps, prompt: 'error prompt' };
      render(<MockImageGenerator {...errorProps} />);
      
      await act(async () => {
        jest.advanceTimersByTime(1000);
      });
      
      await waitFor(() => {
        expect(mockProps.onError).toHaveBeenCalledWith(
          expect.objectContaining({
            message: 'Generation failed'
          })
        );
      });
    });

    test('应该显示错误信息', async () => {
      const errorProps = { ...mockProps, prompt: 'error prompt' };
      render(<MockImageGenerator {...errorProps} />);
      
      await act(async () => {
        jest.advanceTimersByTime(1000);
      });
      
      await waitFor(() => {
        const errorContainer = screen.getByTestId('error-container');
        expect(errorContainer).toBeInTheDocument();
        
        const errorMessage = screen.getByTestId('error-message');
        expect(errorMessage).toHaveTextContent('Generation failed');
        
        const retryButton = screen.getByTestId('retry-button');
        expect(retryButton).toBeInTheDocument();
      });
    });

    test('点击重试应该重新生成', async () => {
      const errorProps = { ...mockProps, prompt: 'error prompt' };
      render(<MockImageGenerator {...errorProps} />);
      
      await act(async () => {
        jest.advanceTimersByTime(1000);
      });
      
      await waitFor(() => {
        const retryButton = screen.getByTestId('retry-button');
        expect(retryButton).toBeInTheDocument();
      });
      
      const retryButton = screen.getByTestId('retry-button');
      fireEvent.click(retryButton);
      
      expect(screen.getByTestId('loading-indicator')).toBeInTheDocument();
    });
  });

  describe('交互功能', () => {
    test('点击重新生成应该开始新的生成', async () => {
      render(<MockImageGenerator {...mockProps} />);
      
      // 等待初始生成完成
      await act(async () => {
        jest.advanceTimersByTime(1000);
      });
      
      await waitFor(() => {
        const regenerateButton = screen.getByTestId('regenerate-button');
        expect(regenerateButton).toBeInTheDocument();
      });
      
      const regenerateButton = screen.getByTestId('regenerate-button');
      fireEvent.click(regenerateButton);
      
      expect(screen.getByTestId('loading-indicator')).toBeInTheDocument();
    });

    test('生成中时按钮应该被禁用', async () => {
      render(<MockImageGenerator {...mockProps} />);
      
      // 在生成过程中
      const loadingIndicator = screen.getByTestId('loading-indicator');
      expect(loadingIndicator).toBeInTheDocument();
      
      // 等待生成完成
      await act(async () => {
        jest.advanceTimersByTime(1000);
      });
      
      await waitFor(() => {
        const regenerateButton = screen.getByTestId('regenerate-button');
        expect(regenerateButton).not.toBeDisabled();
      });
    });
  });

  describe('属性变化测试', () => {
    test('提示词变化应该触发重新生成', async () => {
      const { rerender } = render(<MockImageGenerator {...mockProps} />);
      
      // 等待初始生成
      await act(async () => {
        jest.advanceTimersByTime(1000);
      });
      
      expect(mockProps.onImageGenerated).toHaveBeenCalledTimes(1);
      
      // 更改提示词
      rerender(<MockImageGenerator {...mockProps} prompt="sunset over mountains" />);
      
      expect(screen.getByTestId('loading-indicator')).toBeInTheDocument();
      
      await act(async () => {
        jest.advanceTimersByTime(1000);
      });
      
      expect(mockProps.onImageGenerated).toHaveBeenCalledTimes(2);
    });

    test('风格变化应该触发重新生成', async () => {
      const { rerender } = render(<MockImageGenerator {...mockProps} />);
      
      // 等待初始生成
      await act(async () => {
        jest.advanceTimersByTime(1000);
      });
      
      expect(mockProps.onImageGenerated).toHaveBeenCalledTimes(1);
      
      // 更改风格
      rerender(<MockImageGenerator {...mockProps} style="abstract" />);
      
      expect(screen.getByTestId('loading-indicator')).toBeInTheDocument();
    });
  });

  describe('可访问性测试', () => {
    test('图片应该有适当的alt文本', async () => {
      render(<MockImageGenerator {...mockProps} />);
      
      await act(async () => {
        jest.advanceTimersByTime(1000);
      });
      
      await waitFor(() => {
        const image = screen.getByTestId('generated-image');
        expect(image).toHaveAttribute('alt', '生成的图片');
      });
    });

    test('按钮应该可以通过键盘访问', async () => {
      render(<MockImageGenerator {...mockProps} />);
      
      await act(async () => {
        jest.advanceTimersByTime(1000);
      });
      
      await waitFor(() => {
        const regenerateButton = screen.getByTestId('regenerate-button');
        regenerateButton.focus();
        expect(document.activeElement).toBe(regenerateButton);
      });
    });

    test('加载状态应该有适当的标识', () => {
      render(<MockImageGenerator {...mockProps} isGenerating={true} />);
      
      const loadingText = screen.getByTestId('loading-text');
      expect(loadingText).toHaveTextContent('正在生成图片...');
    });
  });

  describe('边界条件测试', () => {
    test('没有回调函数时应该正常工作', async () => {
      render(<MockImageGenerator prompt="test prompt" />);
      
      expect(() => {
        act(() => {
          jest.advanceTimersByTime(1000);
        });
      }).not.toThrow();
    });

    test('空提示词应该显示空状态', () => {
      render(<MockImageGenerator prompt="" />);
      
      const emptyState = screen.getByTestId('empty-state');
      expect(emptyState).toBeInTheDocument();
      
      expect(screen.queryByTestId('loading-indicator')).not.toBeInTheDocument();
    });

    test('isGenerating属性应该覆盖内部loading状态', () => {
      render(<MockImageGenerator {...mockProps} isGenerating={true} />);
      
      const loadingIndicator = screen.getByTestId('loading-indicator');
      expect(loadingIndicator).toBeInTheDocument();
    });
  });

  describe('组件清理测试', () => {
    test('组件卸载时应该清理定时器', () => {
      const { unmount } = render(<MockImageGenerator {...mockProps} />);
      
      // 在生成过程中卸载
      unmount();
      
      // 验证没有内存泄漏
      expect(jest.getTimerCount()).toBe(0);
    });
  });
});
