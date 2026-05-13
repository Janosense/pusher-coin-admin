<script setup>
import { onMounted } from 'vue'
import { useRouter } from 'vue-router'
import AdminLayout from '@/components/AdminLayout.vue'
import { useAdminRoomsStore } from '@/stores/rooms.js'

const router = useRouter()
const roomsStore = useAdminRoomsStore()

onMounted(() => roomsStore.fetchList())

const STATUS_LABELS = {
  available: 'Available',
  maintenance: 'Maintenance',
  unavailable: 'Unavailable'
}

const onDelete = async (room) => {
  if (!confirm(`Trash "${room.name}"? You can restore it from /wp-admin/.`)) return
  const result = await roomsStore.remove(room.id)
  if (!result.success) {
    alert(`Delete failed: ${result.error}`)
  }
}

const onEdit = (room) => {
  router.push({ name: 'rooms-edit', params: { id: room.id } })
}

const onSchedule = (room) => {
  router.push({ name: 'rooms-schedule', params: { id: room.id } })
}

const onCreate = () => {
  router.push({ name: 'rooms-new' })
}
</script>

<template>
  <AdminLayout>
    <div class="rooms-list">
      <div class="rooms-list__header">
        <h2>Rooms</h2>
        <button class="rooms-list__create" @click="onCreate">+ New room</button>
      </div>

      <p v-if="roomsStore.error" class="rooms-list__error">{{ roomsStore.error }}</p>

      <table v-if="roomsStore.items.length > 0" class="rooms-list__table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Status</th>
            <th>Machine</th>
            <th>Stream URL</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="room in roomsStore.items" :key="room.id">
            <td>{{ room.name }}</td>
            <td>
              <span class="badge" :class="`badge--${room.status}`">
                {{ STATUS_LABELS[room.status] }}
              </span>
            </td>
            <td class="cell--mono">{{ room.machineId || '—' }}</td>
            <td class="cell--mono cell--truncate" :title="room.streamUrl">
              {{ room.streamUrl || '—' }}
            </td>
            <td class="cell--actions">
              <button @click="onEdit(room)">Edit</button>
              <button @click="onSchedule(room)">Schedule</button>
              <button class="danger" @click="onDelete(room)">Trash</button>
            </td>
          </tr>
        </tbody>
      </table>

      <p v-else-if="!roomsStore.isLoading" class="rooms-list__empty">
        No rooms yet. Click "New room" to create one.
      </p>
    </div>
  </AdminLayout>
</template>

<style scoped>
.rooms-list__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
}

.rooms-list__header h2 {
  margin: 0;
  font-size: 18px;
}

.rooms-list__create {
  padding: 8px 16px;
  background: var(--primary);
  color: var(--bg);
  border: 0;
  border-radius: 6px;
  font-weight: 600;
}

.rooms-list__create:hover {
  background: var(--primary-hover);
}

.rooms-list__table {
  width: 100%;
  border-collapse: collapse;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 8px;
  overflow: hidden;
}

.rooms-list__table th,
.rooms-list__table td {
  padding: 10px 12px;
  text-align: left;
  border-bottom: 1px solid var(--border);
  font-size: 13px;
}

.rooms-list__table th {
  background: var(--surface-elevated);
  font-weight: 600;
  color: var(--text-muted);
  text-transform: uppercase;
  font-size: 11px;
  letter-spacing: 0.05em;
}

.rooms-list__table tbody tr:last-child td {
  border-bottom: 0;
}

.cell--mono {
  font-family: ui-monospace, monospace;
  font-size: 12px;
  color: var(--text-muted);
}

.cell--truncate {
  max-width: 240px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.cell--actions {
  display: flex;
  column-gap: 6px;
}

.cell--actions button {
  padding: 4px 10px;
  background: transparent;
  color: var(--text);
  border: 1px solid var(--border);
  border-radius: 4px;
  font-size: 12px;
}

.cell--actions button:hover {
  border-color: var(--primary);
  color: var(--primary);
}

.cell--actions button.danger:hover {
  border-color: var(--danger);
  color: var(--danger);
}

.badge {
  display: inline-flex;
  align-items: center;
  padding: 2px 8px;
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.05);
}

.badge--available {
  color: var(--success);
}

.badge--maintenance {
  color: var(--warning);
}

.badge--unavailable {
  color: var(--text-muted);
}

.rooms-list__empty {
  padding: 32px;
  text-align: center;
  color: var(--text-muted);
}

.rooms-list__error {
  margin: 0 0 16px;
  padding: 10px 12px;
  background: rgba(248, 113, 113, 0.1);
  color: var(--danger);
  border: 1px solid rgba(248, 113, 113, 0.3);
  border-radius: 8px;
  font-size: 13px;
}
</style>
