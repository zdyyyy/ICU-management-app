import { useState } from 'react';
import ModuleCard from './ModuleCard';
import shared from './shared.module.css';
import { api } from '../api/client';
import { priorityBadgeClass } from '../utils/priority';

const BED_TYPES = ['ICU', 'STEP_DOWN', 'GENERAL', 'EMERGENCY'];

export default function BedsPanel({ beds, patients, onRefresh }) {
  const [label, setLabel] = useState('');
  const [type, setType] = useState('GENERAL');
  const [assignBedId, setAssignBedId] = useState('');
  const [assignPatientId, setAssignPatientId] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const patientMap = Object.fromEntries(patients.map((p) => [p.id, p]));

  async function handleCreate(e) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      await api.beds.create({ label: label || undefined, type });
      setLabel('');
      onRefresh();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function handleAssign(e) {
    e.preventDefault();
    if (!assignBedId || !assignPatientId) return;
    setError('');
    setBusy(true);
    try {
      await api.beds.assign(assignBedId, assignPatientId);
      setAssignBedId('');
      setAssignPatientId('');
      onRefresh();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function handleRelease(bedId) {
    setError('');
    setBusy(true);
    try {
      await api.beds.release(bedId);
      onRefresh();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  const availableBeds = beds.filter((b) => b.status === 'AVAILABLE');

  return (
    <ModuleCard title="Bed management" icon="🛏">
      {error && <div className={shared.error}>{error}</div>}

      <form className={shared.formRow} onSubmit={handleCreate}>
        <input
          className={shared.input}
          placeholder="Bed label (optional)"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
        />
        <select className={shared.select} value={type} onChange={(e) => setType(e.target.value)}>
          {BED_TYPES.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
        <button type="submit" className={shared.btnPrimary} disabled={busy}>
          Add bed
        </button>
      </form>

      <form className={shared.formRow} onSubmit={handleAssign}>
        <select
          className={shared.select}
          value={assignBedId}
          onChange={(e) => setAssignBedId(e.target.value)}
        >
          <option value="">Select available bed</option>
          {availableBeds.map((b) => (
            <option key={b.id} value={b.id}>
              {b.label} ({b.type})
            </option>
          ))}
        </select>
        <select
          className={shared.select}
          value={assignPatientId}
          onChange={(e) => setAssignPatientId(e.target.value)}
        >
          <option value="">Select patient</option>
          {patients.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name} · {p.mrn || 'no MRN'}
            </option>
          ))}
        </select>
        <button
          type="submit"
          className={shared.btnPrimary}
          disabled={busy || !assignBedId || !assignPatientId}
        >
          Assign bed
        </button>
      </form>

      <div className={shared.tableWrap}>
        {beds.length === 0 ? (
          <p className={shared.empty}>No beds yet. Add one above.</p>
        ) : (
          <table className={shared.table}>
            <thead>
              <tr>
                <th>Label</th>
                <th>Type</th>
                <th>Status</th>
                <th>Patient</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {beds.map((bed) => {
                const patient = bed.patientId ? patientMap[bed.patientId] : null;
                return (
                  <tr key={bed.id}>
                    <td>{bed.label}</td>
                    <td>{bed.type}</td>
                    <td>
                      <span
                        className={
                          bed.status === 'AVAILABLE' ? shared.badgeAvailable : shared.badgeOccupied
                        }
                      >
                        {bed.status === 'AVAILABLE' ? 'Available' : 'Occupied'}
                      </span>
                    </td>
                    <td>
                      {patient ? (
                        <>
                          {patient.name}
                          {patient.priorityLevel && (
                            <span className={priorityBadgeClass(patient.priorityLevel)}>
                              {' '}
                              {patient.priorityLevel}
                            </span>
                          )}
                        </>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td>
                      {bed.status === 'OCCUPIED' && (
                        <button
                          type="button"
                          className={shared.btnDanger}
                          disabled={busy}
                          onClick={() => handleRelease(bed.id)}
                        >
                          Release
                        </button>
                      )}
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
