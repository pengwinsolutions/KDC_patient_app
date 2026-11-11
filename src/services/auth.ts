import { delay, rejectAfter } from './latency'

export interface AuthSession {
  token: string
  mobile: string
}

export interface AuthService {
  requestOtp(mobile: string): Promise<{ resendAfterSeconds: number }>
  verifyOtp(mobile: string, code: string): Promise<AuthSession>
}

export const INVALID_OTP = '000000'

export class InvalidOtpError extends Error {
  constructor() {
    super('That code is incorrect. Check your SMS and try again.')
    this.name = 'InvalidOtpError'
  }
}

export const mockAuthService: AuthService = {
  requestOtp: () => delay({ resendAfterSeconds: 24 }),
  verifyOtp: (mobile, code) =>
    code === INVALID_OTP
      ? rejectAfter(new InvalidOtpError())
      : delay({ token: `mock-token-${mobile}-${Date.now()}`, mobile }),
}
