import { HttpErrorResponse } from '@angular/common/http';
import { sessionErrorMessage } from './session-error';

describe('session restoration diagnostics', () => {
  it('distinguishes a successful HTML response from a backend outage', () => {
    expect(sessionErrorMessage(new HttpErrorResponse({ status: 200, error: new SyntaxError('Invalid JSON') }))).toContain('development proxy');
    expect(sessionErrorMessage(new HttpErrorResponse({ status: 502 }))).toContain('HTTP 502');
  });
  it('distinguishes connectivity, missing endpoints and forbidden accounts', () => {
    expect(sessionErrorMessage(new HttpErrorResponse({ status: 0 }))).toContain('Cannot reach');
    expect(sessionErrorMessage(new HttpErrorResponse({ status: 404 }))).toContain('endpoint was not found');
    expect(sessionErrorMessage(new HttpErrorResponse({ status: 403 }))).toContain('refused access');
  });
});
