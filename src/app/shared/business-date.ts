import { environment } from '../../environments/environment';
export const businessDateKey = (date = new Date()) => new Intl.DateTimeFormat('en-CA', { timeZone: environment.businessTimezone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(date);
// Datepicker values represent calendar dates, rather than UTC instants.
export function businessCalendarToday() { const [year, month, day] = businessDateKey().split('-').map(Number); return new Date(year, month - 1, day); }
