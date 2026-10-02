import axios from 'axios'
const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'
const api = axios.create({ baseURL: API_BASE })
api.interceptors.request.use(config => { const t=localStorage.getItem('ibva_token'); if(t) config.headers.Authorization=`Bearer ${t}`; return config })
api.interceptors.response.use(res=>res, err => { if(err.response?.status===401){ localStorage.removeItem('ibva_token'); localStorage.removeItem('ibva_user'); window.location.href='/login' } return Promise.reject(err) })
export const authAPI      = { register:d=>api.post('/auth/register',d), login:d=>api.post('/auth/login',d), me:()=>api.get('/auth/me'), updateProfile:d=>api.put('/auth/profile',d) }
export const ideasAPI     = { list:p=>api.get('/ideas',{params:p}), get:id=>api.get(`/ideas/${id}`), create:d=>api.post('/ideas',d), update:(id,d)=>api.put(`/ideas/${id}`,d), delete:id=>api.delete(`/ideas/${id}`) }
export const analysisAPI  = { run:(id,p)=>api.post(`/analysis/${id}/run`,p), get:id=>api.get(`/analysis/${id}`), update:(id,d)=>api.put(`/analysis/${id}`,d) }
export const scenariosAPI = { get:id=>api.get(`/scenarios/${id}`) }
export const reportsAPI   = { generate:(id,fmt)=>api.post(`/reports/${id}/generate`,{format:fmt},{responseType:'blob'}), list:id=>api.get(`/reports/${id}`) }
export const chatAPI      = { send:(id,msg)=>api.post(`/chat/${id}`,{message:msg}), history:id=>api.get(`/chat/${id}`), clear:id=>api.delete(`/chat/${id}`) }
export const dashboardAPI = { get:()=>api.get('/dashboard') }
export default api
