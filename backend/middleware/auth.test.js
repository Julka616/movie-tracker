const auth = require('./auth');
const jwt = require('jsonwebtoken');

jest.mock('jsonwebtoken');

describe('Auth Middleware - Test jednostkowy', () => {
  let req, res, next;

  beforeEach(() => {
    req = {
      header: jest.fn(),
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    next = jest.fn();
    jest.clearAllMocks();
  });

  test('weryfikuje token JWT z nagłówka Bearer i autoryzuje użytkownika', () => {
    const mockToken = 'valid-jwt-token';
    const mockDecoded = { user: { id: 'user123', email: 'test@example.com' } };

    req.header.mockReturnValue(`Bearer ${mockToken}`);
    jwt.verify.mockReturnValue(mockDecoded);

    auth(req, res, next);

    expect(jwt.verify).toHaveBeenCalledWith(mockToken, expect.any(String));
    expect(req.user).toEqual(mockDecoded.user);
    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });
});
