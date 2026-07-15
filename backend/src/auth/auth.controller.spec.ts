import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RolesGuard } from './guards/roles.guard';
import { Reflector } from '@nestjs/core';

const mockAuthService = () => ({
  login: jest.fn(),
  refreshToken: jest.fn(),
  logout: jest.fn(),
  forgotPassword: jest.fn(),
  resetPassword: jest.fn(),
  changePassword: jest.fn(),
});

const mockRequest = (overrides = {}) => ({
  headers: { 'user-agent': 'jest-test' },
  socket: { remoteAddress: '127.0.0.1' },
  ...overrides,
});

const mockUser = () => ({
  id: 'user-uuid-1',
  email: 'test@example.com',
  role: 'sales_rep',
  companyId: 'company-uuid-1',
  fullName: 'Test User',
});

describe('AuthController', () => {
  let controller: AuthController;
  let authService: ReturnType<typeof mockAuthService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        { provide: AuthService, useFactory: mockAuthService },
        { provide: Reflector, useValue: { getAllAndOverride: jest.fn() } },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<AuthController>(AuthController);
    authService = module.get(AuthService);
  });

  afterEach(() => jest.clearAllMocks());

  // ── login ──────────────────────────────────────────────────────────────────

  describe('login()', () => {
    it('delegates to AuthService.login() and returns the result', async () => {
      const expected = { accessToken: 'tok', refreshToken: 'ref', tokenType: 'Bearer', expiresIn: 900, user: mockUser() };
      authService.login.mockResolvedValue(expected);

      const req = mockRequest() as any;
      const result = await controller.login(
        { email: 'test@example.com', password: 'ValidPass1!' },
        req,
      );

      expect(authService.login).toHaveBeenCalledWith(
        { email: 'test@example.com', password: 'ValidPass1!' },
        '127.0.0.1',
        'jest-test',
      );
      expect(result).toEqual(expected);
    });

    it('extracts the first IP from x-forwarded-for', async () => {
      authService.login.mockResolvedValue({});
      const req = mockRequest({
        headers: { 'x-forwarded-for': '10.0.0.1, 192.168.1.1', 'user-agent': 'ua' },
      }) as any;
      await controller.login({ email: 'e@e.com', password: 'P1!' }, req);
      expect(authService.login).toHaveBeenCalledWith(
        expect.anything(),
        '10.0.0.1',
        'ua',
      );
    });
  });

  // ── refresh ────────────────────────────────────────────────────────────────

  describe('refresh()', () => {
    it('delegates to AuthService.refreshToken() and returns the result', async () => {
      const expected = { accessToken: 'new-tok' };
      authService.refreshToken.mockResolvedValue(expected);

      const result = await controller.refresh(
        { refreshToken: 'raw', userId: 'user-uuid-1' },
        mockRequest() as any,
      );

      expect(authService.refreshToken).toHaveBeenCalledTimes(1);
      expect(result).toEqual(expected);
    });
  });

  // ── logout ─────────────────────────────────────────────────────────────────

  describe('logout()', () => {
    it('calls AuthService.logout() with user id from JWT', async () => {
      authService.logout.mockResolvedValue({ message: 'Logged out successfully' });

      const result = await controller.logout(
        { refreshToken: 'raw' },
        mockUser() as any,
      );

      expect(authService.logout).toHaveBeenCalledWith(
        { refreshToken: 'raw' },
        'user-uuid-1',
      );
      expect(result.message).toContain('Logged out');
    });
  });

  // ── forgotPassword ─────────────────────────────────────────────────────────

  describe('forgotPassword()', () => {
    it('calls AuthService.forgotPassword() and returns an opaque message', async () => {
      authService.forgotPassword.mockResolvedValue({
        message: 'If that email is registered, a reset link has been sent',
      });

      const result = await controller.forgotPassword({ email: 'test@example.com' });

      expect(authService.forgotPassword).toHaveBeenCalledWith({ email: 'test@example.com' });
      expect(result.message).toMatch(/reset link has been sent/i);
    });
  });

  // ── resetPassword ──────────────────────────────────────────────────────────

  describe('resetPassword()', () => {
    it('delegates to AuthService.resetPassword()', async () => {
      authService.resetPassword.mockResolvedValue({ message: 'Password reset successfully.' });

      const dto = { userId: 'user-uuid-1', token: 'raw-token', newPassword: 'NewPass1!' };
      const result = await controller.resetPassword(dto as any);

      expect(authService.resetPassword).toHaveBeenCalledWith(dto);
      expect(result.message).toMatch(/reset successfully/i);
    });
  });

  // ── changePassword ─────────────────────────────────────────────────────────

  describe('changePassword()', () => {
    it('calls AuthService.changePassword() with authenticated user id', async () => {
      authService.changePassword.mockResolvedValue({ message: 'Password changed successfully.' });

      const dto = { currentPassword: 'Old1!', newPassword: 'New1!' };
      const result = await controller.changePassword(dto as any, mockUser() as any);

      expect(authService.changePassword).toHaveBeenCalledWith(dto, 'user-uuid-1');
      expect(result.message).toMatch(/changed successfully/i);
    });
  });
});
