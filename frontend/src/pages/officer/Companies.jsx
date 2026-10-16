// Companies — Officer  [P1]
// Lists companies from API, Add Company modal.
import React, { useEffect, useState, useCallback } from 'react';
import PageHeader from '../../components/PageHeader';
import DataTable from '../../components/DataTable';
import Button from '../../components/Button';
import Modal from '../../components/Modal';
import Input from '../../components/Input';
import ErrorState from '../../components/ErrorState';
import { TableSkeleton } from '../../components/Skeleton';
import { fetchCompanies, createCompany } from '../../api/companies';

const EMPTY_FORM = { name: '', sector: '', website: '', contactName: '', contactEmail: '' };

export default function Companies() {
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm]           = useState(EMPTY_FORM);
  const [saving, setSaving]       = useState(false);
  const [saveErr, setSaveErr]     = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchCompanies();
      setCompanies(res?.data || res || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleAdd = async (e) => {
    e.preventDefault();
    setSaving(true);
    setSaveErr('');
    try {
      await createCompany(form);
      setModalOpen(false);
      setForm(EMPTY_FORM);
      await load();
    } catch (err) {
      setSaveErr(err.message || 'Failed to add company.');
    } finally {
      setSaving(false);
    }
  };

  const columns = [
    { header: 'Company',  accessor: (r) => <span style={{ fontWeight: 'var(--font-weight-medium)', color: 'var(--color-text-primary)' }}>{r.name || '—'}</span> },
    { header: 'Sector',   accessor: 'sector' },
    { header: 'Website',  accessor: (r) => r.website ? <a href={r.website} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--color-text-secondary)', textDecoration: 'underline' }}>{r.website}</a> : '—' },
    { header: 'Contact',  accessor: (r) => r.contactName || r.contact_name || '—' },
  ];

  return (
    <div>
      <PageHeader
        title="Company Directory"
        description="Manage corporate partners and recruiter contact points."
        actions={
          <Button variant="primary" onClick={() => setModalOpen(true)}>
            Add company
          </Button>
        }
      />

      {loading && <TableSkeleton rows={5} cols={4} />}
      {!loading && error && <ErrorState message={error} onRetry={load} />}
      {!loading && !error && (
        <DataTable
          columns={columns}
          data={companies}
          emptyTitle="No companies yet"
          emptyDescription="Add your first recruiting company to get started."
        />
      )}

      <Modal
        open={modalOpen}
        onClose={() => { setModalOpen(false); setForm(EMPTY_FORM); setSaveErr(''); }}
        title="Add company"
        footer={
          <>
            <Button variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button variant="primary" loading={saving} onClick={handleAdd} type="submit">
              Add company
            </Button>
          </>
        }
      >
        <form onSubmit={handleAdd} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          <Input label="Company name" required value={form.name}         onChange={e => setForm(f=>({...f, name: e.target.value}))} placeholder="e.g. Infosys" />
          <Input label="Sector"              value={form.sector}        onChange={e => setForm(f=>({...f, sector: e.target.value}))} placeholder="e.g. IT Services" />
          <Input label="Website"    type="url" value={form.website}       onChange={e => setForm(f=>({...f, website: e.target.value}))} placeholder="https://..." />
          <Input label="Contact name"         value={form.contactName}   onChange={e => setForm(f=>({...f, contactName: e.target.value}))} placeholder="Recruiter name" />
          <Input label="Contact email" type="email" value={form.contactEmail} onChange={e => setForm(f=>({...f, contactEmail: e.target.value}))} placeholder="recruiter@company.com" />
          {saveErr && <div className="alert alert-error" role="alert">{saveErr}</div>}
        </form>
      </Modal>
    </div>
  );
}
