<template>
  <div style="padding:20px;">
    <h1>貸出承認</h1>
    <button @click="goBackToDashboard">ダッシュボードに戻る</button>
    <div v-if="loading">読み込み中...</div>
    <div v-else-if="error" style="color:red;">{{ error }}</div>
    <div v-else>
      <table border="1" cellpadding="5" style="border-collapse:collapse; width:100%;">
        <thead>
          <tr>
            <th style="width:100px;">トランザクションID</th>
            <th style="width:100px;">申請日</th>
            <th style="width:150px;">カラーコード</th>
            <th>依頼者</th>
            <th>依頼組織</th>
            <th style="width:80px;">承認</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="tx in loanList" :key="tx.id">
            <td>{{ tx.data["transaction id"] }}</td>
            <td>{{ formatDate(tx.data["Request Date_CA OtD"]?.toDate()) }}</td>
            <td>{{ tx.data["color_code"] ? tx.data["color_code"].join(", ") : "" }}</td>
            <td>{{ tx.data["Customer Name"] }}</td>
            <td>{{ tx.data["Service Centre Name"] }}</td>
            <td><button @click="approveLoan(tx.id)">承認</button></td>
          </tr>
        </tbody>
      </table>
      <div v-if="loanList.length === 0 && !message">承認待ちの貸出リクエストはありません。</div>
    </div>
    <div v-if="message" style="color:green;">{{ message }}</div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { db } from '../firebase'
import { collection, getDocs, doc, updateDoc, Timestamp } from 'firebase/firestore'
import { useRouter } from 'vue-router'

const router = useRouter()
const role = sessionStorage.getItem('role')
if (role !== 'CCR') {
  router.push('/login')
}

const loading = ref(true)
const error = ref('')
const loanList = ref([])
const message = ref('')

onMounted(fetchData)

async function fetchData() {
  loading.value = true
  error.value = ''
  loanList.value = []
  message.value = ''
  try {
    const snap = await getDocs(collection(db, 'colorboards'))
    const tmp = []
    snap.forEach(docSnap => {
      const d = docSnap.data()
      // デバッグ用ログ
      console.log('Check data:', d)
      // Request Date_CA OtDが存在 && Approved Date_CCRがnullのものを抽出
      if (d["Request Date_CA OtD"] && d["Approved Date_CCR"] === null) {
        tmp.push({id: docSnap.id, data: d})
      }
    })
    loanList.value = tmp
  } catch (err) {
    console.error(err)
    error.value = 'データ取得中にエラーが発生しました。'
  } finally {
    loading.value = false
  }
}

async function approveLoan(id) {
  message.value = ''
  try {
    const docRef = doc(db, 'colorboards', id)
    await updateDoc(docRef, {
      "Approved Date_CCR": Timestamp.fromDate(new Date())
    })
    message.value = '承認しました。'
    await fetchData()
  } catch (err) {
    console.error(err)
    error.value = '承認中にエラーが発生しました。'
  }
}

function goBackToDashboard() {
  router.push('/dashboard-ccr')
}

function formatDate(date) {
  if(!date) return ''
  const y = date.getFullYear()
  const m = String(date.getMonth()+1).padStart(2,'0')
  const d = String(date.getDate()).padStart(2,'0')
  return `${y}-${m}-${d}`
}
</script>
