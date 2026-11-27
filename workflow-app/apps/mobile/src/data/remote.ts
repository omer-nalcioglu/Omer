import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import * as SecureStore from "expo-secure-store";
import type { Job, JobData } from "@workflow/core";

/**
 * Bulut bağlantısı. Adres ve herkese açık anahtar derleme sırasında ortam değişkeninden gelir
 * (EXPO_PUBLIC_SUPABASE_URL, EXPO_PUBLIC_SUPABASE_ANON_KEY); gizli anahtarlar uygulamaya hiç girmez.
 * İş değiştiren her komut `apply-command` sunucu fonksiyonuna gider; motor orada yeniden doğrulanır.
 */
const URL = process.env.EXPO_PUBLIC_SUPABASE_URL ?? "";
const ANON = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? "";

export const cloudConfigured = () => URL.startsWith("https://") && ANON.length > 20;

let client: SupabaseClient | null = null;
export function supabase(): SupabaseClient {
  if (!cloudConfigured()) throw new Error("Sunucu yapılandırılmadı");
  client ??= createClient(URL, ANON, {
    auth: {
      storage: { getItem: k => SecureStore.getItemAsync(k), setItem: (k, v) => SecureStore.setItemAsync(k, v), removeItem: k => SecureStore.deleteItemAsync(k) },
      autoRefreshToken: true, persistSession: true, detectSessionInUrl: false,
    },
  });
  return client;
}

export type Command =
  | { type: "create"; businessId: string; flowId: string; input: { title: string; customerName: string; due: number; data?: JobData } }
  | { type: "start" | "complete" | "issue" | "resolve" | "send_back" | "hold" | "resume" | "cancel"; jobId: string; expectedVersion: number;
      stageKey?: string; choice?: string; data?: JobData; to?: string; note?: string; issueType?: string };

export async function send(cmd: Command): Promise<{ job: Job; version: number }> {
  const { data, error } = await supabase().functions.invoke("apply-command", { body: cmd });
  if (error) throw error;
  return data as { job: Job; version: number };
}

export async function emailCode(email: string) {
  const { error } = await supabase().auth.signInWithOtp({ email, options: { shouldCreateUser: true } });
  if (error) throw error;
}

export async function verifyCode(email: string, token: string) {
  const { error } = await supabase().auth.verifyOtp({ email, token, type: "email" });
  if (error) throw error;
}
