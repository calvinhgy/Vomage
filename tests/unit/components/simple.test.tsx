/**
 * 简单组件测试
 */

import React from 'react';
import { render, screen } from '@testing-library/react';

// 简单的测试组件
const TestComponent = ({ title }: { title: string }) => (
  <div data-testid="test-component">
    <h1>{title}</h1>
  </div>
);

describe('Simple Component Test', () => {
  test('应该渲染测试组件', () => {
    render(<TestComponent title="Test Title" />);
    
    const component = screen.getByTestId('test-component');
    expect(component).toBeInTheDocument();
    
    const title = screen.getByText('Test Title');
    expect(title).toBeInTheDocument();
  });

  test('应该正确显示标题', () => {
    const testTitle = 'Hello World';
    render(<TestComponent title={testTitle} />);
    
    const titleElement = screen.getByRole('heading', { level: 1 });
    expect(titleElement).toHaveTextContent(testTitle);
  });
});
