import styles from './Layout.module.css';

export default function Layout({ children, healthOk }) {
  return (
    <div className={styles.page}>
      <header className={styles.topBar}>
        <div className={styles.brand}>
          <span className={styles.logo} aria-hidden>
            ✚
          </span>
          <div>
            <h1 className={styles.appName}>ICU Resource Manager</h1>
            <p className={styles.tagline}>Beds · Triage · Waitlist</p>
          </div>
        </div>
        <div className={styles.status}>
          <span
            className={`${styles.dot} ${healthOk ? styles.dotOk : styles.dotErr}`}
            aria-hidden
          />
          <span>{healthOk ? 'Connected' : 'Disconnected'}</span>
        </div>
      </header>
      <main className={styles.main}>{children}</main>
      <footer className={styles.footer}>
        ICU Resource Manager · Ottawa clinical workflow demo
      </footer>
    </div>
  );
}
