import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';
import { Address, Booking, CartItemInput, Category, Page, ProviderDetail, ProviderSummary, Service, Slot } from './models';

const clean = (o: Record<string, any> = {}) => {
  let p = new HttpParams();
  for (const [k, v] of Object.entries(o)) if (v !== null && v !== undefined && v !== '') p = p.set(k, String(v));
  return p;
};

/** One thin wrapper over every endpoint in niva-openapi.yaml, grouped like the spec's tags. */
@Injectable({ providedIn: 'root' })
export class ApiService {
  private http = inject(HttpClient);
  private base = environment.apiUrl;
  private get = <T>(path: string, params?: Record<string, any>) => this.http.get<T>(this.base + path, { params: clean(params) });
  private post = <T>(path: string, body: any = {}, headers?: Record<string, string>) => this.http.post<T>(this.base + path, body, { headers });
  private put = <T>(path: string, body: any = {}) => this.http.put<T>(this.base + path, body);
  private patch = <T>(path: string, body: any) => this.http.patch<T>(this.base + path, body);
  private del = <T>(path: string) => this.http.delete<T>(this.base + path);

  // Catalog
  categories = () => this.get<Category[]>('/categories');
  home = (city: string) => this.get<{ categories: Category[]; featured: ProviderSummary[] }>('/home', { city });
  providers = (q: Record<string, any>) => this.get<Page<ProviderSummary>>('/providers', q);
  provider = (id: string) => this.get<ProviderDetail>(`/providers/${id}`);
  slots = (id: string, serviceId: string, date: string) => this.get<Slot[]>(`/providers/${id}/availability`, { serviceId, date });
  socialProfile = (id: string) => this.get<any>(`/providers/${id}/profile`);
  media = (id: string) => this.get<Page<any>>(`/providers/${id}/media`, { size: 24 });
  reviews = (id: string) => this.get<Page<any>>(`/providers/${id}/reviews`, { size: 20 });
  follow = (id: string) => this.put(`/providers/${id}/follow`);
  unfollow = (id: string) => this.del(`/providers/${id}/follow`);

  // Saved & following
  saved = () => this.get<Page<ProviderSummary>>('/users/me/saved', { size: 50 });
  save = (id: string) => this.put(`/users/me/saved/${id}`);
  unsave = (id: string) => this.del(`/users/me/saved/${id}`);
  following = () => this.get<Page<ProviderSummary>>('/users/me/following', { size: 50 });

  // Account
  updateMe = (body: any) => this.patch('/users/me', body);
  addresses = () => this.get<Address[]>('/users/me/addresses');
  addAddress = (a: Address) => this.post<Address>('/users/me/addresses', a);
  deleteAddress = (id: string) => this.del(`/users/me/addresses/${id}`);

  // Bookings & cart
  createBooking = (body: any) => this.post<Booking>('/bookings', body, { 'Idempotency-Key': crypto.randomUUID() });
  bookings = (tab: string) => this.get<Page<Booking>>('/bookings', { tab, size: 50 });
  bookingSummary = () => this.get<any>('/bookings/summary');
  cancelBooking = (id: string) => this.post<Booking>(`/bookings/${id}/cancel`, {});
  review = (id: string, rating: number, text: string) => this.post(`/bookings/${id}/review`, { rating, text });
  cart = () => this.get<any>('/cart');
  addToCart = (providerId: string, serviceId: string) => this.post('/cart/items', { providerId, serviceId });
  removeCartItem = (id: string) => this.del(`/cart/items/${id}`);
  updateCartItem = (id: string, body: CartItemInput) => this.put<any>(`/cart/items/${id}`, body);
  checkout = () => this.post<Booking[]>('/cart/checkout', {}, { 'Idempotency-Key': crypto.randomUUID() });

  // Messages
  conversations = () => this.get<Page<any>>('/conversations', { size: 50 });
  startConversation = (providerId: string, bookingId?: string) => this.post<any>('/conversations', { providerId, bookingId });
  messages = (id: string) => this.get<any[]>(`/conversations/${id}/messages`, { size: 50 });
  sendMessage = (id: string, text: string) => this.post<any>(`/conversations/${id}/messages`, { text });
  markRead = (id: string) => this.post(`/conversations/${id}/read`);

  // Assistant
  ask = (text: string, threadId?: string) => this.post<any>('/assistant/messages', { text, threadId });
  assistantBook = (threadId: string, recommendationId: string) => this.post<Booking>(`/assistant/threads/${threadId}/book`, { recommendationId });

  // Notifications
  notifications = () => this.get<Page<any>>('/notifications', { size: 10 });
  readAllNotifications = () => this.post('/notifications/read-all');

  // The backend handles storage; the browser supplies the multipart boundary.
  async upload(file: File, purpose: string): Promise<string> {
    const body = new FormData();
    body.append('purpose', purpose);
    body.append('file', file, file.name);
    const r = await firstValueFrom(this.post<{ uploadId: string }>('/media/uploads', body));
    return r.uploadId;
  }

  // Business onboarding
  onboarding = () => this.get<any>('/business/onboarding');
  startOnboarding = () => this.post<any>('/business/onboarding');
  saveStep = (step: string, body: any) => this.put<any>(`/business/onboarding/steps/${step}`, body);
  submitOnboarding = () => this.post<any>('/business/onboarding/submit');

  // Business dashboard
  overview = () => this.get<any>('/business/dashboard/overview');
  earnings = () => this.get<any>('/business/earnings');
  businessReviews = () => this.get<Page<any>>('/business/reviews', { size: 20 });
  businessBookings = (status?: string) => this.get<Page<Booking>>('/business/bookings', { status, size: 50 });
  bookingAction = (id: string, action: 'accept' | 'decline' | 'complete') => this.post<Booking>(`/business/bookings/${id}/${action}`);
  ownServices = () => this.get<Service[]>('/business/services');
  createService = (s: any) => this.post<Service>('/business/services', s);
  updateService = (id: string, s: any) => this.put<Service>(`/business/services/${id}`, s);
  deleteService = (id: string) => this.del(`/business/services/${id}`);
  setServiceActive = (id: string, active: boolean) => this.put(`/business/services/${id}/active`, { active });
  availability = () => this.get<any>('/business/availability');
  saveAvailability = (a: any) => this.put('/business/availability', a);
}
