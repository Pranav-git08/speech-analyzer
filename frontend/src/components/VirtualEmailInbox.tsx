import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, X } from 'lucide-react';

interface EmailData {
  id: string;
  to: string;
  subject: string;
  body: string;
  type: 'otp' | 'admin';
  timestamp: Date;
}

export const VirtualEmailInbox: React.FC = () => {
  const [emails, setEmails] = useState<EmailData[]>([]);

  useEffect(() => {
    const handleVirtualEmail = (e: Event) => {
      const customEvent = e as CustomEvent;
      const newEmail: EmailData = {
        id: Math.random().toString(36).substring(2, 9),
        to: customEvent.detail.to,
        subject: customEvent.detail.subject,
        body: customEvent.detail.body,
        type: customEvent.detail.type || 'admin',
        timestamp: new Date(),
      };
      
      setEmails((prev) => [newEmail, ...prev]);
      
      // Auto-dismiss after 30 seconds
      setTimeout(() => {
        dismissEmail(newEmail.id);
      }, 30000);
    };

    window.addEventListener('virtual_email', handleVirtualEmail);
    return () => window.removeEventListener('virtual_email', handleVirtualEmail);
  }, []);

  const dismissEmail = (id: string) => {
    setEmails((prev) => prev.filter((em) => em.id !== id));
  };

  return (
    <div style={{
      position: 'fixed',
      bottom: '24px',
      right: '24px',
      zIndex: 999999,
      display: 'flex',
      flexDirection: 'column',
      gap: '12px',
      maxWidth: '380px',
      pointerEvents: 'none'
    }}>
      <AnimatePresence>
        {emails.map((email) => (
          <motion.div
            key={email.id}
            initial={{ opacity: 0, y: 50, scale: 0.9, x: 20 }}
            animate={{ opacity: 1, y: 0, scale: 1, x: 0 }}
            exit={{ opacity: 0, scale: 0.9, x: 100 }}
            style={{
              background: 'rgba(15, 23, 42, 0.95)',
              backdropFilter: 'blur(20px)',
              border: `1px solid ${email.type === 'otp' ? 'rgba(56, 189, 248, 0.4)' : 'rgba(168, 85, 247, 0.4)'}`,
              borderRadius: '16px',
              padding: '16px',
              boxShadow: '0 20px 40px rgba(0,0,0,0.4)',
              pointerEvents: 'auto',
              color: '#fff',
              position: 'relative'
            }}
          >
            <button
              onClick={() => dismissEmail(email.id)}
              style={{
                position: 'absolute',
                top: '12px',
                right: '12px',
                background: 'transparent',
                border: 'none',
                color: '#94a3b8',
                cursor: 'pointer',
                padding: '4px'
              }}
            >
              <X size={16} />
            </button>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <div style={{
                background: email.type === 'otp' ? 'rgba(56, 189, 248, 0.2)' : 'rgba(168, 85, 247, 0.2)',
                color: email.type === 'otp' ? '#38bdf8' : '#a855f7',
                padding: '6px',
                borderRadius: '8px'
              }}>
                <Mail size={18} />
              </div>
              <div style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 600 }}>
                NEW EMAIL RECEIVED
              </div>
            </div>
            
            <div style={{ fontSize: '0.7rem', color: '#cbd5e1', marginBottom: '4px' }}>
              To: <strong>{email.to}</strong>
            </div>
            
            <div style={{ fontSize: '0.9rem', fontWeight: 700, marginBottom: '8px', color: '#f8fafc' }}>
              {email.subject}
            </div>
            
            <div style={{ 
              fontSize: '0.8rem', 
              color: '#e2e8f0', 
              lineHeight: '1.5',
              background: 'rgba(0,0,0,0.3)',
              padding: '10px',
              borderRadius: '8px',
              whiteSpace: 'pre-wrap'
            }}>
              {email.body}
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
};
