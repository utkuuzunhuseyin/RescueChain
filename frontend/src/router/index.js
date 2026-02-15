import { createRouter, createWebHashHistory } from 'vue-router'
import Login from '../views/Login.vue'
import AdminPanel from '../views/AdminPanel.vue'
import StaffPanel from '../views/StaffPanel.vue'

const router = createRouter({
  // DİKKAT: Burada 'createWebHistory' yerine 'createWebHashHistory' kullanıyoruz.
  // Bu sayede linklerin içine '#' işareti gelecek ve sunucu karışıklığı bitecek.
  history: createWebHashHistory(),
  routes: [
    { path: '/', component: Login },
    { path: '/admin', component: AdminPanel },
    { path: '/staff/:id', component: StaffPanel } // Örn: /staff/1 (İstanbul)
  ]
})

export default router
