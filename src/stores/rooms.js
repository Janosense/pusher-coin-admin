import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import adminRoomsService from '@/services/adminRoomsService.js'

export const useAdminRoomsStore = defineStore('admin-rooms', () => {
  const items = ref([])
  const isLoading = ref(false)
  const error = ref(null)

  const fetchList = async () => {
    isLoading.value = true
    error.value = null
    try {
      const result = await adminRoomsService.list({ page: 1, perPage: 100 })
      items.value = result.items
      return { success: true }
    } catch (err) {
      error.value = err.response?.data?.message || err.message
      return { success: false, error: error.value }
    } finally {
      isLoading.value = false
    }
  }

  const fetchOne = async (id) => {
    try {
      const room = await adminRoomsService.get(id)
      const idx = items.value.findIndex((r) => r.id === room.id)
      if (idx >= 0) items.value.splice(idx, 1, room)
      else items.value.push(room)
      return { success: true, room }
    } catch (err) {
      return { success: false, error: err.response?.data?.message || err.message }
    }
  }

  const create = async (input) => {
    try {
      const room = await adminRoomsService.create(input)
      items.value.push(room)
      return { success: true, room }
    } catch (err) {
      return {
        success: false,
        error: err.response?.data?.message || err.message,
        code: err.response?.data?.code
      }
    }
  }

  const update = async (id, input) => {
    try {
      const room = await adminRoomsService.update(id, input)
      const idx = items.value.findIndex((r) => r.id === room.id)
      if (idx >= 0) items.value.splice(idx, 1, room)
      return { success: true, room }
    } catch (err) {
      return {
        success: false,
        error: err.response?.data?.message || err.message,
        code: err.response?.data?.code
      }
    }
  }

  const remove = async (id) => {
    try {
      await adminRoomsService.remove(id)
      items.value = items.value.filter((r) => r.id !== id)
      return { success: true }
    } catch (err) {
      return { success: false, error: err.response?.data?.message || err.message }
    }
  }

  const getSchedule = async (id) => {
    try {
      const schedule = await adminRoomsService.getSchedule(id)
      return { success: true, schedule }
    } catch (err) {
      return { success: false, error: err.response?.data?.message || err.message }
    }
  }

  const replaceSchedule = async (id, rules) => {
    try {
      const schedule = await adminRoomsService.replaceSchedule(id, rules)
      return { success: true, schedule }
    } catch (err) {
      return {
        success: false,
        error: err.response?.data?.message || err.message,
        code: err.response?.data?.code
      }
    }
  }

  const byId = (id) => items.value.find((r) => r.id === Number(id)) || null

  return {
    items: computed(() => items.value),
    isLoading: computed(() => isLoading.value),
    error: computed(() => error.value),
    byId,
    fetchList,
    fetchOne,
    create,
    update,
    remove,
    getSchedule,
    replaceSchedule
  }
})
