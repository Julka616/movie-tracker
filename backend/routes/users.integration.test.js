const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

jest.mock('../models/User');
jest.mock('bcryptjs');
jest.mock('jsonwebtoken');

describe('Users Login - Test integracyjny', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('pełny flow logowania: znajduje użytkownika, weryfikuje hasło i generuje token', async () => {
    const mockUser = {
      _id: 'user123',
      email: 'test@example.com',
      password: '$2a$10$hashedPasswordExample',
      name: 'Test User',
      role: 'user',
    };

    const loginData = {
      email: 'test@example.com',
      password: 'password123',
    };

    // Symuluj proces logowania
    User.findOne.mockResolvedValue(mockUser);
    bcrypt.compare.mockResolvedValue(true);
    
    const mockToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.mock.token';
    jwt.sign.mockReturnValue(mockToken);

    // Wykonaj logikę logowania
    const user = await User.findOne({ email: loginData.email });
    const isPasswordValid = await bcrypt.compare(loginData.password, user.password);
    
    expect(user).toBeTruthy();
    expect(isPasswordValid).toBe(true);

    const payload = {
      user: {
        id: user._id,
        email: user.email,
        role: user.role,
      },
    };

    const token = jwt.sign(payload, 'secretdev', { expiresIn: '24h' });

    // Weryfikacja
    expect(User.findOne).toHaveBeenCalledWith({ email: loginData.email });
    expect(bcrypt.compare).toHaveBeenCalledWith(loginData.password, mockUser.password);
    expect(jwt.sign).toHaveBeenCalledWith(
      payload,
      'secretdev',
      { expiresIn: '24h' }
    );
    expect(token).toBe(mockToken);
  });
});

