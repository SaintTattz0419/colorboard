<template>
  <div class="approval-loan-container">
    <div class="header">
      <h1>貸出承認</h1>
      <button @click="goBackToDashboard" class="back-button">ダッシュボードに戻る</button>
    </div>

    <div v-if="loading" class="loading">読み込み中...</div>
    <div v-else-if="error" class="error-message">{{ error }}</div>
    <div v-else>
      <table class="loan-table">
        <thead>
          <tr>
            <th class="transaction-id-column">トランザクションID</th>
            <th>申請日</th>
            <th>色板タイプ</th>
            <th>カラーコード</th>
            <th>CC担当者名</th>
            <th>貸出先CC</th>
            <th>顧客会社名</th>
            <th>承認</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="tx in loanList" :key="tx.id">
            <td>{{ tx.data["transaction id"] }}</td>
            <td>{{ formatDate(tx.data["Request Date_CA OtD"]?.toDate()) }}</td>
            <td>{{ tx.data["plate_type"] || '' }}</td>
            <td>{{ tx.data["color_code"] ? tx.data["color_code"].join(", ") : "" }}</td>
            <td>{{ tx.data["Customer Name"] }}</td>
            <td>{{ tx.data["Service Centre Name"] }}</td>
            <td>{{ tx.data["end_user_company"] }}</td>
            <td>
              <button @click="approveLoan(tx.id)" class="approve-button">承認</button>
            </td>
          </tr>
        </tbody>
      </table>

      <div v-if="loanList.length === 0 && !message" class="no-requests">
        承認待ちの貸出リクエストはありません。
      </div>
    </div>

    <div v-if="message" class="success-message">{{ message }}</div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { db } from '../firebase';
import { collection, getDocs, doc, updateDoc, Timestamp } from 'firebase/firestore';
import { useRouter } from 'vue-router';

const router = useRouter();
const role = sessionStorage.getItem('role');
if (role !== 'CCR') {
  router.push('/login');
}

const loading = ref(true);
const error = ref('');
const loanList = ref([]);
const message = ref('');

onMounted(fetchData);

async function fetchData() {
  loading.value = true;
  error.value = '';
  loanList.value = [];
  message.value = '';
  try {
    const snap = await getDocs(collection(db, 'colorboards'));
    const tmp = [];
    snap.forEach((docSnap) => {
      const d = docSnap.data();
      if (d['Request Date_CA OtD'] && d['Approved Date_CCR'] === null) {
        tmp.push({ id: docSnap.id, data: d });
      }
    });
    loanList.value = tmp;
  } catch (err) {
    console.error('Error:', err);
    error.value = 'データ取得中にエラーが発生しました。';
  } finally {
    loading.value = false;
  }
}

async function approveLoan(id) {
  message.value = '';
  try {
    const docRef = doc(db, 'colorboards', id);
    await updateDoc(docRef, {
      'Approved Date_CCR': Timestamp.fromDate(new Date()),
    });
    message.value = '承認しました。';
    await fetchData();
  } catch (err) {
    console.error('Error:', err);
    error.value = '承認中にエラーが発生しました。';
  }
}

function goBackToDashboard() {
  router.push('/dashboard-ccr');
}

function formatDate(date) {
  if (!date) return '';
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}
</script>

<style scoped>
.approval-loan-container {
  width: 75%; /* Changed from max-width to width and set to 75% */
  margin: 0 auto;
  padding: 20px;
  background: #ffffff;
  border-radius: 8px;
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.1);
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.header h1 {
  font-size: 24px;
  color: #333;
}

.transaction-id-column {
  width: 12%;
}

.back-button {
  background: #1e90ff;
  color: white;
  border: none;
  padding: 10px 20px;
  border-radius: 5px;
  cursor: pointer;
  font-size: 14px;
}

.back-button:hover {
  background: #63a4ff;
}

.loan-table {
  width: 100%;
  border-collapse: collapse;
  margin-bottom: 20px;
}

.loan-table th {
  background: #4caf50;
  color: white;
  padding: 10px;
  text-align: left;
}

.loan-table td {
  padding: 10px;
  border-bottom: 1px solid #dddddd;
}

.loan-table tr:hover {
  background: #f9f9f9;
}

.approve-button {
  background: #4caf50;
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: 5px;
  cursor: pointer;
}

.approve-button:hover {
  background: #45a049;
}

.loading {
  text-align: center;
  font-size: 16px;
  color: #666;
}

.error-message {
  text-align: center;
  font-size: 16px;
  color: red;
}

.no-requests {
  text-align: center;
  font-size: 16px;
  color: #666;
}

.success-message {
  text-align: center;
  font-size: 16px;
  color: green;
}
</style>