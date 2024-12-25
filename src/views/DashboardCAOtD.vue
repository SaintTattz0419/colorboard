<!--DashboardCAOtD.vue-->
<template>
  <div class="dashboard-container">
    <div class="dashboard-header">
      <h1 class="dashboard-title">CA OtD ダッシュボード</h1>
    </div>
    <div class="dashboard-buttons">
      <button @click="goNewRequest" class="dashboard-button">新規申請</button>
      <!--<button @click="goReturnRequest" class="dashboard-button">返却</button>-->
      <button @click="goAllRecords" class="dashboard-button">全履歴</button>
      <button @click="openChat" class="dashboard-button">
        チャット
        <span v-if="chatLoading" class="loading-count">(...)</span>
        <span v-else-if="chatError" class="error-count">(エラー)</span>
        <span v-else>
          <span style="color: white;">(</span><span :style="{ color: 'yellow' }">{{ unreadChatCount }}</span><span style="color: white;">)</span>
        </span>
      </button>
    </div>
    <DeadlineCAOtD />
  </div>
</template>

<script setup>
import { useRouter } from 'vue-router';
import DeadlineCAOtD from '../components/DeadlineCAOtD.vue';
import { ref, onMounted, provide, computed } from 'vue';
import { db } from '../firebase';
import { collection, getDocs, query, where, onSnapshot } from 'firebase/firestore';

const router = useRouter();
const chatLoading = ref(true);
const chatError = ref('');
const unreadChatCount = ref(0); // 初期値は0
const userId = ref(sessionStorage.getItem('uid'));

onMounted(async () => {
  await fetchUnreadChatCount();
});

async function fetchUnreadChatCount() {
  chatLoading.value = true;
  chatError.value = '';
  unreadChatCount.value = 0; // 初期化

  try {
    const q = query(collection(db, 'colorboards'), where('Status', '==', false));
    onSnapshot(q, async (snapshot) => {
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

// 未読件数を子コンポーネントに提供
provide('unreadChatCount', unreadChatCount);

function goNewRequest() {
  router.push('/requests/new');
}

function goReturnRequest() {
  router.push('/return-requests-caotd');
}

function goAllRecords() {
  router.push('/all-records-caotd');
}

function openChat() {
  router.push('/chats-caotd');
}
</script>

<style scoped>
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
  background: #7a0947; /* 深い青色 */
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
  background: #b2cc3e; /* 明るい青色 */
  box-shadow: 0 6px 12px rgba(0, 0, 0, 0.2);
  transform: translateY(-3px);
}

.dashboard-button:active {
  transform: translateY(0);
  box-shadow: 0 3px 8px rgba(0, 0, 0, 0.1);
}

.loading-count, .error-count {
  color: #666;
  font-size: 0.8em;
}
</style>