import { HttpErrorResponse } from '@angular/common/http';
import { Problem } from './models';
export function problemMessage(error: unknown, fallback = 'Could not complete this request. Please try again.'): string {
  if (!(error instanceof HttpErrorResponse) || !error.error || typeof error.error !== 'object') return fallback;
  const problem = error.error as Problem;
  return [problem.detail || problem.title, ...(problem.errors || []).map(e => `${e.field}: ${e.message}`)].filter(Boolean).join(' · ') || fallback;
}
