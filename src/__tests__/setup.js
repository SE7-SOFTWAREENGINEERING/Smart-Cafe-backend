// Global test setup
beforeAll(() => {
  // Suppress console logs during tests unless DEBUG=true
  if (process.env.DEBUG !== 'true') {
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
  }
});

afterAll(() => {
  jest.restoreAllMocks();
});
