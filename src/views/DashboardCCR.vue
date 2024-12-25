<!--DashboardCCR.vue-->
<template>
  <div class="dashboard-container">
    <div class="dashboard-header">
      <h1 class="dashboard-title">CCR ダッシュボード</h1>
    </div>
    <div class="dashboard-buttons">
      <button @click="goApprovalLoan" class="dashboard-button">
        貸出承認
        <span v-if="loanLoading" class="loading-count">(...)</span>
        <span v-else-if="loanError" class="error-count">(エラー)</span>
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
      <button @click="goChats" class="dashboard-button">
        チャット
        <span v-if="chatLoading" class="loading-count">(...)</span>
        <span v-else-if="chatError" class="error-count">(エラー)</span>
        <span v-else>
          <span style="color: white;">(</span><span :style="{ color: 'yellow' }">{{ unreadChatCount }}</span><span style="color: white;">)</span>
        </span>
      </button>
    </div>
    <DeadlineCCR />
  </div>
</template>

<script setup>
import { useRouter } from 'vue-router';
import DeadlineCCR from '../components/DeadlineCCR.vue';
import { ref, onMounted, provide, computed } from 'vue';
import { db } from '../firebase';
import { collection, getDocs, query, where, onSnapshot } from 'firebase/firestore';

const router = useRouter();
const loading = ref(true); // 全体ローディング
const error = ref(''); // 全体エラー

const loanLoading = ref(false);
const loanError = ref('');
const loanData = ref([]);

const returnLoading = ref(false);
const returnError = ref('');
const returnData = ref([]);

const chatLoading = ref(false);
const chatError = ref('');
const unreadChatCount = ref(0); // 初期値は0
const userId = ref(sessionStorage.getItem('uid'));

onMounted(async () => {
  await fetchData(); // データ取得はonMounted時にまとめる
});

async function fetchData() {
  loading.value = true; // ローディング状態にする
  error.value = '';
  loanData.value = [];
  returnData.value = [];

  // 貸出承認用データ取得
  loanLoading.value = true;
  loanError.value = '';
  try {
    const loanQuery = query(
      collection(db, 'colorboards'),
      where('Request Date_CA OtD', '!=', null),
      where('Approved Date_CCR', '==', null)
    );
    const loanSnap = await getDocs(loanQuery);
    loanData.value = loanSnap.docs.map(doc => ({ id: doc.id, data: doc.data() }));
  } catch (err) {
    console.error('Error fetching loan data:', err);
    loanError.value = '貸出承認データの取得中にエラーが発生しました。';
  } finally {
    loanLoading.value = false;
  }

  // 返却承認用データ取得
  returnLoading.value = true;
  returnError.value = '';
  try {
    const returnQuery = query(
      collection(db, 'colorboards'),
      where('Status', '==', false),
      where('Approved Date_CCR', '!=', null)
    );
    const returnSnap = await getDocs(returnQuery);
    returnData.value = returnSnap.docs.map(doc => ({ id: doc.id, data: doc.data() }));
  } catch (err) {
    console.error('Error fetching return data:', err);
    returnError.value = '返却承認データの取得中にエラーが発生しました。';
  } finally {
    returnLoading.value = false;
  }

  // 未読チャット件数取得
  await fetchUnreadChatCount();

  loading.value = false;
}

async function fetchUnreadChatCount() {
  chatLoading.value = true;
  chatError.value = '';
  unreadChatCount.value = 0; // 初期化

  try {
      const q = query(collection(db, 'colorboards'), where('Status', '==', false));
      onSnapshot(q, async (snapshot) => { //リアルタイム検知に変更
          let totalUnreadCount = 0;

          for (const doc of snapshot.docs) {
              const transaction = doc.data();
              const chatQuery = query(collection(db, `colorboards/${doc.id}/chat`));
              const chatSnapshot = await getDocs(chatQuery);

              let unreadCount = 0;
              if (!chatSnapshot.empty) {
                  chatSnapshot.forEach(chatDoc => {
                      const chatData = chatDoc.data();
                      if (!chatData.readby || !chatData.readby.includes(userId.value)) {
                          unreadCount++;
                      }
                  });
              }
              totalUnreadCount += unreadCount;
          }

          unreadChatCount.value = totalUnreadCount;
          chatLoading.value = false;
      });
  } catch (err) {
      console.error('Error fetching unread chat count:', err);
      chatError.value = '未読件数の取得中にエラーが発生しました。';
      chatLoading.value = false;
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

// データを子コンポーネントに提供
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
  background: linear-gradient(to bottom,#fcfbfb , #d1d0d0); /*#f5faf5,v#c3cfe2 */
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