<template>
    <div>
      <h2>全履歴</h2>
      <div v-if="loadingAll">読み込み中...</div>
      <div v-else-if="errorAll" style="color:red;">{{ errorAll }}</div>
      <div v-else>
        <table border="1" cellpadding="5" style="border-collapse:collapse; width:100%; table-layout:auto;">
          <thead>
            <tr>
              <th>トランザクションID</th>
              <th>申請日</th>
              <th>カラーコード</th>
              <th>依頼者</th>
              <th>依頼組織</th>
              <th>状況</th>
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
  </template>
  
  <script setup>
  import { ref, onMounted } from 'vue';
  import { db } from '../firebase';
  import { collection, getDocs } from 'firebase/firestore';
  
  const allTransactions = ref([]);
  const loadingAll = ref(false);
  const errorAll = ref('');
  
  onMounted(async () => {
    await fetchAllHistory();
  });
  
  async function fetchAllHistory() {
    loadingAll.value = true;
    errorAll.value = '';
    allTransactions.value = [];
  
    try {
      const snap = await getDocs(collection(db, 'colorboards'));
      const tmp = [];
      snap.forEach(docSnap => tmp.push({ id: docSnap.id, data: docSnap.data() }));
      allTransactions.value = tmp;
      if (tmp.length === 0) {
        errorAll.value = '履歴がありません。';
      }
    } catch (err) {
      console.error(err);
      errorAll.value = '履歴取得中にエラーが発生しました。';
    }
    loadingAll.value = false;
  }
  
  function formatDate(date) {
    if (!date) return '';
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
  
  function getStatusText(d) {
    if (!d["Approved Date_CCR"]) return "CCR承認要";
    if (!d["Actual Return Date"]) return "貸出中";
    if (!d["Return Check_CCR"]) return "CCR承認要";
    return "返却済";
  }
  
  function getStatusCellStyle(d) {
    const status = getStatusText(d);
    if (status === "貸出中") return { 'background-color': '#d93054', 'color': '#fff' };
    if (status === "CCR承認要") return { 'background-color': '#46c75d', 'color': '#fff' };
    return {};
  }
  </script>
  