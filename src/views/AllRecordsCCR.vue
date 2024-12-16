<template>
    <div style="padding:20px;">
      <h1>全履歴</h1>
      <button @click="goBackToDashboard" style="margin-bottom: 10px;">ダッシュボードへ戻る</button> <!-- ダッシュボードへ戻るボタンを追加 -->
  
      <!-- フィルター -->
      <div style="margin-bottom: 10px;">
        <label>フィルター(トランザクションIDまたはカラーコード): </label>
        <input v-model="filterText" type="text" placeholder="検索ワードを入力">
      </div>
  
      <!-- ロード状態の表示 -->
      <div v-if="loadingAll">読み込み中...</div>
      <div v-else-if="errorAll" style="color:red;">{{ errorAll }}</div>
  
      <!-- テーブル -->
      <div v-else>
        <table border="1" cellpadding="5" style="border-collapse:collapse; width:100%; table-layout:auto;">
          <thead>
            <tr>
              <th style="width:120px; white-space:nowrap;">トランザクションID</th>
              <th style="width:120px; white-space:nowrap;">申請日</th>
              <th style="width:200px; white-space:nowrap;">カラーコード</th>
              <th style="width:150px; white-space:nowrap;">依頼組織</th>
              <th style="width:150px; white-space:nowrap;">依頼者</th>
              <th style="width:120px; white-space:nowrap;">返却予定日</th>
              <th style="width:150px; white-space:nowrap;">状況</th>
              <th>Note</th>
            </tr>
          </thead>
          <tbody>
            <tr 
              v-for="tx in filteredTransactions" 
              :key="tx.id"
              @dblclick="editRecord(tx.id)"
              class="hover-row"
            >
              <td>{{ tx.data["transaction id"] }}</td>
              <td>{{ formatDate(tx.data["Request Date_CA OtD"]?.toDate()) }}</td>
              <td>{{ tx.data["color_code"] ? tx.data["color_code"].join(", ") : "" }}</td>
              <td>{{ tx.data["Service Centre Name"] }}</td>
              <td>{{ tx.data["Customer Name"] }}</td>
              <td>{{ formatDate(tx.data["Return Date"]?.toDate()) }}</td>
              <td :style="getStatusCellStyle(tx.data)">{{ getStatusText(tx.data) }}</td>
              <td>{{ tx.data.note }}</td>
            </tr>
          </tbody>
        </table>
      </div>
  
      <!-- 編集モード -->
      <div v-if="editMode" style="position: fixed; top: 20%; left: 30%; width: 40%; background: #fff; border: 1px solid #333; padding: 20px;">
        <h2>レコード編集</h2>
        <div v-if="editData">
          <label>トランザクションID:</label> {{ editData["transaction id"] }}<br><br>
          <label>カラーコード:</label>
          <textarea v-model="editData['color_code_input']" placeholder="複数カラーコードをカンマ(,)で区切って入力"></textarea><br><br>
          <label>依頼組織:</label>
          <input v-model="editData['Service Centre Name']" type="text"><br><br>
          <label>依頼者:</label>
          <input v-model="editData['Customer Name']" type="text"><br><br>
          <label>返却予定日:</label>
          <input v-model="returnDateInput" type="date"><br><br>
          <label>状況:</label>
          <select v-model="editData['Status']">
            <option :value="true">返却済</option>
            <option :value="false">貸出中</option>
          </select><br><br>
          <label>Note:</label>
          <input v-model="editData['note']" type="text"><br><br>
          <button @click="updateRecord">更新</button>
          <button @click="cancelEdit">キャンセル</button>
        </div>
      </div>
  
      <!-- メッセージ -->
      <div v-if="message" style="color:green;">{{ message }}</div>
    </div>
  </template>
  
  <script setup>
  import { ref, computed } from 'vue';
  import { db } from '../firebase';
  import { collection, getDocs, doc, updateDoc, Timestamp } from 'firebase/firestore';
  import { useRouter } from 'vue-router';
  
  const router = useRouter();
  const loadingAll = ref(false);
  const errorAll = ref('');
  const allTransactions = ref([]);
  const message = ref('');
  const filterText = ref('');
  
  const editMode = ref(false);
  const editData = ref(null);
  let editDocId = null;
  const returnDateInput = ref('');
  
  function goBackToDashboard() {
    router.push('/dashboard-ccr'); // CCRダッシュボードへ戻る
  }
  
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
  
  fetchAllHistory();
  
  const filteredTransactions = computed(() => {
    const text = filterText.value.toLowerCase().trim();
    if (!text) return allTransactions.value;
    return allTransactions.value.filter(tx => {
      const txid = (tx.data["transaction id"] || '').toLowerCase();
      const colorCodes = (tx.data["color_code"] || []).join(',').toLowerCase();
      return txid.includes(text) || colorCodes.includes(text);
    });
  });
  
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
  
  function editRecord(id) {
    const record = allTransactions.value.find(tx => tx.id === id);
    if (record) {
      editMode.value = true;
      editData.value = { ...record.data, color_code_input: (record.data["color_code"] || []).join(", ") };
      editDocId = record.id;
      if (editData.value["Return Date"]) {
        const rDate = editData.value["Return Date"].toDate();
        returnDateInput.value = formatDate(rDate);
      } else {
        returnDateInput.value = '';
      }
    }
  }
  
  async function updateRecord() {
    if (!editDocId || !editData.value) return;
    try {
      const docRef = doc(db, 'colorboards', editDocId);
      const updatedColorCodes = editData.value.color_code_input.split(',').map(c => c.trim());
  
      let returnDateUpdate = null;
      if (returnDateInput.value) {
        const [y, m, d] = returnDateInput.value.split('-');
        returnDateUpdate = Timestamp.fromDate(new Date(Number(y), Number(m) - 1, Number(d)));
      }
  
      await updateDoc(docRef, {
        "color_code": updatedColorCodes,
        "Customer Name": editData.value["Customer Name"],
        "Service Centre Name": editData.value["Service Centre Name"],
        "Status": editData.value["Status"],
        "note": editData.value["note"] || null,
        "Return Date": returnDateUpdate
      });
      message.value = '更新されました。';
      await fetchAllHistory();
      cancelEdit();
    } catch (err) {
      console.error(err);
      errorAll.value = '更新中にエラーが発生しました。';
    }
  }
  
  function cancelEdit() {
    editMode.value = false;
    editData.value = null;
    editDocId = null;
    returnDateInput.value = '';
  }
  </script>
  
  <style scoped>
  .hover-row:hover {
    cursor: pointer;
  }
  </style>
  