import api from './api.js'

const mapWindow = (w) => (w ? { startAt: w.start_at, endAt: w.end_at } : null)

const mapRoom = (r) => ({
  id: r.id,
  name: r.name,
  status: r.status,
  themeSongUrl: r.theme_song_url || '',
  streamUrl: r.stream_url || '',
  machineId: r.machine_id || '',
  postStatus: r.post_status || 'publish',
  currentWindow: mapWindow(r.current_window),
  nextWindow: mapWindow(r.next_window)
})

const mapRule = (rule) => ({
  weekday: rule.weekday,
  startTime: rule.start_time,
  endTime: rule.end_time,
  recurrence: rule.recurrence,
  onceDate: rule.once_date || null
})

const denormaliseRoom = (input) => {
  const out = {}
  if ('name' in input) out.name = input.name
  if ('status' in input) out.status = input.status
  if ('streamUrl' in input) out.stream_url = input.streamUrl || ''
  if ('themeSongUrl' in input) out.theme_song_url = input.themeSongUrl || ''
  if ('machineId' in input) out.machine_id = input.machineId || ''
  return out
}

const denormaliseRule = (rule) => ({
  weekday: rule.weekday,
  start_time: rule.startTime,
  end_time: rule.endTime,
  recurrence: rule.recurrence,
  once_date: rule.recurrence === 'once' ? rule.onceDate : null
})

export const adminRoomsService = {
  async list({ page = 1, perPage = 50 } = {}) {
    const response = await api.get('/admin/rooms', { params: { page, per_page: perPage } })
    return {
      items: (response.data?.items || []).map(mapRoom),
      total: response.data?.total || 0,
      page: response.data?.page || page,
      perPage: response.data?.per_page || perPage
    }
  },

  async get(id) {
    const response = await api.get(`/admin/rooms/${id}`)
    return mapRoom(response.data)
  },

  async create(input) {
    const response = await api.post('/admin/rooms', denormaliseRoom(input))
    return mapRoom(response.data)
  },

  async update(id, input) {
    const response = await api.put(`/admin/rooms/${id}`, denormaliseRoom(input))
    return mapRoom(response.data)
  },

  async remove(id) {
    const response = await api.delete(`/admin/rooms/${id}`)
    return response.data
  },

  async getSchedule(id) {
    const response = await api.get(`/rooms/${id}/schedule`)
    return {
      rules: (response.data?.rules || []).map(mapRule),
      nextWindow: mapWindow(response.data?.next_window)
    }
  },

  async replaceSchedule(id, rules) {
    const response = await api.put(`/admin/rooms/${id}/schedule`, {
      rules: rules.map(denormaliseRule)
    })
    return {
      rules: (response.data?.rules || []).map(mapRule),
      nextWindow: mapWindow(response.data?.next_window)
    }
  }
}

export default adminRoomsService
