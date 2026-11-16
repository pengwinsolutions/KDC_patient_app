/* Lazy requires keep this module free of import cycles (it is loaded by services/index.ts). */
/**
 * Live sync for the care area:
 * - 'doctors': booking rules, specialties, a first page of the directory and the saved doctors
 * - 'appointments': every appointment (upcoming, completed, cancelled)
 * - 'prescriptions': every issued prescription, with the documents
 */
import { registerDomain } from './sync'

const doctors = () => require('./doctors') as typeof import('./doctors')
const appts = () => require('./appointments') as typeof import('./appointments')
const rx = () => require('./prescriptions') as typeof import('./prescriptions')
const discovery = () => (require('../../store/discovery') as typeof import('../../store/discovery')).useDiscovery
const appointments = () => (require('../../store/appointments') as typeof import('../../store/appointments')).useAppointments

registerDomain({
  name: 'doctors',
  async load() {
    const d = doctors()
    const [, , , saved] = await Promise.all([d.loadCareRules(), d.loadSpecialties(), d.loadFeatured(), d.loadSaved()])
    discovery().setState({ savedDoctorIds: saved })
  },
  clear() {
    discovery().getState().reset()
  },
})

registerDomain({
  name: 'appointments',
  async load() {
    appointments().setState({ items: await appts().listAppointments() })
  },
  clear() {
    appointments().getState().reset()
  },
})

registerDomain({
  name: 'prescriptions',
  async load() {
    await rx().loadPrescriptions()
  },
  clear() {
    rx().clearPrescriptions()
  },
})
