// Only the fields the UI uses. Full shapes are in niva-openapi.yaml.
export interface Money { amount: number; currency: string }
export interface Page<T> { content: T[]; page: number; size: number; totalElements: number; totalPages: number }
export interface Category { slug: string; name: string; providerCount?: number }
export interface Service { id: string; name: string; description?: string; durationMinutes: number; price: Money; fulfilment?: string[]; active?: boolean }
export interface ProviderSummary {
  id: string; businessName: string; ownerName?: string; category?: string; neighbourhood?: string;
  tags?: string[]; coverImageUrl?: string; badges?: string[]; rating?: number; reviewCount?: number;
  distanceKm?: number | null; startingPrice?: Money; saved?: boolean;
}
export interface ProviderDetail extends ProviderSummary { bio?: string; avatarUrl?: string; services: Service[]; followed?: boolean }
export interface Slot { startsAt: string; endsAt: string; available: boolean }
export interface Booking {
  endsAt?: string; address?: Address; listedPrice?: Money; proposedPrice?: Money; agreedPrice?: Money | null;
  holdExpiresAt?: string; responseDeadline?: string; declineReason?: string; allowedActions?: string[]; quotations?: Quotation[];
  id: string; status: string; provider: ProviderSummary; customer?: { id: string; name: string };
  service: Service; startsAt: string; fulfilment?: string; note?: string; total: Money;
  reviewed?: boolean; conversationId?: string | null;
}
export interface UserProfile { id: string; name?: string; phone?: string; email?: string; roles?: string[]; accountType?: 'CUSTOMER' | 'BUSINESS'; onboardingStatus?: string; businessId?: string | null; unreadNotifications?: number }
export interface LoginRequest { email: string; password: string }
export interface CartItemInput {
  providerId: string;
  serviceId: string;
  startsAt?: string;
  fulfilment?: 'AT_CLIENT' | 'AT_STUDIO' | 'PICKUP' | 'DELIVERY';
}
export interface RegisterRequest extends LoginRequest { name?: string; accountType?: 'CUSTOMER' | 'BUSINESS' }
export interface TokenPair { accessToken: string; refreshToken: string; expiresIn: number }
export interface AuthResponse extends TokenPair { newUser: boolean; user: UserProfile }
export interface Address { id?: string; label?: string; line1: string; city: string; pincode: string; neighbourhood?: string }

export interface Problem { title?: string; detail?: string; errors?: { field: string; message: string }[] }
export interface Quotation { id: string; version: number; price: Money; state: 'CURRENT' | 'SUPERSEDED' | 'ACCEPTED' | 'REJECTED' | 'EXPIRED'; createdAt?: string; expiresAt?: string }
export interface QuotationResponse { quotationId: string; version: number; decision: 'ACCEPT' | 'REJECT'; reason?: string }
export interface BusinessProfileUpdate { businessName?: string; bio?: string; note?: string; neighbourhood?: string; workMode?: 'STUDIO' | 'TRAVELS_TO_CLIENT' | 'BOTH'; avatarUploadId?: string; coverUploadId?: string }
export interface MediaUpdate { caption?: string; presentationFormat?: 'STANDARD' | 'REEL'; publicationState?: 'DRAFT' | 'PUBLISHED'; coverUploadId?: string }
export interface MediaItem extends MediaUpdate { id: string; type: 'PHOTO' | 'VIDEO'; url?: string | null; thumbnailUrl?: string | null; processingState?: 'PENDING' | 'READY' | 'FAILED' }

export const DAYS = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];
export const defaultWeek = () => DAYS.map(day => ({ day, open: day !== 'SUN', from: '09:00', to: '18:00' }));

export const STATUS_LABEL: Record<string, string> = {
  AWAITING_CONFIRMATION: 'Awaiting confirmation', CONFIRMED: 'Confirmed',
  COMPLETED: 'Done', CANCELLED: 'Cancelled', DECLINED: 'Declined',
};
export const FULFILMENT_LABEL: Record<string, string> = {
  AT_CLIENT: 'They come to me', AT_STUDIO: 'At their studio', PICKUP: 'Pickup', DELIVERY: 'Delivery',
};
