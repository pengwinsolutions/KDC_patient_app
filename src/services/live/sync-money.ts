/** Registers the money areas with the live sync: membership (plans, status, savings) and payments (history, summary, saved methods). */
import { useMembership } from '../../store/membership'
import { usePayments } from '../../store/payments'
import { loadMembership, loadPlans } from './membership'
import { loadMethods, loadPayments } from './payments'
import { registerDomain } from './sync'

registerDomain({
  name: 'membership',
  load: async () => {
    await Promise.all([loadPlans(), loadMembership()])
  },
  clear: () => useMembership.getState().reset(),
})

registerDomain({
  name: 'payments',
  load: async () => {
    await Promise.all([loadPayments(), loadMethods()])
  },
  clear: () => usePayments.getState().reset(),
})
