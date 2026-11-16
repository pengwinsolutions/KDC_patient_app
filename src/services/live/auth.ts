import type { AuthService } from '../auth'
import { adoptSession, request } from './http'

/**
 * Patient sign-in on the backend: a 6-digit SMS code. The first verified code creates the
 * account; the profile is completed afterwards (PATCH /patient/me with consent).
 */
export const liveAuthService: AuthService = {
  async requestOtp(mobile) {
    const r = await request<{ resendAfterSeconds: number }>('POST', 'auth/otp/request', { accountType: 'patient', mobile }, { auth: false })
    return { resendAfterSeconds: r.resendAfterSeconds }
  },
  async verifyOtp(mobile, code) {
    const pair = await request<{ accessToken: string; refreshToken: string }>(
      'POST',
      'auth/otp/verify',
      { accountType: 'patient', mobile, code },
      { auth: false },
    )
    await adoptSession(pair)
    return { token: pair.accessToken, mobile }
  },
}

