<template>
  <div style="padding:20px;">
    <h1>CA OtD ダッシュボード</h1>
    <div>
      <button @click="goNewRequest">新規申請</button>
      <button @click="showReturnList">返却</button>
      <button @click="showAllHistory">全履歴</button>
      <button @click="openChat">チャット</button> <!-- チャットボタン追加 -->
    </div>

    <!-- 返却リスト表示部分 -->
    <div v-if="showReturnSection">
      <h2>返却可能なリスト</h2>
      <div v-if="loadingReturn">読み込み中...</div>
      <div v-else-if="errorReturn" style="color:red;">{{ errorReturn }}</div>
      <div v-else>
        <table border="1" cellpadding="5" style="border-collapse:collapse; width:100%; table-layout:auto;">
          <thead>
            <tr>
              <th style="width:120px; white-space:nowrap;">トランザクションID</th>
              <th style="width:120px; white-space:nowrap;">申請日</th>
              <th style="width:200px; white-space:nowrap;">カラーコード</th>
              <th style="width:150px; white-space:nowrap;">依頼者</th>
              <th style="width:150px; white-space:nowrap;">依頼組織</th>
              <th style="width:120px; white-space:nowrap;">状況</th>
              <th style="width:80px; white-space:nowrap;">選択</th>
            </tr>
          </thead>
          <tbody>
            <tr 
              v-for="tx in returnTransactions" 
              :key="tx.id"
              class="hover-row"
            >
              <td>{{ tx.data["transaction id"] }}</td>
              <td>{{ formatDate(tx.data["Request Date_CA OtD"].toDate()) }}</td>
              <td>{{ tx.data["color_code"] ? tx.data["color_code"].join(", ") : "" }}</td>
              <td>{{ tx.data["Customer Name"] }}</td>
              <td>{{ tx.data["Service Centre Name"] }}</td>
              <td :style="getStatusCellStyle(tx.data)">{{ getStatusText(tx.data) }}</td>
              <td><button @click="selectTransaction(tx.id)">選択</button></td>
            </tr>
          </tbody>
        </table>

        <div v-if="selectedTransactionId" style="margin-top: 20px;">
          <label>Actual Return Date：</label>
          <input type="date" v-model="actualReturnDateInput" required />
          <button @click="submitReturn">返却登録</button>
        </div>
      </div>
      <div v-if="messageReturn" style="color:green;">{{ messageReturn }}</div>
    </div>

    <!-- 全履歴表示部分 -->
    <div v-if="showAllHistorySection">
      <h2>全履歴</h2>
      <div v-if="loadingAll">読み込み中...</div>
      <div v-else-if="errorAll" style="color:red;">{{ errorAll }}</div>
      <div v-else>
        <table border="1" cellpadding="5" style="border-collapse:collapse; width:100%; table-layout:auto;">
          <thead>
            <tr>
              <th style="width:120px; white-space:nowrap;">トランザクションID</th>
              <th style="width:120px; white-space:nowrap;">申請日</th>
              <th style="width:200px; white-space:nowrap;">カラーコード</th>
              <th style="width:150px; white-space:nowrap;">依頼者</th>
              <th style="width:150px; white-space:nowrap;">依頼組織</th>
              <th style="width:120px; white-space:nowrap;">状況</th>
            </tr>
          </thead>
          <tbody>
            <tr 
              v-for="tx in allTransactions" 
              :key="tx.id"
              class="hover-row"
            >
              <td>{{ tx.data["transaction id"] }}</td>
              <td>{{ formatDate(tx.data["Request Date_CA OtD"].toDate()) }}</td>
              <td>{{ tx.data["color_code"] ? tx.data["color_code"].join(", ") : "" }}</td>
              <td>{{ tx.data["Customer Name"] }}</td>
              <td>{{ tx.data["Service Centre Name"] }}</td>
              <td :style="getStatusCellStyle(tx.data)">{{ getStatusText(tx.data) }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { db } from '../firebase'
import { collection, getDocs, query, where, doc, updateDoc, Timestamp } from 'firebase/firestore'
import { useRouter } from 'vue-router'

const router = useRouter()
const role = sessionStorage.getItem('role')
if (role !== 'CA OtD') {
  router.push('/login')
}

const showReturnSection = ref(false)
const loadingReturn = ref(false)
const errorReturn = ref('')
const returnTransactions = ref([])
const messageReturn = ref('')
const selectedTransactionId = ref('')
const actualReturnDateInput = ref('')

const showAllHistorySection = ref(false)
const loadingAll = ref(false)
const errorAll = ref('')
const allTransactions = ref([])

function goNewRequest() {
  router.push('/requests/new')
}

async function showReturnList() {
  showReturnSection.value = true
  showAllHistorySection.value = false
  loadingReturn.value = true
  errorReturn.value = ''
  messageReturn.value = ''
  returnTransactions.value = []

  try {
    const q = query(collection(db, 'colorboards'), where('Status', '==', false))
    const snap = await getDocs(q)
    const tmp = []
    snap.forEach(docSnap => {
      const d = docSnap.data()
      if (d["Approved Date_CCR"] !== null) {
        tmp.push({ id: docSnap.id, data: d })
      }
    })
    returnTransactions.value = tmp
    if (tmp.length === 0) {
      messageReturn.value = '返却可能なトランザクションはありません。'
    }
  } catch (err) {
    console.error(err)
    errorReturn.value = 'データ取得中にエラーが発生しました。'
  }
  loadingReturn.value = false
}

async function showAllHistory() {
  showAllHistorySection.value = true
  showReturnSection.value = false
  loadingAll.value = true
  errorAll.value = ''
  allTransactions.value = []

  try {
    const snap = await getDocs(collection(db, 'colorboards'))
    const tmp = []
    snap.forEach(docSnap => tmp.push({ id: docSnap.id, data: docSnap.data() }))
    allTransactions.value = tmp
    if (tmp.length === 0) {
      errorAll.value = '履歴がありません。'
    }
  } catch (err) {
    console.error(err)
    errorAll.value = '履歴取得中にエラーが発生しました。'
  }
  loadingAll.value = false
}

function openChat() {
  router.push('/chats-caotd'); // Chats.vue を表示
}

function formatDate(date) {
  if (!date) return ''
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function getStatusText(d) {
  if (!d["Approved Date_CCR"]) return "CCR承認要"
  if (!d["Actual Return Date"]) return "貸出中"
  if (!d["Return Check_CCR"]) return "CCR承認要"
  return "返却済"
}

function getStatusCellStyle(d) {
  const status = getStatusText(d)
  if (status === "貸出中") return { 'background-color': '#d93054', 'color': '#fff' }
  if (status === "CCR承認要") return { 'background-color': '#46c75d', 'color': '#fff' }
  return {}
}

function selectTransaction(id) {
  selectedTransactionId.value = id
}

async function submitReturn() {
  if (!selectedTransactionId.value) {
    errorReturn.value = 'トランザクションを選択してください。'
    return
  }
  if (!actualReturnDateInput.value) {
    errorReturn.value = 'Actual Return Dateを選択してください。'
    return
  }

  try {
    const docRef = doc(db, 'colorboards', selectedTransactionId.value)
    const chosenDate = new Date(actualReturnDateInput.value)
    await updateDoc(docRef, {
      "Actual Return Date": Timestamp.fromDate(chosenDate),
      "Status": true
    })
    messageReturn.value = '返却が登録されました。'
    await showReturnList()
  } catch (err) {
    console.error(err)
    errorReturn.value = '返却登録中にエラーが発生しました。'
  }
}
</script>

<style>
.hover-row:hover {
  cursor: pointer;
}
</style>
