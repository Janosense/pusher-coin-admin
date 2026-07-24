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
  },

  async getBonusMap() {
    const response = await api.get('/admin/machine/bonus-map')
    return {
      map: response.data?.map || {},
      relayCoinCount: Number(response.data?.relay_coin_count || 0)
    }
  },

  async updateBonusMap({ map, relayCoinCount }) {
    const response = await api.put('/admin/machine/bonus-map', {
      map,
      relay_coin_count: Number(relayCoinCount) || 0
    })
    return {
      map: response.data?.map || {},
      relayCoinCount: Number(response.data?.relay_coin_count || 0)
    }
  }
}

export default adminMachineService
