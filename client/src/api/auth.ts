import type { ApiResponse } from "@ai-novel/shared/types/api";
import { apiClient } from "./client";

export type UserRole = "admin" | "writer" | "pending";
export type UserStatus = "active" | "pending_review" | "disabled";

export interface CurrentUser {
  id: string;
  username: string;
  displayName: string | null;
  role: UserRole;
  status: UserStatus;
}

export interface LoginResponse {
  token: string;
  user: CurrentUser;
  expiresAt: string;
}

export interface ManagedUser extends CurrentUser {
  createdAt: string;
  updatedAt: string;
}

export async function login(payload: { username: string; password: string }) {
  const { data } = await apiClient.post<ApiResponse<LoginResponse>>("/auth/login", payload);
  return data;
}

export async function register(payload: { username: string; password: string; displayName?: string }) {
  const { data } = await apiClient.post<ApiResponse<CurrentUser>>("/auth/register", payload);
  return data;
}

export async function getCurrentUser() {
  const { data } = await apiClient.get<ApiResponse<CurrentUser>>("/auth/me");
  return data;
}

export async function logout() {
  const { data } = await apiClient.post<ApiResponse<null>>("/auth/logout");
  return data;
}

export async function changePassword(payload: { currentPassword: string; nextPassword: string }) {
  const { data } = await apiClient.put<ApiResponse<null>>("/auth/password", payload);
  return data;
}

export async function updateProfile(payload: { displayName?: string | null }) {
  const { data } = await apiClient.put<ApiResponse<CurrentUser>>("/auth/profile", payload);
  return data;
}

export async function listUsers() {
  const { data } = await apiClient.get<ApiResponse<ManagedUser[]>>("/admin/users");
  return data;
}

export async function createUser(payload: {
  username: string;
  displayName?: string | null;
  password: string;
  role: UserRole;
  status: UserStatus;
}) {
  const { data } = await apiClient.post<ApiResponse<ManagedUser>>("/admin/users", payload);
  return data;
}

export async function updateUser(id: string, payload: {
  displayName?: string | null;
  password?: string;
  role?: UserRole;
  status?: UserStatus;
}) {
  const { data } = await apiClient.put<ApiResponse<ManagedUser>>(`/admin/users/${id}`, payload);
  return data;
}

export async function deleteUser(id: string) {
  const { data } = await apiClient.delete<ApiResponse<null>>(`/admin/users/${id}`);
  return data;
}
