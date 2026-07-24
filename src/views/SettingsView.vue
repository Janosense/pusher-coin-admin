<script setup>
import { onMounted, ref } from 'vue'
import AdminLayout from '@/components/AdminLayout.vue'
import adminCoinPricingService from '@/services/adminCoinPricingService.js'
import adminMachineService from '@/services/adminMachineService.js'

// ---- coin pricing ----
const pricingForm = ref({ default: '40.00', min: '10.00', max: '500.00' })
const pricingLoading = ref(false)
const pricingSaving = ref(false)
const pricingError = ref(null)
const pricingMessage = ref(null)

const hydratePricing = async () => {
  pricingLoading.value = true
  pricingError.value = null
  try {
    pricingForm.value = await adminCoinPricingService.get()
  } catch (err) {
    pricingError.value = err.response?.data?.message || err.message
  } finally {
    pricingLoading.value = false
  }
}

const savePricing = async () => {
  pricingError.value = null
  pricingMessage.value = null
  pricingSaving.value = true
  try {
    pricingForm.value = await adminCoinPricingService.update(pricingForm.value)
    pricingMessage.value = 'Coin pricing updated.'
  } catch (err) {
    pricingError.value = err.response?.data?.message || err.message
  } finally {
    pricingSaving.value = false
  }
}

// ---- bonus mapping ----
const bonusForm = ref({
  // Twelve string fields (1..12) so `v-model` plays nicely with number
  // inputs that can be momentarily empty during typing.
  map: Object.fromEntries(Array.from({ length: 12 }, (_, i) => [String(i + 1), '0'])),
  relayCoinCount: '0'
})
const bonusLoading = ref(false)
const bonusSaving = ref(false)
const bonusError = ref(null)
const bonusMessage = ref(null)

const hydrateBonus = async () => {
  bonusLoading.value = true
  bonusError.value = null
  try {
    const result = await adminMachineService.getBonusMap()
    bonusForm.value = {
      map: Object.fromEntries(
        Array.from({ length: 12 }, (_, i) => {
          const key = String(i + 1)
          return [key, String(result.map[key] ?? 0)]
        })
      ),
      relayCoinCount: String(result.relayCoinCount || 0)
    }
  } catch (err) {
    bonusError.value = err.response?.data?.message || err.message
  } finally {
    bonusLoading.value = false
  }
}

const saveBonus = async () => {
  bonusError.value = null
  bonusMessage.value = null
  bonusSaving.value = true
  try {
    const intMap = {}
    for (let i = 1; i <= 12; i++) {
      const raw = String(bonusForm.value.map[i] ?? '').trim()
      if (raw === '' || !/^\d+$/.test(raw)) {
        bonusError.value = `Bonus ${i} must be a non-negative integer.`
        bonusSaving.value = false
        return
      }
      intMap[String(i)] = Number(raw)
    }
    const relayRaw = String(bonusForm.value.relayCoinCount ?? '').trim()
    if (relayRaw === '' || !/^\d+$/.test(relayRaw)) {
      bonusError.value = 'Relay coin count must be a non-negative integer.'
      bonusSaving.value = false
      return
    }
    const result = await adminMachineService.updateBonusMap({
      map: intMap,
      relayCoinCount: Number(relayRaw)
    })
    bonusForm.value.map = Object.fromEntries(
      Array.from({ length: 12 }, (_, i) => [String(i + 1), String(result.map[String(i + 1)] ?? 0)])
    )
    bonusForm.value.relayCoinCount = String(result.relayCoinCount || 0)
    bonusMessage.value = 'Bonus mapping updated.'
  } catch (err) {
    bonusError.value = err.response?.data?.message || err.message
  } finally {
    bonusSaving.value = false
  }
}

onMounted(() => {
  hydratePricing()
  hydrateBonus()
})
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

        <form class="settings__form" @submit.prevent="savePricing">
          <label>
            <span>Min per coin</span>
            <input v-model="pricingForm.min" type="number" min="0.01" step="0.01" required />
          </label>
          <label>
            <span>Default per coin</span>
            <input v-model="pricingForm.default" type="number" min="0.01" step="0.01" required />
          </label>
          <label>
            <span>Max per coin</span>
            <input v-model="pricingForm.max" type="number" min="0.01" step="0.01" required />
          </label>

          <p v-if="pricingError" class="settings__error">{{ pricingError }}</p>
          <p v-if="pricingMessage" class="settings__success">{{ pricingMessage }}</p>

          <div class="settings__actions">
            <button class="ghost" type="button" :disabled="pricingLoading" @click="hydratePricing">Reset</button>
            <button type="submit" :disabled="pricingSaving || pricingLoading">
              {{ pricingSaving ? 'Saving…' : 'Save' }}
            </button>
          </div>
        </form>
      </section>

      <section class="settings__section">
        <header class="settings__section-header">
          <h3>Bonus mapping</h3>
          <p>
            Coins credited when the bonus wheel (<code>sensor.lc01_12</code>) lands
            on a given number, plus a flat payout when the relay contact
            (<code>sensor.relay_on</code>) closes. All values are coin counts; 0
            means "no bonus."
          </p>
        </header>

        <form class="settings__form" @submit.prevent="saveBonus">
          <div class="settings__bonus-grid">
            <label v-for="i in 12" :key="i" class="settings__bonus-cell">
              <span>Bonus {{ i }}</span>
              <input
                v-model="bonusForm.map[String(i)]"
                type="number"
                min="0"
                step="1"
                inputmode="numeric"
                required
              />
            </label>
          </div>

          <label class="settings__bonus-relay">
            <span>Relay-closed coin count</span>
            <input
              v-model="bonusForm.relayCoinCount"
              type="number"
              min="0"
              step="1"
              inputmode="numeric"
              required
            />
          </label>

          <p v-if="bonusError" class="settings__error">{{ bonusError }}</p>
          <p v-if="bonusMessage" class="settings__success">{{ bonusMessage }}</p>

          <div class="settings__actions">
            <button class="ghost" type="button" :disabled="bonusLoading" @click="hydrateBonus">Reset</button>
            <button type="submit" :disabled="bonusSaving || bonusLoading">
              {{ bonusSaving ? 'Saving…' : 'Save' }}
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

.settings__bonus-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
}

.settings__bonus-cell {
  display: flex;
  flex-direction: column;
  row-gap: 4px;
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--text-muted);
}

.settings__bonus-cell input {
  padding: 8px 10px;
  background: var(--surface-elevated);
  color: var(--text);
  border: 1px solid var(--border);
  border-radius: 6px;
  outline: none;
  font-size: 14px;
  text-align: center;
}

.settings__bonus-cell input:focus {
  border-color: var(--primary);
}

.settings__bonus-relay {
  display: flex;
  flex-direction: column;
  row-gap: 6px;
  font-size: 12px;
  color: var(--text-muted);
}

.settings__bonus-relay input {
  padding: 10px 12px;
  background: var(--surface-elevated);
  color: var(--text);
  border: 1px solid var(--border);
  border-radius: 6px;
  outline: none;
}
</style>
