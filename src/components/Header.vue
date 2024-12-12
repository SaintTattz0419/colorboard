<template>
    <header class="header">
      <!-- 左側：アプリ名 -->
      <div class="header-left">
        <h1 class="header-title" @click="goToDashboard">Color Board Management</h1>
      </div>
  
      <!-- 右側：ログアウトボタン -->
      <div class="header-right">
        <button class="logout-button" @click="logout">Log Out</button>
      </div>
    </header>
  </template>
  
  <script setup>
  import { useRouter } from 'vue-router'
  
  const router = useRouter()
  const role = sessionStorage.getItem('role') // ロールを取得
  
  function goToDashboard() {
    // ロールに基づいて遷移
    if (role === 'CCR') {
      router.push('/dashboard-ccr')
    } else if (role === 'CA OtD') {
      router.push('/')
    }
  }
  
  function logout() {
    sessionStorage.clear()
    router.push('/login')
  }
  </script>
  
  <style scoped>
  /* ヘッダー全体 */
  .header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    background: linear-gradient(to right, #4CAF50, #2E7D32); /* グラデーション背景 */
    color: white;
    padding: 15px 30px;
    box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
  }
  
  /* 左側コンテンツ */
  .header-left {
    display: flex;
    align-items: center;
  }
  
  /* タイトルのスタイル */
  .header-title {
    font-size: 1.5rem;
    cursor: pointer;
    transition: color 0.3s;
  }
  .header-title:hover {
    color: #c8e6c9; /* ホバー時の色 */
  }
  
  /* 右側コンテンツ */
  .header-right {
    display: flex;
    align-items: center;
  }
  
  /* ログアウトボタン */
  .logout-button {
    background: white;
    color: #4CAF50;
    border: 1px solid #4CAF50;
    border-radius: 5px;
    padding: 10px 20px;
    font-size: 0.9rem;
    cursor: pointer;
    transition: all 0.3s;
  }
  .logout-button:hover {
    background: #81C784;
    color: white;
  }
  </style>
  