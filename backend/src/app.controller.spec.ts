import { AppController } from './app.controller';

describe('AppController', () => {
  const controller = new AppController();

  it('getHello returns Hello World', () => {
    expect(controller.getHello()).toBe('Hello World');
  });

  it('health returns ok status', () => {
    expect(controller.health()).toEqual({ status: 'ok' });
  });
});
