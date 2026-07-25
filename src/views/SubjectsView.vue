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

// ---- captcha ----
// Lives next to the subjects because both are "how the support form
// behaves" settings, and an operator setting up support hits them in the
// same sitting.
const captcha = ref({ provider: 'turnstile', siteKey: '', secretConfigured: false, enabled: false })
const captchaSaving = ref(false)
const captchaError = ref(null)
const captchaMessage = ref(null)

const hydrateCaptcha = async () => {
  try {
    captcha.value = await adminSupportService.getCaptcha()
  } catch (err) {
    captchaError.value = err.response?.data?.message || err.message
  }
}

const saveCaptcha = async () => {
  captchaError.value = null
  captchaMessage.value = null
  captchaSaving.value = true
  try {
    captcha.value = await adminSupportService.updateCaptcha({
      provider: captcha.value.provider,
      siteKey: captcha.value.siteKey.trim()
    })
    captchaMessage.value = captcha.value.enabled
      ? 'Captcha is live on the guest form.'
      : 'Saved. The captcha stays off until the secret is set in wp-config.php.'
  } catch (err) {
    captchaError.value = err.response?.data?.message || err.message
  } finally {
    captchaSaving.value = false
  }
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

onMounted(() => {
  hydrate()
  hydrateCaptcha()
})
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

      <section class="captcha">
        <h3>Guest captcha</h3>
        <p class="subjects__hint">
          Guests must solve this before a ticket is accepted. Logged-in players never see it —
          their session is the proof. The site key is public and set here; the secret must be a
          <code>PC_CAPTCHA_SECRET</code> constant in <code>wp-config.php</code>, never the
          database.
        </p>

        <p class="captcha__state" :class="captcha.enabled ? 'captcha__state--on' : 'captcha__state--off'">
          <template v-if="captcha.enabled">
            Active — the guest form is protected.
          </template>
          <template v-else-if="!captcha.secretConfigured && captcha.siteKey">
            Inactive — <code>PC_CAPTCHA_SECRET</code> is missing from wp-config.php. Guests can
            submit without a challenge.
          </template>
          <template v-else-if="captcha.secretConfigured && !captcha.siteKey">
            Inactive — the secret is set but no site key. Guests can submit without a challenge.
          </template>
          <template v-else>
            Inactive — no captcha configured. Guests can submit without a challenge.
          </template>
        </p>

        <div class="captcha__form">
          <label>
            <span>Provider</span>
            <select v-model="captcha.provider">
              <option value="turnstile">Cloudflare Turnstile</option>
              <option value="hcaptcha">hCaptcha</option>
            </select>
          </label>
          <label>
            <span>Site key</span>
            <input v-model="captcha.siteKey" type="text" placeholder="0x4AAAAAAA…" />
          </label>
          <button type="button" :disabled="captchaSaving" @click="saveCaptcha">
            {{ captchaSaving ? 'Saving…' : 'Save captcha' }}
          </button>
        </div>

        <p v-if="captchaError" class="subjects__error">{{ captchaError }}</p>
        <p v-if="captchaMessage" class="subjects__success">{{ captchaMessage }}</p>
      </section>
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

.captcha {
  margin-top: 32px;
  padding-top: 24px;
  border-top: 1px solid var(--border);
}

.captcha h3 {
  margin: 0 0 4px;
  font-size: 15px;
}

.captcha__state {
  margin: 12px 0;
  padding: 10px 12px;
  border-radius: 6px;
  font-size: 13px;
}

.captcha__state--on {
  background: rgba(40, 167, 69, 0.12);
  color: #7ddc9a;
}

.captcha__state--off {
  background: rgba(255, 193, 7, 0.12);
  color: #ffd970;
}

.captcha__form {
  display: flex;
  align-items: flex-end;
  column-gap: 12px;
  flex-wrap: wrap;
}

.captcha__form label {
  display: flex;
  flex-direction: column;
  row-gap: 4px;
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--text-muted);
}

.captcha__form input,
.captcha__form select {
  min-width: 260px;
  padding: 8px 10px;
  background: var(--surface-elevated);
  border: 1px solid var(--border);
  border-radius: 6px;
  color: var(--text);
  font-size: 13px;
}

.captcha__form button {
  padding: 8px 16px;
  border: 1px solid var(--border);
  border-radius: 6px;
  background: var(--primary);
  color: #16161a;
  font-size: 13px;
}
</style>
