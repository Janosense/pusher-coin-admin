<script setup>
import { ref, computed, onMounted } from 'vue'
import AdminLayout from '@/components/AdminLayout.vue'
import adminChatService from '@/services/adminChatService.js'
import adminRoomsService from '@/services/adminRoomsService.js'

const filters = [
  { value: '', label: 'All' },
  { value: 'visible', label: 'Visible' },
  { value: 'hidden', label: 'Hidden' }
]

// Mute presets. "Lift" is 0, which deletes the meta rather than setting
// a past timestamp, so an unmuted account carries no leftover state.
const MUTE_OPTIONS = [
  { minutes: 15, label: '15 min' },
  { minutes: 60, label: '1 hour' },
  { minutes: 1440, label: '24 hours' },
  { minutes: 0, label: 'Lift mute' }
]

const items = ref([])
const rooms = ref([])
const total = ref(0)
const page = ref(1)
const perPage = ref(20)
const statusFilter = ref('')
const roomFilter = ref('')
const search = ref('')

const isLoading = ref(false)
const error = ref(null)
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
    const result = await adminChatService.listMessages({
      status: statusFilter.value,
      roomId: roomFilter.value,
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

const toggleStatus = async (message) => {
  const next = message.status === 'hidden' ? 'visible' : 'hidden'
  savingId.value = message.id
  error.value = null
  try {
    const updated = await adminChatService.setStatus(message.id, next)
    // Drop the row when it no longer matches the active filter, the same
    // way the ticket queue does — a hidden message left sitting in the
    // "Visible" list reads as a failed save.
    if (statusFilter.value && updated.status !== statusFilter.value) {
      items.value = items.value.filter((m) => m.id !== updated.id)
      total.value = Math.max(0, total.value - 1)
    } else {
      items.value = items.value.map((m) => (m.id === updated.id ? updated : m))
    }
  } catch (err) {
    error.value = err.response?.data?.message || err.message
  } finally {
    savingId.value = null
  }
}

const muteAuthor = async (message, minutes) => {
  savingId.value = message.id
  error.value = null
  try {
    const result = await adminChatService.mute(message.userId, Number(minutes))
    // The mute is account-wide, so reflect it on every row by this author.
    items.value = items.value.map((m) =>
      m.userId === result.userId ? { ...m, mutedUntil: result.mutedUntil } : m
    )
  } catch (err) {
    error.value = err.response?.data?.message || err.message
  } finally {
    savingId.value = null
  }
}

const formatDate = (value) => (value ? String(value).replace('T', ' ').slice(0, 16) : '—')

const formatMuted = (until) => {
  if (!until) return null
  const expires = new Date(Number(until) * 1000)
  return expires > new Date() ? expires.toISOString().replace('T', ' ').slice(0, 16) : null
}

onMounted(async () => {
  try {
    rooms.value = (await adminRoomsService.list({ perPage: 50 })).items
  } catch {
    // A missing room list only costs the filter dropdown; the queue
    // itself still loads, so this is not worth surfacing as an error.
    rooms.value = []
  }
  await fetchList()
})
</script>

<template>
  <AdminLayout>
    <div class="chat">
      <div class="chat__header">
        <h2>Chat moderation</h2>
        <div class="chat__filters">
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

      <form class="chat__search" @submit.prevent="onSearch">
        <select v-model="roomFilter" @change="onSearch">
          <option value="">All rooms</option>
          <option v-for="room in rooms" :key="room.id" :value="room.id">{{ room.name }}</option>
        </select>
        <input v-model="search" type="search" placeholder="Search message text…" />
        <button type="submit" :disabled="isLoading">Search</button>
      </form>

      <p v-if="error" class="chat__error">{{ error }}</p>

      <table v-if="items.length > 0" class="chat__table">
        <thead>
          <tr>
            <th>Author</th>
            <th>Room</th>
            <th>Message</th>
            <th>Sent</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="message in items" :key="message.id" :class="{ 'is-hidden': message.status === 'hidden' }">
            <td>
              <div>{{ message.nickname }}</div>
              <span class="cell--mono">#{{ message.userId }} · {{ message.ip || '—' }}</span>
              <span v-if="formatMuted(message.mutedUntil)" class="badge badge--warn">
                muted until {{ formatMuted(message.mutedUntil) }}
              </span>
            </td>
            <td>{{ message.roomName }}</td>
            <td class="chat__body">{{ message.body }}</td>
            <td class="cell--mono">{{ formatDate(message.createdAt) }}</td>
            <td class="cell--actions">
              <button :disabled="savingId === message.id" @click="toggleStatus(message)">
                {{ message.status === 'hidden' ? 'Restore' : 'Hide' }}
              </button>
              <select
                :disabled="savingId === message.id"
                :value="''"
                @change="muteAuthor(message, $event.target.value)"
              >
                <option value="" disabled>Mute…</option>
                <option v-for="option in MUTE_OPTIONS" :key="option.minutes" :value="option.minutes">
                  {{ option.label }}
                </option>
              </select>
            </td>
          </tr>
        </tbody>
      </table>

      <p v-else-if="!isLoading" class="chat__empty">No messages here.</p>

      <div v-if="pageCount > 1" class="chat__pagination">
        <button :disabled="page <= 1" @click="fetchList({ page: page - 1 })">Prev</button>
        <span>Page {{ page }} of {{ pageCount }}</span>
        <button :disabled="page >= pageCount" @click="fetchList({ page: page + 1 })">Next</button>
      </div>
    </div>
  </AdminLayout>
</template>

<style scoped>
.chat__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
  gap: 16px;
  flex-wrap: wrap;
}

.chat__filters {
  display: flex;
  column-gap: 8px;
}

.chat__filters button {
  padding: 6px 12px;
  background: transparent;
  border: 1px solid var(--border);
  border-radius: 6px;
  color: var(--text-muted);
  font-size: 13px;
}

.chat__filters button.active {
  border-color: var(--primary);
  color: var(--primary);
}

.chat__search {
  display: flex;
  column-gap: 8px;
  margin-bottom: 16px;
}

.chat__search input {
  flex-grow: 1;
}

.chat__error {
  padding: 8px 12px;
  margin-bottom: 12px;
  border-radius: 6px;
  background: rgba(220, 80, 80, 0.12);
  color: #ff9c9c;
  font-size: 13px;
}

.chat__table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
}

.chat__table th,
.chat__table td {
  padding: 10px 8px;
  text-align: left;
  border-bottom: 1px solid var(--border);
  vertical-align: top;
}

.chat__table tr.is-hidden {
  opacity: 0.5;
}

.chat__body {
  max-width: 420px;
  overflow-wrap: anywhere;
}

.cell--mono {
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 12px;
  color: var(--text-muted);
}

.cell--actions {
  display: flex;
  column-gap: 8px;
  align-items: center;
}

.badge {
  display: inline-block;
  margin-top: 4px;
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 11px;
}

.badge--warn {
  background: rgba(220, 160, 60, 0.16);
  color: #f0c070;
}

.chat__empty {
  color: var(--text-muted);
  font-size: 13px;
}

.chat__pagination {
  display: flex;
  align-items: center;
  column-gap: 12px;
  margin-top: 16px;
  font-size: 13px;
  color: var(--text-muted);
}
</style>
