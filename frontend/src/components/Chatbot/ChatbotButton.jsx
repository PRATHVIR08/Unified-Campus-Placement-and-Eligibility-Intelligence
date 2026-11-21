import React, { useEffect, useRef, useState } from 'react';
import { askChatbot } from '../../api/chatbot';
import { fetchCompanies } from '../../api/companies';
import ChatbotPanel from './ChatbotPanel';
import './Chatbot.css';

function storedMessages(key) {
  try {
    const saved = JSON.parse(sessionStorage.getItem(key) || '[]');
    if (!Array.isArray(saved)) return [];
    return saved
      .filter((item) => item && ['user', 'assistant'].includes(item.role) && typeof item.text === 'string')
      .slice(-100);
  } catch {
    return [];
  }
}

function createMessage(role, text) {
  return { id: `${Date.now()}-${Math.random()}`, role, text };
}

export default function ChatbotButton({ userId }) {
  const storageKey = `campus-placement-chatbot:${userId}`;
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState(() => storedMessages(storageKey));
  const [companies, setCompanies] = useState([]);
  const [companyId, setCompanyId] = useState('');
  const [loading, setLoading] = useState(false);
  const [chatError, setChatError] = useState('');
  const [retryRequest, setRetryRequest] = useState(null);
  const buttonRef = useRef(null);
  const inputRef = useRef(null);
  const wasOpen = useRef(false);

  useEffect(() => {
    sessionStorage.setItem(storageKey, JSON.stringify(messages));
  }, [messages, storageKey]);

  useEffect(() => {
    let active = true;
    fetchCompanies()
      .then((response) => {
        const available = Array.isArray(response?.data) ? response.data : [];
        if (active) setCompanies(available.filter((company) => company?.id && company?.name));
      })
      .catch(() => {
        if (active) setCompanies([]);
      });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (open) {
      inputRef.current?.focus();
    } else if (wasOpen.current) {
      buttonRef.current?.focus();
    }
    wasOpen.current = open;
  }, [open]);

  useEffect(() => {
    if (!open) return undefined;
    const closeOnEscape = (event) => {
      if (event.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [open]);

  async function sendRequest(request, addQuestion) {
    if (loading) return;
    setLoading(true);
    setChatError('');
    if (addQuestion) {
      setMessages((current) => [...current, createMessage('user', request.message)]);
    }
    setRetryRequest(request);
    try {
      const response = await askChatbot(request);
      setMessages((current) => [...current, createMessage('assistant', response.answer)]);
      setRetryRequest(null);
    } catch (error) {
      setChatError(error.message || 'The assistant is unavailable right now.');
    } finally {
      setLoading(false);
    }
  }

  function handleSend(message) {
    const trimmed = message.trim();
    if (!trimmed || loading) return;
    const request = {
      message: trimmed,
      companyId: companyId || undefined,
      history: messages.slice(-10).map(({ role, text }) => ({ role, text })),
    };
    void sendRequest(request, true);
  }

  return (
    <div className={`chatbot${open ? ' chatbot-open' : ''}`}>
      {open && (
        <ChatbotPanel
          messages={messages}
          companies={companies}
          companyId={companyId}
          onCompanyChange={setCompanyId}
          loading={loading}
          error={chatError}
          onRetry={() => retryRequest && sendRequest(retryRequest, false)}
          onSend={handleSend}
          onMinimize={() => setOpen(false)}
          onClose={() => setOpen(false)}
          inputRef={inputRef}
        />
      )}
      <button
        ref={buttonRef}
        type="button"
        className="chatbot-launcher"
        aria-label="Open Placement Assistant chatbot"
        aria-expanded={open}
        aria-haspopup="dialog"
        onClick={() => setOpen(true)}
      >
        <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
          <path d="M21 11.5a8.4 8.4 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.4 8.4 0 0 1-3.8-.9L3 21l1.9-5.7a8.4 8.4 0 0 1-.9-3.8A8.5 8.5 0 0 1 8.7 3.9a8.4 8.4 0 0 1 3.8-.9h.5a8.5 8.5 0 0 1 8 8v.5Z" />
        </svg>
        <span>Chatbot</span>
      </button>
    </div>
  );
}
