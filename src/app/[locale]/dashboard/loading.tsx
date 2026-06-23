import Skeleton from "@/components/Skeleton";
import dash from "./page.module.scss";
import loading from "./loading.module.scss";

// Schlichtes Lade-Skeleton fürs Dashboard: Header, Kennzahlen und drei
// Listen-Abschnitte — gleiche Hüllen/Maße wie die echte Seite.
function RowSkeleton() {
  return (
    <li className={`card ${dash.row}`}>
      <Skeleton className={loading.thumb} />
      <div className={dash.main}>
        <Skeleton className={loading.rowTitle} />
        <Skeleton className={loading.rowMeta} />
      </div>
      <div className={dash.trailing}>
        <Skeleton className={loading.badge} />
      </div>
    </li>
  );
}

export default function Loading() {
  return (
    <div className={dash.page} aria-busy="true">
      <header className={dash.head}>
        <div className={dash.headText}>
          <Skeleton className={loading.headTitle} />
          <Skeleton className={loading.headSub} />
        </div>
        <Skeleton className={loading.button} />
      </header>

      <div className={dash.stats}>
        {Array.from({length: 3}).map((_, i) => (
          <div key={i} className={`card ${dash.stat}`}>
            <Skeleton className={loading.statValue} />
            <Skeleton className={loading.statLabel} />
          </div>
        ))}
      </div>

      {Array.from({length: 3}).map((_, s) => (
        <section key={s} className={dash.section}>
          <div className={dash.sectionHead}>
            <Skeleton className={loading.sectionTitle} />
          </div>
          <ul className={dash.list}>
            {Array.from({length: 2}).map((_, r) => (
              <RowSkeleton key={r} />
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
