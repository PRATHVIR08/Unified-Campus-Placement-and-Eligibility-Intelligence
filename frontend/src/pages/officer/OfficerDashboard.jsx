// Officer Dashboard  [P1]
// Shows placement stats loaded from API. No hardcoded numbers.
import React, { useEffect, useState, useCallback } from 'react';
import PageHeader from '../../components/PageHeader';
import ErrorState from '../../components/ErrorState';
import { StatsSkeleton } from '../../components/Skeleton';
import { fetchDepartmentSummary } from '../../api/reports';
import { fetchAllDrives } from '../../api/drives';

export default function OfficerDashboard() {
  const [summary, setSummary] = useState(null);
  const [drives, setDrives]   = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [s, d] = await Promise.all([
        fetchDepartmentSummary(),
        fetchAllDrives(),
      ]);
      setSummary(s?.data || s);
      setDrives(d?.data || d || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const totalDrives = drives?.length ?? 0;
  const totalPlaced = Array.isArray(summary)
    ? summary.reduce((acc, row) => acc + (row.placed || row.total_placed || 0), 0)
    : (summary?.totalPlaced ?? '—');
  const totalApplicants = Array.isArray(summary)
    ? summary.reduce((acc, row) => acc + (row.applicants || row.total_applicants || 0), 0)
    : (summary?.totalApplicants ?? '—');

  return (
    <div>
      <PageHeader
        title="Placement Dashboard"
        description="Overview of this season's campus recruitment activity."
      />

      {loading && <StatsSkeleton count={4} />}
      {!loading && error && <ErrorState message={error} onRetry={load} />}

      {!loading && !error && (
        <>
          <div className="stats-grid" style={{ marginBottom: 'var(--space-8)' }}>
            <div className="stat-card">
              <div className="stat-label">Active Drives</div>
              <div className="stat-value">{totalDrives}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Total Applicants</div>
              <div className="stat-value">{totalApplicants}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Students Placed</div>
              <div className="stat-value">{totalPlaced}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Departments</div>
              <div className="stat-value">{Array.isArray(summary) ? summary.length : '—'}</div>
            </div>
          </div>

          {/* Department summary table */}
          {Array.isArray(summary) && summary.length > 0 && (
            <div className="card">
              <h2 style={{ fontSize: 'var(--font-size-base)', marginBottom: 'var(--space-4)' }}>
                Department Summary
              </h2>
              <div className="table-container">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Department</th>
                      <th>Applicants</th>
                      <th>Placed</th>
                      <th>Avg CTC (LPA)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {summary.map((row, i) => (
                      <tr key={i}>
                        <td style={{ color: 'var(--color-text-primary)' }}>{row.department || '—'}</td>
                        <td>{row.applicants || row.total_applicants || 0}</td>
                        <td>{row.placed || row.total_placed || 0}</td>
                        <td>{row.avgCtc
                          ? `₹${(row.avgCtc / 100000).toFixed(1)}`
                          : row.avg_ctc
                          ? `₹${(row.avg_ctc / 100000).toFixed(1)}`
                          : '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}