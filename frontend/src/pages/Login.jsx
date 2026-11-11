// Login / Register page  [P1]
// Split desktop layout: left marketing panel + right form card.
// Mobile: form only. Segmented toggle switches between login and register.
import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import Input from '../components/Input';
import Button from '../components/Button';
import {
  USN_REGEX,
  USN_PATTERN_HINT,
  PASSWORD_MIN_LENGTH,
  NAME_MIN_LENGTH,
} from '../config/validation';

/* ---- Validation helpers ---------------------------------------- */
function validateLoginForm({ email, password }) {
  const errors = {};
  if (!email) errors.email = 'Email is required.';
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.email = 'Enter a valid email address.';
  if (!password) errors.password = 'Password is required.';
  return errors;
}

function validateRegisterForm({ name, email, usn, password, confirm }) {
  const errors = {};
  if (!name || name.trim().length < NAME_MIN_LENGTH)
    errors.name = `Name must be at least ${NAME_MIN_LENGTH} characters.`;
  if (!email) errors.email = 'Email is required.';
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    errors.email = 'Enter a valid email address.';
  if (!usn) errors.usn = 'USN is required.';
  else if (!USN_REGEX.test(usn)) errors.usn = `Invalid USN. ${USN_PATTERN_HINT}`;
  if (!password || password.length < PASSWORD_MIN_LENGTH)
    errors.password = `Password must be at least ${PASSWORD_MIN_LENGTH} characters.`;
  if (!confirm) errors.confirm = 'Please confirm your password.';
  else if (confirm !== password) errors.confirm = 'Passwords do not match.';
  return errors;
}

/* ---- Feature bullets (static marketing copy) ------------------- */
const FEATURES = [
  {
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
        <polyline points="9 11 12 14 22 4" />
        <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
      </svg>
    ),
    text: 'Automatic eligibility checks against drive criteria, updated in real-time.',
  },
  {
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
        <circle cx="12" cy="12" r="10" />
        <polyline points="12 6 12 12 16 14" />
      </svg>
    ),
    text: 'End-to-end application tracking — from apply to final offer letter.',
  },
  {
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
        <line x1="18" y1="20" x2="18" y2="10" />
        <line x1="12" y1="20" x2="12" y2="4" />
        <line x1="6"  y1="20" x2="6"  y2="14" />
      </svg>
    ),
    text: 'Placement analytics and reports for officers — by department, drive, and year.',
  },
];

const STUDENT_ICON = (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
    <path d="M22 10 12 5 2 10l10 5 10-5z" />
    <path d="M6 12v5c0 1 3 3 6 3s6-2 6-3v-5" />
  </svg>
);

const OFFICER_ICON = (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
    <rect x="2" y="7" width="20" height="14" rx="2" />
    <path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2" />
  </svg>
);

const PORTALS = {
  student: {
    id: 'student',
    label: 'Student Login',
    description: 'Access drives, eligibility, and your applications.',
    submitLabel: 'Sign in as Student',
    icon: STUDENT_ICON,
  },
  officer: {
    id: 'officer',
    label: 'Placement Officer Login',
    description: 'Manage companies, drives, and placement operations.',
    submitLabel: 'Sign in as Officer',
    icon: OFFICER_ICON,
  },
};

function PortalPicker({ onSelect }) {
  return (
    <div className="login-portal-grid" role="group" aria-label="Choose login type">
      {Object.values(PORTALS).map((portal) => (
        <button
          key={portal.id}
          type="button"
          className="login-portal-option"
          onClick={() => onSelect(portal.id)}
        >
          <span className="login-portal-icon">{portal.icon}</span>
          <span className="login-portal-copy">
            <strong>{portal.label}</strong>
            <span>{portal.description}</span>
          </span>
        </button>
      ))}
    </div>
  );
}

/* ---- Login form ------------------------------------------------- */
function LoginForm({ portal, onChangePortal, registrationNotice }) {
  const { signIn, error: authError } = useAuth();
  const [fields, setFields]     = useState({ email: '', password: '' });
  const [touched, setTouched]   = useState({});
  const [errors, setErrors]     = useState({});
  const [formError, setFormError] = useState('');
  const [loading, setLoading]   = useState(false);
  const set = (field, value) => {
    setFields(f => ({ ...f, [field]: value }));
    if (touched[field]) {
      const errs = validateLoginForm({ ...fields, [field]: value });
      setErrors(e => ({ ...e, [field]: errs[field] }));
    }
  };

  const blur = (field) => {
    setTouched(t => ({ ...t, [field]: true }));
    const errs = validateLoginForm({ ...fields });
    setErrors(e => ({ ...e, [field]: errs[field] }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const allTouched = { email: true, password: true };
    setTouched(allTouched);
    const errs = validateLoginForm(fields);
    setErrors(errs);

    if (Object.keys(errs).length > 0) {
      // Move focus to first invalid field
      const firstInvalid = Object.keys(errs)[0];
      document.getElementById(`login-${firstInvalid}`)?.focus();
      return;
    }

    setLoading(true);
    setFormError('');
    try {
      await signIn({ email: fields.email, password: fields.password, portal });
    } catch (err) {
      setFormError(err.message || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const selected = PORTALS[portal];

  return (
    <form onSubmit={handleSubmit} noValidate>
      <div className="login-portal-banner">
        <span className="login-portal-icon">{selected.icon}</span>
        <div>
          <p className="login-portal-banner-title">{selected.label}</p>
          <p className="login-portal-banner-copy">{selected.description}</p>
        </div>
      </div>
      <div className="login-portal-actions">
        <button
          type="button"
          className="login-portal-switch"
          onClick={() => {
            setFormError('');
            onChangePortal(null);
          }}
        >
          All login options
        </button>
        <button
          type="button"
          className="login-portal-switch"
          onClick={() => {
            setFormError('');
            onChangePortal(portal === 'student' ? 'officer' : 'student');
          }}
        >
          Switch to {portal === 'student' ? 'Placement Officer Login' : 'Student Login'}
        </button>
      </div>
      {registrationNotice && (
        <div
          className={`alert ${registrationNotice.confirmationRequired ? 'alert-success' : 'alert-error'}`}
          role="status"
          style={{ marginBottom: 'var(--space-4)' }}
        >
          {registrationNotice.confirmationRequired
            ? 'Registration successful. Check your email, confirm your account, then sign in here.'
            : 'Registration succeeded, but Supabase email confirmation is disabled. Enable Confirm email in Supabase Auth to send verification emails.'}
        </div>
      )}
      <div className="form-section" style={{ gap: 'var(--space-4)' }}>
        <Input
          id="login-email"
          label="Email address"
          type="email"
          autoComplete="email"
          required
          value={fields.email}
          onChange={e => set('email', e.target.value)}
          onBlur={() => blur('email')}
          error={touched.email ? errors.email : undefined}
          placeholder="you@university.edu"
        />
        <Input
          id="login-password"
          label="Password"
          type="password"
          autoComplete="current-password"
          required
          showToggle
          value={fields.password}
          onChange={e => set('password', e.target.value)}
          onBlur={() => blur('password')}
          error={touched.password ? errors.password : undefined}
          placeholder="••••••••"
        />
      </div>

      {(formError || authError) && (
        <div className="alert alert-error" role="alert" style={{ marginBottom: 'var(--space-4)' }}>
          {formError || authError.message}
        </div>
      )}

      <Button type="submit" variant="primary" fullWidth loading={loading}>
        {loading ? 'Signing in…' : selected.submitLabel}
      </Button>
    </form>
  );
}

/* ---- Register form --------------------------------------------- */
function RegisterForm({ onRegistered }) {
  const { signUp } = useAuth();
  const [fields, setFields]     = useState({ name: '', email: '', usn: '', password: '', confirm: '' });
  const [touched, setTouched]   = useState({});
  const [errors, setErrors]     = useState({});
  const [formError, setFormError] = useState('');
  const [loading, setLoading]   = useState(false);

  const set = (field, rawValue) => {
    const value = field === 'usn' ? rawValue.toUpperCase() : rawValue;
    setFields(f => ({ ...f, [field]: value }));
    if (touched[field]) {
      const errs = validateRegisterForm({ ...fields, [field]: value });
      setErrors(e => ({ ...e, [field]: errs[field] }));
    }
  };

  const blur = (field) => {
    setTouched(t => ({ ...t, [field]: true }));
    const errs = validateRegisterForm({ ...fields });
    setErrors(e => ({ ...e, [field]: errs[field] }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const allTouched = { name: true, email: true, usn: true, password: true, confirm: true };
    setTouched(allTouched);
    const errs = validateRegisterForm(fields);
    setErrors(errs);

    if (Object.keys(errs).length > 0) {
      const firstInvalid = Object.keys(errs)[0];
      document.getElementById(`reg-${firstInvalid}`)?.focus();
      return;
    }

    setLoading(true);
    setFormError('');
    try {
      const result = await signUp({ name: fields.name, email: fields.email, usn: fields.usn, password: fields.password });
      onRegistered(result.confirmationRequired);
    } catch (err) {
      setFormError(err.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} noValidate>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
        <Input
          id="reg-name"
          label="Full name"
          type="text"
          autoComplete="name"
          required
          value={fields.name}
          onChange={e => set('name', e.target.value)}
          onBlur={() => blur('name')}
          error={touched.name ? errors.name : undefined}
          placeholder="Your full name"
        />
        <Input
          id="reg-email"
          label="Email address"
          type="email"
          autoComplete="email"
          required
          value={fields.email}
          onChange={e => set('email', e.target.value)}
          onBlur={() => blur('email')}
          error={touched.email ? errors.email : undefined}
          placeholder="you@university.edu"
        />
        <Input
          id="reg-usn"
          label="USN"
          type="text"
          autoComplete="off"
          required
          hint={USN_PATTERN_HINT}
          value={fields.usn}
          onChange={e => set('usn', e.target.value)}
          onBlur={() => blur('usn')}
          error={touched.usn ? errors.usn : undefined}
          placeholder="1AB21CS001"
          inputMode="text"
          style={{ textTransform: 'uppercase' }}
        />
        <Input
          id="reg-password"
          label="Password"
          type="password"
          autoComplete="new-password"
          required
          showToggle
          hint={`Minimum ${PASSWORD_MIN_LENGTH} characters`}
          value={fields.password}
          onChange={e => set('password', e.target.value)}
          onBlur={() => blur('password')}
          error={touched.password ? errors.password : undefined}
          placeholder="••••••••"
        />
        <Input
          id="reg-confirm"
          label="Confirm password"
          type="password"
          autoComplete="new-password"
          required
          showToggle
          value={fields.confirm}
          onChange={e => set('confirm', e.target.value)}
          onBlur={() => blur('confirm')}
          error={touched.confirm ? errors.confirm : undefined}
          placeholder="••••••••"
        />
      </div>

      {formError && (
        <div className="alert alert-error" role="alert" style={{ margin: 'var(--space-4) 0' }}>
          {formError}
        </div>
      )}

      <Button type="submit" variant="primary" fullWidth loading={loading} style={{ marginTop: 'var(--space-4)' }}>
        {loading ? 'Creating account…' : 'Create account'}
      </Button>

      <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)', marginTop: 'var(--space-3)', textAlign: 'center' }}>
        Your account will be created as a Student. Contact your placement officer to request an elevated role.
      </p>
    </form>
  );
}

/* ---- Page -------------------------------------------------------- */
export default function Login() {
  const [tab, setTab] = useState('login');
  const [portal, setPortal] = useState(null);
  const [registrationNotice, setRegistrationNotice] = useState(null);

  const handleRegistrationComplete = (confirmationRequired) => {
    setRegistrationNotice({ confirmationRequired });
    setPortal('student');
    setTab('login');
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--color-bg)' }}>

      {/* ---- Left marketing panel (desktop only) ---- */}
      <div
        aria-hidden="true"
        style={{
          display: 'none',
          flex: '1',
          padding: 'var(--space-12)',
          borderRight: '1px solid var(--color-border)',
          flexDirection: 'column',
          justifyContent: 'center',
        }}
        className="login-left-panel"
      >
        <div style={{ maxWidth: 400 }}>
          <div style={{ marginBottom: 'var(--space-3)' }}>
            <span style={{
              fontSize: 'var(--font-size-xs)',
              textTransform: 'uppercase',
              letterSpacing: 'var(--letter-spacing-label)',
              color: 'var(--color-text-muted)',
              fontWeight: 'var(--font-weight-medium)',
            }}>
              Campus Placement Intelligence
            </span>
          </div>
          <h1 style={{
            fontSize: 'var(--font-size-3xl)',
            fontWeight: 'var(--font-weight-bold)',
            letterSpacing: 'var(--letter-spacing-heading)',
            lineHeight: 1.15,
            marginBottom: 'var(--space-4)',
          }}>
            Your placement journey,<br />simplified.
          </h1>
          <p style={{ color: 'var(--color-text-secondary)', marginBottom: 'var(--space-8)', lineHeight: 1.7 }}>
            A single platform for students to discover opportunities and for placement officers to manage the entire recruitment lifecycle.
          </p>
          <ul style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)', listStyle: 'none' }}>
            {FEATURES.map((f, i) => (
              <li key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 'var(--space-3)' }}>
                <span style={{ color: 'var(--color-text-muted)', marginTop: 2, flexShrink: 0 }}>{f.icon}</span>
                <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)', lineHeight: 1.6 }}>{f.text}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* ---- Right form panel ---- */}
      <div
        style={{
          flex: '0 0 auto',
          width: '100%',
          maxWidth: 480,
          margin: '0 auto',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 'var(--space-8) var(--space-6)',
        }}
      >
        {/* Mobile brand */}
        <div style={{ marginBottom: 'var(--space-8)', textAlign: 'center', width: '100%' }} className="login-mobile-brand">
          <p style={{ fontSize: 'var(--font-size-xs)', textTransform: 'uppercase', letterSpacing: 'var(--letter-spacing-label)', color: 'var(--color-text-muted)', marginBottom: 4 }}>
            Campus Placement Intelligence
          </p>
          <h1 style={{ fontSize: 'var(--font-size-xl)', fontWeight: 'var(--font-weight-semibold)', letterSpacing: 'var(--letter-spacing-heading)' }}>
            {tab === 'register'
              ? 'Create a student account'
              : portal
                ? PORTALS[portal].label
                : 'Choose how you want to sign in'}
          </h1>
        </div>

        <div style={{ width: '100%', maxWidth: 400 }}>
          {/* Segmented toggle */}
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 'var(--space-6)' }}>
            <div className="segmented" role="tablist" aria-label="Form mode">
              <button
                role="tab"
                id="tab-login"
                aria-selected={tab === 'login'}
                aria-controls="tabpanel-login"
                className={`segmented-btn${tab === 'login' ? ' active' : ''}`}
                onClick={() => setTab('login')}
                type="button"
              >
                Sign in
              </button>
              <button
                role="tab"
                id="tab-register"
                aria-selected={tab === 'register'}
                aria-controls="tabpanel-register"
                className={`segmented-btn${tab === 'register' ? ' active' : ''}`}
                onClick={() => setTab('register')}
                type="button"
              >
                Register
              </button>
            </div>
          </div>

          {/* Form card */}
          <div
            className="card"
            id={tab === 'login' ? 'tabpanel-login' : 'tabpanel-register'}
            role="tabpanel"
            aria-labelledby={tab === 'login' ? 'tab-login' : 'tab-register'}
          >
            {tab === 'login'
              ? portal
                ? (
                  <LoginForm
                    key={portal}
                    portal={portal}
                    onChangePortal={setPortal}
                    registrationNotice={portal === 'student' ? registrationNotice : null}
                  />
                )
                : <PortalPicker onSelect={setPortal} />
              : <RegisterForm onRegistered={handleRegistrationComplete} />}
          </div>
          {tab === 'login' && !portal && (
            <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)', marginTop: 'var(--space-4)', textAlign: 'center' }}>
              Students and placement officers use separate dashboards. Choose the option that matches your role.
            </p>
          )}
        </div>
      </div>

      {/* Inline responsive style — no external CSS needed */}
      <style>{`
        @media (min-width: 769px) {
          .login-left-panel { display: flex !important; }
          .login-mobile-brand h1 { display: none; }
        }
        .login-portal-grid {
          display: flex;
          flex-direction: column;
          gap: var(--space-3);
        }
        .login-portal-option {
          display: flex;
          align-items: flex-start;
          gap: var(--space-3);
          width: 100%;
          text-align: left;
          padding: var(--space-4);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-input);
          background: var(--color-elevated);
          color: var(--color-text-primary);
          cursor: pointer;
          transition: border-color var(--transition-fast), background var(--transition-fast);
        }
        .login-portal-option:hover {
          border-color: var(--color-border-hover);
          background: var(--color-elevated-2);
        }
        .login-portal-icon {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 40px;
          height: 40px;
          flex-shrink: 0;
          border: 1px solid var(--color-border);
          border-radius: var(--radius-input);
          color: var(--color-text-secondary);
        }
        .login-portal-copy {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        .login-portal-copy strong {
          font-size: var(--font-size-sm);
          font-weight: var(--font-weight-semibold);
        }
        .login-portal-copy span {
          font-size: var(--font-size-xs);
          color: var(--color-text-muted);
          line-height: 1.5;
        }
        .login-portal-banner {
          display: flex;
          align-items: flex-start;
          gap: var(--space-3);
          margin-bottom: var(--space-3);
        }
        .login-portal-banner-title {
          font-size: var(--font-size-sm);
          font-weight: var(--font-weight-semibold);
          margin: 0;
        }
        .login-portal-banner-copy {
          font-size: var(--font-size-xs);
          color: var(--color-text-muted);
          margin: 4px 0 0;
          line-height: 1.5;
        }
        .login-portal-actions {
          display: flex;
          flex-wrap: wrap;
          gap: var(--space-3);
          margin-bottom: var(--space-4);
        }
        .login-portal-switch {
          padding: 0;
          border: none;
          background: none;
          color: var(--color-text-secondary);
          font-size: var(--font-size-xs);
          text-decoration: underline;
          cursor: pointer;
        }
        .login-portal-switch:hover { color: var(--color-text-primary); }
      `}</style>
    </div>
  );
}