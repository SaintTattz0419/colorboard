<template>
  <div class="dashboard-container">
    <div class="dashboard-header">
      <h1 class="dashboard-title">CCR ダッシュボード</h1>
    </div>
    <div class="dashboard-buttons">
      <button @click="goApprovalLoan" class="dashboard-button">貸出承認</button>
      <button @click="goApprovalReturn" class="dashboard-button">返却承認</button>
      <button @click="goAllRecords" class="dashboard-button">全履歴</button>
      <button @click="goChats" class="dashboard-button">チャット</button>
    </div>
    <DeadlineCCR />
  </div>
</template>

<script setup>
import { useRouter } from 'vue-router';
import DeadlineCCR from '../components/DeadlineCCR.vue';

const router = useRouter();

function goApprovalLoan() {
  router.push('/approval-loan');
}

function goApprovalReturn() {
  router.push('/approval-return');
}

function goAllRecords() {
  router.push('/all-records-ccr');
}

function goChats() {
  router.push('/chats-ccr');
}
</script>

<style>
/* 全体の背景 */
body {
  margin: 0;
  padding: 0;
  font-family: Arial, sans-serif;
  background: linear-gradient(to bottom, #f5f7fa, #c3cfe2);
  min-height: 100vh;
}

/* ダッシュボードのコンテナ */
.dashboard-container {
  padding: 50px 20px; /* 上部にスペースを追加 */
}

/* ダッシュボードヘッダー */
.dashboard-header {
  text-align: center;
  margin-bottom: 40px;
}

/* タイトル */
.dashboard-title {
  font-size: 36px;
  font-weight: bold;
  color: #333;
  text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.1);
}

/* ボタンコンテナ */
.dashboard-buttons {
  display: flex;
  gap: 20px;
  flex-wrap: wrap;
  justify-content: center;
}

/* ボタンスタイル */
.dashboard-button {
  background: #1e3c72; /* 深い青色 */
  color: white;
  border: none;
  padding: 15px 30px;
  font-size: 16px;
  font-weight: bold;
  border-radius: 8px;
  cursor: pointer;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  transition: all 0.3s ease;
}

.dashboard-button:hover {
  background: #3e92cc; /* 明るい青色 */
  box-shadow: 0 6px 12px rgba(0, 0, 0, 0.2);
  transform: translateY(-3px);
}

.dashboard-button:active {
  transform: translateY(0);
  box-shadow: 0 3px 8px rgba(0, 0, 0, 0.1);
}
</style>
