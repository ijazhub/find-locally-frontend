import { Component, computed, effect, ElementRef, inject, OnDestroy, signal, viewChild } from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink, RouterLinkActive } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatTabsModule } from '@angular/material/tabs';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs';
import { AccountType, Action, labels, Media, PreviewService, PreviewStore, Request } from './preview.store';

@Component({
  selector: 'app-preview',
  imports: [FormsModule, RouterLink, RouterLinkActive, MatButtonModule, MatTabsModule],
  templateUrl: './preview.html', styleUrl: './preview.scss',
})
export class Preview implements OnDestroy {
  store = inject(PreviewStore);
  route = inject(ActivatedRoute);
  router = inject(Router);
  role: AccountType = this.route.snapshot.data['role'] || 'CUSTOMER';
  view: string = this.route.snapshot.data['view'] || 'entry';
  base = this.role === 'BUSINESS' ? '/preview/provider' : '/preview/customer';
  labels = labels;
  fulfilments: Record<string, string> = { AT_STUDIO: 'At the studio', AT_CLIENT: 'At your address', DELIVERY: 'Delivery', PICKUP: 'Pickup' };
  requestId = toSignal(this.route.paramMap.pipe(map(params => params.get('id'))), { initialValue: this.route.snapshot.paramMap.get('id') });
  request = computed(() => this.store.requests().find(r => r.id === this.requestId()));
  currentQuote = computed(() => this.request()?.quotes.at(-1));
  activeServices = computed(() => this.store.services().filter(s => s.active));
  newRequests = computed(() => this.store.requests().filter(r => r.status === 'AWAITING_CONFIRMATION'));
  awaiting = computed(() => this.store.requests().filter(r => r.status === 'AWAITING_CUSTOMER_APPROVAL'));
  today = this.dateKey(new Date());
  confirmedToday = computed(() => this.store.requests().filter(r => r.status === 'CONFIRMED' && this.dateKey(new Date(r.startsAt)) === this.today));
  completedValue = computed(() => this.store.requests().filter(r => r.status === 'COMPLETED').reduce((sum, r) => sum + (r.agreed || 0), 0));
  cancelled = computed(() => this.store.requests().filter(r => r.status === 'CANCELLED').length);
  filter = 'ALL'; mediaFilter = 'ALL';
  filteredRequests = computed(() => this.store.requests());
  pending = signal(false); error = signal(''); notice = signal('');
  step = 0; date = ''; slot = ''; serviceId = this.route.snapshot.queryParamMap.get('service') || this.activeServices()[0]?.id || '';
  fulfilment = ''; address = ''; proposal: number | null = null; note = '';
  submitKey = crypto.randomUUID();
  holdUntil = 0;
  service = () => this.activeServices().find(s => s.id === this.serviceId);
  slots = ['09:00', '10:00', '11:00', '14:00', '15:00', '16:00'];
  quoteAmount: number | null = null; quoteNote = ''; quoteHours = 24; quoting = false;
  text = '';
  context = this.route.snapshot.queryParamMap.get('booking') || 'general';
  profileDraft = { ...this.store.profile() };
  serviceDraft: PreviewService = this.blankService();
  servicePrice: number | null = null;
  week = this.store.availability().map(d => ({ ...d }));
  mediaCaption = ''; mediaType: Media['type'] = 'PHOTO';
  photo = signal<Media | null>(null);
  viewer = viewChild<ElementRef<HTMLDialogElement>>('viewer');
  private photoTrigger?: HTMLElement;
  private timers: ReturnType<typeof setTimeout>[] = [];
  private objectUrls: string[] = [];
  constructor() {
    this.route.queryParamMap.pipe(takeUntilDestroyed()).subscribe(params => {
      this.context = params.get('booking') || 'general'; this.text = '';
      if (this.view === 'messages') this.store.unread.set(0);
    });
    effect(() => { const dialog = this.viewer()?.nativeElement; if (dialog && this.photo() && !dialog.open) dialog.showModal(); });
  }
  money(amount: number) { return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(amount / 100); }
  time(value: string) { return new Intl.DateTimeFormat('en-IN', { timeZone: this.store.timezone, dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value)); }
  dateKey(date: Date) { return new Intl.DateTimeFormat('en-CA', { timeZone: this.store.timezone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(date); }
  unavailable(time: string) {
    const start = `${this.date}T${time}:00+05:30`;
    return new Date(start).getTime() <= Date.now() || this.store.requests().some(r => new Date(r.startsAt).getTime() === new Date(start).getTime() && ['CONFIRMED', 'AWAITING_CONFIRMATION', 'AWAITING_CUSTOMER_APPROVAL'].includes(r.status));
  }
  selectSlot(time: string) { this.slot = time; this.holdUntil = Date.now() + 5 * 60000; }
  validStep() {
    if (this.step === 0) return !!this.service();
    if (this.step === 1) return !!this.date && !!this.slot && !this.unavailable(this.slot);
    if (this.step === 2) return !!this.fulfilment && (!['AT_CLIENT', 'DELIVERY'].includes(this.fulfilment) || this.address.trim().length >= 10);
    return this.proposal !== null && Number.isFinite(this.proposal) && this.proposal > 0 && Number.isSafeInteger(Math.round(this.proposal * 100));
  }
  next() { if (this.validStep()) { this.step++; this.error.set(''); } }
  async submitBooking() {
    if (this.pending()) return;
    this.error.set('');
    if (!this.service() || !this.slot || this.proposal === null || this.proposal <= 0 || !this.fulfilment) { this.error.set('Please complete all booking details.'); return; }
    if (Date.now() > this.holdUntil) { this.step = 1; this.slot = ''; this.error.set('Your preview hold expired. Please select a slot again. Your other details are saved.'); return; }
    await this.run(() => {
      const request = this.store.create({ service: this.service()!.name, startsAt: `${this.date}T${this.slot}:00+05:30`, fulfilment: this.fulfilment, address: this.address, note: this.note, proposal: Math.round(this.proposal! * 100) }, this.submitKey);
      void this.router.navigate([this.base, 'requests', request.id]);
    });
  }
  async run(action: () => void) {
    if (this.pending()) return;
    this.pending.set(true); this.error.set(''); this.notice.set('');
    try { await Promise.resolve(); action(); } catch (e) { this.error.set(e instanceof Error ? e.message : 'Something went wrong. Your input is preserved. Please retry.'); }
    finally { this.pending.set(false); }
  }
  allowed(action: Action) { return !!this.request()?.allowed[this.role].includes(action); }
  act(action: Action) {
    const request = this.request(); if (!request) return;
    const quote = this.currentQuote();
    void this.run(() => {
      this.store.action(request.id, this.role, action, request.version, quote && { id: quote.id, version: quote.version }, this.quoteAmount === null ? undefined : { amount: Math.round(this.quoteAmount * 100), note: this.quoteNote, hours: this.quoteHours });
      this.quoting = false; this.notice.set('Request updated in this preview.');
    });
  }
  chat(id?: string) { void this.router.navigate([this.base, 'messages'], { queryParams: id ? { booking: id } : {} }); }
  send() {
    const text = this.text.trim(); if (!text) return;
    this.store.send(this.context, this.role === 'BUSINESS' ? 'Ananya' : 'Mira', text); this.text = '';
  }
  saveProfile(form: NgForm) { if (form.invalid) return; this.store.profile.set({ ...this.profileDraft }); this.notice.set('Profile saved for this preview session.'); }
  blankService(): PreviewService { return { id: '', name: '', description: '', minutes: 60, price: 0, active: true, fulfilment: ['AT_STUDIO'] }; }
  editService(s: PreviewService) { this.serviceDraft = { ...s, fulfilment: [...s.fulfilment] }; this.servicePrice = s.price / 100; this.notice.set(''); }
  toggleFulfilment(value: string, checked: boolean) { this.serviceDraft.fulfilment = checked ? [...this.serviceDraft.fulfilment, value] : this.serviceDraft.fulfilment.filter(f => f !== value); }
  saveService(form: NgForm) {
    if (form.invalid || !this.servicePrice || !this.serviceDraft.fulfilment.length) return;
    const s = { ...this.serviceDraft, id: this.serviceDraft.id || crypto.randomUUID(), price: Math.round(this.servicePrice * 100) };
    this.store.services.update(list => list.some(x => x.id === s.id) ? list.map(x => x.id === s.id ? s : x) : [...list, s]);
    this.serviceDraft = this.blankService(); this.servicePrice = null; form.resetForm(this.serviceDraft); this.notice.set('Service saved for this preview session.');
  }
  toggleService(id: string) { this.store.services.update(list => list.map(s => s.id === id ? { ...s, active: !s.active } : s)); }
  saveAvailability() {
    if (this.week.some(d => d.open && (!d.from || !d.to || d.from >= d.to))) { this.error.set('Each open day needs an end time after its start time.'); return; }
    this.store.availability.set(this.week.map(d => ({ ...d }))); this.error.set(''); this.notice.set('Availability saved locally. Preview slots remain fixtures until backend integration.');
  }
  upload(event: Event) {
    const input = event.target as HTMLInputElement; const file = input.files?.[0]; if (!file) return;
    this.error.set('');
    if (!(this.mediaType === 'PHOTO' ? ['image/jpeg', 'image/png', 'image/webp'] : ['video/mp4', 'video/webm']).includes(file.type) || file.size > 50 * 1024 * 1024) { this.error.set('Choose a supported image or video smaller than 50 MB.'); return; }
    const url = URL.createObjectURL(file); this.objectUrls.push(url);
    const m: Media = { id: crypto.randomUUID(), type: this.mediaType, caption: this.mediaCaption || file.name, url, status: 'PROCESSING', progress: 0, local: true };
    this.store.media.update(list => [m, ...list]); this.mediaCaption = ''; input.value = '';
    for (const [delay, progress] of [[300, 35], [650, 70], [1000, 100]]) this.timers.push(setTimeout(() => this.store.media.update(list => list.map(x => x.id === m.id ? { ...x, progress, status: progress === 100 ? 'PUBLISHED' : 'PROCESSING' } : x)), delay));
    this.notice.set('Local file preview only. Upload and publication are simulated.');
  }
  failMedia(id: string) { this.store.media.update(list => list.map(m => m.id === id ? { ...m, status: 'FAILED' } : m)); }
  retryMedia(id: string) {
    this.store.media.update(list => list.map(m => m.id === id ? { ...m, status: 'PROCESSING' } : m));
    const item = this.store.media().find(m => m.id === id);
    if (item?.local) this.timers.push(setTimeout(() => this.store.media.update(list => list.map(m => m.id === id ? { ...m, status: 'PUBLISHED', progress: 100 } : m)), 1000));
    this.notice.set('Retrying local preview processing. Server publication will require backend confirmation.');
  }
  deleteMedia(id: string) { const m = this.store.media().find(x => x.id === id); if (m?.local) URL.revokeObjectURL(m.url); this.store.media.update(list => list.filter(m => m.id !== id)); }
  openPhoto(m: Media, event: Event) { this.photoTrigger = event.currentTarget as HTMLElement; this.photo.set(m); }
  closePhoto() { this.photo.set(null); this.photoTrigger?.focus(); }
  ngOnDestroy() { this.timers.forEach(clearTimeout); /* Blob URLs stay valid for this in-memory preview session. */ }
}
