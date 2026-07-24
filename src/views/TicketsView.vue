<script setup>
import { ref, computed, onMounted } from 'vue'
import AdminLayout from '@/components/AdminLayout.vue'
import adminSupportService from '@/services/adminSupportService.js'

const STATUSES = ['open', 'in_progress', 'resolved', 'closed']

const filters = [
  { value: '', label: 'All' },
  { value: 'open', label: 'Open' },
  { value: 'in_progress', label: 'In progress' },
  { value: 'resolved', label: 'Resolved' },
  { value: 'closed', label: 'Closed' }
]

const items = ref([])
const total = ref(0)
const page = ref(1)
const perPage = ref(20)
const statusFilter = ref('open')
const search = ref('')

const isLoading = ref(false)
const error = ref(null)
const expandedId = ref(null)
const savingId = ref(null)

const pageCount = computed(() => Math.max(1, Math.ceil(total.value / perPage.value)))

const fetchList = async (overrides = {}) => {
  if (overrides.status !== undefined) {
    statusFilter.value = overrides.status
    page.value = 1
  }
  if (overrides.page) page.value = overrides.page

  isLoading.value = true
  error.value = null
  try {
    const result = await adminSupportService.listTickets({
      status: statusFilter.value,
      search: search.value,
      page: page.value,
      perPage: perPage.value
    })
    items.value = result.items
    total.value = result.total
  } catch (err) {
    error.value = err.response?.data?.message || err.message
  } finally {
    isLoading.value = false
  }
}

const onSearch = () => fetchList({ page: 1 })

const changeStatus = async (ticket, status) => {
  if (ticket.status === status) return
  savingId.value = ticket.id
  error.value = null
  try {
    const updated = await adminSupportService.updateTicketStatus(ticket.id, status)
    // Drop the row when it no longer matches the active filter — leaving
    // a resolved ticket sitting in the "Open" list reads as a failed save.
    if (statusFilter.value && updated.status !== statusFilter.value) {
      items.value = items.value.filter((t) => t.id !== updated.id)
      total.value = Math.max(0, total.value - 1)
    } else {
      items.value = items.value.map((t) => (t.id === updated.id ? updated : t))
    }
  } catch (err) {
    error.value = err.response?.data?.message || err.message
  } finally {
    savingId.value = null
  }
}

const toggleExpanded = (id) => {
  expandedId.value = expandedId.value === id ? null : id
}

const formatDate = (value) => (value ? String(value).replace('T', ' ').slice(0, 16) : '—')

onMounted(fetchList)
</script>

<template>
  <AdminLayout>
    <div class="tickets">
      <div class="tickets__header">
        <h2>Support tickets</h2>
        <RouterLink class="tickets__subjects-link" :to="{ name: 'support-subjects' }">
          Manage subjects
        </RouterLink>
        <div class="tickets__filters">
          <button
            v-for="f in filters"
            :key="f.value"
            :class="{ active: statusFilter === f.value }"
            @click="fetchList({ status: f.value })"
          >
            {{ f.label }}
          </button>
        </div>
      </div>

      <form class="tickets__search" @submit.prevent="onSearch">
        <input v-model="search" type="search" placeholder="Search email or message…" />
        <button type="submit" :disabled="isLoading">Search</button>
      </form>

      <p v-if="error" class="tickets__error">{{ error }}</p>

      <table v-if="items.length > 0" class="tickets__table">
        <thead>
          <tr>
            <th>From</th>
            <th>Subject</th>
            <th>Received</th>
            <th>Status</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          <template v-for="ticket in items" :key="ticket.id">
            <tr>
              <td>
                <div class="cell--mono">{{ ticket.email }}</div>
                <span class="badge" :class="ticket.emailVerified ? 'badge--ok' : 'badge--warn'">
                  {{ ticket.emailVerified ? 'verified' : 'unverified' }}
                </span>
                <span v-if="!ticket.userId" class="badge badge--warn">guest</span>
              </td>
              <td>{{ ticket.subjectLabel }}</td>
              <td class="cell--mono">{{ formatDate(ticket.createdAt) }}</td>
              <td>
                <select
                  :value="ticket.status"
                  :disabled="savingId === ticket.id"
                  @change="changeStatus(ticket, $event.target.value)"
                >
                  <option v-for="s in STATUSES" :key="s" :value="s">{{ s }}</option>
                </select>
              </td>
              <td class="cell--actions">
                <button @click="toggleExpanded(ticket.id)">
                  {{ expandedId === ticket.id ? 'Hide' : 'Read' }}
                </button>
                <a :href="`mailto:${ticket.email}?subject=Re: ${ticket.subjectLabel}`">Reply</a>
              </td>
            </tr>
            <tr v-if="expandedId === ticket.id" class="tickets__detail">
              <td colspan="5">
                <p class="tickets__message">{{ ticket.description }}</p>
                <p class="tickets__meta">
                  <span>IP {{ ticket.ip || '—' }}</span>
                  <span>{{ ticket.userAgent || '—' }}</span>
                  <span>Updated {{ formatDate(ticket.updatedAt) }}</span>
                </p>
              </td>
            </tr>
          </template>
        </tbody>
      </table>

      <p v-else-if="!isLoading" class="tickets__empty">No tickets here.</p>

      <div v-if="pageCount > 1" class="tickets__pagination">
        <button :disabled="page <= 1" @click="fetchList({ page: page - 1 })">Prev</button>
        <span>Page {{ page }} of {{ pageCount }}</span>
        <button :disabled="page >= pageCount" @click="fetchList({ page: page + 1 })">Next</button>
      </div>
    </div>
  </AdminLayout>
</template>

<style scoped>
.tickets__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
  gap: 16px;
  flex-wrap: wrap;
}

.tickets__subjects-link {
  margin-right: auto;
  color: var(--primary);
  font-size: 13px;
}

.tickets__filters {
  display: flex;
  column-gap: 8px;
}

.tickets__filters button {
  padding: 6px 12px;
  background: transparent;
  border: 1px solid var(--border);
  border-radius: 6px;
  color: var(--text-muted);
  font-size: 13px;
}

.tickets__filters button.active {
  border-color: var(--primary);
  color: var(--primary);
}

.tickets__search {
  display: flex;
  column-gap: 8px;
  margin-bottom: 16px;
}

.tickets__search input {
  flex-grow: 1;
  max-width: 320px;
  padding: 8px 10px;
  background: var(--surface-elevated);
  border: 1px solid var(--border);
  border-radius: 6px;
  color: var(--text);
}

.tickets__error {
  margin-bottom: 12px;
  color: #ff8b95;
  font-size: 13px;
}

.tickets__table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
}

.tickets__table th,
.tickets__table td {
  padding: 10px 12px;
  border-bottom: 1px solid var(--border);
  text-align: left;
  vertical-align: top;
}

.tickets__table th {
  color: var(--text-muted);
  font-weight: 500;
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.cell--mono {
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 12px;
}

.cell--actions {
  display: flex;
  align-items: center;
  column-gap: 8px;
  white-space: nowrap;
}

.cell--actions a {
  color: var(--primary);
  font-size: 13px;
}

.badge {
  display: inline-block;
  margin-right: 6px;
  padding: 2px 8px;
  border-radius: 999px;
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.badge--ok {
  background: rgba(40, 167, 69, 0.15);
  color: #7ddc9a;
}

.badge--warn {
  background: rgba(255, 193, 7, 0.15);
  color: #ffd970;
}

.tickets__detail td {
  background: var(--surface);
}

.tickets__message {
  margin: 0 0 8px;
  white-space: pre-wrap;
  line-height: 1.5;
}

.tickets__meta {
  display: flex;
  column-gap: 16px;
  margin: 0;
  color: var(--text-muted);
  font-size: 12px;
  flex-wrap: wrap;
}

.tickets__empty {
  color: var(--text-muted);
  font-size: 13px;
}

.tickets__pagination {
  display: flex;
  align-items: center;
  column-gap: 12px;
  margin-top: 16px;
  font-size: 13px;
  color: var(--text-muted);
}
</style>
