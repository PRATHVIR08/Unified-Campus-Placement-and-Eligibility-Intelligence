// Student Profile page  [P1]
// Loads profile from API, allows editing, saves via API.
// No hardcoded defaults — shows skeleton while loading, error state on failure.
import React, { useEffect, useState } from 'react';
import PageHeader from '../../components/PageHeader';
import Button from '../../components/Button';
import Input from '../../components/Input';
import ErrorState from '../../components/ErrorState';
import Skeleton from '../../components/Skeleton';
import { getStudentProfile, updateStudentProfile } from '../../api/students';

const EMPTY = {
  name: '',
  email: '',
  usn: '',
  department: '',
  degree: '',
  batch_year: '',
  cgpa: '',
  active_backlogs: '',
};

export default function Profile() {
  const [profile, setProfile]     = useState(null);
  const [form, setForm]           = useState(EMPTY);
  const [loadErr, setLoadErr]     = useState(null);
  const [loading, setLoading]     = useState(true);
  const [saving, setSaving]       = useState(false);
  const [saveMsg, setSaveMsg]     = useState('');
  const [saveErr, setSaveErr]     = useState('');

  const load = async () => {
    setLoading(true);
    setLoadErr(null);
    try {
      const res = await getStudentProfile();
      const data = res?.data || res;
      setProfile(data);
      setForm({
        name:            data.name            || '',
        email:           data.email           || '',
        usn:             data.usn || data.rollNumber || '',
        department:      data.department      || '',
        degree:          data.degree          || '',
        batch_year:      String(data.batchYear || data.batch_year || ''),
        cgpa:            String(data.cgpa     || ''),
        active_backlogs: String(data.activeBacklogs ?? data.active_backlogs ?? ''),
      });
    } catch (err) {
      setLoadErr(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleChange = (e) => {
    setForm(f => ({ ...f, [e.target.name]: e.target.value }));
    setSaveMsg('');
    setSaveErr('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setSaveErr('');
    setSaveMsg('');
    try {
      await updateStudentProfile({
        name:            form.name,
        department:      form.department.trim() || null,
        degree:          form.degree.trim() || null,
        batchYear:       form.batch_year === '' ? null : Number(form.batch_year),
        cgpa:            form.cgpa === '' ? null : Number(form.cgpa),
        activeBacklogs:  form.active_backlogs === '' ? null : Number(form.active_backlogs),
      });
      setSaveMsg('Profile updated successfully.');
    } catch (err) {
      setSaveErr(err.message || 'Failed to save profile.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div>
        <div style={{ marginBottom: 'var(--space-8)' }}>
          <Skeleton type="text-lg" width="200px" />
          <Skeleton type="text" width="300px" style={{ marginTop: 8 }} />
        </div>
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} type="text" />
          ))}
        </div>
      </div>
    );
  }

  if (loadErr) {
    return <ErrorState message={loadErr} onRetry={load} />;
  }

  return (
    <div>
      <PageHeader
        title="My Profile"
        description="Review and update your academic record. These details are used for eligibility checks."
      />

      {saveMsg && (
        <div className="alert alert-success" role="status" style={{ marginBottom: 'var(--space-6)' }}>
          {saveMsg}
        </div>
      )}
      {saveErr && (
        <div className="alert alert-error" role="alert" style={{ marginBottom: 'var(--space-6)' }}>
          {saveErr}
        </div>
      )}

      <form onSubmit={handleSubmit} style={{ maxWidth: 640 }}>
        {/* Personal details */}
        <div className="card" style={{ marginBottom: 'var(--space-4)' }}>
          <div style={{ marginBottom: 'var(--space-4)' }}>
            <p className="form-section-title">Personal Details</p>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
            <Input
              label="Full name"
              name="name"
              value={form.name}
              onChange={handleChange}
              autoComplete="name"
              required
              placeholder="Your full name"
            />
            <Input
              label="Institutional email"
              name="email"
              type="email"
              value={form.email}
              disabled
              hint="Email cannot be changed. Contact your administrator."
              placeholder="—"
            />
            <Input
              label="USN"
              name="usn"
              value={form.usn}
              disabled
              hint="USN is assigned and cannot be edited."
              placeholder="—"
            />
          </div>
        </div>

        {/* Academic record */}
        <div className="card" style={{ marginBottom: 'var(--space-6)' }}>
          <div style={{ marginBottom: 'var(--space-4)' }}>
            <p className="form-section-title">Academic Record</p>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
            <Input
              label="Department"
              name="department"
              value={form.department}
              onChange={handleChange}
              placeholder="e.g. Computer Science"
            />
            <Input
              label="Degree"
              name="degree"
              value={form.degree}
              onChange={handleChange}
              placeholder="e.g. B.Tech"
            />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 'var(--space-3)' }}>
              <Input
                label="Batch year"
                name="batch_year"
                type="number"
                value={form.batch_year}
                onChange={handleChange}
                placeholder="2025"
                min="2000"
                max="2050"
              />
              <Input
                label="CGPA"
                name="cgpa"
                type="number"
                step="0.01"
                min="0"
                max="10"
                value={form.cgpa}
                onChange={handleChange}
                placeholder="0.00 – 10.00"
              />
              <Input
                label="Active backlogs"
                name="active_backlogs"
                type="number"
                min="0"
                value={form.active_backlogs}
                onChange={handleChange}
                placeholder="0"
              />
            </div>
          </div>
        </div>

        <Button type="submit" variant="primary" loading={saving}>
          {saving ? 'Saving…' : 'Save changes'}
        </Button>
      </form>
    </div>
  );
}
