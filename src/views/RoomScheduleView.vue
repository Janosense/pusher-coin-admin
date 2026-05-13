<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AdminLayout from '@/components/AdminLayout.vue'
import { useAdminRoomsStore } from '@/stores/rooms.js'

const route = useRoute()
const router = useRouter()
const roomsStore = useAdminRoomsStore()

const roomId = computed(() => Number(route.params.id))

const room = computed(() => roomsStore.byId(roomId.value))
const rules = ref([])
const nextWindow = ref(null)
const isSaving = ref(false)
const error = ref(null)
const info = ref(null)

const WEEKDAYS = [
  { value: 0, label: 'Monday' },
  { value: 1, label: 'Tuesday' },
  { value: 2, label: 'Wednesday' },
  { value: 3, label: 'Thursday' },
  { value: 4, label: 'Friday' },
  { value: 5, label: 'Saturday' },
  { value: 6, label: 'Sunday' }
]

const blankRule = () => ({
  weekday: 0,
  startTime: '18:00',
  endTime: '22:00',
  recurrence: 'always',
  onceDate: null
})

const hydrate = async () => {
  error.value = null
  info.value = null
  if (!roomsStore.byId(roomId.value)) {
    await roomsStore.fetchOne(roomId.value)
  }
  const result = await roomsStore.getSchedule(roomId.value)
  if (result.success) {
    rules.value = result.schedule.rules
    nextWindow.value = result.schedule.nextWindow
  } else {
    error.value = result.error
  }
}

onMounted(hydrate)
watch(roomId, hydrate)

const addRule = () => rules.value.push(blankRule())
const removeRule = (index) => rules.value.splice(index, 1)

const onSave = async () => {
  error.value = null
  info.value = null
  isSaving.value = true
  const result = await roomsStore.replaceSchedule(roomId.value, rules.value)
  isSaving.value = false
  if (result.success) {
    rules.value = result.schedule.rules
    nextWindow.value = result.schedule.nextWindow
    info.value = 'Schedule saved.'
  } else {
    error.value = result.error
  }
}

const onBack = () => router.push({ name: 'rooms-list' })

const formatWindow = (w) => {
  if (!w) return '—'
  const start = new Date(w.startAt)
  const end = new Date(w.endAt)
  return `${start.toLocaleString()} → ${end.toLocaleString()}`
}
</script>

<template>
  <AdminLayout>
    <div class="schedule-view">
      <div class="schedule-view__header">
        <button class="back" @click="onBack">← Rooms</button>
        <h2>Schedule — {{ room?.name || `Room #${roomId}` }}</h2>
      </div>

      <p class="schedule-view__next">
        <strong>Next window:</strong> {{ formatWindow(nextWindow) }}
      </p>

      <div class="schedule-view__rules">
        <div v-for="(rule, index) in rules" :key="index" class="rule">
          <label class="rule__field">
            <span>Day</span>
            <select v-model.number="rule.weekday">
              <option v-for="d in WEEKDAYS" :key="d.value" :value="d.value">
                {{ d.label }}
              </option>
            </select>
          </label>

          <label class="rule__field">
            <span>Start</span>
            <input v-model="rule.startTime" type="time" required />
          </label>

          <label class="rule__field">
            <span>End</span>
            <input v-model="rule.endTime" type="time" required />
          </label>

          <label class="rule__field">
            <span>Recurrence</span>
            <select v-model="rule.recurrence">
              <option value="always">Every week</option>
              <option value="once">One-off</option>
            </select>
          </label>

          <label v-if="rule.recurrence === 'once'" class="rule__field">
            <span>Date</span>
            <input v-model="rule.onceDate" type="date" required />
          </label>

          <button class="rule__remove" type="button" @click="removeRule(index)">
            Remove
          </button>
        </div>

        <p v-if="rules.length === 0" class="schedule-view__empty">
          No rules. Add one to schedule broadcasts.
        </p>

        <button class="schedule-view__add" type="button" @click="addRule">+ Add rule</button>
      </div>

      <p v-if="info" class="schedule-view__info">{{ info }}</p>
      <p v-if="error" class="schedule-view__error">{{ error }}</p>

      <div class="schedule-view__actions">
        <button class="ghost" type="button" @click="hydrate">Reset</button>
        <button type="button" :disabled="isSaving" @click="onSave">
          {{ isSaving ? 'Saving…' : 'Save schedule' }}
        </button>
      </div>
    </div>
  </AdminLayout>
</template>

<style scoped>
.schedule-view__header {
  display: flex;
  align-items: center;
  column-gap: 12px;
  margin-bottom: 16px;
}

.schedule-view__header h2 {
  margin: 0;
  font-size: 18px;
}

.back {
  padding: 6px 12px;
  background: transparent;
  color: var(--text-muted);
  border: 1px solid var(--border);
  border-radius: 6px;
  font-size: 12px;
}

.back:hover {
  border-color: var(--primary);
  color: var(--primary);
}

.schedule-view__next {
  margin: 0 0 16px;
  padding: 10px 12px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 6px;
  font-size: 13px;
  color: var(--text-muted);
}

.schedule-view__next strong {
  color: var(--text);
}

.schedule-view__rules {
  display: flex;
  flex-direction: column;
  row-gap: 8px;
  margin-bottom: 16px;
}

.rule {
  display: grid;
  grid-template-columns: 1.5fr 1fr 1fr 1.2fr 1fr auto;
  align-items: end;
  gap: 8px;
  padding: 12px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 6px;
}

.rule__field {
  display: flex;
  flex-direction: column;
  row-gap: 4px;
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--text-muted);
}

.rule__field input,
.rule__field select {
  padding: 6px 8px;
  background: var(--surface-elevated);
  color: var(--text);
  border: 1px solid var(--border);
  border-radius: 4px;
  outline: none;
  font-size: 13px;
}

.rule__field input:focus,
.rule__field select:focus {
  border-color: var(--primary);
}

.rule__remove {
  padding: 6px 10px;
  background: transparent;
  color: var(--text-muted);
  border: 1px solid var(--border);
  border-radius: 4px;
  font-size: 12px;
}

.rule__remove:hover {
  border-color: var(--danger);
  color: var(--danger);
}

.schedule-view__empty {
  margin: 0;
  padding: 16px;
  text-align: center;
  color: var(--text-muted);
  font-size: 13px;
}

.schedule-view__add {
  padding: 8px 12px;
  background: transparent;
  color: var(--primary);
  border: 1px dashed var(--border);
  border-radius: 6px;
  font-size: 13px;
}

.schedule-view__add:hover {
  border-color: var(--primary);
}

.schedule-view__info {
  margin: 8px 0;
  padding: 10px 12px;
  background: rgba(74, 222, 128, 0.1);
  color: var(--success);
  border: 1px solid rgba(74, 222, 128, 0.3);
  border-radius: 6px;
  font-size: 13px;
}

.schedule-view__error {
  margin: 8px 0;
  padding: 10px 12px;
  background: rgba(248, 113, 113, 0.1);
  color: var(--danger);
  border: 1px solid rgba(248, 113, 113, 0.3);
  border-radius: 6px;
  font-size: 13px;
}

.schedule-view__actions {
  display: flex;
  justify-content: flex-end;
  column-gap: 8px;
}

.schedule-view__actions button {
  padding: 8px 18px;
  background: var(--primary);
  color: var(--bg);
  border: 0;
  border-radius: 6px;
  font-weight: 600;
}

.schedule-view__actions button.ghost {
  background: transparent;
  color: var(--text);
  border: 1px solid var(--border);
}

.schedule-view__actions button:hover:not(:disabled) {
  background: var(--primary-hover);
}

.schedule-view__actions button.ghost:hover {
  border-color: var(--primary);
  color: var(--primary);
}
</style>
