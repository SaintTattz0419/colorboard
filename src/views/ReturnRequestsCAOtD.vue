<template>
    <div>
      <h2>返却可能なリスト</h2>
      <div v-if="loadingReturn">読み込み中...</div>
      <div v-else-if="errorReturn" style="color:red;">{{ errorReturn }}</div>
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
              <th>選択</th>
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
  </template>
  
  <script setup>
  import { ref, onMounted } from 'vue';
  import { db } from '../firebase';
  import { collection, getDocs, query, where, doc, updateDoc, Timestamp } from 'firebase/firestore';
  
  const returnTransactions = ref([]);
  const loadingReturn = ref(false);
  const errorReturn = ref('');
  const messageReturn = ref('');
  const selectedTransactionId = ref('');
  const actualReturnDateInput = ref('');
  
  onMounted(async () => {
    await fetchReturnList();
  });
  
  async function fetchReturnList() {
    loadingReturn.value = true;
    errorReturn.value = '';
    messageReturn.value = '';
    returnTransactions.value = [];
  
    try {
      const q = query(collection(db, 'colorboards'), where('Status', '==', false));
      const snap = await getDocs(q);
      const tmp = [];
      snap.forEach(docSnap => {
        const d = docSnap.data();
        if (d["Approved Date_CCR"] !== null) {
          tmp.push({ id: docSnap.id, data: d });
        }
      });
      returnTransactions.value = tmp;
      if (tmp.length === 0) {
        messageReturn.value = '返却可能なトランザクションはありません。';
      }
    } catch (err) {
      console.error(err);
      errorReturn.value = 'データ取得中にエラーが発生しました。';
    }
    loadingReturn.value = false;
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
  
  function selectTransaction(id) {
    selectedTransactionId.value = id;
  }
  
  async function submitReturn() {
    if (!selectedTransactionId.value) {
      errorReturn.value = 'トランザクションを選択してください。';
      return;
    }
    if (!actualReturnDateInput.value) {
      errorReturn.value = 'Actual Return Dateを選択してください。';
      return;
    }
  
    try {
      const docRef = doc(db, 'colorboards', selectedTransactionId.value);
      const chosenDate = new Date(actualReturnDateInput.value);
      await updateDoc(docRef, {
        "Actual Return Date": Timestamp.fromDate(chosenDate),
        "Status": true
      });
      messageReturn.value = '返却が登録されました。';
      await fetchReturnList();
    } catch (err) {
      console.error(err);
      errorReturn.value = '返却登録中にエラーが発生しました。';
    }
  }
  </script>
  