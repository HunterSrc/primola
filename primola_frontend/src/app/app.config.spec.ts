import { describe, it, expect } from 'vitest';
import { appConfig } from './app.config';
import { routes } from './app.routes';

describe('App Config & Routes', () => {
  it('should define appConfig with providers', () => {
    expect(appConfig).toBeDefined();
    expect(appConfig.providers.length).toBeGreaterThan(0);
  });

  it('should define expected routing table', () => {
    expect(routes).toBeDefined();
    expect(routes.some(r => r.path === 'login')).toBe(true);
    expect(routes.some(r => r.path === '')).toBe(true);
    expect(routes.some(r => r.path === '**')).toBe(true);
  });
});
