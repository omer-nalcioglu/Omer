import { activeStages, isLate, progress, type FlowDef, type Job } from "@workflow/core";
import type { Tone } from "@/ui/kit";

const DAY = 86_400_000;
const sod = (t: number) => { const d = new Date(t); d.setHours(0, 0, 0, 0); return d.getTime(); };

export function dayLabel(t: number, now = Date.now()) {
  const diff = Math.round((sod(t) - sod(now)) / DAY);
  if (diff === 0) return "Bugün";
  if (diff === 1) return "Yarın";
  if (diff === -1) return "Dün";
  if (diff > 1 && diff < 7) return new Date(t).toLocaleDateString("tr-TR", { weekday: "long" });
  return new Date(t).toLocaleDateString("tr-TR", { day: "numeric", month: "short" });
}

export const hm = (t: number) => new Date(t).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" });

export function jobState(job: Job, flow: FlowDef | undefined): { label: string; tone: Tone; live: boolean } {
  if (job.status === "done") return { label: "Bitti", tone: "ok", live: false };
  if (job.status === "cancelled") return { label: "İptal", tone: "mute", live: false };
  if (job.status === "on_hold") return { label: "Bekletiliyor", tone: "warn", live: false };
  if (!flow) return { label: "Açık", tone: "mute", live: false };
  const act = activeStages(job, flow);
  if (act.some(s => job.stages[s.key]!.status === "blocked")) return { label: "Sorun var", tone: "bad", live: false };
  const working = act.find(s => job.stages[s.key]!.status === "working");
  if (working) return { label: working.name, tone: "accent", live: true };
  const first = act[0];
  if (first?.kind === "approval" || first?.kind === "decision") return { label: `${first.name} · onay bekliyor`, tone: "warn", live: false };
  return { label: first ? `${first.name} · sırada` : "Açık", tone: "mute", live: false };
}

export { isLate, progress };
