import { BusinessTimePipe } from './business-time.pipe';
describe('business-local timestamps', () => {
  it('displays UTC instants in Asia/Kolkata regardless of browser timezone', () => {
    const result = new BusinessTimePipe().transform('2030-01-01T18:45:00Z');
    expect(result).toContain('2 Jan 2030'); expect(result).toMatch(/12:15/);
  });
});
