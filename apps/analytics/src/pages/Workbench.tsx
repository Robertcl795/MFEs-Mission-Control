import { useCallback, useRef, useState } from 'react';
import { getBridge } from '@teradata-pe/bridge';
import { QueryEditor } from '../components/QueryEditor';
import { isFleetDataCached, loadFleetData, type FleetRecord } from '../data/fleet';

const DEFAULT_QUERY = `-- Query the shared fleet dataset (cache key: "fleet-data")
SELECT vessel, class, status, fuel_pct
FROM fleet
WHERE status != 'docked'
ORDER BY fuel_pct ASC;`;

interface RunInfo {
  ms: number;
  fromCache: boolean;
}

export function Workbench() {
  const [rows, setRows] = useState<FleetRecord[] | null>(null);
  const [runInfo, setRunInfo] = useState<RunInfo | null>(null);
  const [running, setRunning] = useState(false);
  const queryRef = useRef(DEFAULT_QUERY);

  const runQuery = useCallback(async () => {
    setRunning(true);
    const cached = isFleetDataCached();
    const start = performance.now();
    try {
      const data = await loadFleetData();
      // The "SQL" is illustrative for the POC — we apply a naive filter of
      // the WHERE clause used in the default query.
      const filtered = queryRef.current.includes("status != 'docked'")
        ? data.filter((row) => row.status !== 'docked')
        : data;
      setRows([...filtered].sort((a, b) => a.fuelPct - b.fuelPct));
      setRunInfo({ ms: Math.round(performance.now() - start), fromCache: cached });
    } finally {
      setRunning(false);
    }
  }, []);

  return (
    <div className="mc-stack">
      <section className="mc-card">
        <header className="mc-card-header">
          <h2>Query workbench</h2>
          <button className="mc-btn mc-btn-primary" onClick={runQuery} disabled={running} data-testid="run-query">
            {running ? 'Running…' : 'Run query'}
          </button>
        </header>
        <QueryEditor value={DEFAULT_QUERY} onChange={(value) => (queryRef.current = value)} />
      </section>

      {runInfo && (
        <div
          className={`mc-badge ${runInfo.fromCache ? 'mc-badge-success' : 'mc-badge-info'}`}
          data-testid="cache-indicator"
        >
          {runInfo.fromCache
            ? `⚡ Served from the shared SharedDataCache in ${runInfo.ms}ms — no duplicate network request`
            : `🛰 Fetched over the (mock) network in ${runInfo.ms}ms — now cached for every remote`}
        </div>
      )}

      {rows && (
        <section className="mc-card">
          <h3>Results · {rows.length} vessels</h3>
          <table className="mc-table" data-testid="results-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Vessel</th>
                <th>Class</th>
                <th>Status</th>
                <th>Fuel %</th>
                <th>Crew</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id}>
                  <td>{row.id}</td>
                  <td>{row.vessel}</td>
                  <td>{row.class}</td>
                  <td>
                    <span className={`mc-status mc-status-${row.status}`}>{row.status}</span>
                  </td>
                  <td>{row.fuelPct}%</td>
                  <td>{row.crew}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}
    </div>
  );
}
