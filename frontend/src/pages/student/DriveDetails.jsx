// Drive Details — Student  [P1]
// Loads drive by ID from URL param, shows eligibility badge, reasons list, and apply button.
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import PageHeader from '../../components/PageHeader';
import Badge from '../../components/Badge';
import Button from '../../components/Button';
import ErrorState from '../../components/ErrorState';
import Skeleton from '../../components/Skeleton';
import EmptyState from '../../components/EmptyState';
import { fetchDriveById } from '../../api/drives';
import { applyForDrive } from '../../api/applications';

export default function DriveDetails() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [drive, setDrive]       = useState(null);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState(null);
  const [applying, setApplying] = useState(false);
  const [applyMsg, setApplyMsg] = useState('');
  const [applyErr, setApplyErr] = useState('');

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchDriveById(id);
      setDrive(res?.data || res);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { if (id) load(); }, [id]);

  const handleApply = async () => {
    setApplying(true);
    setApplyErr('');
    setApplyMsg('');
    try {
      await applyForDrive(id);
      setApplyMsg('Application submitted successfully.');
    } catch (err) {
      setApplyErr(err.message || 'Failed to apply.');
    } finally {
      setApplying(false);
    }
  };

  if (loading) {
    return (
      <div>
        <Skeleton type="text-lg" width="40%" />
        <Skeleton type="text" width="60%" style={{ marginTop: 8, marginBottom: 32 }} />
        <div className="card">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} type="text" style={{ marginBottom: 12 }} />
          ))}
        </div>
      </div>
    );
  }

  if (error) return <ErrorState message={error} onRetry={load} />;

  if (!drive) {
    return (
      <EmptyState
        title="Drive not found"
        description="This drive may no longer exist or the link is incorrect."
        action={<Button variant="secondary" onClick={() => navigate('/drives')}>Back to drives</Button>}
      />
    );
  }

  const ctc = drive.ctcAnnual
    ? `₹${(drive.ctcAnnual / 100000).toFixed(1)} LPA`
    : drive.ctc || '—';

  const eligibleStatus = drive.isEligible ? 'eligible' : 'not eligible';
  const eligibilityReasons = drive.eligibilityReasons || drive.eligibility_reasons || [];

  return (
    <div>
      <PageHeader
        title={drive.title || drive.role || 'Drive Details'}
        description={drive.companyName || drive.company_name}
        actions={
          <>
            <Button variant="ghost" size="sm" onClick={() => navigate('/drives')}>
              ← Back
            </Button>
          </>
        }
      />

      <div style={{ display: 'flex', gap: 'var(--space-6)', flexWrap: 'wrap', alignItems: 'flex-start' }}>
        {/* Main details card */}
        <div style={{ flex: '1', minWidth: 280 }}>
          <div className="card" style={{ marginBottom: 'var(--space-4)' }}>
            <div style={{ marginBottom: 'var(--space-4)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <h2 style={{ fontSize: 'var(--font-size-lg)' }}>Drive Details</h2>
              <Badge status={eligibleStatus} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
              <DetailRow label="Company"      value={drive.companyName || drive.company_name} />
              <DetailRow label="Role"         value={drive.title || drive.role} />
              <DetailRow label="Package"      value={ctc} />
              <DetailRow label="Min CGPA"     value={drive.minCgpa != null ? drive.minCgpa : '—'} />
              <DetailRow label="Max Backlogs" value={drive.maxActiveBacklogs != null ? drive.maxActiveBacklogs : '—'} />
              <DetailRow label="Deadline"     value={drive.applicationDeadline
                ? new Date(drive.applicationDeadline).toLocaleDateString('en-IN', { dateStyle: 'long' })
                : '—'
              } />
              {drive.eligibleDepartments?.length > 0 && (
                <DetailRow label="Eligible branches" value={drive.eligibleDepartments.join(', ')} />
              )}
              {drive.location && <DetailRow label="Location" value={drive.location} />}
            </div>
          </div>

          {/* Eligibility reasons */}
          {eligibilityReasons.length > 0 && (
            <div className="card" style={{ marginBottom: 'var(--space-4)' }}>
              <h3 style={{ fontSize: 'var(--font-size-base)', marginBottom: 'var(--space-3)' }}>
                Eligibility Check
              </h3>
              <ul style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                {eligibilityReasons.map((r, i) => (
                  <li key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 'var(--space-2)', fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)' }}>
                    {r.passed ? (
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ flexShrink: 0, marginTop: 2, color: 'var(--color-text-primary)' }} aria-hidden="true">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    ) : (
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ flexShrink: 0, marginTop: 2, color: 'var(--color-text-muted)' }} aria-hidden="true">
                        <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                      </svg>
                    )}
                    <span style={{ color: r.passed ? 'var(--color-text-secondary)' : 'var(--color-text-muted)' }}>
                      {r.message || r.reason}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Apply section */}
          {applyMsg && (
            <div className="alert alert-success" role="status" style={{ marginBottom: 'var(--space-3)' }}>
              {applyMsg}
            </div>
          )}
          {applyErr && (
            <div className="alert alert-error" role="alert" style={{ marginBottom: 'var(--space-3)' }}>
              {applyErr}
            </div>
          )}

          {!applyMsg && (
            <Button
              variant="primary"
              onClick={handleApply}
              loading={applying}
              disabled={drive.isEligible === false || !!applyMsg}
            >
              {applying ? 'Applying…' : drive.isEligible ? 'Apply for this drive' : 'Not eligible'}
            </Button>
          )}
        </div>
      </div>

    </div>
  );
}

function DetailRow({ label, value }) {
  return (
    <div style={{ display: 'flex', gap: 'var(--space-3)', fontSize: 'var(--font-size-sm)' }}>
      <span style={{ color: 'var(--color-text-muted)', minWidth: 140, flexShrink: 0 }}>{label}</span>
      <span style={{ color: 'var(--color-text-primary)', fontWeight: 'var(--font-weight-medium)' }}>{value ?? '—'}</span>
    </div>
  );
}
