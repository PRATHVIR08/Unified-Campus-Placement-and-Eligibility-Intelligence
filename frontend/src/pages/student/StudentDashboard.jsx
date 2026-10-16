// Student Dashboard  [P1]
// Shows summary stats from API calls — no hardcoded numbers.
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import PageHeader from '../../components/PageHeader';
import Button from '../../components/Button';
import ErrorState from '../../components/ErrorState';
import { StatsSkeleton } from '../../components/Skeleton';
import { fetchAllDrives } from '../../api/drives';
import { fetchMyApplications } from '../../api/applications';

function useStudentStats() {
  const [drives, setDrives] = useState(null);
  const [applications, setApplications] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const [d, a] = await Promise.all([fetchAllDrives(), fetchMyApplications()]);
      setDrives(d?.data || d || []);
      setApplications(a?.data || a || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);
  return { drives, applications, loading, error, retry: load };
}

export default function StudentDashboard() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const { drives, applications, loading, error, retry } = useStudentStats();

  const firstName = profile?.name?.split(' ')[0] || null;

  const totalDrives     = drives?.length ?? 0;
  const eligibleDrives  = drives?.filter(d => d.isEligible)?.length ?? 0;
  const totalApplied    = applications?.length ?? 0;
  const activeApps      = applications?.filter(a => !['SELECTED','REJECTED','WITHDRAWN'].includes(a.status))?.length ?? 0;

  return (
    <div>
      <PageHeader
        title={firstName ? `Welcome back, ${firstName}` : 'Dashboard'}
        description="Track your placement journey and discover new opportunities."
        actions={
          <Button variant="primary" onClick={() => navigate('/drives')}>
            Browse drives
          </Button>
        }
      />

      {loading && <StatsSkeleton count={4} />}

      {!loading && error && <ErrorState message={error} onRetry={retry} />}

      {!loading && !error && (
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-label">Active Drives</div>
            <div className="stat-value">{totalDrives}</div>
            <div className="stat-sub">Open for application</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Eligible For</div>
            <div className="stat-value">{eligibleDrives}</div>
            <div className="stat-sub">Based on your profile</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Total Applied</div>
            <div className="stat-value">{totalApplied}</div>
            <div className="stat-sub">All-time applications</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">In Progress</div>
            <div className="stat-value">{activeApps}</div>
            <div className="stat-sub">Awaiting outcome</div>
          </div>
        </div>
      )}
    </div>
  );
}