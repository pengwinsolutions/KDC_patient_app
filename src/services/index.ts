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

/** The single switch point: a NestJS client implementing `Services` replaces this object. */
export const services: Services = {
  auth: mockAuthService,
  doctors: mockDoctorsService,
  appointments: mockAppointmentsService,
  payments: mockPaymentsService,
  pharmacy: mockPharmacyService,
  diagnostics: mockDiagnosticsService,
  documents: mockDocumentsService,
  family: mockFamilyService,
  addresses: mockAddressesService,
  profile: mockProfileService,
  membership: mockMembershipService,
  help: mockHelpService,
}
