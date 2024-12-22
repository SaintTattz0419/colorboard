<!--ApprovalLoan.vue-->
<template>
  <div class="approval-loan-container">
    <div class="header">
      <h1>貸出承認</h1>
      <button @click="goBackToDashboard" class="back-button">ダッシュボードへ戻る</button>
    </div>

    <div v-if="loading" class="loading">読み込み中...</div>
    <div v-else-if="error" class="error-message">{{ error }}</div>
    <div v-else>
      <table class="loan-table">
        <thead>
          <tr>
            <th class="transaction-id-column">トランザクションID</th>
            <th>申請日</th>
            <th class="color-code-column">カラーコード</th>
            <th class="material-type-column">素材タイプ</th>
            <th>色板タイプ</th>
            <th>CC担当者名</th>
            <th>貸出先CC</th>
            <th class="end-user-company-column">顧客会社名</th>
            <th>承認</th>
          </tr>
        </thead>
        <tbody>
          <tr class="record" v-for="tx in loanList" :key="tx.id" @dblclick="openColorModal(tx)">
            <td>{{ tx.data["transaction id"] }}</td>
            <td>{{ formatDate(tx.data["Request Date_CA OtD"]?.toDate()) }}</td>
            <td>{{ tx.data["color_code"] ? tx.data["color_code"].join(", ") : "" }}</td>
            <td>{{ tx.data["material_type"] }}</td>
            <td>{{ tx.data["plate_type"] || '' }}</td>
            <td>{{ tx.data["Customer Name"] }}</td>
            <td>{{ tx.data["Service Centre Name"] }}</td>
            <td>{{ tx.data["end_user_company"] }}</td>
            <td>
              <button @click="tryApproveLoan(tx)" class="approve-button">承認</button>
            </td>
          </tr>
        </tbody>
      </table>

      <div v-if="loanList.length === 0 && !message" class="no-requests">
        承認待ちの貸出リクエストはありません。
      </div>
    </div>

    <div v-if="message" class="success-message">{{ message }}</div>

    <!-- エラーモーダル -->
    <div v-if="showErrorModal" class="modal-overlay" @click="closeErrorModal">
      <div class="modal-content" @click.stop>
        <h2>エラー</h2>
        <p v-if="errorMessage">{{ errorMessage }}</p>
        <div class="button-group">
          <button @click="closeErrorModal" class="cancel-button">OK</button>
        </div>
      </div>
    </div>

    <!-- 色登録用モーダル -->
    <div v-if="showColorModal" class="modal-overlay" @click="closeColorModal">
      <div class="modal-content edit-modal" @click.stop>
        <h3 class="modal-title">色情報登録</h3>
        <div class="form-group">
          <label for="edit-color-code">カラーコード</label>
          <textarea id="edit-color-code" v-model="editColorCode" @input="toUpperCase" placeholder="カラーコードをカンマ区切りで入力"></textarea>
        </div>
        <div class="form-group">
          <label for="edit-plate-type">色板タイプ</label>
          <select id="edit-plate-type" v-model="editPlateType">
            <option value="">選択してください</option>
            <option value="基準板">基準板</option>
            <option value="ロット板">ロット板</option>
            <option value="基準板 & ロット板">基準板 & ロット板</option>
          </select>
        </div>
        <div class="modal-buttons">
          <button @click="saveChosenColors" class="save-button">保存</button>
          <button @click="closeColorModal" class="cancel-button">キャンセル</button>
        </div>
      </div>
    </div>
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

const showErrorModal = ref(false);
const errorMessage = ref('');

const showColorModal = ref(false);
const currentTx = ref(null);
const editColorCode = ref('');
const editPlateType = ref('');

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

function tryApproveLoan(tx) {
  errorMessage.value = '';
  if (!tx.data["color_code"] || tx.data["color_code"].length === 0) {
    errorMessage.value = 'カラーコードの追加が必要です。';
    showErrorModal.value = true;
    return;
  }
  if (!tx.data["plate_type"]) {
    errorMessage.value = '色板タイプの追加が必要です。';
    showErrorModal.value = true;
    return;
  }
  approveLoan(tx);
}

async function approveLoan(tx) {
  message.value = '';
  try {
    const docRef = doc(db, 'colorboards', tx.id);
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

function closeErrorModal() {
  showErrorModal.value = false;
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

function openColorModal(tx) {
  currentTx.value = tx;
  editColorCode.value = tx.data["color_code"] ? tx.data["color_code"].join(", ") : "";
  editPlateType.value = tx.data["plate_type"] || "";
  showColorModal.value = true;
}

function closeColorModal() {
  showColorModal.value = false;
  currentTx.value = null;
  editColorCode.value = '';
  editPlateType.value = '';
}

async function saveChosenColors() {
  if (!currentTx.value) return;

  try {
    const docRef = doc(db, 'colorboards', currentTx.value.id);
    await updateDoc(docRef, {
      "color_code": editColorCode.value ? editColorCode.value.split(',').map(code => code.trim().toUpperCase()) : [],
      "plate_type": editPlateType.value
    });
    message.value = 'カラーコードと色板タイプを更新しました。';
    closeColorModal();
    await fetchData();
  } catch (err) {
    console.error('Error:', err);
    error.value = 'カラーコードと色板タイプの更新中にエラーが発生しました。';
  }
}

// この関数を追加
function toUpperCase() {
  editColorCode.value = editColorCode.value.toUpperCase();
}
</script>

<style scoped>
.approval-loan-container {
  width: 75%;
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

.record{
  cursor: pointer;
}

.transaction-id-column {
  width: 11.5%;
}

.material-type-column{
  width: 8%;
}

.color-code-column{
  width: 15%;
}

.end-user-company-column{
  width: 15%;
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

/* モーダルスタイル */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0,0,0,0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
}

.modal-content {
  background-color: #f8f9fa;
  padding: 20px;
  border-radius: 8px;
  width: 300px;
  max-width: 90%;
  box-shadow: 0 4px 8px rgba(0,0,0,0.1);
  position: relative;
  text-align: center;
}

.modal-content h2 {
  margin-top: 0;
  margin-bottom: 10px;
  font-size: 18px;
}

.modal-content p {
  margin-bottom: 20px;
  font-size: 14px;
  color: #333;
}

.button-group {
  display: flex;
  justify-content: center;
  gap: 10px;
  margin-top: 10px;
}

.cancel-button {
  background-color: #b71c1c;
  color: #fff;
  border: none;
  padding: 6px 12px;
  border-radius: 4px;
  font-weight: bold;
  cursor: pointer;
  font-size: 12px;
}

.cancel-button:hover {
  background-color: #7f0000;
}

.modal-content.edit-modal {
  width: 400px; /* 幅を少し広げる */
}

.modal-title {
  font-size: 1.2rem;
  font-weight: bold;
  margin-bottom: 20px;
  color: #333;
}

.form-group {
  margin-bottom: 15px;
}

.form-group label {
  display: block;
  margin-bottom: 5px;
  font-weight: bold;
  text-align: left;
  color: #555;
}

.form-group textarea,
.form-group select {
  width: 95%; /* 幅を少し広げる */
  padding: 8px 12px;
  border: 1px solid #ccc;
  border-radius: 4px;
  box-sizing: border-box;
  font-size: 0.9rem;
  color: #333;
}

.form-group textarea {
  min-height: 80px;
  resize: vertical; /* 垂直方向のみリサイズ可能にする */
}

.modal-buttons {
  display: flex;
  justify-content: flex-end; /* ボタンを右端に寄せる */
  margin-top: 20px;
}

.modal-buttons button {
  padding: 8px 16px;
  border: none;
  border-radius: 4px;
  font-size: 0.9rem;
  cursor: pointer;
  transition: background-color 0.3s;
}

.modal-buttons .save-button {
  background-color: #4CAF50;
  color: white;
  margin-right: 10px;
}

.modal-buttons .save-button:hover {
  background-color: #45a049;
}

.modal-buttons .cancel-button {
  background-color: #aaa;
  color: white;
}

.modal-buttons .cancel-button:hover {
  background-color: #999;
}
</style>