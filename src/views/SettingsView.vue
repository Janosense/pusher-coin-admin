<script setup>
import { onMounted, ref } from 'vue'
import AdminLayout from '@/components/AdminLayout.vue'
import adminCoinPricingService from '@/services/adminCoinPricingService.js'

const form = ref({ default: '40.00', min: '10.00', max: '500.00' })
const isLoading = ref(false)
const isSaving = ref(false)
const error = ref(null)
const successMessage = ref(null)

const hydrate = async () => {
  isLoading.value = true
  error.value = null
  try {
    form.value = await adminCoinPricingService.get()
  } catch (err) {
    error.value = err.response?.data?.message || err.message
  } finally {
    isLoading.value = false
  }
}

onMounted(hydrate)

const onSave = async () => {
  error.value = null
  successMessage.value = null
  isSaving.value = true
  try {
    form.value = await adminCoinPricingService.update(form.value)
    successMessage.value = 'Coin pricing updated.'
  } catch (err) {
    error.value = err.response?.data?.message || err.message
  } finally {
    isSaving.value = false
  }
}
</script>

<template>
  <AdminLayout>
    <div class="settings">
      <h2>Settings</h2>

      <section class="settings__section">
        <header class="settings__section-header">
          <h3>Coin pricing</h3>
          <p>
            All values in UAH. The default is what the top-up form picks for new
            players; min and max bound what players can choose per purchase. The
            server enforces these on every <code>POST /wallet/topup</code>.
          </p>
        </header>

        <form class="settings__form" @submit.prevent="onSave">
          <label>
            <span>Min per coin</span>
            <input v-model="form.min" type="number" min="0.01" step="0.01" required />
          </label>
          <label>
            <span>Default per coin</span>
            <input v-model="form.default" type="number" min="0.01" step="0.01" required />
          </label>
          <label>
            <span>Max per coin</span>
            <input v-model="form.max" type="number" min="0.01" step="0.01" required />
          </label>

          <p v-if="error" class="settings__error">{{ error }}</p>
          <p v-if="successMessage" class="settings__success">{{ successMessage }}</p>

          <div class="settings__actions">
            <button class="ghost" type="button" :disabled="isLoading" @click="hydrate">Reset</button>
            <button type="submit" :disabled="isSaving || isLoading">
              {{ isSaving ? 'Saving…' : 'Save' }}
            </button>
          </div>
        </form>
      </section>

      <section class="settings__section">
        <header class="settings__section-header">
          <h3>LiqPay credentials</h3>
          <p>
            The merchant public key lives in the <code>pc_liqpay_public_key</code>
            WP option. The matching private key must be defined in
            <code>wp-config.php</code> as <code>PC_LIQPAY_PRIVATE_KEY</code> — it is
            never persisted to the database. Update from the server, not here.
          </p>
        </header>
        <p class="settings__cli-hint">
          <code>wp option update pc_liqpay_public_key '&lt;your-public-key&gt;'</code>
        </p>
      </section>
    </div>
  </AdminLayout>
</template>

<style scoped>
.settings {
  max-width: 640px;
}

.settings h2 {
  margin: 0 0 16px;
  font-size: 18px;
}

.settings__section {
  margin-bottom: 24px;
  padding: 24px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 8px;
}

.settings__section-header h3 {
  margin: 0 0 8px;
  font-size: 14px;
  font-weight: 600;
  color: var(--text);
}

.settings__section-header p {
  margin: 0 0 16px;
  font-size: 12px;
  color: var(--text-muted);
  line-height: 1.5;
}

.settings__section-header code,
.settings__cli-hint code {
  padding: 1px 6px;
  background: var(--surface-elevated);
  border-radius: 4px;
  font-family: ui-monospace, monospace;
  font-size: 11px;
  color: var(--text);
}

.settings__cli-hint {
  margin: 0;
  padding: 12px;
  background: var(--surface-elevated);
  border-radius: 6px;
  font-size: 12px;
}

.settings__cli-hint code {
  background: transparent;
  padding: 0;
  font-size: 12px;
  color: var(--primary);
}

.settings__form {
  display: flex;
  flex-direction: column;
  row-gap: 12px;
}

.settings__form label {
  display: flex;
  flex-direction: column;
  row-gap: 6px;
  font-size: 12px;
  color: var(--text-muted);
}

.settings__form input {
  padding: 10px 12px;
  background: var(--surface-elevated);
  color: var(--text);
  border: 1px solid var(--border);
  border-radius: 6px;
  outline: none;
}

.settings__form input:focus {
  border-color: var(--primary);
}

.settings__error {
  margin: 0;
  padding: 8px 12px;
  background: rgba(248, 113, 113, 0.1);
  color: var(--danger);
  border: 1px solid rgba(248, 113, 113, 0.3);
  border-radius: 6px;
  font-size: 12px;
}

.settings__success {
  margin: 0;
  padding: 8px 12px;
  background: rgba(74, 222, 128, 0.1);
  color: var(--success);
  border: 1px solid rgba(74, 222, 128, 0.3);
  border-radius: 6px;
  font-size: 12px;
}

.settings__actions {
  display: flex;
  justify-content: flex-end;
  column-gap: 8px;
}

.settings__actions button {
  padding: 8px 18px;
  background: var(--primary);
  color: var(--bg);
  border: 0;
  border-radius: 6px;
  font-weight: 600;
}

.settings__actions button.ghost {
  background: transparent;
  color: var(--text);
  border: 1px solid var(--border);
}

.settings__actions button:hover:not(:disabled) {
  background: var(--primary-hover);
}

.settings__actions button.ghost:hover {
  border-color: var(--primary);
  color: var(--primary);
}
</style>
