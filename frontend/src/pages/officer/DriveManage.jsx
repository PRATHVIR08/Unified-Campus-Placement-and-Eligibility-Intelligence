import React, { useCallback, useEffect, useState } from 'react';
import PageHeader from '../../components/PageHeader';
import Button from '../../components/Button';
import Input from '../../components/Input';
import ErrorState from '../../components/ErrorState';
import { TableSkeleton } from '../../components/Skeleton';
import { fetchAllDrives, createDrive, updateDrive, deleteDrive, updateDriveStatus } from '../../api/drives';
import { fetchCompanies } from '../../api/companies';
import { useAuth } from '../../context/AuthContext';
import { fetchSkills } from '../../api/skills';

const PAGE_SIZE = 100;
const EMPTY_FORM = {
  company_id: '',
  title: '',
  role_type: '',
  role_description: '',
  package_lpa: '',
  location: '',
  work_mode: '',
  application_deadline: '',
  status: 'active',
  minCgpa: '6',
  maxActiveBacklogs: '0',
  departments: '',
  graduationYears: '',
  skills: [],
};

function toLocalDateTime(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 16);
}

function splitList(value) {
  return value.split(',').map((item) => item.trim()).filter(Boolean);
}

function getRuleValue(rules, field, operator) {
  const rule = rules.find((item) =>
    item.field_name === field && item.operator === operator && item.mandatory !== false);
  if (!rule) return '';
  if (typeof rule.value === 'string') return rule.value;
  return String(rule.value ?? '');
}

function toForm(drive) {
  const rules = drive.eligibility_rules || [];
  return {
    company_id: drive.company_id || '',
    title: drive.title || '',
    role_type: drive.role_type || drive.roleType || '',
    role_description: drive.role_description || '',
    package_lpa: drive.package_lpa ?? (drive.ctcAnnual ? drive.ctcAnnual / 100000 : ''),
    location: drive.location || '',
    work_mode: drive.work_mode || drive.workMode || '',
    application_deadline: toLocalDateTime(drive.application_deadline || drive.applicationDeadline),
    status: drive.status || 'draft',
    minCgpa: getRuleValue(rules, 'cgpa', '>=') || '6',
    maxActiveBacklogs: getRuleValue(rules, 'backlogs', '<=') || '0',
    departments: getRuleValue(rules, 'department', 'IN') || getRuleValue(rules, 'department', '='),
    graduationYears: getRuleValue(rules, 'graduation_year', 'IN') || getRuleValue(rules, 'graduation_year', '='),
    skills: (drive.skills || []).map((skill) => skill.id),
  };
}

function buildEligibilityRules(form, existingRules = [], initialEligibility = null) {
  if (!initialEligibility) {
    const rules = [
      { field_name: 'cgpa', operator: '>=', value: Number(form.minCgpa), mandatory: true },
      { field_name: 'backlogs', operator: '<=', value: Number(form.maxActiveBacklogs), mandatory: true },
    ];
    const departments = splitList(form.departments);
    const years = splitList(form.graduationYears);
    if (departments.length) {
      rules.push({ field_name: 'department', operator: 'IN', value: departments.join(', '), mandatory: true });
    }
    if (years.length) {
      rules.push({ field_name: 'graduation_year', operator: 'IN', value: years.join(', '), mandatory: true });
    }
    return rules;
  }

  const rules = [...existingRules];
  const replacements = [
    {
      field: 'minCgpa',
      matches: (rule) => rule.field_name === 'cgpa' && rule.operator === '>=',
      create: () => ({ field_name: 'cgpa', operator: '>=', value: Number(form.minCgpa), mandatory: true }),
    },
    {
      field: 'maxActiveBacklogs',
      matches: (rule) => rule.field_name === 'backlogs' && rule.operator === '<=',
      create: () => ({ field_name: 'backlogs', operator: '<=', value: Number(form.maxActiveBacklogs), mandatory: true }),
    },
    {
      field: 'departments',
      matches: (rule) => rule.field_name === 'department' && ['IN', '='].includes(rule.operator),
      create: () => {
        const values = splitList(form.departments);
        return values.length
          ? { field_name: 'department', operator: 'IN', value: values.join(', '), mandatory: true }
          : null;
      },
    },
    {
      field: 'graduationYears',
      matches: (rule) => rule.field_name === 'graduation_year' && ['IN', '='].includes(rule.operator),
      create: () => {
        const values = splitList(form.graduationYears);
        return values.length
          ? { field_name: 'graduation_year', operator: 'IN', value: values.join(', '), mandatory: true }
          : null;
      },
    },
  ];

  for (const replacement of replacements) {
    if (form[replacement.field] === initialEligibility[replacement.field]) continue;
    const existingIndex = rules.findIndex((rule) =>
      rule.mandatory !== false && replacement.matches(rule));
    if (existingIndex >= 0) rules.splice(existingIndex, 1);
    const nextRule = replacement.create();
    if (nextRule) rules.push(nextRule);
  }
  return rules;
}

export default function DriveManage() {
  const { role } = useAuth();
  const [drives, setDrives] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [skills, setSkills] = useState([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [editingDrive, setEditingDrive] = useState(null);
  const [formOpen, setFormOpen] = useState(false);
  const [actionError, setActionError] = useState('');
  const [forceRuleUpdate, setForceRuleUpdate] = useState(false);
  const [initialEligibility, setInitialEligibility] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [driveResult, companyResult, skillResult] = await Promise.all([
        fetchAllDrives(new URLSearchParams({ page: String(page), limit: String(PAGE_SIZE) })),
        fetchCompanies(),
        fetchSkills(),
      ]);
      setDrives(driveResult?.data || []);
      setTotal(driveResult?.pagination?.total ?? driveResult?.data?.length ?? 0);
      setCompanies(companyResult?.data || []);
      setSkills(skillResult?.data || []);
    } catch (err) {
      setError(err.message || 'Could not load drives and companies.');
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => { load(); }, [load]);

  function startCreate() {
    setEditingDrive(null);
    setForm({ ...EMPTY_FORM, company_id: companies[0]?.id || '' });
    setFormError('');
    setFormOpen(true);
    setForceRuleUpdate(false);
    setInitialEligibility(null);
  }

  function startEdit(drive) {
    setEditingDrive(drive);
    const editForm = toForm(drive);
    setForm(editForm);
    setFormError('');
    setFormOpen(true);
    setForceRuleUpdate(false);
    setInitialEligibility({
      minCgpa: editForm.minCgpa,
      maxActiveBacklogs: editForm.maxActiveBacklogs,
      departments: editForm.departments,
      graduationYears: editForm.graduationYears,
    });
  }

  function cancelEdit() {
    setEditingDrive(null);
    setForm(EMPTY_FORM);
    setFormError('');
    setFormOpen(false);
    setForceRuleUpdate(false);
    setInitialEligibility(null);
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setFormError('');
    setSaving(true);
    try {
      const existingRules = editingDrive?.eligibility_rules || [];
      const eligibilityChanged = !editingDrive || !initialEligibility ||
        ['minCgpa', 'maxActiveBacklogs', 'departments', 'graduationYears']
          .some((field) => form[field] !== initialEligibility[field]);
      const payload = {
        company_id: form.company_id,
        title: form.title.trim(),
        role_type: form.role_type.trim(),
        role_description: form.role_description.trim() || null,
        package_lpa: Number(form.package_lpa),
        location: form.location.trim() || null,
        work_mode: form.work_mode.trim() || null,
        application_deadline: new Date(form.application_deadline).toISOString(),
        status: form.status,
        skills: form.skills,
      };
      if (eligibilityChanged) {
        payload.eligibility_rules = buildEligibilityRules(form, existingRules, editingDrive ? initialEligibility : null);
      }
      if (editingDrive) {
        if (forceRuleUpdate) payload.force = true;
        await updateDrive(editingDrive.id, payload);
      } else {
        await createDrive(payload);
      }
      cancelEdit();
      await load();
    } catch (err) {
      setFormError(err.message || 'Could not save this drive.');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(drive) {
    if (!window.confirm(`Delete the drive "${drive.title}"? Drives with applications cannot be deleted.`)) return;
    setActionError('');
    try {
      await deleteDrive(drive.id);
      if (editingDrive?.id === drive.id) cancelEdit();
      await load();
    } catch (err) {
      setActionError(err.message || 'Could not delete this drive.');
    }
  }

  async function handleStatusChange(drive, status) {
    setActionError('');
    try {
      await updateDriveStatus(drive.id, status);
      await load();
    } catch (err) {
      setActionError(err.message || 'Could not update drive status.');
    }
  }

  return (
    <div>
      <PageHeader
        title="Drive Manager"
        description="Create and manage recruitment drives linked to companies in the directory."
        actions={<Button variant="primary" onClick={startCreate}>Create drive</Button>}
      />

      {error && <ErrorState message={error} onRetry={load} />}
      {!error && loading && <TableSkeleton rows={5} cols={6} />}

      {!loading && !error && companies.length === 0 && (
        <div className="alert alert-error" role="status">
          Add a company in Company Directory before creating a drive.
        </div>
      )}

      {formOpen && (
        <form className="card" onSubmit={handleSubmit} style={{ marginBottom: 'var(--space-6)', display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          <h2 style={{ fontSize: 'var(--font-size-lg)' }}>{editingDrive ? 'Edit drive' : 'Create drive'}</h2>
          <div className="field">
            <label className="field-label" htmlFor="drive-company">Company</label>
            <select
              id="drive-company"
              className="input"
              value={form.company_id}
              onChange={(event) => setForm((current) => ({ ...current, company_id: event.target.value }))}
              required
            >
              <option value="">Select a company</option>
              {companies.map((company) => <option key={company.id} value={company.id}>{company.name}</option>)}
            </select>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 'var(--space-4)' }}>
            <Input label="Drive title" required value={form.title} onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))} />
            <Input label="Role type" required value={form.role_type} onChange={(event) => setForm((current) => ({ ...current, role_type: event.target.value }))} />
            <Input label="Package (LPA)" required type="number" min="0.01" step="0.01" value={form.package_lpa} onChange={(event) => setForm((current) => ({ ...current, package_lpa: event.target.value }))} />
            <Input label="Application deadline" required type="datetime-local" value={form.application_deadline} onChange={(event) => setForm((current) => ({ ...current, application_deadline: event.target.value }))} />
            <Input label="Location" value={form.location} onChange={(event) => setForm((current) => ({ ...current, location: event.target.value }))} />
            <div className="field">
              <label className="field-label" htmlFor="drive-work-mode">Work mode</label>
              <select id="drive-work-mode" className="input" value={form.work_mode} onChange={(event) => setForm((current) => ({ ...current, work_mode: event.target.value }))}>
                <option value="">Select work mode</option>
                <option value="ONSITE">Onsite</option>
                <option value="REMOTE">Remote</option>
                <option value="HYBRID">Hybrid</option>
              </select>
            </div>
          </div>
          <div className="field">
            <label className="field-label" htmlFor="drive-description">Role description</label>
            <textarea id="drive-description" className="input" rows="3" value={form.role_description} onChange={(event) => setForm((current) => ({ ...current, role_description: event.target.value }))} />
          </div>
          <div className="field">
            <label className="field-label" htmlFor="drive-skills">Required skills</label>
            <select
              id="drive-skills"
              className="input"
              multiple
              value={form.skills}
              onChange={(event) => setForm((current) => ({
                ...current,
                skills: Array.from(event.target.selectedOptions, (option) => option.value),
              }))}
            >
              {skills.map((skill) => <option key={skill.id} value={skill.id}>{skill.name}</option>)}
            </select>
          </div>
          <h3 style={{ fontSize: 'var(--font-size-base)' }}>Eligibility requirements</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 'var(--space-4)' }}>
            <Input label="Minimum CGPA (0–10)" required type="number" min="0" max="10" step="0.01" value={form.minCgpa} onChange={(event) => setForm((current) => ({ ...current, minCgpa: event.target.value }))} />
            <Input label="Maximum active backlogs" required type="number" min="0" step="1" value={form.maxActiveBacklogs} onChange={(event) => setForm((current) => ({ ...current, maxActiveBacklogs: event.target.value }))} />
            <Input label="Eligible departments" hint="Optional; comma-separated, e.g. Computer Science, ECE" value={form.departments} onChange={(event) => setForm((current) => ({ ...current, departments: event.target.value }))} />
            <Input label="Eligible graduation years" hint="Optional; comma-separated, e.g. 2026, 2027" value={form.graduationYears} onChange={(event) => setForm((current) => ({ ...current, graduationYears: event.target.value }))} />
          </div>
          <div className="field">
            <label className="field-label" htmlFor="drive-status">Status</label>
            <select id="drive-status" className="input" value={form.status} onChange={(event) => setForm((current) => ({ ...current, status: event.target.value }))}>
              <option value="draft">Draft (not visible to students)</option>
              <option value="active">Active / published (visible if eligible and before deadline)</option>
              <option value="closed">Closed</option>
              <option value="completed">Completed</option>
            </select>
          </div>
          {editingDrive && role === 'ADMIN' && (
            <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
              <input
                type="checkbox"
                checked={forceRuleUpdate}
                onChange={(event) => setForceRuleUpdate(event.target.checked)}
              />
              Allow eligibility-rule replacement when applications already exist
            </label>
          )}
          {formError && <div className="alert alert-error" role="alert">{formError}</div>}
          <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
            <Button type="submit" variant="primary" loading={saving}>{editingDrive ? 'Save changes' : 'Create drive'}</Button>
            <Button type="button" variant="secondary" onClick={cancelEdit}>Cancel</Button>
          </div>
        </form>
      )}

      {!loading && !error && (
        <>
          {actionError && <div className="alert alert-error" role="alert">{actionError}</div>}
          <div className="table-container card">
            <table className="table">
              <thead>
                <tr><th>Company</th><th>Drive</th><th>Package</th><th>Deadline</th><th>Status</th><th>Actions</th></tr>
              </thead>
              <tbody>
                {drives.map((drive) => (
                  <tr key={drive.id}>
                    <td>{drive.company_name || drive.companyName || 'Company unavailable'}</td>
                    <td>{drive.title || drive.role_type}</td>
                    <td>{drive.package_lpa == null ? '—' : `${drive.package_lpa} LPA`}</td>
                    <td>{drive.application_deadline ? new Date(drive.application_deadline).toLocaleDateString() : '—'}</td>
                    <td>
                      <select
                        className="input"
                        aria-label={`Change status for ${drive.title}`}
                        value={drive.status}
                        onChange={(event) => handleStatusChange(drive, event.target.value)}
                      >
                        <option value="draft">Draft</option>
                        <option value="active">Active / published</option>
                        <option value="closed">Closed</option>
                        <option value="completed">Completed</option>
                      </select>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                        <Button variant="secondary" size="sm" onClick={() => startEdit(drive)}>Edit</Button>
                        <Button variant="danger" size="sm" onClick={() => handleDelete(drive)}>Delete</Button>
                      </div>
                    </td>
                  </tr>
                ))}
                {!drives.length && <tr><td colSpan="6">No drives found. Create a drive linked to a company.</td></tr>}
              </tbody>
            </table>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'var(--space-3)' }}>
            <span>{total} drive{total === 1 ? '' : 's'}</span>
            <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
              <Button variant="secondary" size="sm" disabled={page <= 1} onClick={() => setPage((current) => current - 1)}>Previous</Button>
              <span>Page {page} of {Math.max(1, Math.ceil(total / PAGE_SIZE))}</span>
              <Button variant="secondary" size="sm" disabled={page >= Math.ceil(total / PAGE_SIZE)} onClick={() => setPage((current) => current + 1)}>Next</Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
