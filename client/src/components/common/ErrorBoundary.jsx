import React from 'react';

export default class ErrorBoundary extends React.Component {
  state = { hasError: false, error: null };

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('[ErrorBoundary]', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-[#F3F1EC] px-6 text-center">
          <div className="text-4xl mb-4">⚠️</div>
          <h2 className="text-lg font-bold text-primary mb-2">문제가 발생했습니다</h2>
          <p className="text-sm text-primary/50 mb-6">
            페이지를 새로고침하거나 아래 버튼을 눌러주세요.
          </p>
          <button
            onClick={this.handleReset}
            className="px-6 py-2.5 bg-primary text-gold rounded-xl font-bold text-sm"
          >
            다시 시도
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
