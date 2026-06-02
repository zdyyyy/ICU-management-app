import { useCallback, useEffect, useState } from 'react';
import Layout from './components/Layout';
import StatsBar from './components/StatsBar';
import BedsPanel from './components/BedsPanel';
import PatientsPanel from './components/PatientsPanel';
import WaitlistPanel from './components/WaitlistPanel';
import AssistantPanel from './components/AssistantPanel';
import { api } from './api/client';
import styles from './App.module.css';

export default function App() {
  const [healthOk, setHealthOk] = useState(false);
  const [beds, setBeds] = useState([]);
  const [patients, setPatients] = useState([]);
  const [ranked, setRanked] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  const refresh = useCallback(async () => {
    try {
      const [bedsData, patientsData, rankedData] = await Promise.all([
        api.beds.list(),
        api.patients.list(),
        api.waitlist.ranked(),
      ]);
      setBeds(bedsData);
      setPatients(patientsData);
      setRanked(rankedData);
      setLoadError('');
    } catch (err) {
      setLoadError(err.message);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function init() {
      setLoading(true);
      try {
        await api.health();
        if (!cancelled) setHealthOk(true);
        await refresh();
      } catch {
        if (!cancelled) setHealthOk(false);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    init();
    return () => {
      cancelled = true;
    };
  }, [refresh]);

  return (
    <Layout healthOk={healthOk}>
      {loadError && (
        <div className={styles.banner}>
          Failed to load data: {loadError}. Ensure the API is running (<code>npm run dev</code>, port 3000).
        </div>
      )}

      {loading ? (
        <p className={styles.loading}>Loading…</p>
      ) : (
        <>
          <StatsBar beds={beds} patients={patients} waitlist={ranked} />
          <div className={styles.grid}>
            <div className={styles.col}>
              <PatientsPanel patients={patients} onRefresh={refresh} />
            </div>
            <div className={styles.col}>
              <WaitlistPanel patients={patients} ranked={ranked} onRefresh={refresh} />
            </div>
            <div className={styles.colFull}>
              <BedsPanel beds={beds} patients={patients} onRefresh={refresh} />
            </div>
            <div className={styles.colFull}>
              <AssistantPanel />
            </div>
          </div>
        </>
      )}
    </Layout>
  );
}
