import { useState } from 'react';
import ModuleCard from './ModuleCard';
import shared from './shared.module.css';
import { api } from '../api/client';
import { priorityBadgeClass } from '../utils/priority';

const PRIORITIES = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'];
const BED_TYPES = ['ICU', 'STEP_DOWN', 'GENERAL', 'EMERGENCY'];

export default function PatientsPanel({ patients, onRefresh }) {
  const [form, setForm] = useState({
    name: '',
    mrn: '',
    priorityLevel: 'MEDIUM',
    requiredBedType: 'GENERAL',
    notes: '',
  });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  function updateField(key, value) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleCreate(e) {
    e.preventDefault();
    if (!form.name.trim()) {
      setError('Patient name is required');
      return;
    }
    setError('');
    setBusy(true);
    try {
      await api.patients.create(form);
      setForm({
        name: '',
        mrn: '',
        priorityLevel: 'MEDIUM',
        requiredBedType: 'GENERAL',
        notes: '',
      });
      onRefresh();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <ModuleCard title="Patient registration" icon="👤">
      {error && <div className={shared.error}>{error}</div>}

      <form onSubmit={handleCreate}>
        <div className={shared.formRow}>
          <input
            className={shared.input}
            placeholder="Name *"
            value={form.name}
            onChange={(e) => updateField('name', e.target.value)}
            required
          />
          <input
            className={shared.input}
            placeholder="MRN"
            value={form.mrn}
            onChange={(e) => updateField('mrn', e.target.value)}
          />
          <select
            className={shared.select}
            value={form.priorityLevel}
            onChange={(e) => updateField('priorityLevel', e.target.value)}
          >
            {PRIORITIES.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
          <select
            className={shared.select}
            value={form.requiredBedType}
            onChange={(e) => updateField('requiredBedType', e.target.value)}
          >
            {BED_TYPES.map((t) => (
              <option key={t} value={t}>
                Needs {t}
              </option>
            ))}
          </select>
          <button type="submit" className={shared.btnPrimary} disabled={busy}>
            Register patient
          </button>
        </div>
        <textarea
          className={shared.textarea}
          placeholder="Notes (optional)"
          value={form.notes}
          onChange={(e) => updateField('notes', e.target.value)}
        />
      </form>

      <div className={shared.tableWrap}>
        {patients.length === 0 ? (
          <p className={shared.empty}>No patients yet</p>
        ) : (
          <table className={shared.table}>
            <thead>
              <tr>
                <th>Name</th>
                <th>MRN</th>
                <th>Priority</th>
                <th>Bed type</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {patients.map((p) => (
                <tr key={p.id}>
                  <td>{p.name}</td>
                  <td>{p.mrn || '—'}</td>
                  <td>
                    <span className={priorityBadgeClass(p.priorityLevel)}>{p.priorityLevel}</span>
                  </td>
                  <td>{p.requiredBedType}</td>
                  <td>{p.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </ModuleCard>
  );
}
