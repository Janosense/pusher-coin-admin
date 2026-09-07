import api from './api.js'

/**
 * Chat moderation (Phase 6 §1).
 *
 * Hiding a message never deletes the row — the author, body, IP, and
 * timestamp survive so a complaint can still be reviewed. `mute` is
 * account-wide and expires on its own; `minutes: 0` lifts it.
 */

const mapMessage = (m) => ({
  id: m.id,
  roomId: m.room_id,
  roomName: m.room_name || `#${m.room_id}`,
  userId: m.user_id,
  nickname: m.nickname,
  body: m.body,
  status: m.status,
  ip: m.ip,
  mutedUntil: m.muted_until || null,
  createdAt: m.created_at
})

export const adminChatService = {
  async listMessages({ roomId = '', userId = '', status = '', search = '', page = 1, perPage = 20 } = {}) {
    const params = { page, per_page: perPage }
    if (roomId) params.room_id = roomId
    if (userId) params.user_id = userId
    if (status) params.status = status
    if (search) params.search = search

    const response = await api.get('/admin/chat/messages', { params })
    return {
      items: (response.data?.items || []).map(mapMessage),
      total: response.data?.total || 0,
      page: response.data?.page || page,
      perPage: response.data?.per_page || perPage
    }
  },

  async setStatus(id, status) {
    const response = await api.patch(`/admin/chat/messages/${id}`, { status })
    return mapMessage(response.data)
  },

  async mute(userId, minutes) {
    const response = await api.post('/admin/chat/mute', {
      user_id: userId,
      minutes
    })
    return {
      userId: response.data?.user_id,
      mutedUntil: response.data?.muted_until || null
    }
  }
}

export default adminChatService
