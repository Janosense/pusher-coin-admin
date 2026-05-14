import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import adminWithdrawalsService from '@/services/adminWithdrawalsService.js'

export const useAdminWithdrawalsStore = defineStore('admin-withdrawals', () => {
  const items = ref([])
  const total = ref(0)
  const statusFilter = ref('pending')
  const isLoading = ref(false)
  const error = ref(null)

  const fetchList = async ({ status } = {}) => {
    if (status) statusFilter.value = status
    isLoading.value = true
    error.value = null
    try {
      const result = await adminWithdrawalsService.list({ status: statusFilter.value, page: 1, perPage: 100 })
      items.value = result.items
      total.value = result.total
      return { success: true }
    } catch (err) {
      error.value = err.response?.data?.message || err.message
      return { success: false, error: error.value }
    } finally {
      isLoading.value = false
    }
  }

  const applyUpdated = (updated) => {
    const idx = items.value.findIndex((r) => r.id === updated.id)
    if (idx >= 0) {
      // When viewing the pending queue, settled rows fall off; for "all"
      // or any other filter the row updates in place.
      if (statusFilter.value !== 'all' && updated.status !== statusFilter.value) {
        items.value.splice(idx, 1)
      } else {
        items.value.splice(idx, 1, updated)
      }
    }
  }

  const approve = async (id, notes) => {
    try {
      const updated = await adminWithdrawalsService.approve(id, { notes })
      applyUpdated(updated)
      return { success: true, withdrawal: updated }
    } catch (err) {
      return {
        success: false,
        error: err.response?.data?.message || err.message,
        code: err.response?.data?.code
      }
    }
  }

  const reject = async (id, notes) => {
    try {
      const updated = await adminWithdrawalsService.reject(id, { notes })
      applyUpdated(updated)
      return { success: true, withdrawal: updated }
    } catch (err) {
      return {
        success: false,
        error: err.response?.data?.message || err.message,
        code: err.response?.data?.code
      }
    }
  }

  return {
    items: computed(() => items.value),
    total: computed(() => total.value),
    statusFilter: computed(() => statusFilter.value),
    isLoading: computed(() => isLoading.value),
    error: computed(() => error.value),
    fetchList,
    approve,
    reject
  }
})
