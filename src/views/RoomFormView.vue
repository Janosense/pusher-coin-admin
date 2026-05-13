<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AdminLayout from '@/components/AdminLayout.vue'
import { useAdminRoomsStore } from '@/stores/rooms.js'

const route = useRoute()
const router = useRouter()
const roomsStore = useAdminRoomsStore()

const isCreate = computed(() => route.name === 'rooms-new')
const roomId = computed(() => (isCreate.value ? null : Number(route.params.id)))

const form = ref({
  name: '',
  status: 'unavailable',
  streamUrl: '',
  themeSongUrl: '',
  machineId: ''
})

const isSaving = ref(false)
const error = ref(null)

const loadIntoForm = (room) => {
  form.value = {
    name: room.name,
    status: room.status,
    streamUrl: room.streamUrl || '',
    themeSongUrl: room.themeSongUrl || '',
    machineId: room.machineId || ''
  }
}

const hydrate = async () => {
  if (isCreate.value) return
  const existing = roomsStore.byId(roomId.value)
  if (existing) {
    loadIntoForm(existing)
    return
  }
  const result = await roomsStore.fetchOne(roomId.value)
  if (result.success) loadIntoForm(result.room)
  else error.value = result.error
}

onMounted(hydrate)
watch(roomId, hydrate)

const onSubmit = async () => {
  error.value = null
  isSaving.value = true
  const payload = { ...form.value }
  const result = isCreate.value
    ? await roomsStore.create(payload)
    : await roomsStore.update(roomId.value, payload)
  isSaving.value = false

  if (result.success) {
    router.push({ name: 'rooms-list' })
  } else {
    error.value = result.error
  }
}

const onCancel = () => router.push({ name: 'rooms-list' })
</script>

<template>
  <AdminLayout>
    <div class="form-view">
      <h2>{{ isCreate ? 'New room' : 'Edit room' }}</h2>

      <form class="form-view__form" @submit.prevent="onSubmit">
        <label>
          <span>Name</span>
          <input v-model="form.name" type="text" required maxlength="200" />
        </label>

        <label>
          <span>Status</span>
          <select v-model="form.status">
            <option value="available">Available</option>
            <option value="maintenance">Maintenance</option>
            <option value="unavailable">Unavailable</option>
          </select>
        </label>

        <label>
          <span>Stream URL</span>
          <input
            v-model="form.streamUrl"
            type="url"
            placeholder="https://stream.example.com/room.m3u8"
          />
        </label>

        <label>
          <span>Theme song URL</span>
          <input v-model="form.themeSongUrl" type="url" placeholder="https://…/theme.mp3" />
        </label>

        <label>
          <span>Machine ID</span>
          <input
            v-model="form.machineId"
            type="text"
            placeholder="sonoff_10024fb618"
            pattern="[A-Za-z0-9_.\-]{0,64}"
          />
          <small>Letters, digits, underscore, hyphen, dot. Max 64 chars.</small>
        </label>

        <p v-if="error" class="form-view__error">{{ error }}</p>

        <div class="form-view__actions">
          <button type="button" class="ghost" @click="onCancel">Cancel</button>
          <button type="submit" :disabled="isSaving">
            {{ isSaving ? 'Saving…' : isCreate ? 'Create room' : 'Save' }}
          </button>
        </div>
      </form>
    </div>
  </AdminLayout>
</template>

<style scoped>
.form-view {
  max-width: 560px;
}

.form-view h2 {
  margin: 0 0 16px;
  font-size: 18px;
}

.form-view__form {
  display: flex;
  flex-direction: column;
  row-gap: 16px;
  padding: 24px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 8px;
}

.form-view__form label {
  display: flex;
  flex-direction: column;
  row-gap: 6px;
  font-size: 13px;
  color: var(--text-muted);
}

.form-view__form input,
.form-view__form select {
  padding: 10px 12px;
  background: var(--surface-elevated);
  color: var(--text);
  border: 1px solid var(--border);
  border-radius: 6px;
  outline: none;
}

.form-view__form input:focus,
.form-view__form select:focus {
  border-color: var(--primary);
}

.form-view__form small {
  color: var(--text-muted);
  font-size: 11px;
}

.form-view__actions {
  display: flex;
  justify-content: flex-end;
  column-gap: 8px;
}

.form-view__actions button {
  padding: 8px 18px;
  background: var(--primary);
  color: var(--bg);
  border: 0;
  border-radius: 6px;
  font-weight: 600;
}

.form-view__actions button.ghost {
  background: transparent;
  color: var(--text);
  border: 1px solid var(--border);
}

.form-view__actions button:hover:not(:disabled) {
  background: var(--primary-hover);
}

.form-view__actions button.ghost:hover {
  border-color: var(--primary);
  color: var(--primary);
}

.form-view__error {
  margin: 0;
  padding: 10px 12px;
  background: rgba(248, 113, 113, 0.1);
  color: var(--danger);
  border: 1px solid rgba(248, 113, 113, 0.3);
  border-radius: 6px;
  font-size: 13px;
}
</style>
