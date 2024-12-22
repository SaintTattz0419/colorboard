<template>
  <div class="container">
    <div class="header">
      <button @click="goBackToDashboard" class="back-button">ダッシュボードに戻る</button>
      <h1 class="main-title">CA OtD チャット</h1>
    </div>

    <div class="content-area">
      <!-- トランザクションリスト -->
      <div class="transaction-list">
        <h2 class="section-title">トランザクションリスト</h2>
        <div class="transaction-table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Transaction ID</th>
                <th>Color Code</th>
                <th>貸出先CC</th>
                <th>申請日時</th>
                <th>顧客会社名</th>
                <th>未読件数</th>
              </tr>
            </thead>
            <tbody>
              <tr 
                v-for="tx in transactions" 
                :key="tx.id" 
                @dblclick="startChat(tx)" 
                class="hover-row"
              >
                <td>{{ tx.data["transaction id"] }}</td>
                <td>{{ tx.data.color_code.join(', ') }}</td>
                <td>{{ tx.data["Service Centre Name"] }}</td>
                <td>{{ formatDate(tx.data["Request Date_CA OtD"]?.toDate()) }}</td>
                <td>{{ tx.data["end_user_company"] }}</td>
                <td>
                  <span v-if="tx.unreadCount > 0" class="unread-badge">未読{{ tx.unreadCount }}件</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- チャット表示部分 -->
      <div class="chat-area">
        <div v-if="currentTransaction" class="chat-header">
          <h2 class="section-title chat-title">チャット - {{ currentTransaction.data["transaction id"] }}</h2>
        </div>
        <div v-else class="chat-header">
          <h2 class="section-title chat-title">トランザクションをダブルクリックしてチャットを開始してください。</h2>
        </div>

        <!-- チャットログ -->
        <div v-if="currentTransaction" class="chat-log-container">
          <div 
            v-for="message in chatMessages" 
            :key="message.id" 
            :class="{'message-caotd': message.role === 'CA OtD', 'message-ccr': message.role === 'CCR'}"
            class="message-box"
          >
            <strong>{{ message.name }}:</strong> {{ message.message }}<br>
            <small>{{ formatDate(message.timestamp?.toDate()) }}</small>
          </div>
        </div>

        <!-- メッセージ入力 -->
        <div v-if="currentTransaction" class="message-input-area">
          <textarea 
            v-model="newMessage" 
            placeholder="メッセージを入力..." 
            @keyup.enter="sendMessage" 
            @keydown.enter.prevent="sendMessageWithCtrl($event)"
          ></textarea>
          <button @click="sendMessage" class="send-button">送信</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'; // onUnmounted を追加
import { db } from '../firebase';
import { collection, query, where, onSnapshot, addDoc, orderBy, Timestamp, updateDoc, getDocs, doc } from 'firebase/firestore';
import { useRouter } from 'vue-router';

const transactions = ref([]);
const currentTransaction = ref(null);
const chatMessages = ref([]);
const newMessage = ref('');
const router = useRouter();
const role = sessionStorage.getItem('role');
const name = sessionStorage.getItem('name');
const userId = sessionStorage.getItem('uid');

let unsubscribe = null; // onSnapshot の戻り値を格納する変数

// トランザクションリストを取得
onMounted(async () => {
  const q = query(collection(db, 'colorboards'), where('Status', '==', false));
  unsubscribe = onSnapshot(q, async (snapshot) => { // リスナーを登録し、戻り値(解除関数)を unsubscribe に格納
    transactions.value = await Promise.all(
      snapshot.docs.map(async (doc) => {
        const transaction = doc.data();
        const chatQuery = query(collection(db, `colorboards/${doc.id}/chat`));
        const chatSnapshot = await getDocs(chatQuery);

        let unreadCount = 0;
        chatSnapshot.forEach(chatDoc => {
          const chatData = chatDoc.data();
          if (!chatData.readby || !chatData.readby.includes(userId)) {
            unreadCount++;
          }
        });

        return {
          id: doc.id,
          data: transaction,
          unreadCount,
        };
      })
    );
  });
});

// コンポーネントがアンマウントされたときにリスナーを解除
onUnmounted(() => {
  if (unsubscribe) {
    unsubscribe(); // リスナーを解除
  }
});

// チャットを開始
function startChat(transaction) {
  currentTransaction.value = transaction;
  markMessagesAsRead(transaction.id);

  // チャットメッセージをリアルタイム取得
  const chatRef = collection(db, `colorboards/${transaction.id}/chat`);
  const chatQuery = query(chatRef, orderBy('timestamp', 'asc'));
  onSnapshot(chatQuery, (snapshot) => {
    chatMessages.value = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  });
}

// メッセージを既読にする
async function markMessagesAsRead(transactionId) {
  const chatQuery = query(collection(db, `colorboards/${transactionId}/chat`));
  const chatSnapshot = await getDocs(chatQuery);

  chatSnapshot.forEach(async (chatDoc) => {
    const chatData = chatDoc.data();
    // ログインユーザーがCA OtDの場合にのみ、readbyを更新
    if (role === 'CA OtD' && (!chatData.readby || !chatData.readby.includes(userId))) {
      const chatRef = doc(db, `colorboards/${transactionId}/chat`, chatDoc.id);
      await updateDoc(chatRef, {
        readby: chatData.readby ? [...chatData.readby, userId] : [userId],
      });
    }
  });
}

// メッセージを送信
async function sendMessage() {
  if (!newMessage.value.trim()) return;

  const chatRef = collection(db, `colorboards/${currentTransaction.value.id}/chat`);
  await addDoc(chatRef, {
    message: newMessage.value.trim(),
    name,
    role,
    readby: [userId],
    timestamp: Timestamp.fromDate(new Date()),
  });
  newMessage.value = ''; // 入力欄をクリア
}

function sendMessageWithCtrl(event) {
  if (event.ctrlKey) {
    sendMessage();
  }
}

function formatDate(date) {
  if (!date) return '';
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  const h = String(date.getHours()).padStart(2, '0');
  const min = String(date.getMinutes()).padStart(2, '0');
  return `${y}-${m}-${d} ${h}:${min}`;
}

function goBackToDashboard() {
  router.push('/');
}
</script>

<style scoped>
html, body {
  height: 100%;
  margin: 0;
  padding: 0;
}

body {
  display: flex;
  flex-direction: column;
  background: #fdfdfd;
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
}

.container {
  display: flex;
  flex-direction: column;
  flex: 1;
  height: 100vh;
  box-sizing: border-box;
  padding: 20px;
}

/* ヘッダ部分 */
.header {
  display: flex;
  align-items: center;
  justify-content: center; /* 中央寄せ */
  margin-bottom: 10px;
  position: relative;
}

.back-button {
  position: absolute;
  left: 10px;
  top: 70%;
  transform: translateY(-50%);
  background: linear-gradient(to right, #6b8e23, #556b2f);
  color: #fff;
  border: none;
  padding: 10px 15px;
  border-radius: 4px;
  font-weight: bold;
  box-shadow: 0 3px 6px rgba(0,0,0,0.1);
  cursor: pointer;
}

.back-button:hover {
  background: linear-gradient(to right, #7f9a3a, #667b30);
}

.main-title {
  font-size: 2rem;
  font-weight: bold;
  color: #333;
  text-shadow: 1px 1px 2px #aaa;
  margin: 0;
}

/* コンテンツエリアを全高活用 */
.content-area {
  display: flex;
  flex: 1;
  gap: 20px;
  overflow: hidden;
}

/* トランザクションリスト */
.transaction-list {
  width: 40%;
  border-right: 1px solid #ccc;
  padding: 10px;
  overflow-y: auto;
}

.section-title {
  font-size: 1.1rem;
  padding: 8px 0;
  font-weight: bold;
  color: #333;
  text-align: left;
  border-bottom: 2px solid #8B4513;
  margin-bottom: 20px;
  background: linear-gradient(to right, #8B4513, #a0522d);
  color: #fff;
  padding-left: 15px;
  border-radius: 4px;
}

.transaction-table-wrapper {
  box-shadow: 0 3px 6px rgba(0,0,0,0.1);
  border-radius: 4px;
  overflow: hidden;
}

table {
  width: 100%;
  border-collapse: collapse;
  background-color: #fff;
}

thead th {
  background-color: #8B4513;
  color: #fff;
  padding: 8px;
  text-align: left;
  font-weight: bold;
}

tbody td {
  padding: 8px;
  text-align: left;
  background-color: #fff;
}

.hover-row {
  background-color: #ffffff;
  transition: background-color 0.2s;
}

.hover-row:hover {
  cursor: pointer;
  background-color: #f0f0f5;
}

.unread-badge {
  color: red;
  font-weight: bold;
}

/* チャットエリア */
.chat-area {
  flex: 1; 
  display: flex; 
  flex-direction: column;
  padding: 10px;
  overflow: hidden;
}

.chat-header {
  margin-bottom: 10px;
}

.chat-title {
  font-size: 1.2rem;
  text-shadow: 1px 1px 2px #ccc;
  background: linear-gradient(to right, #2e8b57, #3cb371);
  color: #fff;
  padding: 7px;
  border-radius: 4px;
  margin: 0;
}

/* チャットログコンテナをフレキシブルに */
.chat-log-container {
  flex: 0.91;
  border: 1px solid #ccc;
  padding: 10px;
  overflow-y: auto;
  background: #eef5ee;
  border-radius: 5px;
  box-shadow: inset 0 3px 6px rgba(0,0,0,0.05);
}

/* メッセージスタイル */
.message-box {
  margin: 1px 0;
  padding: 6px;
  border-radius: 8px;
  max-width: 47%;
  word-wrap: break-word;
  line-height: 1.3;
  font-size: 0.95rem;
}

.message-caotd {
  background-color: #e3f2fd;
  text-align: left;
  border: 1px solid #90caf9;
  box-shadow: 0 1px 2px rgba(0,0,0,0.1);
}

.message-ccr {
  background-color: #fce4ec;
  text-align: right;
  margin-left: auto;
  border: 1px solid #f8bbd0;
  box-shadow: 0 1px 2px rgba(0,0,0,0.1);
}

/* メッセージ入力部分 */
.message-input-area {
  margin-top: 10px; 
  display: flex; 
  align-items: center; 
  gap:10px;
}

.message-input-area textarea {
  flex: 1; 
  padding: 10px; 
  resize: none; 
  height: 65px; 
  border: 1px solid #ccc; 
  border-radius: 4px;
  font-size: 0.95rem;
  box-sizing: border-box;
}

.send-button {
  padding: 15px 30px;
  background: linear-gradient(to right, #00695c, #00897b);
  color: #fff;
  border: none;
  border-radius: 4px;
  font-weight: bold;
  box-shadow: 0 3px 6px rgba(0,0,0,0.1);
  cursor: pointer;
}

.send-button:hover {
  background: linear-gradient(to right, #00796b, #009688);
}
</style>