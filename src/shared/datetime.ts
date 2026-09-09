export const CLINIC_TIMEZONE = "America/Mexico_City";

export function formatInClinicTimezone(
  date: Date | string,
  options: Intl.DateTimeFormatOptions = {},
): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("es-MX", {
    timeZone: CLINIC_TIMEZONE,
    ...options,
  }).format(d);
}

export function clinicDateKey(date: Date): string {
  return formatInClinicTimezone(date, {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  })
    .split("/")
    .reverse()
    .join("-");
}

/** Interpreta YYYY-MM-DD + HH:mm como hora local del consultorio (CDMX, UTC-6). */
export function parseClinicDateTime(dateStr: string, timeStr: string): Date {
  return new Date(`${dateStr}T${timeStr}:00-06:00`);
}

export function toClinicDateInput(date: Date | string): string {
  return formatInClinicTimezone(date, {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  })
    .split("/")
    .reverse()
    .join("-");
}

export function toClinicTimeInput(date: Date | string): string {
  return formatInClinicTimezone(date, {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

export function addMinutes(date: Date, minutes: number): Date {
  return new Date(date.getTime() + minutes * 60_000);
}

export function startOfWeek(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}
