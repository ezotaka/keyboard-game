// Simple test that just validates the Application class exists and can be imported
describe('Application (Simple)', () => {
    it('should be able to import Application class', async () => {
        const { Application } = await import('../main');
        expect(Application).toBeDefined();
        expect(typeof Application).toBe('function');
    });

    it('should create application instance without initialization', () => {
        const { Application } = require('../main');
        const application = new Application();
        expect(application).toBeInstanceOf(Application);
    });
});