import { z } from "zod";

export const sessionStatusEnum = ["pending", "connecting", "connected", "failed", "terminated"] as const;
export type SessionStatus = typeof sessionStatusEnum[number];

export interface Session {
  id: string;
  sessionId: string;
  pairingCode: string | null;
  qrCode: string | null;
  status: SessionStatus;
  connectionMethod: "pairing" | "qr";
  createdAt: string;
  linkedAt: string | null;
  credentialsBase64: string | null;
}

export interface CreateSessionRequest {
  method: "pairing" | "qr";
  phoneNumber?: string;
}

export const createSessionSchema = z.object({
  method: z.enum(["pairing", "qr"]),
  phoneNumber: z.string().optional(),
});

export interface SessionResponse {
  sessionId: string;
  pairingCode?: string;
  qrCode?: string;
  status: SessionStatus;
  message: string;
}
