import type { Zone, ZoneInput, ZoneStatus } from './types';
export const API_URL = 'https://vkmt2bkh68.execute-api.us-west-2.amazonaws.com/dev';
async function request(path: string, method = 'GET', body?: unknown): Promise<unknown> {
  const response = await fetch(API_URL + path, { method, ...(body === undefined ? {} : { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }) });
  const value: unknown = await response.json();
  if (!response.ok) {
    const message = value && typeof value === 'object' && 'message' in value ? String(value.message) : response.statusText;
    throw new Error(`HTTP ${response.status}: ${message}`);
  }
  return value;
}
function isZone(v: unknown): v is Zone {
  return typeof v === 'object' && v !== null && 'id' in v && typeof v.id === 'string' && 'name' in v && typeof v.name === 'string' &&
    'capacity' in v && typeof v.capacity === 'number' && Number.isSafeInteger(v.capacity) && v.capacity > 0 &&
    'status' in v && ['OPEN', 'FULL', 'CLOSED'].includes(String(v.status));
}
export async function listZones(): Promise<Zone[]> {
  const value = await request('/zones');
  if (!Array.isArray(value) || !value.every(isZone)) throw new Error('Catálogo inválido');
  return value;
}
export async function getZone(id: string): Promise<Zone> {
  const value = await request('/zones/' + encodeURIComponent(id));
  if (!isZone(value)) throw new Error('Espacio inválido');
  return value;
}
export const createZone = (v: ZoneInput) => request('/zones', 'POST', v);
export const replaceZone = (id: string, v: ZoneInput) => request('/zones/' + encodeURIComponent(id), 'PUT', v);
export const updateZone = (id: string, status: ZoneStatus) => request('/zones/' + encodeURIComponent(id), 'PATCH', { status });
export const deleteZone = (id: string) => request('/zones/' + encodeURIComponent(id), 'DELETE');
