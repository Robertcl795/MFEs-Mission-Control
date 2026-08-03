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

export const FLEET_CACHE_KEY = 'fleet-data';

/**
 * Simulated fleet API. The request flows through the bridge HTTP client so
 * the shared auth/origin interceptors run exactly as they would against a
 * real backend — only the transport is mocked (1.2s latency).
 */
function mockTransport(url: string, init: RequestInit): Promise<Response> {
  const headers = new Headers(init.headers);
  console.info(
    `[analytics] NETWORK ${url} (auth=${headers.has('Authorization') ? 'yes' : 'no'}, app=${headers.get('X-Remote-App')})`,
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
      interceptors: [createAuthInterceptor(session), createOriginInterceptor('analytics')],
      fetchImpl: mockTransport,
    });
  }
  return client;
}

/** SWR read-through — shared cache key with the `reports` remote. */
export async function loadFleetData(): Promise<FleetRecord[]> {
  const { cache } = getBridge();
  return cache.fetch<FleetRecord[]>(FLEET_CACHE_KEY, async () => {
    const response = await getClient()('https://api.mission.local/fleet');
    return (await response.json()) as FleetRecord[];
  });
}

/** True when the next `loadFleetData()` will be served without a network hit. */
export function isFleetDataCached(): boolean {
  return getBridge().cache.peek(FLEET_CACHE_KEY) !== undefined;
}
