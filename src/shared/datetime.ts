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

const CLINIC_WEEKDAY: Record<string, number> = {
  lun: 0,
  mar: 1,
  mié: 2,
  mie: 2,
  jue: 3,
  vie: 4,
  sáb: 5,
  sab: 5,
  dom: 6,
};

function normalizeWeekdayToken(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .slice(0, 3);
}

/** 0 = lunes … 6 = domingo, según zona del consultorio. */
export function clinicWeekdayIndex(date: Date): number {
  const token = normalizeWeekdayToken(formatInClinicTimezone(date, { weekday: "short" }));
  return CLINIC_WEEKDAY[token] ?? 0;
}

export function addClinicDays(dateStr: string, days: number): string {
  const [year, month, day] = dateStr.split("-").map(Number);
  return toClinicDateInput(new Date(Date.UTC(year, month - 1, day + days, 12, 0, 0)));
}

export function startOfDayClinic(date: Date): Date {
  return parseClinicDateTime(toClinicDateInput(date), "00:00");
}

export function endOfDayClinic(date: Date): Date {
  return parseClinicDateTime(addClinicDays(toClinicDateInput(date), 1), "00:00");
}

export function startOfWeekClinic(date: Date): Date {
  const dateKey = toClinicDateInput(date);
  const weekday = clinicWeekdayIndex(parseClinicDateTime(dateKey, "12:00"));
  return parseClinicDateTime(addClinicDays(dateKey, -weekday), "00:00");
}

export function clinicDayAtHour(date: Date, hour: number): Date {
  return parseClinicDateTime(toClinicDateInput(date), `${String(hour).padStart(2, "0")}:00`);
}
