import api from './api.js'

const mapTicket = (r) => ({
  id: r.id,
  userId: r.user_id,
  email: r.email,
  subjectId: r.subject_id,
  subjectLabel: r.subject_label || `#${r.subject_id}`,
  description: r.description,
  emailVerified: !!r.email_verified,
  status: r.status,
  ip: r.ip,
  userAgent: r.user_agent,
  createdAt: r.created_at,
  updatedAt: r.updated_at
})

const mapSubject = (s) => ({
  id: s.id,
  label: s.label,
  hidden: !!s.hidden,
  order: Number(s.order || 0)
})

export const adminSupportService = {
  async listTickets({ status = '', search = '', page = 1, perPage = 20 } = {}) {
    const params = { page, per_page: perPage }
    if (status) params.status = status
    if (search) params.search = search

    const response = await api.get('/admin/support/tickets', { params })
    return {
      items: (response.data?.items || []).map(mapTicket),
      total: response.data?.total || 0,
      page: response.data?.page || page,
      perPage: response.data?.per_page || perPage
    }
  },

  async updateTicketStatus(id, status) {
    const response = await api.patch(`/admin/support/tickets/${id}`, { status })
    return mapTicket(response.data)
  },

  async getSubjects() {
    const response = await api.get('/admin/support/subjects')
    return (response.data?.items || []).map(mapSubject)
  },

  /**
   * Replaces the whole list — array order becomes display order, and any
   * subject missing from the payload is trashed server-side.
   */
  async replaceSubjects(subjects) {
    const response = await api.put('/admin/support/subjects', {
      items: subjects.map((s) => ({
        ...(s.id ? { id: s.id } : {}),
        label: s.label,
        hidden: !!s.hidden
      }))
    })
    return (response.data?.items || []).map(mapSubject)
  }
}

export default adminSupportService
