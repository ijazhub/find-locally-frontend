import { Pipe, PipeTransform } from '@angular/core';
import { environment } from '../../environments/environment';
@Pipe({ name: 'businessTime' })
export class BusinessTimePipe implements PipeTransform {
  transform(value?: string | null, timeOnly = false): string {
    if (!value) return '';
    const date = new Date(value); if (!Number.isFinite(date.getTime())) return '';
    return new Intl.DateTimeFormat('en-IN', { timeZone: environment.businessTimezone, ...(timeOnly ? {} : { dateStyle: 'medium' as const }), timeStyle: 'short' }).format(date);
  }
}
