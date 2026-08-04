import React from 'react';

interface BackButtonProps {
  onBack?: () => void;
  className?: string;
}

const BackButton: React.FC<BackButtonProps> = ({ onBack, className }) => {
  const goBackSafely = () => {
    if (onBack) {
      onBack();
      return;
    }
    
    const event = new CustomEvent('app_request_go_back', {
      bubbles: true,
      cancelable: true,
      detail: { handled: false }
    });
    
    window.dispatchEvent(event);

    if (!event.detail.handled) {
      if (typeof window !== 'undefined' && window.history.length > 1) {
        window.history.back();
      }
    }
  };

  return (
    <button
      onClick={goBackSafely}
      type="button"
      className={className}
      style={!className ? {
        padding: '8px 16px',
        fontSize: '15px',
        fontWeight: '600',
        borderRadius: '8px',
        border: 'none',
        background: '#2563eb',
        color: 'white',
        cursor: 'pointer',
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)'
      } : undefined}
      onMouseOver={(e) => {
        if (!className) e.currentTarget.style.background = '#1d4ed8';
      }}
      onMouseOut={(e) => {
        if (!className) e.currentTarget.style.background = '#2563eb';
      }}
    >
      ⬅️ Back
    </button>
  );
};

export default BackButton;
