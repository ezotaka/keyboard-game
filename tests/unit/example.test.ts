// Example test to verify Jest setup
describe('Project Setup', () => {
  test('should have correct project structure', () => {
    expect(true).toBe(true);
  });

  test('should have TypeScript support', () => {
    const message: string = 'TypeScript is working';
    expect(typeof message).toBe('string');
  });
});