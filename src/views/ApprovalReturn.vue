<template>
  <div style="padding:20px;">
    <h1>返却承認</h1>
    <button @click="goBackToDashboard">ダッシュボードに戻る</button>
    <div v-if="loading">読み込み中...</div>
    <div v-else-if="error" style="color:red;">{{ error }}</div>
    <div v-else>
      <table border="1" cellpadding="5" style="border-collapse:collapse; width:100%; table-layout:auto;">
        <thead>
          <tr>
            <th style="width:120px; white-space:nowrap;">トランザクションID</th>
            <th style="width:120px; white-space:nowrap;">申請日</th>
            <th style="width:120px; white-space:nowrap;">返却日</th>
            <th style="width:200px; white-space:nowrap;">カラーコード</th>
            <th style="width:150px; white-space:nowrap;">依頼者</th>
            <th style="width:150px; white-space:nowrap;">依頼組織</th>
            <th style="width:80px; white-space:nowrap;">承認</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="tx in returnList" :key="tx.id" class="hover-row">
            <td>{{ tx.data["transaction id"] }}</td>
            <td>{{ formatDate(tx.data["Request Date_CA OtD"]?.toDate()) }}</td>
            <td>{{ formatDate(tx.data["Actual Return Date"]?.toDate()) }}</td>
            <td>{{ tx.data["color_code"] ? tx.data["color_code"].join(", ") : "" }}</td>
            <td>{{ tx.data["Customer Name"] }}</td>
            <td>{{ tx.data["Service Centre Name"] }}</td>
            <td><button @click="approveReturn(tx.id)">承認</button></td>
          </tr>
        </tbody>
      </table>
      <div v-if="returnList.length === 0 && !message">承認待ちの返却データはありません。</div>
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
const returnList = ref([])
const message = ref('')

onMounted(fetchData)

async function fetchData() {
  loading.value = true
  error.value = ''
  returnList.value = []
  try {
    const snap = await getDocs(collection(db, 'colorboards'))
    const tmp = []
    snap.forEach(docSnap => {
      const d = docSnap.data()
      // Actual Return Dateが入力済み && Return Check_CCRが未入力
      if (d["Actual Return Date"] && !d["Return Check_CCR"]) {
        tmp.push({ id: docSnap.id, data: d })
      }
    })
    returnList.value = tmp
    if (tmp.length === 0) {
      message.value = '承認待ちの返却データはありません。'
    }
  } catch (err) {
    console.error(err)
    error.value = 'データ取得中にエラーが発生しました。'
  }
  loading.value = false
}

async function approveReturn(id) {
  message.value = ''
  try {
    const docRef = doc(db, 'colorboards', id)
    await updateDoc(docRef, {
      "Return Check_CCR": Timestamp.fromDate(new Date())
    })
    message.value = '返却承認しました。'
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
  if (!date) return ''
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}
</script>

<style scoped>
.hover-row:hover {
  cursor: pointer;
}
</style>
