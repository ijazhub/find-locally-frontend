import { Injectable, signal } from '@angular/core';
import { environment } from '../../environments/environment';

export const WEST_BENGAL_CITIES = [
  'Kolkata', 'Howrah', 'Bidhannagar', 'Barasat', 'Barrackpore', 'Serampore',
  'Chandannagar', 'Chinsurah', 'Kalyani', 'Krishnanagar', 'Bardhaman',
  'Durgapur', 'Asansol', 'Siliguri', 'Darjeeling', 'Jalpaiguri', 'Cooch Behar',
  'Malda', 'Berhampore', 'Bolpur', 'Bankura', 'Purulia', 'Medinipur',
  'Kharagpur', 'Haldia', 'Tamluk', 'Balurghat', 'Raiganj',
] as const;
const KEY = 'niva_city';

@Injectable({ providedIn: 'root' })
export class CityService {
  readonly cities = WEST_BENGAL_CITIES;
  private selection = signal(this.restore());
  readonly selected = this.selection.asReadonly();

  private restore(): string {
    try {
      const city = localStorage.getItem(KEY);
      if (city && this.cities.some(value => value === city)) return city;
    } catch { /* Use the default when storage is unavailable. */ }
    return environment.defaultCity;
  }

  select(city: string) {
    if (!this.cities.some(value => value === city)) return;
    this.selection.set(city);
    try { localStorage.setItem(KEY, city); } catch { /* Selection still works for this visit. */ }
  }
}
