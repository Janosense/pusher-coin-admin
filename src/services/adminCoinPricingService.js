import api from './api.js'

export const adminCoinPricingService = {
  async get() {
    const response = await api.get('/admin/coin-pricing')
    return {
      default: response.data?.default || '40.00',
      min: response.data?.min || '10.00',
      max: response.data?.max || '500.00'
    }
  },

  async update({ default: defaultPrice, min, max }) {
    const response = await api.put('/admin/coin-pricing', {
      default: defaultPrice,
      min,
      max
    })
    return {
      default: response.data?.default,
      min: response.data?.min,
      max: response.data?.max
    }
  }
}

export default adminCoinPricingService
