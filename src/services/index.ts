import { mockAuthService, type AuthService } from './auth'
import { mockDoctorsService, type DoctorsService } from './doctors'
import { mockAppointmentsService, type AppointmentsService } from './appointments'
import { mockPaymentsService, type PaymentsService } from './payments'
import { mockPharmacyService, type PharmacyService } from './pharmacy'
import { mockDiagnosticsService, type DiagnosticsService } from './diagnostics'
import { mockDocumentsService, type DocumentsService } from './documents'
import {
  mockAddressesService,
  mockFamilyService,
  mockHelpService,
  mockMembershipService,
  mockProfileService,
  type AddressesService,
  type FamilyService,
  type HelpService,
  type MembershipService,
  type ProfileService,
} from './account'
import { LIVE } from './config'
import { liveAuthService } from './live/auth'
import './live/sync-care'
import './live/sync-money'
import { liveAddressesService, liveFamilyService, liveProfileService } from './live/account'

export interface Services {
  auth: AuthService
  doctors: DoctorsService
  appointments: AppointmentsService
  payments: PaymentsService
  pharmacy: PharmacyService
  diagnostics: DiagnosticsService
  documents: DocumentsService
  family: FamilyService
  addresses: AddressesService
  profile: ProfileService
  membership: MembershipService
  help: HelpService
}

/**
 * The single switch point. Live builds use `services/live/*` (the KDC+ backend) where a
 * service applies; the live flows (`services/live/flows-*.ts`) call the backend directly
 * where the mock interfaces don't fit a server that decides prices, slots and stock.
 */
export const services: Services = {
  auth: LIVE ? liveAuthService : mockAuthService,
  doctors: mockDoctorsService,
  appointments: mockAppointmentsService,
  payments: mockPaymentsService,
  pharmacy: mockPharmacyService,
  diagnostics: mockDiagnosticsService,
  documents: mockDocumentsService,
  family: LIVE ? liveFamilyService : mockFamilyService,
  addresses: LIVE ? liveAddressesService : mockAddressesService,
  profile: LIVE ? liveProfileService : mockProfileService,
  membership: mockMembershipService,
  help: mockHelpService,
}
