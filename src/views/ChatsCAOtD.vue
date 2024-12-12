<template>
    <div style="padding:20px;">
      <h1>CA OtD チャット</h1>
      <button @click="goBackToDashboard" style="margin-bottom: 10px;">ダッシュボードに戻る</button>
  
      <div style="display: flex; height: 90vh;">
        <!-- トランザクションリスト -->
        <div style="width: 700px; border-right: 1px solid #ccc; padding: 10px; overflow-y: auto;">
          <h2>トランザクションリスト</h2>
          <table border="1" cellpadding="5" style="border-collapse:collapse; width:100%;">
            <thead>
              <tr>
                <th style="width:150px;">トランザクションID</th>
                <th style="width:120px;">カラーコード</th>
                <th style="width:180px;">依頼組織</th>
                <th style="width:180px;">申請日時</th>
                <th style="width:100px;">未読件数</th>
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
                <td>
                  <span v-if="tx.unreadCount > 0" style="color: red;">{{ tx.unreadCount }}</span>
                  <span v-else>既読</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
  
        <!-- チャット表示部分 -->
        <div style="flex: 1; padding: 10px; display: flex; flex-direction: column;">
          <h2 v-if="currentTransaction">チャット - {{ currentTransaction.data["transaction id"] }}</h2>
          <div v-else>トランザクションをダブルクリックしてチャットを開始してください。</div>
  
          <!-- チャットログ -->
          <div v-if="currentTransaction" style="flex: 1; border: 1px solid #ccc; padding: 10px; overflow-y: auto;">
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
          <div v-if="currentTransaction" style="margin-top: 10px; display: flex; align-items: center;">
            <textarea 
              v-model="newMessage" 
              placeholder="メッセージを入力..." 
              style="flex: 1; padding: 5px; margin-right: 10px; resize: none; height: 60px;"
              @keyup.enter="sendMessage" 
              @keydown.enter.prevent="sendMessageWithCtrl($event)"
            ></textarea>
            <button @click="sendMessage" style="padding: 10px 20px;">送信</button>
          </div>
        </div>
      </div>
    </div>
  </template>
  
  <script setup>
import { ref, onMounted } from 'vue';
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

// トランザクションリストを取得
onMounted(async () => {
  const q = query(collection(db, 'colorboards'), where('Status', '==', false));
  onSnapshot(q, async (snapshot) => {
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
    if (!chatData.readby || !chatData.readby.includes(userId)) {
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


  
  <style>
  .hover-row:hover {
    cursor: pointer;
    background-color: #f0f0f0;
  }
  .message-box {
    margin: 10px 0;
    padding: 10px;
    border-radius: 8px;
    max-width: 40%; /* チャットバブルの最大幅を調整 */
    word-wrap: break-word;
  }
  .message-caotd {
    background-color: #e3f2fd;
    text-align: left;
  }
  .message-ccr {
    background-color: #fce4ec;
    text-align: right;
    margin-left: auto;
  }
  </style>
  