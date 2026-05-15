<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import AdminLayout from '@/components/AdminLayout.vue'
import adminMachineService from '@/services/adminMachineService.js'

const state = ref(null)
const isFetching = ref(false)
const isToggling = ref(false)
const error = ref(null)
const lastFetchedAt = ref(null)

const POLL_INTERVAL_MS = 3000
let pollHandle = null

const fetchState = async () => {
  isFetching.value = true
  try {
    state.value = await adminMachineService.getState()
    error.value = null
    lastFetchedAt.value = new Date()
  } catch (err) {
    error.value = err.response?.data?.message || err.message
  } finally {
    isFetching.value = false
  }
}

const startPolling = () => {
  if (pollHandle) return
  pollHandle = window.setInterval(fetchState, POLL_INTERVAL_MS)
}

const stopPolling = () => {
  if (pollHandle) {
    window.clearInterval(pollHandle)
    pollHandle = null
  }
}

onMounted(async () => {
  await fetchState()
  startPolling()
})

onBeforeUnmount(stopPolling)

const togglePower = async (on) => {
  if (isToggling.value) return
  isToggling.value = true
  try {
    await adminMachineService.setPower(on)
    await fetchState()
  } catch (err) {
    error.value = err.response?.data?.message || err.message
  } finally {
    isToggling.value = false
  }
}

const formatBool = (v) => {
  if (v === null || v === undefined) return '—'
  return v ? 'Yes' : 'No'
}

const formatNumber = (v) => {
  if (v === null || v === undefined) return '—'
  return String(v)
}

// Light state is a bitfield (0..15). Render the bits explicitly so the
// operator can read off which lights are lit without doing math.
const lightBits = computed(() => {
  if (state.value?.lightState === null || state.value?.lightState === undefined) return null
  const v = Number(state.value.lightState)
  return [0, 1, 2, 3].map((i) => ({
    bit: i,
    on: (v & (1 << i)) !== 0
  }))
})

const lastFetchedLabel = computed(() => {
  if (!lastFetchedAt.value) return '—'
  return lastFetchedAt.value.toLocaleTimeString()
})
</script>

<template>
  <AdminLayout>
    <div class="machine">
      <div class="machine__header">
        <h2>Machine</h2>
        <div class="machine__meta">
          <span class="machine__last-fetch">Last poll: {{ lastFetchedLabel }}</span>
          <button class="machine__refresh" :disabled="isFetching" @click="fetchState">
            {{ isFetching ? 'Refreshing…' : 'Refresh now' }}
          </button>
        </div>
      </div>

      <p v-if="error" class="machine__error">{{ error }}</p>

      <section class="machine__section">
        <header class="machine__section-header">
          <h3>Connection</h3>
        </header>
        <div class="machine__status-row">
          <span
            class="machine__dot"
            :class="state?.online ? 'machine__dot--ok' : 'machine__dot--bad'"
          />
          <strong>{{ state?.online ? 'Home Assistant reachable' : 'Home Assistant unreachable' }}</strong>
        </div>
        <p v-if="!state?.online" class="machine__hint">
          Check <code>PC_MACHINE_TOKEN</code> in wp-config.php and the
          <code>pc_machine_endpoint</code> WP option.
        </p>
      </section>

      <section class="machine__section">
        <header class="machine__section-header">
          <h3>Power</h3>
          <p>Toggles <code>switch.sonoff_*</code> directly.</p>
        </header>
        <div class="machine__power">
          <span
            class="machine__dot"
            :class="{
              'machine__dot--ok': state?.powerOn === true,
              'machine__dot--bad': state?.powerOn === false,
              'machine__dot--unknown': state?.powerOn === null || state?.powerOn === undefined
            }"
          />
          <span class="machine__power-label">
            {{ state?.powerOn === true ? 'On' : state?.powerOn === false ? 'Off' : 'Unknown' }}
          </span>
          <button
            class="machine__power-btn"
            :disabled="!state?.online || isToggling"
            @click="togglePower(true)"
          >
            Power on
          </button>
          <button
            class="machine__power-btn ghost"
            :disabled="!state?.online || isToggling"
            @click="togglePower(false)"
          >
            Power off
          </button>
        </div>
      </section>

      <section class="machine__section">
        <header class="machine__section-header">
          <h3>Sensors</h3>
          <p>Polled every 3 seconds. Phase 5 Step 4 swaps this for real-time push.</p>
        </header>
        <dl class="machine__sensors">
          <div>
            <dt>Coin counter (<code>sensor.coin</code>)</dt>
            <dd>{{ formatNumber(state?.coinCount) }}</dd>
          </div>
          <div>
            <dt>Last bonus number (<code>sensor.lc01_12</code>)</dt>
            <dd>{{ formatNumber(state?.lastBonusNumber) }}</dd>
          </div>
          <div>
            <dt>Relay closed (<code>sensor.relay_on</code>)</dt>
            <dd>{{ formatBool(state?.relayClosed) }}</dd>
          </div>
          <div>
            <dt>Light bitfield (<code>sensor.light_b_t</code>)</dt>
            <dd v-if="lightBits">
              <span
                v-for="b in lightBits"
                :key="b.bit"
                class="machine__bit"
                :class="{ 'machine__bit--on': b.on }"
                :title="`bit ${b.bit}`"
              >
                {{ b.bit }}
              </span>
              <span class="machine__bit-raw">({{ state?.lightState }})</span>
            </dd>
            <dd v-else>—</dd>
          </div>
        </dl>
      </section>
    </div>
  </AdminLayout>
</template>

<style scoped>
.machine {
  max-width: 720px;
}

.machine__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
  gap: 16px;
}

.machine__header h2 {
  margin: 0;
  font-size: 18px;
}

.machine__meta {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 12px;
  color: var(--text-muted);
}

.machine__refresh {
  padding: 6px 12px;
  background: transparent;
  color: var(--text);
  border: 1px solid var(--border);
  border-radius: 6px;
  font-size: 12px;
}

.machine__refresh:hover:not(:disabled) {
  border-color: var(--primary);
  color: var(--primary);
}

.machine__section {
  margin-bottom: 16px;
  padding: 20px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 8px;
}

.machine__section-header h3 {
  margin: 0 0 4px;
  font-size: 14px;
  font-weight: 600;
}

.machine__section-header p {
  margin: 0 0 12px;
  font-size: 12px;
  color: var(--text-muted);
}

.machine__section-header code {
  padding: 1px 6px;
  background: var(--surface-elevated);
  border-radius: 4px;
  font-family: ui-monospace, monospace;
  font-size: 11px;
  color: var(--text);
}

.machine__error {
  margin: 0 0 16px;
  padding: 10px 12px;
  background: rgba(248, 113, 113, 0.1);
  color: var(--danger);
  border: 1px solid rgba(248, 113, 113, 0.3);
  border-radius: 8px;
  font-size: 13px;
}

.machine__status-row {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 14px;
}

.machine__hint {
  margin: 12px 0 0;
  font-size: 12px;
  color: var(--text-muted);
}

.machine__hint code {
  padding: 1px 6px;
  background: var(--surface-elevated);
  border-radius: 4px;
  font-family: ui-monospace, monospace;
  font-size: 11px;
  color: var(--text);
}

.machine__dot {
  display: inline-block;
  width: 10px;
  height: 10px;
  border-radius: 50%;
}

.machine__dot--ok {
  background-color: var(--success);
  box-shadow: 0 0 0 3px rgba(74, 222, 128, 0.2);
}

.machine__dot--bad {
  background-color: var(--danger);
  box-shadow: 0 0 0 3px rgba(248, 113, 113, 0.2);
}

.machine__dot--unknown {
  background-color: var(--text-muted);
}

.machine__power {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.machine__power-label {
  font-size: 14px;
  font-weight: 600;
  min-width: 60px;
}

.machine__power-btn {
  padding: 8px 18px;
  background: var(--success);
  color: var(--bg);
  border: 0;
  border-radius: 6px;
  font-weight: 600;
}

.machine__power-btn.ghost {
  background: transparent;
  color: var(--text);
  border: 1px solid var(--border);
}

.machine__power-btn:hover:not(:disabled) {
  filter: brightness(1.1);
}

.machine__power-btn.ghost:hover:not(:disabled) {
  border-color: var(--danger);
  color: var(--danger);
}

.machine__power-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.machine__sensors {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  margin: 0;
}

.machine__sensors > div {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.machine__sensors dt {
  font-size: 11px;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.machine__sensors dt code {
  font-family: ui-monospace, monospace;
  text-transform: none;
  letter-spacing: 0;
  color: var(--text);
  font-size: 11px;
}

.machine__sensors dd {
  margin: 0;
  font-size: 18px;
  font-family: ui-monospace, monospace;
}

.machine__bit {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  margin-right: 4px;
  border-radius: 4px;
  background: var(--surface-elevated);
  color: var(--text-muted);
  font-size: 12px;
}

.machine__bit--on {
  background: var(--warning);
  color: var(--bg);
  font-weight: 600;
}

.machine__bit-raw {
  margin-left: 8px;
  font-size: 11px;
  color: var(--text-muted);
}
</style>
