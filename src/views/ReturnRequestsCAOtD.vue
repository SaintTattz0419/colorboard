<template>
  <div class="return-container">
    <h2 class="title">返却可能なリスト</h2>
    <div v-if="loadingReturn" class="loading-message">読み込み中...</div>
    <div v-else-if="errorReturn" class="error-message">{{ errorReturn }}</div>
    <div v-else>
      <table class="styled-table">
        <thead>
          <tr>
            <th class="transaction-id-column">トランザクションID</th>
            <th>申請日</th>
            <th>カラーコード</th>
            <th>依頼者</th>
            <th>依頼組織</th>
            <th>状況</th>
            <th>返却</th>
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
            <td class="return-button-cell">
              <button class="return-button" @click="selectTransaction(tx.id)">選択</button>
            </td>
          </tr>
        </tbody>
      </table>

      <div v-if="selectedTransactionId" class="return-form">
        <label>Actual Return Date：</label>
        <input type="date" v-model="actualReturnDateInput" required />
        <button class="submit-button" @click="submitReturn">返却登録</button>
      </div>
    </div>
    <div v-if="messageReturn" class="success-message">{{ messageReturn }}</div>
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

<style scoped>
/* 全体のコンテナ */
.return-container {
  padding: 20px;
  font-family: 'Merriweather', serif; /* クラシックなフォント */
  background: linear-gradient(to bottom, #fdfcf9, #f7f4ed);
  color: #333;
  max-width: 65%; /* 全体幅を画面の60%に設定 */
  margin: 0 auto;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
}

/* タイトルのスタイル */
.title {
  font-size: 28px;
  text-align: center;
  font-weight: bold;
  color: #5b3923;
  margin-bottom: 20px;
  text-shadow: 1px 1px 3px rgba(0, 0, 0, 0.2);
}

/* テーブルのスタイル */
.styled-table {
  width: 100%;
  border-collapse: collapse;
  margin-bottom: 20px;
  text-align: left;
}

.styled-table th {
  background-color: #5b3923;
  color: #fff;
  padding: 12px;
  font-size: 16px;
  border: 1px solid #ddd;
}

.styled-table td {
  padding: 10px; /* レコード行の高さを調整 */
  border: 1px solid #ddd;
  font-size: 16px; /* 文字を少し大きく */
}

.styled-table tr:nth-child(even) {
  background-color: #f7f4ed;
}

.styled-table tr:hover {
  background-color: #f0e6d2;
}

/* 列幅の調整 */
.transaction-id-column {
  width: 14%; /* トランザクションIDの幅を大胆に狭める */
}

.styled-table th:nth-child(4), 
.styled-table th:nth-child(5),
.styled-table td:nth-child(4), 
.styled-table td:nth-child(5) {
  width: 15%; /* 依頼者と依頼組織の列幅を同じに設定 */
}

.return-button-cell {
  text-align: center; /* ボタンをセル中央に配置 */
}

.return-button {
  background-color: #7c513a;
  color: #fff;
  border: none;
  padding: 8px 12px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  font-weight: bold;
  transition: background-color 0.3s ease;
}

.return-button:hover {
  background-color: #5b3923;
}

/* エラーメッセージのスタイル */
.error-message {
  color: red;
  font-weight: bold;
  margin-top: 10px;
  text-align: center;
}

/* 成功メッセージのスタイル */
.success-message {
  color: green;
  font-weight: bold;
  margin-top: 10px;
  text-align: center;
}

/* フォームのスタイル */
.return-form {
  margin-top: 20px;
  display: flex;
  gap: 10px;
  align-items: center;
  justify-content: center;
}

.return-form input[type="date"] {
  padding: 6px;
  border: 1px solid #ccc;
  border-radius: 4px;
  font-size: 14px;
}

/* レスポンシブ対応 */
@media (max-width: 768px) {
  .styled-table th, .styled-table td {
    font-size: 12px;
    padding: 6px;
  }

  .return-form {
    flex-direction: column;
    gap: 5px;
  }

  .return-button {
    font-size: 12px;
    padding: 6px 10px;
  }
}
</style>