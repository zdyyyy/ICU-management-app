import { useState } from 'react';
import ModuleCard from './ModuleCard';
import shared from './shared.module.css';
import { api } from '../api/client';
import { priorityBadgeClass } from '../utils/priority';

export default function WaitlistPanel({ patients, ranked, onRefresh }) {
  const [selectedPatient, setSelectedPatient] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const onWaitlistIds = new Set(ranked.map((w) => w.patientId));
  const notOnWaitlist = patients.filter((p) => !onWaitlistIds.has(p.id));

  async function handleAdd(e) {
    e.preventDefault();
    if (!selectedPatient) return;
    setError('');
    setBusy(true);
    try {
      await api.waitlist.add(selectedPatient);
      setSelectedPatient('');
      onRefresh();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function handleRemove(patientId) {
    setError('');
    setBusy(true);
    try {
      await api.waitlist.remove(patientId);
      onRefresh();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <ModuleCard title="Waitlist (triage ranked)" icon="📋">
      {error && <div className={shared.error}>{error}</div>}

      <form className={shared.formRow} onSubmit={handleAdd}>
        <select
          className={shared.select}
          value={selectedPatient}
          onChange={(e) => setSelectedPatient(e.target.value)}
          style={{ flex: 1, minWidth: '12rem' }}
        >
          <option value="">Select patient to add</option>
          {notOnWaitlist.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name} · {p.priorityLevel} · needs {p.requiredBedType}
            </option>
          ))}
        </select>
        <button
          type="submit"
          className={shared.btnPrimary}
          disabled={busy || !selectedPatient}
        >
          Add to waitlist
        </button>
      </form>

      <div className={shared.tableWrap}>
        {ranked.length === 0 ? (
          <p className={shared.empty}>Waitlist is empty</p>
        ) : (
          <table className={shared.table}>
            <thead>
              <tr>
                <th>#</th>
                <th>Patient</th>
                <th>Priority</th>
                <th>Bed type</th>
                <th>Arrival</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {ranked.map((entry, index) => {
                const p = entry.patient;
                if (!p) return null;
                return (
                  <tr key={entry.id}>
                    <td>{index + 1}</td>
                    <td>{p.name}</td>
                    <td>
                      <span className={priorityBadgeClass(p.priorityLevel)}>{p.priorityLevel}</span>
                    </td>
                    <td>{p.requiredBedType}</td>
                    <td>
                      {p.arrivalTime
                        ? new Date(p.arrivalTime).toLocaleString('en-CA', {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })
                        : '—'}
                    </td>
                    <td>
                      <button
                        type="button"
                        className={shared.btnDanger}
                        disabled={busy}
                        onClick={() => handleRemove(entry.patientId)}
                      >
                        Remove
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </ModuleCard>
  );
}
