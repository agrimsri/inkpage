import React, { useState } from 'react';
import { Lock, Unlock, Key, X, AlertTriangle } from 'lucide-react';

export interface PasswordModalProps {
  isLocked: boolean;
  hasPassword: boolean;
  onSetPassword: (password: string) => void;
  onUnlock: (password: string) => boolean;
  onRemovePassword: () => void;
  onClose: () => void;
}

export const PasswordModal: React.FC<PasswordModalProps> = ({
  isLocked,
  hasPassword,
  onSetPassword,
  onUnlock,
  onRemovePassword,
  onClose,
}) => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (isLocked) {
      const ok = onUnlock(password);
      if (ok) {
        onClose();
      } else {
        setErrorMsg('Incorrect section password.');
      }
    } else {
      // Set new password
      if (!password) {
        setErrorMsg('Password cannot be empty.');
        return;
      }
      if (password !== confirmPassword) {
        setErrorMsg('Passwords do not match.');
        return;
      }
      onSetPassword(password);
      onClose();
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
      }}
    >
      <div
        style={{
          backgroundColor: '#ffffff',
          borderRadius: 10,
          width: 380,
          padding: 24,
          boxShadow: '0 20px 40px rgba(0,0,0,0.2)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 700, fontSize: 16 }}>
            {isLocked ? <Lock color="#dc2626" /> : <Key color="#3b82f6" />}
            {isLocked ? 'Unlock Protected Section' : 'Set Section Password'}
          </div>
          <button onClick={onClose} style={{ border: 'none', background: 'none', cursor: 'pointer' }}>
            <X size={18} color="#94a3b8" />
          </button>
        </div>

        <p style={{ fontSize: 12, color: '#475569', margin: '0 0 16px 0', lineHeight: 1.5 }}>
          {isLocked
            ? 'This section is password-protected with AES-256 encryption. Enter password to view notes.'
            : 'Protect this section with a password. If you forget your password, notes cannot be recovered.'}
        </p>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 4 }}>
              {isLocked ? 'Enter Password' : 'New Password'}
            </label>
            <input
              type="password"
              autoFocus
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={inputStyle}
            />
          </div>

          {!isLocked && (
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 4 }}>
                Confirm Password
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                style={inputStyle}
              />
            </div>
          )}

          {errorMsg && (
            <div style={{ color: '#dc2626', fontSize: 12, display: 'flex', alignItems: 'center', gap: 4 }}>
              <AlertTriangle size={14} />
              {errorMsg}
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
            {!isLocked && hasPassword ? (
              <button
                type="button"
                onClick={() => {
                  onRemovePassword();
                  onClose();
                }}
                style={{ border: 'none', background: 'none', color: '#dc2626', fontSize: 12, cursor: 'pointer' }}
              >
                Remove Password
              </button>
            ) : <div />}

            <div style={{ display: 'flex', gap: 8 }}>
              <button type="button" onClick={onClose} style={cancelBtnStyle}>
                Cancel
              </button>
              <button type="submit" style={primaryBtnStyle}>
                {isLocked ? 'Unlock' : 'Protect'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '8px 10px',
  borderRadius: 6,
  border: '1px solid #cbd5e1',
  fontSize: 13,
  outline: 'none',
  boxSizing: 'border-box',
};

const cancelBtnStyle: React.CSSProperties = {
  padding: '6px 12px',
  borderRadius: 4,
  border: '1px solid #cbd5e1',
  background: '#ffffff',
  fontSize: 12,
  cursor: 'pointer',
};

const primaryBtnStyle: React.CSSProperties = {
  padding: '6px 16px',
  borderRadius: 4,
  border: 'none',
  background: '#3b82f6',
  color: '#ffffff',
  fontSize: 12,
  fontWeight: 600,
  cursor: 'pointer',
};
