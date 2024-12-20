// src/router/index.js
import { createRouter, createWebHistory } from 'vue-router'
import Login from '../views/Login.vue'
import DashboardCAOtD from '../views/DashboardCAOtD.vue'
import DashboardCCR from '../views/DashboardCCR.vue'
import NewRequest from '../views/NewRequest.vue'
import ApprovalLoan from '../views/ApprovalLoan.vue'
import ApprovalReturn from '../views/ApprovalReturn.vue'
import ChatsCAOtD from '../views/ChatsCAOtD.vue'
import ChatsCCR from '../views/ChatsCCR.vue'
import AllRecordsCCR from '../views/AllRecordsCCR.vue'
//import ReturnRequestsCAOtD from '../views/ReturnRequestsCAOtD.vue'
import AllRecordsCAOtD from '../views/AllRecordsCAOtD.vue'


const routes = [
  { path: '/login', component: Login },
  // ログイン後は直接DashboardCAOtDへ。CA OtD専用ページとする
  //{ path: '/', component: DashboardCAOtD, meta: { requiresAuth: true } },
  { path: '/', component: DashboardCAOtD, meta: { requiresAuth: true }  },
  { path: '/dashboard-ccr', component: DashboardCCR, meta: { requiresAuth: true } },
  { path: '/requests/new', component: NewRequest, meta: { requiresAuth: true } },
  { path: '/approval-loan', component: ApprovalLoan, meta: { requiresAuth: true } },
  { path: '/approval-return', component: ApprovalReturn, meta: { requiresAuth: true } },
  { path: '/chats-caotd', component: ChatsCAOtD, meta: { requiresAuth: true } },
  { path: '/chats-ccr', component: ChatsCCR, meta: { requiresAuth: true } },
  { path: '/all-records-ccr', component: AllRecordsCCR, meta: { requiresAuth: true, role: 'CCR' } },
  //{ path: '/return-requests-caotd', component: ReturnRequestsCAOtD,  },
  { path: '/all-records-caotd', component: AllRecordsCAOtD },
  
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

// シンプルなガード例
router.beforeEach((to, from, next) => {
  const uid = sessionStorage.getItem('uid')
  const role = sessionStorage.getItem('role')

  if (to.meta.requiresAuth && !uid) {
    next('/login')
  } else {
    // CA OtD専用ページのチェック
    if (to.path.startsWith('/requests') || to.path === '/') {
      if (role !== 'CA OtD') {
        next('/login')
      } else {
        next()
      }
    }
    // CCR専用ページのチェック
    else if (to.path.startsWith('/dashboard-ccr') || to.path === '/dashboard-ccr') {
      if (role !== 'CCR') {
        next('/login')
      } else {
        next()
      }
    } else {
      next()
    }
  }
})

export default router
