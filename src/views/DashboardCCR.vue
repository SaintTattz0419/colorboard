<template>
  <div style="padding:20px;">
    <h1>CCRダッシュボード</h1>
    <button @click="goApprovalLoan">貸出承認</button>
    <button @click="goApprovalReturn">返却承認</button>
    <button @click="goAllRecords">全履歴</button> <!-- 全履歴ページへの遷移 -->
    <button @click="goChats">チャット</button> <!-- チャットページへの遷移 -->
  </div>
</template>

<script setup>
import { useRouter } from 'vue-router';

const router = useRouter();
const role = sessionStorage.getItem('role');
if (role !== 'CCR') {
  router.push('/login');
}

function goApprovalLoan() {
  router.push('/approval-loan');
}

function goApprovalReturn() {
  router.push('/approval-return');
}

function goAllRecords() {
  router.push('/all-records-ccr'); // 全履歴ページへの遷移
}

function goChats() {
  router.push('/chats-ccr'); // チャットページへの遷移
}
</script>
