import { fakeAsync, flushMicrotasks, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { AuthService } from '../../core/auth.service';
import { BusinessProfileEditor } from './business-profile';
import { environment } from '../../../environments/environment';
import { ProviderProfile } from '../provider-profile/provider-profile';
import { MediaItem } from '../../core/models';

describe('live business media', () => {
  let backend: HttpTestingController;
  beforeEach(() => { TestBed.configureTestingModule({ providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting(), { provide: AuthService, useValue: { user: () => ({ accountType: 'BUSINESS', businessId: 'business' }) } }] }); backend = TestBed.inject(HttpTestingController); });
  afterEach(() => backend.verify());
  it('retains the uploaded file ID after an attach failure and retries without uploading twice', fakeAsync(() => {
    const fixture = TestBed.createComponent(BusinessProfileEditor); const component = fixture.componentInstance;
    component.file = new File(['image'], 'work.jpg', { type: 'image/jpeg' }); component.mediaDraft.caption = 'My work';
    component.attach();
    backend.expectOne(environment.apiUrl + '/media/uploads').flush({ uploadId: 'u', status: 'UPLOADED', contentType: 'image/jpeg', sizeBytes: 5 }, { status: 201, statusText: 'Created' });
    flushMicrotasks();
    backend.expectOne(environment.apiUrl + '/business/media').flush({ detail: 'Temporary failure' }, { status: 503, statusText: 'Unavailable' });
    flushMicrotasks();
    expect(component.uploadId).toBe('u'); expect(component.file?.name).toBe('work.jpg'); expect(component.error()).toContain('Temporary failure');
    component.attach(); backend.expectNone(environment.apiUrl + '/media/uploads');
    const attach = backend.expectOne(environment.apiUrl + '/business/media'); expect(attach.request.body.uploadId).toBe('u');
    attach.flush({ id: 'm', processingState: 'PENDING', publicationState: 'DRAFT' }); flushMicrotasks();
    backend.expectOne(environment.apiUrl + '/business/media?page=0&size=24').flush({ content: [], totalPages: 0 }); flushMicrotasks();
    expect(component.uploadId).toBeUndefined(); expect(component.pending()).toBeFalse(); fixture.destroy();
  }));
  it('never exposes processing, failed, draft or unknown-state media as public playable work', () => {
    const fixture = TestBed.createComponent(ProviderProfile); const component = fixture.componentInstance;
    component.media.set([
      { id: 'ready', type: 'PHOTO', processingState: 'READY', publicationState: 'PUBLISHED' },
      { id: 'draft', type: 'PHOTO', processingState: 'READY', publicationState: 'DRAFT' },
      { id: 'pending', type: 'VIDEO', processingState: 'PENDING', publicationState: 'PUBLISHED' },
      { id: 'failed', type: 'VIDEO', processingState: 'FAILED', publicationState: 'PUBLISHED' },
      { id: 'unknown', type: 'VIDEO' },
    ] as MediaItem[]);
    expect(component.published().map(m => m.id)).toEqual(['ready']); fixture.destroy();
  });
});
