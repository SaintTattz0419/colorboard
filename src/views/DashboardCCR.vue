<template>
  <div class="dashboard-container">
    <div class="dashboard-header">
      <h1 class="dashboard-title">CCR ダッシュボード</h1>
    </div>
    <div class="dashboard-buttons">
      <button @click="goApprovalLoan" class="dashboard-button">
        貸出承認
        <span v-if="loading" class="loading-count">(...)</span>
        <span v-else-if="error" class="error-count">(エラー)</span>
        <span v-else>
          <span style="color: white;">(</span><span :style="{ color: 'yellow' }">{{ approvalLoanCount }}</span><span style="color: white;">)</span>
        </span>
      </button>
      <button @click="goApprovalReturn" class="dashboard-button">
        返却承認
        <span v-if="returnLoading" class="loading-count">(...)</span>
        <span v-else-if="returnError" class="error-count">(エラー)</span>
        <span v-else>
          <span style="color: white;">(</span><span :style="{ color: 'yellow' }">{{ approvalReturnCount }}</span><span style="color: white;">)</span>
        </span>
      </button>
      <button @click="goAllRecords" class="dashboard-button">全履歴</button>
      <button @click="goChats" class="dashboard-button">チャット</button>
    </div>
    <DeadlineCCR />
  </div>
</template>

<script setup>
import { useRouter } from 'vue-router';
import DeadlineCCR from '../components/DeadlineCCR.vue';
import { ref, onMounted, provide, computed } from 'vue';
import { db } from '../firebase';
import { collection, getDocs, query, where } from 'firebase/firestore';

const router = useRouter();
const loading = ref(true);
const error = ref('');
const loanData = ref([]);
const returnLoading = ref(true);
const returnError = ref('');
const returnData = ref([]);

onMounted(async () => {
  await fetchData();
  await fetchReturnData();
});

async function fetchData() {
  loading.value = true;
  error.value = '';
  loanData.value = [];

  try {
    const snap = await getDocs(collection(db, 'colorboards'));
    const tmp = [];
    snap.forEach((docSnap) => {
      const d = docSnap.data();
      if (d['Request Date_CA OtD'] && d['Approved Date_CCR'] === null) {
        tmp.push({ id: docSnap.id, data: d });
      }
    });
    loanData.value = tmp;
  } catch (err) {
    console.error('Error:', err);
    error.value = 'データ取得中にエラーが発生しました。';
  } finally {
    loading.value = false;
  }
}

async function fetchReturnData() {
  returnLoading.value = true;
  returnError.value = '';
  returnData.value = [];

  try {
    // クエリを使って条件に合致するドキュメントを取得
    const q = query(
      collection(db, 'colorboards'),
      where('Status', '==', false),
      where('Approved Date_CCR', '!=', null)
    );
    const snap = await getDocs(q);
    const tmp = [];
    snap.forEach((docSnap) => {
      tmp.push({ id: docSnap.id, data: docSnap.data() });
    });
    returnData.value = tmp;
  } catch (err) {
    console.error('Error:', err);
    returnError.value = 'データ取得中にエラーが発生しました。';
  } finally {
    returnLoading.value = false;
  }
}

// 貸出承認が必要なレコード件数を算出
const approvalLoanCount = computed(() => {
  return loanData.value.length;
});

// 返却承認が必要なレコード件数を算出
const approvalReturnCount = computed(() => {
  return returnData.value.length;
});

// データを子コンポーネントに提供 (必要に応じて)
provide('loanData', loanData);
provide('returnData', returnData);

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
  background: #b80b22; /* 深い青色 */
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
  background: #17ac3c; /* 明るい青色 */
  box-shadow: 0 6px 12px rgba(0, 0, 0, 0.2);
  transform: translateY(-3px);
}

.dashboard-button:active {
  transform: translateY(0);
  box-shadow: 0 3px 8px rgba(0, 0, 0, 0.1);
}

/* ローディング・エラースタイル */
.loading-count, .error-count {
  color: #666;
  font-size: 0.8em;
}
</style>