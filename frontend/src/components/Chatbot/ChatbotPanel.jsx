import React, { useEffect, useRef, useState } from 'react';

const STARTER_QUESTIONS = [
  'What skills should I build for placement roles?',
  'How can I prepare for a technical interview?',
  'What placement information is available?',
];

function renderInline(text, keyPrefix) {
  return text.split(/(\*\*[^*]+\*\*)/g).map((part, index) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={`${keyPrefix}-${index}`}>{part.slice(2, -2)}</strong>;
    }
    return part;
  });
}

function renderAssistantText(text) {
  return text.split('\n').map((line, index) => {
    const bullet = line.match(/^\s*-\s+(.*)$/);
    return (
      <React.Fragment key={`line-${index}`}>
        {bullet ? (
          <span className="chatbot-bullet">
            <span aria-hidden="true">•</span>
            <span>{renderInline(bullet[1], `bullet-${index}`)}</span>
          </span>
        ) : (
          <span>{renderInline(line, `text-${index}`)}</span>
        )}
        {index < text.split('\n').length - 1 && <br />}
      </React.Fragment>
    );
  });
}

export default function ChatbotPanel({
  messages,
  companies,
  companyId,
  onCompanyChange,
  loading,
  error,
  onRetry,
  onSend,
  onMinimize,
  onClose,
  inputRef,
}) {
  const [draft, setDraft] = useState('');
  const messageListRef = useRef(null);
  const nearLimit = draft.length >= 850;

  useEffect(() => {
    if (messageListRef.current) {
      messageListRef.current.scrollTop = messageListRef.current.scrollHeight;
    }
  }, [messages, loading, error]);

  function submit() {
    if (!draft.trim() || loading) return;
    onSend(draft);
    setDraft('');
  }

  function handleKeyDown(event) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      submit();
    }
  }

  return (
    <section className="chatbot-panel" role="dialog" aria-modal="false" aria-labelledby="chatbot-title">
      <header className="chatbot-header">
        <h2 id="chatbot-title">Placement Assistant</h2>
        <div className="chatbot-header-actions">
          <button type="button" className="chatbot-icon-button" aria-label="Minimize chatbot" onClick={onMinimize}>
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <path d="M5 12h14" />
            </svg>
          </button>
          <button type="button" className="chatbot-icon-button" aria-label="Close chatbot" onClick={onClose}>
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <path d="m18 6-12 12M6 6l12 12" />
            </svg>
          </button>
        </div>
      </header>

      {companies.length > 0 && (
        <div className="chatbot-company-select">
          <label htmlFor="chatbot-company">Ask about:</label>
          <select
            id="chatbot-company"
            value={companyId}
            onChange={(event) => onCompanyChange(event.target.value)}
          >
            <option value="">All companies</option>
            {companies.map((company) => (
              <option key={company.id} value={company.id}>{company.name}</option>
            ))}
          </select>
        </div>
      )}

      <div className="chatbot-messages" ref={messageListRef} role="log" aria-live="polite" aria-relevant="additions text">
        {messages.length === 0 ? (
          <div className="chatbot-empty-state">
            <p>Ask about placement companies, roles, skills, or preparation.</p>
            <div className="chatbot-starters">
              {STARTER_QUESTIONS.map((question) => (
                <button key={question} type="button" onClick={() => onSend(question)}>
                  {question}
                </button>
              ))}
            </div>
          </div>
        ) : messages.map((message) => (
          <div key={message.id} className={`chatbot-message chatbot-message-${message.role}`}>
            <div className="chatbot-bubble">
              {message.role === 'assistant' ? renderAssistantText(message.text) : message.text}
            </div>
          </div>
        ))}
        {loading && (
          <div className="chatbot-message chatbot-message-assistant" role="status" aria-label="Assistant is typing">
            <div className="chatbot-bubble chatbot-typing"><span /><span /><span /></div>
          </div>
        )}
        {error && (
          <div className="chatbot-error" role="alert">
            <p>{error}</p>
            <button type="button" onClick={onRetry} disabled={loading}>Retry</button>
          </div>
        )}
      </div>

      <form className="chatbot-compose" onSubmit={(event) => { event.preventDefault(); submit(); }}>
        <label className="chatbot-sr-only" htmlFor="chatbot-input">Your message</label>
        <textarea
          id="chatbot-input"
          ref={inputRef}
          value={draft}
          maxLength={1000}
          rows={2}
          placeholder="Ask a placement question..."
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={handleKeyDown}
        />
        {nearLimit && <span className="chatbot-counter" aria-live="polite">{draft.length}/1000</span>}
        <button type="submit" className="chatbot-send" disabled={!draft.trim() || loading} aria-label="Send message">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <path d="m22 2-7 20-4-9-9-4Z" />
            <path d="M22 2 11 13" />
          </svg>
        </button>
      </form>
      <p className="chatbot-footer">AI-generated. Check important details with the placement office.</p>
    </section>
  );
}
