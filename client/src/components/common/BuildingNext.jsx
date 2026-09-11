import styles from './ComingSoon.module.css';

export function BuildingNext({ icon: Icon, title }) {
  return (
    <div className={styles.wrap}>
      {Icon && <Icon size={28} strokeWidth={1.5} className={styles.icon} />}
      <div className={styles.titleRow}>
        <h2 className={styles.title}>{title}</h2>
        <span className={styles.badge}>Screen under construction</span>
      </div>
      <p className={styles.body}>
        The backend for this is live and already tested — this screen is next up. Use the assistant panel in the
        meantime for anything here.
      </p>
    </div>
  );
}
