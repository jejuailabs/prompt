// Client-safe shapes shared by the class studio API routes and screens.

export type ClassRoomState = 'scheduled' | 'open' | 'ended';

export interface ClassGenerationDTO {
  id: string;
  promptText: string;
  referenceUrl: string | null;
  status: 'queued' | 'running' | 'done' | 'failed';
  resultUrl: string | null;
  /** Student-facing reason; the raw provider error never leaves the server. */
  error: string | null;
  createdAt: string;
}

export interface ClassRoomDTO {
  code: string;
  title: string;
  state: ClassRoomState;
  startsAt: string;
  endsAt: string;
  modelName: string;
  perUserLimit: number;
  /** Present once this browser has joined. */
  me: { nickname: string; blocked: boolean; used: number } | null;
  generations: ClassGenerationDTO[];
  /** True when the whole class has spent its budget. */
  budgetExhausted: boolean;
  full: boolean;
}

export interface ClassBoardCardDTO {
  id: string;
  nickname: string;
  promptText: string;
  resultUrl: string;
  referenceUrl: string | null;
  createdAt: string;
}

export interface ClassBoardDTO {
  title: string;
  state: ClassRoomState;
  cards: ClassBoardCardDTO[];
}

export interface ClassSessionAdminDTO {
  id: string;
  code: string;
  title: string;
  state: ClassRoomState;
  startsAt: string;
  endsAt: string;
  maxParticipants: number;
  perUserLimit: number;
  budgetKrw: number;
  boardPublic: boolean;
  providerId: string;
  modelName: string;
  unitCost: number;
  participants: number;
  generated: number;
  failed: number;
  spentKrw: number;
}

export interface ClassSessionDetailDTO {
  participants: { id: string; nickname: string; blocked: boolean; used: number; createdAt: string }[];
  generations: (ClassGenerationDTO & { nickname: string; hidden: boolean; rawError: string | null; usage: Record<string, unknown> | null })[];
}
