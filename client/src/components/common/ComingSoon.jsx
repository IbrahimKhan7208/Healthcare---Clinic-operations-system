import styles from './ComingSoon.module.css';

export function ComingSoon({ icon: Icon, buildStep, title, description }) {
  return (
    <div className={styles.wrap}>
      {Icon && <Icon size={28} strokeWidth={1.5} className={styles.icon} />}
      <div className={styles.titleRow}>
        <h2 className={styles.title}>{title}</h2>
        {buildStep && <span className={styles.badge}>Lands in build step {buildStep}</span>}
      </div>
      <p className={styles.body}>{description}</p>
    </div>
  );
}
