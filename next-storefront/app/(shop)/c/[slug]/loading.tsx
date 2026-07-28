import styles from "@/components/shop/catalog.module.css";

export default function CatalogLoading() {
  return (
    <>
      <div
        className="sf-skel"
        style={{ height: 30, width: 220, marginBottom: 20 }}
      />
      <div className={styles.layout}>
        <aside className={`shop-card ${styles.facets}`}>
          {Array.from({ length: 3 }).map((_, group) => (
            <div key={group} className={styles.facetGroup}>
              <div className="sf-skel" style={{ height: 12, width: 90 }} />
              {Array.from({ length: 4 }).map((_, row) => (
                <div key={row} className="sf-skel" style={{ height: 14 }} />
              ))}
            </div>
          ))}
        </aside>
        <div>
          <div className={styles.grid}>
            {Array.from({ length: 8 }).map((_, card) => (
              <div key={card} className={`sf-card ${styles.card}`}>
                <div
                  className="sf-skel"
                  style={{ aspectRatio: "1.5 / 1", borderRadius: 0 }}
                />
                <div className={styles.cardBody}>
                  <div className="sf-skel" style={{ height: 10, width: 60 }} />
                  <div className="sf-skel" style={{ height: 16 }} />
                  <div className="sf-skel" style={{ height: 12, width: 90 }} />
                  <div
                    className="sf-skel"
                    style={{ height: 20, width: 72, marginTop: 4 }}
                  />
                  <div
                    className="sf-skel"
                    style={{ height: 32, marginTop: 10 }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
