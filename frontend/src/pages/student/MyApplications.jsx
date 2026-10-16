// My Applications — Student  [P1]
// Loads applications from API, shows status badges, withdraw action.
// No hardcoded data.
import React, { useEffect, useState, useCallback } from 'react';
import PageHeader from '../../components/PageHeader';
import Badge from '../../components/Badge';
import Button from '../../components/Button';
import EmptyState from '../../components/EmptyState';
import ErrorState from '../../components/ErrorState';
import { TableSkeleton } from '../../components/Skeleton';
import DataTable from '../../components/DataTable';
import { fetchMyApplications, updateApplicationStatus } from '../../api/applications';

export default function MyApplications() {
  const [applications, setApplications] = useState([]);
  const [loading, setLoading]           = useState(true);
  const [error, setError]               = useState(null);
  const [withdrawing, setWithdrawing]   = useState(null);
  const [actionErr, setActionErr]       = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchMyApplications();
      setApplications(res?.data || res || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleWithdraw = async (appId) => {
    setWithdrawing(appId);
    setActionErr('');
    try {
      await updateApplicationStatus(appId, 'withdrawn');
      // Re-fetch to get updated list
      await load();
    } catch (err) {
      setActionErr(err.message || 'Failed to withdraw application.');
    } finally {
      setWithdrawing(null);
    }
  };

  const columns = [
    {
      header: 'Company',
      accessor: (row) => (
        <span style={{ fontWeight: 'var(--font-weight-medium)', color: 'var(--color-text-primary)' }}>
          {row.companyName || row.company_name || row.drive?.companyName || '—'}
        </span>
      ),
    },
    {
      header: 'Role',
      accessor: (row) => row.driveTitle || row.role || row.drive?.title || '—',
    },
    {
      header: 'Applied on',
      accessor: (row) => {
        const d = row.appliedAt || row.applied_date || row.createdAt;
        return d ? new Date(d).toLocaleDateString() : '—';
      },
    },
    {
      header: 'Status',
      accessor: (row) => <Badge status={row.status || 'applied'} />,
    },
    {
      header: 'Action',
      accessor: (row) => {
        const canWithdraw = ['applied', 'APPLIED'].includes(row.status);
        if (!canWithdraw) return null;
        return (
          <Button
            variant="danger"
            size="sm"
            loading={withdrawing === row.id}
            onClick={() => handleWithdraw(row.id)}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
            Withdraw
          </Button>
        );
      },
    },
  ];

  return (
    <div>
      <PageHeader
        title="My Applications"
        description="Track the status of your submitted job applications."
      />

      {actionErr && (
        <div className="alert alert-error" role="alert" style={{ marginBottom: 'var(--space-4)' }}>
          {actionErr}
        </div>
      )}

      {loading && <TableSkeleton rows={4} cols={5} />}

      {!loading && error && <ErrorState message={error} onRetry={load} />}

      {!loading && !error && (
        <DataTable
          columns={columns}
          data={applications}
          emptyTitle="No applications yet"
          emptyDescription="Once you apply for a drive, it will appear here. Visit Job Drives to explore opportunities."
        />
      )}
    </div>
  );
}