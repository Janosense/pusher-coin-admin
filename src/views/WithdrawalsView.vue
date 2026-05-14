<script setup>
import { onMounted, ref } from 'vue'
import AdminLayout from '@/components/AdminLayout.vue'
import { useAdminWithdrawalsStore } from '@/stores/withdrawals.js'

const store = useAdminWithdrawalsStore()

const filters = [
  { value: 'pending', label: 'Pending' },
  { value: 'completed', label: 'Completed' },
  { value: 'refunded', label: 'Refunded' },
  { value: 'all', label: 'All' }
]

const decisionDialog = ref(null) // { withdrawal, action: 'approve' | 'reject', notes }
const isSubmitting = ref(false)
const localError = ref(null)

onMounted(() => store.fetchList())

const formatDate = (iso) => {
  if (!iso) return '—'
  return new Date(iso.replace(' ', 'T') + 'Z').toLocaleString()
}

const openDecision = (withdrawal, action) => {
  decisionDialog.value = { withdrawal, action, notes: '' }
  localError.value = null
}

const closeDecision = () => {
  decisionDialog.value = null
  isSubmitting.value = false
  localError.value = null
}

const submitDecision = async () => {
  if (!decisionDialog.value) return
  isSubmitting.value = true
  const { withdrawal, action, notes } = decisionDialog.value
  const result =
    action === 'approve' ? await store.approve(withdrawal.id, notes) : await store.reject(withdrawal.id, notes)
  isSubmitting.value = false
  if (!result.success) {
    localError.value = result.error || 'Action failed.'
    return
  }
  closeDecision()
}
</script>

<template>
  <AdminLayout>
    <div class="withdrawals">
      <div class="withdrawals__header">
        <h2>Withdrawals</h2>
        <div class="withdrawals__filters">
          <button
            v-for="f in filters"
            :key="f.value"
            :class="{ active: store.statusFilter === f.value }"
            @click="store.fetchList({ status: f.value })"
          >
            {{ f.label }}
          </button>
        </div>
      </div>

      <p v-if="store.error" class="withdrawals__error">{{ store.error }}</p>

      <table v-if="store.items.length > 0" class="withdrawals__table">
        <thead>
          <tr>
            <th>Player</th>
            <th>Coins</th>
            <th>Payout (UAH)</th>
            <th>Status</th>
            <th>Requested</th>
            <th>Settled</th>
            <th>Notes</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="w in store.items" :key="w.id">
            <td>
              <div>{{ w.userNickname }}</div>
              <div class="cell--mono">{{ w.userEmail }}</div>
            </td>
            <td>{{ w.amountCoins }}</td>
            <td>₴{{ w.amountMoney }}</td>
            <td>
              <span class="badge" :class="`badge--${w.status}`">{{ w.status }}</span>
            </td>
            <td class="cell--mono">{{ formatDate(w.createdAt) }}</td>
            <td class="cell--mono">{{ formatDate(w.settledAt) }}</td>
            <td class="cell--notes">{{ w.notes || '—' }}</td>
            <td class="cell--actions">
              <template v-if="w.status === 'pending'">
                <button class="success" @click="openDecision(w, 'approve')">Approve</button>
                <button class="danger" @click="openDecision(w, 'reject')">Reject</button>
              </template>
              <span v-else class="cell--muted">—</span>
            </td>
          </tr>
        </tbody>
      </table>

      <p v-else-if="!store.isLoading" class="withdrawals__empty">
        No withdrawals match this filter.
      </p>
    </div>

    <div v-if="decisionDialog" class="dialog-backdrop" @click.self="closeDecision">
      <div class="dialog">
        <h3>
          {{ decisionDialog.action === 'approve' ? 'Approve withdrawal' : 'Reject withdrawal' }}
        </h3>
        <p class="dialog__body">
          <strong>{{ decisionDialog.withdrawal.userNickname }}</strong>
          ({{ decisionDialog.withdrawal.userEmail }}) — {{ decisionDialog.withdrawal.amountCoins }} coins
          → ₴{{ decisionDialog.withdrawal.amountMoney }}.
        </p>
        <p v-if="decisionDialog.action === 'approve'" class="dialog__note">
          Confirm only after you've paid out by bank transfer or other channel.
        </p>
        <p v-else class="dialog__note">
          Coins will be re-credited to the player's wallet using the original purchase prices.
        </p>
        <label class="dialog__field">
          <span>Notes (optional)</span>
          <textarea v-model="decisionDialog.notes" rows="3" />
        </label>
        <p v-if="localError" class="dialog__error">{{ localError }}</p>
        <div class="dialog__actions">
          <button class="ghost" @click="closeDecision">Cancel</button>
          <button
            :class="decisionDialog.action === 'approve' ? 'success' : 'danger'"
            :disabled="isSubmitting"
            @click="submitDecision"
          >
            {{ isSubmitting ? 'Saving…' : decisionDialog.action === 'approve' ? 'Approve' : 'Reject' }}
          </button>
        </div>
      </div>
    </div>
  </AdminLayout>
</template>

<style scoped>
.withdrawals__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
  gap: 16px;
  flex-wrap: wrap;
}

.withdrawals__header h2 {
  margin: 0;
  font-size: 18px;
}

.withdrawals__filters {
  display: flex;
  gap: 6px;
}

.withdrawals__filters button {
  padding: 6px 12px;
  background: transparent;
  color: var(--text-muted);
  border: 1px solid var(--border);
  border-radius: 6px;
  font-size: 12px;
}

.withdrawals__filters button.active {
  color: var(--text);
  background: var(--surface-elevated);
  border-color: var(--primary);
}

.withdrawals__table {
  width: 100%;
  border-collapse: collapse;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 8px;
  overflow: hidden;
}

.withdrawals__table th,
.withdrawals__table td {
  padding: 10px 12px;
  text-align: left;
  border-bottom: 1px solid var(--border);
  font-size: 13px;
  vertical-align: top;
}

.withdrawals__table th {
  background: var(--surface-elevated);
  font-weight: 600;
  color: var(--text-muted);
  text-transform: uppercase;
  font-size: 11px;
  letter-spacing: 0.05em;
}

.withdrawals__table tbody tr:last-child td {
  border-bottom: 0;
}

.cell--mono {
  font-family: ui-monospace, monospace;
  font-size: 11px;
  color: var(--text-muted);
}

.cell--notes {
  max-width: 240px;
  white-space: pre-wrap;
  word-break: break-word;
}

.cell--actions {
  display: flex;
  gap: 6px;
}

.cell--actions button {
  padding: 4px 10px;
  background: transparent;
  border: 1px solid var(--border);
  border-radius: 4px;
  color: var(--text);
  font-size: 12px;
}

.cell--actions button.success:hover {
  border-color: var(--success);
  color: var(--success);
}

.cell--actions button.danger:hover {
  border-color: var(--danger);
  color: var(--danger);
}

.cell--muted {
  color: var(--text-muted);
}

.badge {
  display: inline-block;
  padding: 2px 8px;
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.05);
}

.badge--pending { color: var(--warning); }
.badge--completed { color: var(--success); }
.badge--refunded { color: var(--text-muted); }
.badge--failed { color: var(--danger); }

.withdrawals__empty {
  padding: 32px;
  text-align: center;
  color: var(--text-muted);
}

.withdrawals__error {
  margin: 0 0 16px;
  padding: 10px 12px;
  background: rgba(248, 113, 113, 0.1);
  color: var(--danger);
  border: 1px solid rgba(248, 113, 113, 0.3);
  border-radius: 8px;
  font-size: 13px;
}

.dialog-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
}

.dialog {
  width: 100%;
  max-width: 440px;
  padding: 24px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 12px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.dialog h3 {
  margin: 0;
  font-size: 16px;
}

.dialog__body {
  margin: 0;
  font-size: 13px;
}

.dialog__note {
  margin: 0;
  font-size: 12px;
  color: var(--text-muted);
}

.dialog__field {
  display: flex;
  flex-direction: column;
  gap: 6px;
  font-size: 12px;
  color: var(--text-muted);
}

.dialog__field textarea {
  padding: 8px 10px;
  background: var(--surface-elevated);
  color: var(--text);
  border: 1px solid var(--border);
  border-radius: 6px;
  resize: vertical;
  font-family: inherit;
}

.dialog__error {
  margin: 0;
  padding: 8px 10px;
  background: rgba(248, 113, 113, 0.1);
  color: var(--danger);
  border: 1px solid rgba(248, 113, 113, 0.3);
  border-radius: 6px;
  font-size: 12px;
}

.dialog__actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

.dialog__actions button {
  padding: 8px 16px;
  background: var(--primary);
  color: var(--bg);
  border: 0;
  border-radius: 6px;
  font-weight: 600;
}

.dialog__actions button.ghost {
  background: transparent;
  color: var(--text);
  border: 1px solid var(--border);
}

.dialog__actions button.success {
  background: var(--success);
  color: var(--bg);
}

.dialog__actions button.danger {
  background: var(--danger);
  color: var(--bg);
}
</style>
