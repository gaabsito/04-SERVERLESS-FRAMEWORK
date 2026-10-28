import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';

type Status = 'OPEN' | 'FULL' | 'CLOSED';
interface Zone { id: string; name: string; capacity: number; status: Status }
const catalog: Zone[] = [
  { id: 'ZONE-01', name: 'Main Stage', capacity: 5000, status: 'OPEN' },
  { id: 'ZONE-07', name: 'Garden Stage', capacity: 2500, status: 'FULL' },
  { id: 'ZONE-03', name: 'Invernadero', capacity: 1800, status: 'OPEN' },
  { id: 'ZONE-04', name: 'Club Stage', capacity: 900, status: 'CLOSED' }
];
const json = (statusCode: number, value: unknown): APIGatewayProxyResult => ({
  statusCode, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }, body: JSON.stringify(value)
});
const isStatus = (v: unknown): v is Status => v === 'OPEN' || v === 'FULL' || v === 'CLOSED';
function readBody(event: APIGatewayProxyEvent): Record<string, unknown> | null {
  try {
    const raw = event.isBase64Encoded && event.body ? Buffer.from(event.body, 'base64').toString('utf8') : event.body;
    const v: unknown = JSON.parse(raw ?? 'null');
    return typeof v === 'object' && v !== null && !Array.isArray(v) ? v as Record<string, unknown> : null;
  } catch { return null; }
}
function valid(v: Record<string, unknown> | null): v is Omit<Zone, 'id'> {
  return v !== null && typeof v.name === 'string' && v.name.trim().length > 0 && v.name.trim().length <= 100 &&
    typeof v.capacity === 'number' && Number.isSafeInteger(v.capacity) && v.capacity > 0 && isStatus(v.status) &&
    Object.keys(v).every(k => ['name', 'capacity', 'status'].includes(k));
}

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  const method = event.httpMethod;
  const detail = event.resource.endsWith('/{id}');
  const id = event.pathParameters?.id;
  console.log('VENUE', method, event.resource, id ?? 'collection');
  if (detail && !id) return json(400, { message: 'Falta id' });
  const found = id ? catalog.find(z => z.id === id) : undefined;
  if (detail && !found) return json(404, { message: 'Espacio no encontrado' });
  if (method === 'GET') return json(200, detail ? found : catalog);
  if (method === 'DELETE' && detail) return json(200, { id, operation: 'DELETED', simulated: true });
  const body = readBody(event);
  if (method === 'PATCH' && detail) {
    if (!body || Object.keys(body).length !== 1 || !isStatus(body.status)) return json(400, { message: 'PATCH requiere únicamente status OPEN, FULL o CLOSED' });
    return json(200, { id, changes: { status: body.status }, operation: 'UPDATED', simulated: true });
  }
  if ((method === 'POST' && !detail) || (method === 'PUT' && detail)) {
    if (!valid(body)) return json(400, { message: 'Objeto requerido: name no vacío (máx. 100), capacity entero positivo y status OPEN, FULL o CLOSED' });
    return json(method === 'POST' ? 201 : 200, {
      id: method === 'POST' ? 'ZONE-NEW' : id,
      name: body.name.trim(), capacity: body.capacity, status: body.status,
      operation: method === 'POST' ? 'CREATED' : 'REPLACED', simulated: true
    });
  }
  return json(405, { message: 'Método no permitido' });
};
