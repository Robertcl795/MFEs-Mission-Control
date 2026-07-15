import { getBridge, type TaskSnapshot } from '@mission/bridge';
import { loadFleetData, type FleetRecord } from './fleet';

export interface FleetReport {
  id: string;
  title: string;
  generatedAt: string;
  requestedBy: string;
  fleetSize: number;
  readiness: Array<{
    vessel: string;
    status: FleetRecord['status'];
    readinessScore: number;
    note: string;
  }>;
  summary: string;
}

export const reportCacheKey = (id: string) => `report:${id}`;

const PHASES = [
  'Queued on report service…',
  'Collecting fleet telemetry…',
  'Cross-referencing crew rosters…',
  'Scoring vessel readiness…',
  'Rendering sections…',
  'Signing and archiving…',
];

/**
 * Kicks off a long-running "server-side" generation job via the HOST-owned
 * TaskManager. The poll closure below keeps executing in the host even
 * after this remote unmounts — progress and completion are broadcast on the
 * bridge EventBus, and the result lands in the shared DataCache.
 */
export function startReportGeneration(): TaskSnapshot {
  const bridge = getBridge();
  const id = `rpt-${Date.now().toString(36)}`;
  const requestedBy = bridge.session.user?.name ?? 'unknown';

  return bridge.tasks.start<FleetReport>({
    id,
    kind: 'report:generate',
    title: 'Fleet readiness report',
    intervalMs: 900,
    cacheKey: reportCacheKey(id),
    resultRoute: `/reports/results/${id}`,
    poll: async (tick) => {
      // Simulated backend: ~6 polling rounds. A real implementation would
      // GET /jobs/:id here (via the bridge HTTP client) or read a WebSocket.
      const progress = Math.min(100, tick * 17);
      if (progress < 100) {
        return {
          status: 'running',
          progress,
          message: PHASES[Math.min(tick - 1, PHASES.length - 1)],
        };
      }

      const fleet = await loadFleetData();
      const readiness = fleet.map((vessel) => {
        const base = vessel.status === 'nominal' ? 80 : vessel.status === 'docked' ? 60 : vessel.status === 'degraded' ? 45 : 20;
        const readinessScore = Math.min(100, base + Math.round(vessel.fuelPct / 5));
        return {
          vessel: vessel.vessel,
          status: vessel.status,
          readinessScore,
          note:
            readinessScore >= 80
              ? 'Mission ready'
              : readinessScore >= 50
                ? 'Conditional — schedule maintenance'
                : 'Stand down pending repairs',
        };
      });
      const ready = readiness.filter((r) => r.readinessScore >= 80).length;

      const report: FleetReport = {
        id,
        title: 'Fleet readiness report',
        generatedAt: new Date().toISOString(),
        requestedBy,
        fleetSize: fleet.length,
        readiness,
        summary: `${ready}/${fleet.length} vessels mission-ready. Generated for ${requestedBy}.`,
      };
      return { status: 'completed', message: report.summary, result: report };
    },
  });
}
