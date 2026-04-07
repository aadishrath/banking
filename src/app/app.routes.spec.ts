import { routes } from './app.routes';

describe('app routes', () => {
  it('defines the expected top-level routes', () => {
    expect(routes.map((route) => route.path)).toEqual(['login', '', '**']);
  });

  it('redirects the authenticated shell default child to dashboard', () => {
    const shellRoute = routes.find((route) => route.path === '')!;
    const defaultChild = shellRoute.children?.find((route) => route.path === '');
    expect(defaultChild?.redirectTo).toBe('dashboard');
  });
});
