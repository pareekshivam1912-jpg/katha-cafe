import { describe, it, expect, vi } from 'vitest';
import { healthRouter } from '../src/routes/health.js';
import { Request, Response } from 'express';

describe('Health Router Unit Tests (no TCP socket required)', () => {
  it('GET /health returns 200 with service metadata', () => {
    // Find the /health route handler
    const route = healthRouter.stack.find((layer) => layer.route?.path === '/health');
    expect(route).toBeDefined();

    const handler = route?.route?.stack[0]?.handle;
    expect(handler).toBeTypeOf('function');

    const req = {} as Request;
    const jsonMock = vi.fn();
    const statusMock = vi.fn().mockReturnValue({ json: jsonMock });
    const res = { status: statusMock } as unknown as Response;

    handler(req, res, () => {});

    expect(statusMock).toHaveBeenCalledWith(200);
    expect(jsonMock).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'ok',
        service: 'katha-cafe-api',
        version: '0.1.0',
      })
    );
  });
});
