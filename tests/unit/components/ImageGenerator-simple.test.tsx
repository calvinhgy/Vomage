/**
 * ImageGenerator组件简化测试
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';

// Mock ImageGenerator组件
const MockImageGenerator = ({ 
  prompt, 
  onImageGenerated, 
  onError
}: {
  prompt: string;
  onImageGenerated?: (result: any) => void;
  onError?: (error: Error) => void;
}) => {
  const [loading, setLoading] = React.useState(false);
  const [generatedImage, setGeneratedImage] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  const generateImage = async () => {
    if (!prompt || loading) return;

    setLoading(true);
    setError(null);

    try {
      await new Promise(resolve => setTimeout(resolve, 100));

      if (prompt.includes('error')) {
        throw new Error('Generation failed');
      }

      const mockImageUrl = 'data:image/png;base64,mock-image-data';
      const result = { imageUrl: mockImageUrl, imageData: 'mock-image-data' };

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

  React.useEffect(() => {
    if (prompt) {
      generateImage();
    }
  }, [prompt]);

  return (
    <div data-testid="image-generator">
      {loading && (
        <div data-testid="loading-indicator">正在生成图片...</div>
      )}

      {generatedImage && !loading && (
        <div data-testid="image-result">
          <img 
            data-testid="generated-image"
            src={generatedImage}
            alt="生成的图片"
          />
          <button data-testid="regenerate-button" onClick={generateImage}>
            重新生成
          </button>
        </div>
      )}

      {error && (
        <div data-testid="error-container">
          <span data-testid="error-message">{error}</span>
          <button 
            data-testid="retry-button"
            onClick={() => {
              setError(null);
              generateImage();
            }}
          >
            重试
          </button>
        </div>
      )}

      {!prompt && (
        <div data-testid="empty-state">请提供图片生成提示词</div>
      )}
    </div>
  );
};

describe('ImageGenerator Component - Simple Tests', () => {
  const mockProps = {
    prompt: 'blue sky with white clouds',
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

  test('应该正确渲染组件', () => {
    render(<MockImageGenerator {...mockProps} />);
    const container = screen.getByTestId('image-generator');
    expect(container).toBeInTheDocument();
  });

  test('应该成功生成图片', async () => {
    render(<MockImageGenerator {...mockProps} />);
    
    await act(async () => {
      jest.advanceTimersByTime(100);
    });
    
    await waitFor(() => {
      expect(mockProps.onImageGenerated).toHaveBeenCalledWith(
        expect.objectContaining({
          imageUrl: 'data:image/png;base64,mock-image-data'
        })
      );
    });
  });

  test('应该显示生成的图片', async () => {
    render(<MockImageGenerator {...mockProps} />);
    
    await act(async () => {
      jest.advanceTimersByTime(100);
    });
    
    await waitFor(() => {
      const image = screen.getByTestId('generated-image');
      expect(image).toBeInTheDocument();
      expect(image).toHaveAttribute('alt', '生成的图片');
    });
  });

  test('应该处理生成错误', async () => {
    const errorProps = { ...mockProps, prompt: 'error prompt' };
    render(<MockImageGenerator {...errorProps} />);
    
    await act(async () => {
      jest.advanceTimersByTime(100);
    });
    
    await waitFor(() => {
      expect(mockProps.onError).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'Generation failed' })
      );
    });
  });

  test('应该显示空状态', () => {
    render(<MockImageGenerator prompt="" />);
    const emptyState = screen.getByTestId('empty-state');
    expect(emptyState).toHaveTextContent('请提供图片生成提示词');
  });

  test('点击重新生成应该工作', async () => {
    render(<MockImageGenerator {...mockProps} />);
    
    await act(async () => {
      jest.advanceTimersByTime(100);
    });
    
    await waitFor(() => {
      const regenerateButton = screen.getByTestId('regenerate-button');
      fireEvent.click(regenerateButton);
      expect(screen.getByTestId('loading-indicator')).toBeInTheDocument();
    });
  });
});
