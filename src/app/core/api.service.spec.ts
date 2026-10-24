import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../environments/environment';
import { ApiService } from './api.service';
import { authInterceptor } from './auth.interceptor';
import { session } from './session';

describe('backend file uploads', () => {
  let api: ApiService;
  let backend: HttpTestingController;
  beforeEach(() => {
    session.set({ accessToken: 'access', refreshToken: 'refresh' });
    TestBed.configureTestingModule({ providers: [
      provideHttpClient(withInterceptors([authInterceptor])), provideHttpClientTesting(),
    ] });
    api = TestBed.inject(ApiService);
    backend = TestBed.inject(HttpTestingController);
  });
  afterEach(() => { backend.verify(); session.clear(); });

  it('sends the file and purpose to the backend with authentication and returns the upload ID', async () => {
    const file = new File(['document'], 'identity.pdf', { type: 'application/pdf' });
    const result = api.upload(file, 'ID_DOCUMENT');
    const req = backend.expectOne(`${environment.apiUrl}/media/uploads`);
    expect(req.request.method).toBe('POST');
    expect(req.request.headers.get('Authorization')).toBe('Bearer access');
    expect(req.request.headers.has('Content-Type')).toBeFalse();
    const body = req.request.body as FormData;
    expect(body.get('purpose')).toBe('ID_DOCUMENT');
    const uploaded = body.get('file') as File;
    expect(uploaded.name).toBe('identity.pdf');
    expect(uploaded.type).toBe('application/pdf');
    expect(uploaded.size).toBe(file.size);
    req.flush({ uploadId: 'upload-id' }, { status: 201, statusText: 'Created' });
    expect(await result).toBe('upload-id');
    backend.expectNone(request => request.method === 'PUT');
  });

  it('propagates rejected uploads without sending any storage request', async () => {
    const result = api.upload(new File(['large'], 'photo.jpg'), 'AVATAR');
    const rejected = expectAsync(result).toBeRejected();
    backend.expectOne(`${environment.apiUrl}/media/uploads`).flush({}, { status: 413, statusText: 'Too Large' });
    await rejected;
  });
});
