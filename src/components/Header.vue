<!--Header.vue-->
<template>
  <header class="app-header">
    <div class="logo-container" @click="goToDashboard">
      <div class="hexagon-container">
      </div>
      <h1 class="header-title">Color Board Management</h1>
    </div>
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
  background-color: #444; /* Darker background */
  background-image: linear-gradient(
      45deg,
      #555 25%,
      transparent 25%,
      transparent 75%,
      #555 75%,
      #555
    ),
    linear-gradient(
      45deg,
      #555 25%,
      transparent 25%,
      transparent 75%,
      #555 75%,
      #555
    ); /* Geometric pattern */
  background-size: 20px 20px;
  background-position: 0 0, 10px 10px;
  color: #fff;
  padding: 20px 30px;
  border-bottom: 5px solid #d40000;
}

.logo-container {
  display: flex;
  align-items: center;
  cursor: pointer;
}

.header-title {
  font-size: 26px;
  font-weight: bold;
  margin: 0;
  color: #fff;
  font-family: "Roboto", sans-serif; /* Modern font */
  text-shadow: 2px 2px 3px rgba(0, 0, 0, 0.5); /* Text shadow */
}

.logout-button {
  background-color: #d40000;
  color: #fff;
  border: none;
  padding: 10px 25px;
  cursor: pointer;
  border-radius: 20px;
  font-size: 14px;
  font-weight: bold;
  transition: all 0.3s ease;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.5); /* Button shadow */
}

.logout-button:hover {
  background-color: #ff2424;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.7); /* Enhanced shadow on hover */
}
</style>