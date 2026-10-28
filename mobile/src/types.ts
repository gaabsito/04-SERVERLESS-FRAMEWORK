export type ZoneStatus = 'OPEN' | 'FULL' | 'CLOSED';
export interface Zone { id: string; name: string; capacity: number; status: ZoneStatus }
export type ZoneInput = Omit<Zone, 'id'>;
