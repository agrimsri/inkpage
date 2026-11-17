import React, { useState } from 'react';
import { Lock, Unlock, Key, X, AlertTriangle } from 'lucide-react';
import { appleTheme, appleStyles } from '../theme';

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
    <div style={appleStyles.modalBackdrop}>
      <div style={{ ...appleStyles.modalCard, width: 400, fontFamily: appleTheme.fonts.sans }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 600, fontSize: 16, color: appleTheme.colors.labelPrimary }}>
            {isLocked ? (
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: '50%',
                  backgroundColor: appleTheme.colors.destructiveTint,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Lock size={16} color={appleTheme.colors.destructive} />
              </div>
            ) : (
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: '50%',
                  backgroundColor: appleTheme.colors.accentTint,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Key size={16} color={appleTheme.colors.accent} />
              </div>
            )}
            {isLocked ? 'Unlock Protected Section' : 'Set Section Password'}
          </div>
          <button
            onClick={onClose}
            style={{
              border: 'none',
              background: 'none',
              cursor: 'pointer',
              color: appleTheme.colors.labelTertiary,
              width: 28,
              height: 28,
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: appleTheme.transitions.fast,
            }}
          >
            <X size={18} />
          </button>
        </div>

        <p style={{ fontSize: 13, color: appleTheme.colors.labelSecondary, margin: '0 0 16px 0', lineHeight: 1.5 }}>
          {isLocked
            ? 'This section is password-protected with AES-256 encryption. Enter password to view notes.'
            : 'Protect this section with a password. If you forget your password, notes cannot be recovered.'}
        </p>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: appleTheme.colors.labelSecondary, marginBottom: 6 }}>
              {isLocked ? 'Enter Password' : 'New Password'}
            </label>
            <input
              type="password"
              autoFocus
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={{ ...appleStyles.inputField, width: '100%' }}
            />
          </div>

          {!isLocked && (
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: appleTheme.colors.labelSecondary, marginBottom: 6 }}>
                Confirm Password
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                style={{ ...appleStyles.inputField, width: '100%' }}
              />
            </div>
          )}

          {errorMsg && (
            <div
              style={{
                color: appleTheme.colors.destructive,
                backgroundColor: appleTheme.colors.destructiveTint,
                padding: '6px 10px',
                borderRadius: appleTheme.radii.sm,
                fontSize: 12,
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
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
                style={appleStyles.destructiveButton()}
              >
                Remove Password
              </button>
            ) : <div />}

            <div style={{ display: 'flex', gap: 8 }}>
              <button type="button" onClick={onClose} style={appleStyles.secondaryButton()}>
                Cancel
              </button>
              <button type="submit" style={appleStyles.primaryButton()}>
                {isLocked ? 'Unlock' : 'Protect'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
