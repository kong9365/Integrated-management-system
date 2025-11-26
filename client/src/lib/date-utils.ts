import { format as dateFnsFormat } from "date-fns";
import { ko } from "date-fns/locale";

export function formatDate(date: Date | string, formatStr: string = "yyyy-MM-dd"): string {
  const dateObj = typeof date === "string" ? new Date(date) : date;
  return dateFnsFormat(dateObj, formatStr, { locale: ko });
}

export function formatTime(date: Date | string): string {
  const dateObj = typeof date === "string" ? new Date(date) : date;
  return dateFnsFormat(dateObj, "HH:mm:ss");
}

export function formatDateTime(date: Date | string): string {
  const dateObj = typeof date === "string" ? new Date(date) : date;
  return dateFnsFormat(dateObj, "yyyy년 MM월 dd일 (eee) HH:mm", { locale: ko });
}

export function formatDateKorean(date: Date | string): string {
  const dateObj = typeof date === "string" ? new Date(date) : date;
  return dateFnsFormat(dateObj, "yyyy년 MM월 dd일 (eee)", { locale: ko });
}

