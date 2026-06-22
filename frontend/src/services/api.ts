import axios from "axios";
import type { Meeting, User } from "../types";

const API_URL = import.meta.env.VITE_API_URL || "";

export const api = axios.create({
  baseURL: API_URL,
  headers: { "Content-Type": "application/json" }
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("pymeet_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export interface AuthResponse {
  access_token: string;
  token_type: string;
  user: User;
}

export const authApi = {
  register: (payload: { name: string; email: string; password: string }) => api.post<AuthResponse>("/api/auth/register", payload),
  login: (payload: { email: string; password: string }) => api.post<AuthResponse>("/api/auth/login", payload),
  resetPassword: (payload: { email: string; name: string; new_password: string }) => api.post("/api/auth/reset-password", payload),
  me: () => api.get<User>("/api/auth/me"),
  updateProfile: (payload: { name?: string; email?: string; password?: string }) => api.put<User>("/api/auth/profile", payload)
};

export const meetingApi = {
  create: (payload: { title: string; waiting_room_enabled: boolean; scheduled_for?: string | null; duration_limit_minutes?: number | null }) => api.post<Meeting>("/api/meetings", payload),
  list: () => api.get<Meeting[]>("/api/meetings"),
  get: (meetingId: string) => api.get<Meeting>(`/api/meetings/${meetingId}`),
  join: (meeting_id: string) => api.post<Meeting>("/api/meetings/join", { meeting_id }),
  getChatHistory: async (meetingId: string) => {
    const response = await api.get<any[]>(`/api/meetings/${meetingId}/chat`);
    return response.data;
  }
};

export const schedulerApi = {
  getProfile: () => api.get("/api/scheduler/profile"),
  updateProfile: (data: any) => api.put("/api/scheduler/profile", data),
  getPublicProfile: (slug: string) => api.get(`/api/scheduler/public/${slug}`),
  getAvailableSlots: (slug: string, date: string) => api.get(`/api/scheduler/public/${slug}/slots?target_date=${date}`),
  bookSlot: (slug: string, data: any) => api.post(`/api/scheduler/public/${slug}/book`, data),
};
