import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { Preview } from './preview';
import { PreviewStore } from './preview.store';
import { previewRoutes } from './preview.routes';

describe('FindLocally screen flows', () => {
  beforeEach(() => TestBed.configureTestingModule({ providers: [provideRouter([{ path: 'preview', children: previewRoutes }])] }));

  it('renders distinct customer and provider navigation', async () => {
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/preview/customer', Preview);
    let nav = harness.routeNativeElement!.querySelector('nav')!.textContent!;
    expect(nav).toContain('Discover'); expect(nav).not.toContain('Dashboard');
    await harness.navigateByUrl('/preview/provider', Preview);
    nav = harness.routeNativeElement!.querySelector('nav')!.textContent!;
    expect(nav).toContain('Dashboard'); expect(nav).not.toContain('Discover');
  });
  it('renders exactly the two profile tabs and hides processing media', async () => {
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/preview/customer/profile', Preview);
    const tabs = [...harness.routeNativeElement!.querySelectorAll('[role="tab"]')].map(e => e.textContent!.trim());
    expect(tabs).toEqual(['Bio / My Work', 'Services']);
    expect(harness.routeNativeElement!.querySelector('video')).toBeNull();
    expect(harness.routeNativeElement!.textContent).not.toContain('Behind the stems');
  });
  it('submits a customer proposal without confirming a booking', async () => {
    const harness = await RouterTestingHarness.create();
    const page = await harness.navigateByUrl('/preview/customer/book', Preview);
    page.date = '2030-01-01'; page.selectSlot('14:00'); page.fulfilment = 'AT_STUDIO'; page.proposal = 1250; page.note = 'White flowers';
    await page.submitBooking();
    await harness.fixture.whenStable();
    const request = TestBed.inject(PreviewStore).requests()[0];
    expect(request.proposal).toBe(125000); expect(request.agreed).toBeUndefined();
    expect(request.status).toBe('AWAITING_CONFIRMATION');
    expect(TestBed.inject(Router).url).toContain('/preview/customer/requests/');
  });
  it('preserves form input when a local slot hold expires', async () => {
    const harness = await RouterTestingHarness.create();
    const page = await harness.navigateByUrl('/preview/customer/book', Preview);
    page.date = '2030-01-01'; page.slot = '14:00'; page.holdUntil = Date.now() - 1;
    page.fulfilment = 'AT_STUDIO'; page.proposal = 1250; page.note = 'Please keep this note';
    await page.submitBooking();
    expect(page.step).toBe(1); expect(page.slot).toBe(''); expect(page.proposal).toBe(1250); expect(page.note).toBe('Please keep this note');
    expect(page.error()).toContain('expired');
  });
  it('accepts a quotation from its rendered action and shows the agreed price', async () => {
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/preview/customer/requests/request-102', Preview);
    expect(harness.routeNativeElement!.textContent).not.toContain('Final agreed price');
    const button = [...harness.routeNativeElement!.querySelectorAll('button')].find(e => e.textContent!.includes('Accept current quotation'))!;
    button.click(); await harness.fixture.whenStable(); harness.detectChanges();
    expect(harness.routeNativeElement!.textContent).toContain('Final agreed price');
    expect(TestBed.inject(PreviewStore).requests().find(r => r.id === 'request-102')?.status).toBe('CONFIRMED');
  });
  it('updates deep-linked request and chat context when the router reuses a screen', async () => {
    const harness = await RouterTestingHarness.create();
    let page = await harness.navigateByUrl('/preview/customer/requests/request-101', Preview);
    expect(page.request()?.id).toBe('request-101');
    page = await harness.navigateByUrl('/preview/customer/requests/request-102', Preview);
    expect(page.request()?.id).toBe('request-102');
    page = await harness.navigateByUrl('/preview/customer/messages?booking=request-101', Preview);
    page.text = 'Unsent draft';
    page = await harness.navigateByUrl('/preview/customer/messages?booking=request-102', Preview);
    expect(page.context).toBe('request-102'); expect(page.text).toBe('');
    expect(harness.routeNativeElement!.textContent).toContain('seasonal lilies');
  });
});
