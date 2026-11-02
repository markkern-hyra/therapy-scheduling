// Адреса дня на сторінці слотів: кроки днями й повернення після «Hold». Порожні параметри не потрапляють в адресу.
export function slotsHref(therapist: string | undefined, day: string | undefined, client?: string): string {
  return `/slots?${new URLSearchParams({ ...(therapist ? { therapist } : {}), ...(day ? { day } : {}), ...(client ? { client } : {}) })}`;
}
