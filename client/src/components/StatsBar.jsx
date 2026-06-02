import styles from './StatsBar.module.css';

export default function StatsBar({ beds, patients, waitlist }) {
  const available = beds.filter((b) => b.status === 'AVAILABLE').length;
  const occupied = beds.filter((b) => b.status === 'OCCUPIED').length;
  const waiting = patients.filter((p) => p.status === 'WAITING').length;

  const items = [
    { label: 'Total beds', value: beds.length, sub: `${available} available` },
    { label: 'Occupied', value: occupied, sub: 'in use' },
    { label: 'On waitlist', value: waitlist.length, sub: `${waiting} waiting` },
    { label: 'Patients', value: patients.length, sub: 'registered' },
  ];

  return (
    <div className={styles.bar}>
      {items.map((item) => (
        <div key={item.label} className={styles.item}>
          <span className={styles.value}>{item.value}</span>
          <span className={styles.label}>{item.label}</span>
          <span className={styles.sub}>{item.sub}</span>
        </div>
      ))}
    </div>
  );
}
