import {
  createAuthInterceptor,
  createHttpClient,
  createOriginInterceptor,
  getBridge,
  type HttpClient,
} from '@teradata-pe/bridge';

export interface FleetRecord {
  id: string;
  vessel: string;
  class: string;
  status: 'nominal' | 'degraded' | 'critical' | 'docked';
  fuelPct: number;
  crew: number;
  lastContactMinAgo: number;
}

/** SAME key as analytics/reports — the SharedDataCache dedupes across all three. */
export const FLEET_CACHE_KEY = 'fleet-data';

function mockTransport(url: string, init: RequestInit): Promise<Response> {
  const headers = new Headers(init.headers);
  console.info(
    `[playground] NETWORK ${url} (auth=${headers.has('Authorization') ? 'yes' : 'no'}, app=${headers.get('X-Remote-App')})`,
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

/**
 * Renders the shared dataset as an HTML fragment for the canvas. The
 * generated markup follows the same BEM grammar as the default documents:
 * `fleet-table` block, `__cell` elements, and the row status expressed as
 * an element modifier (`fleet-table__cell--critical`) instead of the old
 * orphan `.status-*` classes that nothing tied back to the table.
 */
export function fleetTableHtml(rows: FleetRecord[]): string {
  const cell = (value: string | number, modifier = '') =>
    `<td class="fleet-table__cell${modifier ? ` fleet-table__cell--${modifier}` : ''}">${value}</td>`;
  const head = ['ID', 'Vessel', 'Class', 'Status', 'Fuel']
    .map((label) => `<th class="fleet-table__cell fleet-table__cell--head">${label}</th>`)
    .join('');
  const body = rows
    .map(
      (row) =>
        `    <tr>${cell(row.id)}${cell(row.vessel)}${cell(row.class)}${cell(row.status, row.status)}${cell(`${row.fuelPct}%`)}</tr>`,
    )
    .join('\n');
  return `<table class="fleet-table">\n  <thead>\n    <tr>${head}</tr>\n  </thead>\n  <tbody>\n${body}\n  </tbody>\n</table>`;
}
