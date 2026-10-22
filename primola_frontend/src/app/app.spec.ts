import { describe, it, expect } from 'vitest';
import { App } from './app';

describe('App Component', () => {
  it('should instantiate with default title', () => {
    const app = new App();
    expect(app.title).toBe('primola_frontend');
  });
});
