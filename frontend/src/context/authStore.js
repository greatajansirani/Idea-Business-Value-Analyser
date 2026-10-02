import { create } from 'zustand'
import { authAPI } from '../services/api.js'
const useAuthStore = create((set) => ({
  user: (() => { try { return JSON.parse(localStorage.getItem('ibva_user')||'null') } catch { return null } })(),
  token: localStorage.getItem('ibva_token') || null,
  isLoading: false, error: null,
  login: async (email, password) => {
    set({ isLoading:true, error:null })
    try {
      const { data } = await authAPI.login({ email, password })
      localStorage.setItem('ibva_token', data.token)
      localStorage.setItem('ibva_user', JSON.stringify(data.user))
      set({ user:data.user, token:data.token, isLoading:false }); return data
    } catch (err) { const msg=err.response?.data?.error||'Login failed'; set({ error:msg, isLoading:false }); throw new Error(msg) }
  },
  register: async (name, email, password) => {
    set({ isLoading:true, error:null })
    try {
      const { data } = await authAPI.register({ name, email, password })
      localStorage.setItem('ibva_token', data.token)
      localStorage.setItem('ibva_user', JSON.stringify(data.user))
      set({ user:data.user, token:data.token, isLoading:false }); return data
    } catch (err) { const msg=err.response?.data?.error||'Registration failed'; set({ error:msg, isLoading:false }); throw new Error(msg) }
  },
  logout: () => { localStorage.removeItem('ibva_token'); localStorage.removeItem('ibva_user'); set({ user:null, token:null }) },
  clearError: () => set({ error:null }),
}))
export default useAuthStore
