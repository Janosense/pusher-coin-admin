import api from './api.js'

const mapItem = (r) => ({
  id: r.id,
  userId: r.user_id,
  userEmail: r.user_email,
  userNickname: r.user_nickname,
  amountMoney: r.amount_money,
  amountCoins: Number(r.amount_coins || 0),
  status: r.status,
  notes: r.notes || '',
  createdAt: r.created_at,
  settledAt: r.settled_at,
  consumedLots: (r.consumed_lots || []).map((l) => ({
    qty: Number(l.qty || 0),
    unitPrice: l.unit_price
  }))
})

export const adminWithdrawalsService = {
  async list({ status = 'pending', page = 1, perPage = 50 } = {}) {
    const response = await api.get('/admin/withdrawals', {
      params: { status, page, per_page: perPage }
    })
    return {
      items: (response.data?.items || []).map(mapItem),
      total: response.data?.total || 0,
      page: response.data?.page || page,
      perPage: response.data?.per_page || perPage
    }
  },

  async approve(id, { notes } = {}) {
    const response = await api.post(`/admin/withdrawals/${id}/approve`, { notes })
    return mapItem(response.data)
  },

  async reject(id, { notes } = {}) {
    const response = await api.post(`/admin/withdrawals/${id}/reject`, { notes })
    return mapItem(response.data)
  }
}

export default adminWithdrawalsService
