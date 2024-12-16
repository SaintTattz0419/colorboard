<template>
  <header class="app-header">
    <h1 @click="goToDashboard" class="header-title">Color Board Management</h1>
    <button @click="logout" class="logout-button">ログアウト</button>
  </header>
</template>

<script setup>
import { useRouter } from 'vue-router'
const router = useRouter()

function logout() {
  sessionStorage.clear()
  router.push('/login')
}

function goToDashboard() {
  const role = sessionStorage.getItem('role')
  if (role === 'CA OtD') {
    router.push('/') // CA OtDのダッシュボード
  } else if (role === 'CCR') {
    router.push('/dashboard-ccr') // CCRのダッシュボード
  } else {
    router.push('/login') // ロールが不明な場合はログイン画面へ
  }
}
</script>

<style scoped>
/* Header用のCSS */
.app-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: linear-gradient(90deg, #b92b27, #1565c0);
  color: #ffffff;
  padding: 15px 20px;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
}

.header-title {
  cursor: pointer;
  font-size: 28px;
  font-weight: bold;
  text-shadow: 1px 1px 3px rgba(0, 0, 0, 0.3);
  margin: 0;
}

.logout-button {
  background: #065c06;
  color: white;
  border: none;
  padding: 10px 25px;
  cursor: pointer;
  border-radius: 25px;
  font-size: 16px;
  font-weight: bold;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  transition: all 0.3s ease;
}

.logout-button:hover {
  background: #3e92cc;
  transform: scale(1.05);
  box-shadow: 0 6px 10px rgba(0, 0, 0, 0.2);
}
</style>
