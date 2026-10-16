// Drive List page — Student  [P1]
// Loads drives from API and provides a filter panel (collapsible on mobile).
// No hardcoded drive data.
import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import PageHeader from '../../components/PageHeader';
import Button from '../../components/Button';
import Badge from '../../components/Badge';
import EmptyState from '../../components/EmptyState';
import ErrorState from '../../components/ErrorState';
import { TableSkeleton } from '../../components/Skeleton';
import Input from '../../components/Input';
import { fetchAllDrives } from '../../api/drives';

/* ---- Filter panel ----------------------------------------------- */
function FilterPanel({ filters, onChange, onApply, onReset }) {
  const [skillInput, setSkillInput] = useState('');

  function addSkill(e) {
    if ((e.key === 'Enter' || e.key === ',') && skillInput.trim()) {
      e.preventDefault();
      const val = skillInput.trim();
      if (!filters.skills.includes(val)) {
        onChange({ ...filters, skills: [...filters.skills, val] });
      }
      setSkillInput('');
    }
  }

  function removeSkill(skill) {
    onChange({ ...filters, skills: filters.skills.filter(s => s !== skill) });
  }

  return (
    <div className="filter-panel">
      <p style={{ fontSize: 'var(--font-size-sm)', fontWeight: 'var(--font-weight-semibold)', color: 'var(--color-text-primary)', marginBottom: 'var(--space-2)' }}>
        Filters
      </p>

      <Input
        label="Role keywords"
        value={filters.keyword}
        onChange={e => onChange({ ...filters, keyword: e.target.value })}
        placeholder="e.g. Engineer, Analyst"
      />

      <div className="field">
        <label className="field-label">Skills (press Enter to add)</label>
        <input
          className="input"
          value={skillInput}
          onChange={e => setSkillInput(e.target.value)}
          onKeyDown={addSkill}
          placeholder="e.g. Python, React…"
        />
        {filters.skills.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-2)', marginTop: 'var(--space-2)' }}>
            {filters.skills.map(s => (
              <span key={s} className="chip">
                {s}
                <button type="button" onClick={() => removeSkill(s)} aria-label={`Remove skill ${s}`}>
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      <Input
        label="Min. package (LPA)"
        type="number"
        min="0"
        step="0.1"
        value={filters.minPackage}
        onChange={e => onChange({ ...filters, minPackage: e.target.value })}
        placeholder="e.g. 5"
      />

      <Input
        label="Location"
        value={filters.location}
        onChange={e => onChange({ ...filters, location: e.target.value })}
        placeholder="e.g. Bengaluru"
      />

      <label className="toggle">
        <div
          className={`toggle-track${filters.eligibleOnly ? ' on' : ''}`}
          onClick={() => onChange({ ...filters, eligibleOnly: !filters.eligibleOnly })}
          role="switch"
          aria-checked={filters.eligibleOnly}
          tabIndex={0}
          onKeyDown={e => { if (e.key === ' ' || e.key === 'Enter') onChange({ ...filters, eligibleOnly: !filters.eligibleOnly }); }}
        >
          <div className="toggle-thumb" />
        </div>
        Eligible only
      </label>

      <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
        <Button variant="primary" size="sm" onClick={onApply} style={{ flex: 1 }}>Apply</Button>
        <Button variant="secondary" size="sm" onClick={onReset}>Reset</Button>
      </div>
    </div>
  );
}

const EMPTY_FILTERS = { keyword: '', skills: [], minPackage: '', location: '', eligibleOnly: false };

/* ---- Drive card ------------------------------------------------- */
function DriveCard({ drive, onViewDetails }) {
  const eligibleStatus = drive.isEligible ? 'eligible' : 'not eligible';
  const ctc = drive.ctcAnnual
    ? `₹${(drive.ctcAnnual / 100000).toFixed(1)} LPA`
    : drive.ctc || null;

  return (
    <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 'var(--space-3)' }}>
        <div>
          <h3 style={{ fontSize: 'var(--font-size-base)', fontWeight: 'var(--font-weight-semibold)', marginBottom: 2 }}>
            {drive.companyName || drive.company_name || '—'}
          </h3>
          <p style={{ fontSize: 'var(--font-size-sm)', margin: 0 }}>
            {drive.title || drive.role || '—'}
          </p>
        </div>
        <Badge status={eligibleStatus} />
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-2)' }}>
        {ctc && (
          <span className="chip">{ctc}</span>
        )}
        {drive.applicationDeadline && (
          <span className="chip">
            Deadline: {new Date(drive.applicationDeadline).toLocaleDateString()}
          </span>
        )}
        {drive.location && <span className="chip">{drive.location}</span>}
      </div>

      <div style={{ marginTop: 'auto', paddingTop: 'var(--space-2)' }}>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => onViewDetails(drive.id)}
          fullWidth
        >
          View details
        </Button>
      </div>
    </div>
  );
}

/* ---- Main page -------------------------------------------------- */
export default function DriveList() {
  const navigate = useNavigate();

  const [drives, setDrives]         = useState([]);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState(null);
  const [filters, setFilters]       = useState(EMPTY_FILTERS);
  const [appliedFilters, setAppliedFilters] = useState(EMPTY_FILTERS);
  const [filterOpen, setFilterOpen] = useState(false);

  const load = useCallback(async (f = EMPTY_FILTERS) => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (f.keyword)     params.set('keyword', f.keyword);
      if (f.skills?.length) params.set('skills', f.skills.join(','));
      if (f.minPackage)  params.set('minPackage', f.minPackage);
      if (f.location)    params.set('location', f.location);
      if (f.eligibleOnly) params.set('eligibleOnly', '1');

      const res = await fetchAllDrives(params);
      setDrives(res?.data || res || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleApply = () => {
    setAppliedFilters(filters);
    load(filters);
    setFilterOpen(false);
  };

  const handleReset = () => {
    setFilters(EMPTY_FILTERS);
    setAppliedFilters(EMPTY_FILTERS);
    load(EMPTY_FILTERS);
    setFilterOpen(false);
  };

  return (
    <div>
      <PageHeader
        title="Job Drives"
        description="Browse active campus recruitment drives and check your eligibility."
        actions={
          <>
            <Button variant="ghost" size="sm" onClick={() => setFilterOpen(o => !o)}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
              </svg>
              Filters
            </Button>
          </>
        }
      />

      <div style={{ display: 'flex', gap: 'var(--space-6)', alignItems: 'flex-start' }}>
        {/* Filter panel — sidebar on desktop, collapsible on mobile */}
        {filterOpen && (
          <div style={{ width: 260, flexShrink: 0 }}>
            <FilterPanel
              filters={filters}
              onChange={setFilters}
              onApply={handleApply}
              onReset={handleReset}
            />
          </div>
        )}

        {/* Main drives grid */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {loading && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px,1fr))', gap: 'var(--space-4)' }}>
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="card" style={{ minHeight: 160 }}>
                  <div className="skeleton skeleton-text" style={{ width: '60%', marginBottom: 8 }} />
                  <div className="skeleton skeleton-text" style={{ width: '80%', marginBottom: 16 }} />
                  <div className="skeleton skeleton-text" style={{ width: '40%' }} />
                </div>
              ))}
            </div>
          )}

          {!loading && error && <ErrorState message={error} onRetry={() => load(appliedFilters)} />}

          {!loading && !error && drives.length === 0 && (
            <EmptyState
              icon={
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <rect x="2" y="7" width="20" height="14" rx="2" /><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
                </svg>
              }
              title="No drives found"
              description="There are no active recruitment drives at the moment, or none match your current filters."
              action={appliedFilters !== EMPTY_FILTERS
                ? <Button variant="secondary" onClick={handleReset}>Clear filters</Button>
                : null
              }
            />
          )}

          {!loading && !error && drives.length > 0 && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px,1fr))', gap: 'var(--space-4)' }}>
              {drives.map(drive => (
                <DriveCard
                  key={drive.id}
                  drive={drive}
                  onViewDetails={id => navigate(`/drives/${id}`)}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}