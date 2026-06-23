import styles from "./Skeleton.module.scss";

// Wiederverwendbarer Lade-Platzhalter mit dezentem Shimmer. Form/Größe kommen
// über eine zusätzliche (gescopte) Klasse des aufrufenden Moduls.
export default function Skeleton({className = ""}: {className?: string}) {
  return <span className={`${styles.skeleton} ${className}`} aria-hidden />;
}
