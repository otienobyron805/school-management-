import React from 'react';
import { useNavigate } from 'react-router-dom';

interface BackButtonProps {
  onBack?: () => void;
  className?: string;
}

const BackButton: React.FC<BackButtonProps> = ({ onBack, className }) => {
  let navigate: ((delta: number) => void) | null = null;
  try {
    navigate = useNavigate();
  } catch (e) {
    // Fallback if rendered outside Router context
  }

  const goBackSafely = () => {
    if (onBack) {
      onBack();
      return;
    }
    if (navigate) {
      navigate(-1);
    } else if (typeof window !== 'undefined' && window.history.length > 1) {
      window.history.back();
    }
  };

  return (
    <button
      onClick={goBackSafely}
      className={className}
      style={!className ? {
        padding: '8px 16px',
        fontSize: '16px',
        borderRadius: '8px',
        border: 'none',
        background: '#2563eb',
        color: 'white',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
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
