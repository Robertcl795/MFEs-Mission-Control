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

/**
 * SAME cache key as the analytics remote — that's the whole point: the
 * DataCache dedupes by key, so whichever remote asks first pays the network
 * cost and the other one reads it instantly.
 */
export const FLEET_CACHE_KEY = 'fleet-data';

function mockTransport(url: string, init: RequestInit): Promise<Response> {
  const headers = new Headers(init.headers);
  console.info(
    `[reports] NETWORK ${url} (auth=${headers.has('Authorization') ? 'yes' : 'no'}, app=${headers.get('X-Mission-App')})`,
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
      interceptors: [createAuthInterceptor(session), createOriginInterceptor('reports')],
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
