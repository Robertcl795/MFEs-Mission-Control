import { useEffect, useState } from 'react';
import { loadFleetData, type FleetRecord } from '../data/fleet';

export function Insights() {
  const [rows, setRows] = useState<FleetRecord[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    void loadFleetData().then((data) => {
      if (!cancelled) setRows(data);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!rows) return <p className="mc-muted">Loading fleet insights…</p>;

  const avgFuel = Math.round(rows.reduce((sum, row) => sum + row.fuelPct, 0) / rows.length);
  const byStatus = rows.reduce<Record<string, number>>((acc, row) => {
    acc[row.status] = (acc[row.status] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <div className="mc-stack">
      <section className="mc-card">
        <h2>Fleet insights</h2>
        <div className="mc-kpis">
          <div className="mc-kpi">
            <span className="mc-kpi-value">{rows.length}</span>
            <span className="mc-kpi-label">vessels</span>
          </div>
          <div className="mc-kpi">
            <span className="mc-kpi-value">{avgFuel}%</span>
            <span className="mc-kpi-label">avg fuel</span>
          </div>
          {Object.entries(byStatus).map(([status, count]) => (
            <div className="mc-kpi" key={status}>
              <span className="mc-kpi-value">{count}</span>
              <span className="mc-kpi-label">{status}</span>
            </div>
          ))}
        </div>
        <p className="mc-muted">
          This page reuses the <code>fleet-data</code> cache entry — open the console: no second network request,
          even if you loaded the data from the <em>reports</em> remote first.
        </p>
      </section>
    </div>
  );
}
