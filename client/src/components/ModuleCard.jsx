import styles from './ModuleCard.module.css';

export default function ModuleCard({ title, icon, children, actions }) {
  return (
    <section className={styles.card}>
      <header className={styles.header}>
        <div className={styles.titleRow}>
          {icon && <span className={styles.icon}>{icon}</span>}
          <h2 className={styles.title}>{title}</h2>
        </div>
        {actions && <div className={styles.actions}>{actions}</div>}
      </header>
      <div className={styles.body}>{children}</div>
    </section>
  );
}
