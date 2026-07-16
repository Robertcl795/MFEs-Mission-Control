import {
  createAuthInterceptor,
  createHttpClient,
  createOriginInterceptor,
  getBridge,
  type HttpClient,
} from '@mission/bridge';

export interface FleetRecord {
  id: string;
  vessel: string;
  class: string;
  status: 'nominal' | 'degraded' | 'critical' | 'docked';
  fuelPct: number;
  crew: number;
  lastContactMinAgo: number;
}

/** SAME key as analytics/reports — the DataCache dedupes across all three. */
export const FLEET_CACHE_KEY = 'fleet-data';

function mockTransport(url: string, init: RequestInit): Promise<Response> {
  const headers = new Headers(init.headers);
  console.info(
    `[playground] NETWORK ${url} (auth=${headers.has('Authorization') ? 'yes' : 'no'}, app=${headers.get('X-Mission-App')})`,
  );
  const vessels: Array<[string, string]> = [
    ['Meridian', 'Explorer'],
    ['Caldera', 'Freighter'],
    ['Nightjar', 'Scout'],
    ['Auriga', 'Explorer'],
    ['Basilisk', 'Tanker'],
    ['Corvus', 'Scout'],
    ['Damascus', 'Freighter'],
    ['Eventide', 'Explorer'],
  ];
  const statuses: FleetRecord['status'][] = ['nominal', 'nominal', 'degraded', 'docked', 'nominal', 'critical', 'nominal', 'degraded'];
  const data: FleetRecord[] = vessels.map(([vessel, klass], i) => ({
    id: `MC-${100 + i}`,
    vessel,
    class: klass,
    status: statuses[i],
    fuelPct: Math.round(35 + ((i * 37) % 60)),
    crew: 3 + ((i * 5) % 9),
    lastContactMinAgo: (i * 13) % 45,
  }));
  return new Promise((resolve) =>
    setTimeout(() => resolve(new Response(JSON.stringify(data), { status: 200 })), 1200),
  );
}

let client: HttpClient | undefined;

function getClient(): HttpClient {
  if (!client) {
    const { session } = getBridge();
    client = createHttpClient({
      interceptors: [createAuthInterceptor(session), createOriginInterceptor('playground')],
      fetchImpl: mockTransport,
    });
  }
  return client;
}

export async function loadFleetData(): Promise<FleetRecord[]> {
  const { cache } = getBridge();
  return cache.fetch<FleetRecord[]>(FLEET_CACHE_KEY, async () => {
    const response = await getClient()('https://api.mission.local/fleet');
    return (await response.json()) as FleetRecord[];
  });
}

export function isFleetDataCached(): boolean {
  return getBridge().cache.peek(FLEET_CACHE_KEY) !== undefined;
}

/** Renders the shared dataset as an HTML fragment for the canvas. */
export function fleetTableHtml(rows: FleetRecord[]): string {
  const body = rows
    .map(
      (row) =>
        `    <tr><td>${row.id}</td><td>${row.vessel}</td><td>${row.class}</td><td class="status-${row.status}">${row.status}</td><td>${row.fuelPct}%</td></tr>`,
    )
    .join('\n');
  return `<table class="fleet">\n  <thead>\n    <tr><th>ID</th><th>Vessel</th><th>Class</th><th>Status</th><th>Fuel</th></tr>\n  </thead>\n  <tbody>\n${body}\n  </tbody>\n</table>`;
}
