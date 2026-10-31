import { HttpErrorResponse } from '@angular/common/http';
import { problemMessage } from './problem';

export function sessionErrorMessage(error: unknown): string {
  if (!(error instanceof HttpErrorResponse)) return 'Could not verify your saved session. Please retry or sign in again.';
  if (error.status === 0) return 'Cannot reach the account service. Check that the backend is running and the API connection is available.';
  if (error.status === 200) return 'The account service returned an unexpected response. Check the API address or development proxy.';
  if (error.status === 404) return 'The account service endpoint was not found (HTTP 404). Check the API address and proxy configuration.';
  if (error.status === 403) return 'The server refused access to your account (HTTP 403). Sign in again or check backend permissions.';
  if (error.status >= 500) return `The account service is unavailable (HTTP ${error.status}). Check the backend and retry.`;
  return problemMessage(error, `Could not verify your saved session (HTTP ${error.status}). Please retry or sign in again.`);
}
