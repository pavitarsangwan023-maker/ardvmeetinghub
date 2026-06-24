export interface User {
  id: number;
  name: string;
  email: string;
  avatar_color: string;
  profile_pic?: string | null;
  created_at: string;
}

export interface ParticipantRecord {
  id: number;
  user: User;
  joined_at: string;
  left_at?: string | null;
  was_removed: boolean;
}

export interface Meeting {
  id: number;
  meeting_id: string;
  title: string;
  waiting_room_enabled: boolean;
  is_active: boolean;
  created_at: string;
  scheduled_for?: string | null;
  started_at?: string | null;
  ended_at?: string | null;
  duration_limit_minutes?: number | null;
  host: User;
  participants: ParticipantRecord[];
}

export interface RoomParticipant {
  sid: string;
  id: number;
  name: string;
  email: string;
  avatar_color: string;
  profile_pic?: string | null;
  is_host: boolean;
  is_co_host?: boolean;
  is_waiting?: boolean;
  mic_enabled?: boolean;
  camera_enabled?: boolean;
}

export interface ChatMessage {
  id: string;
  message: string;
  user: RoomParticipant;
  sentAt: string;
  isPrivate?: boolean;
  toUser?: string;
  isIntercepted?: boolean;
}
