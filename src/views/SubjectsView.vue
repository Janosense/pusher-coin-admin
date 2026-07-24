<script setup>
import { ref, onMounted } from 'vue'
import AdminLayout from '@/components/AdminLayout.vue'
import adminSupportService from '@/services/adminSupportService.js'

// The list is edited as a whole and saved with one PUT: order here
// becomes display order in the player's dropdown, and anything removed
// is trashed server-side (old tickets keep resolving their label).
const subjects = ref([])
const isLoading = ref(false)
const isSaving = ref(false)
const error = ref(null)
const message = ref(null)

const hydrate = async () => {
  isLoading.value = true
  error.value = null
  try {
    subjects.value = await adminSupportService.getSubjects()
  } catch (err) {
    error.value = err.response?.data?.message || err.message
  } finally {
    isLoading.value = false
  }
}

const addSubject = () => {
  subjects.value.push({ id: null, label: '', hidden: false })
}

const removeSubject = (index) => {
  subjects.value.splice(index, 1)
}

const move = (index, delta) => {
  const target = index + delta
  if (target < 0 || target >= subjects.value.length) return
  const next = [...subjects.value]
  const [item] = next.splice(index, 1)
  next.splice(target, 0, item)
  subjects.value = next
}

const save = async () => {
  error.value = null
  message.value = null

  if (subjects.value.some((s) => !s.label.trim())) {
    error.value = 'Every subject needs a label.'
    return
  }

  isSaving.value = true
  try {
    subjects.value = await adminSupportService.replaceSubjects(
      subjects.value.map((s) => ({ ...s, label: s.label.trim() }))
    )
    message.value = 'Subjects updated.'
  } catch (err) {
    error.value = err.response?.data?.message || err.message
  } finally {
    isSaving.value = false
  }
}

onMounted(hydrate)
</script>

<template>
  <AdminLayout>
    <div class="subjects">
      <div class="subjects__header">
        <div>
          <h2>Support subjects</h2>
          <p class="subjects__hint">
            The dropdown players choose from. Order here is the order they see. Hidden subjects
            stay attached to existing tickets but can't be picked for new ones.
          </p>
        </div>
        <RouterLink class="subjects__back" :to="{ name: 'support-tickets' }">
          Back to tickets
        </RouterLink>
      </div>

      <p v-if="error" class="subjects__error">{{ error }}</p>
      <p v-if="message" class="subjects__success">{{ message }}</p>

      <p v-if="isLoading" class="subjects__hint">Loading…</p>

      <ul v-else class="subjects__list">
        <li v-for="(subject, index) in subjects" :key="subject.id ?? `new-${index}`">
          <input v-model="subject.label" type="text" maxlength="200" placeholder="Subject label" />
          <label class="subjects__hidden">
            <input v-model="subject.hidden" type="checkbox" />
            <span>Hidden</span>
          </label>
          <div class="subjects__row-actions">
            <button type="button" :disabled="index === 0" @click="move(index, -1)">↑</button>
            <button
              type="button"
              :disabled="index === subjects.length - 1"
              @click="move(index, 1)"
            >
              ↓
            </button>
            <button type="button" class="danger" @click="removeSubject(index)">Remove</button>
          </div>
        </li>
      </ul>

      <div class="subjects__actions">
        <button type="button" @click="addSubject">Add subject</button>
        <button type="button" class="ghost" :disabled="isLoading" @click="hydrate">Reset</button>
        <button type="button" :disabled="isSaving || isLoading" @click="save">
          {{ isSaving ? 'Saving…' : 'Save' }}
        </button>
      </div>
    </div>
  </AdminLayout>
</template>

<style scoped>
.subjects__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 16px;
}

.subjects__hint {
  margin: 4px 0 0;
  max-width: 60ch;
  color: var(--text-muted);
  font-size: 13px;
  line-height: 1.5;
}

.subjects__back {
  color: var(--primary);
  font-size: 13px;
  white-space: nowrap;
}

.subjects__error {
  margin-bottom: 12px;
  color: #ff8b95;
  font-size: 13px;
}

.subjects__success {
  margin-bottom: 12px;
  color: #7ddc9a;
  font-size: 13px;
}

.subjects__list {
  list-style: none;
  margin: 0 0 16px;
  padding: 0;
  display: flex;
  flex-direction: column;
  row-gap: 8px;
}

.subjects__list li {
  display: flex;
  align-items: center;
  column-gap: 12px;
  padding: 8px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 6px;
}

.subjects__list input[type='text'] {
  flex-grow: 1;
  padding: 8px 10px;
  background: var(--surface-elevated);
  border: 1px solid var(--border);
  border-radius: 6px;
  color: var(--text);
}

.subjects__hidden {
  display: flex;
  align-items: center;
  column-gap: 6px;
  color: var(--text-muted);
  font-size: 12px;
  white-space: nowrap;
}

.subjects__row-actions {
  display: flex;
  column-gap: 6px;
}

.subjects__row-actions button {
  padding: 6px 10px;
  background: transparent;
  border: 1px solid var(--border);
  border-radius: 6px;
  color: var(--text);
  font-size: 12px;
}

.subjects__row-actions button:disabled {
  opacity: 0.4;
}

.subjects__row-actions .danger {
  color: #ff8b95;
}

.subjects__actions {
  display: flex;
  column-gap: 8px;
}

.subjects__actions button {
  padding: 8px 16px;
  border-radius: 6px;
  border: 1px solid var(--border);
  background: var(--primary);
  color: #16161a;
  font-size: 13px;
}

.subjects__actions button.ghost,
.subjects__actions button:first-child {
  background: transparent;
  color: var(--text);
}
</style>
