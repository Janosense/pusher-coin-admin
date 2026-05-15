import api from './api.js'

const mapState = (s) => ({
  online: !!s?.online,
  powerOn: s?.power_on,
  coinCount: s?.coin_count,
  lastBonusNumber: s?.last_bonus_number,
  lightState: s?.light_state,
  relayClosed: s?.relay_closed
})

export const adminMachineService = {
  async getState() {
    const response = await api.get('/admin/machine/state')
    return mapState(response.data)
  },

  async setPower(on) {
    const response = await api.post('/admin/machine/power', { on })
    return { on: !!response.data?.on }
  }
}

export default adminMachineService
