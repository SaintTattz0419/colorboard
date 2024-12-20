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
          <tr v-for="tx in loanList" :key="tx.id" @dblclick="openColorModal(tx)">
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

    <!-- メールテンプレートモーダル -->
    <div v-if="showEmailModal" class="modal-overlay" @click="closeEmailModal">
      <div class="modal-content" @click.stop>
        <div class="modal-header">
          <h2>メールテンプレート</h2>
          <button class="copy-button" @click="copyTemplateToClipboard">
            コピー
          </button>
        </div>
        <pre>{{ emailTemplate }}</pre>
        <div class="button-group">
          <button @click="closeEmailModal" class="cancel-button">閉じる</button>
        </div>
      </div>
    </div>

    <!-- 色登録用モーダル -->
    <div v-if="showColorModal" class="modal-overlay" @click="closeColorModal">
      <div class="modal-content" @click.stop>
        <h3>色情報登録</h3>
        <p>カラーコードをカンマ区切りで登録してください。</p>
        <div class="color-options">
          <label for="edit-color-code">カラーコード:</label>
          <textarea id="edit-color-code" v-model="editColorCode" placeholder="カラーコードをカンマ区切りで入力"></textarea>
        </div>
        <div class="plate-type-options">
          <label for="edit-plate-type">色板タイプ:</label>
          <select id="edit-plate-type" v-model="editPlateType">
            <option value="">選択してください</option>
            <option value="基準板">基準板</option>
            <option value="ロット板">ロット板</option>
            <option value="基準板 & ロット板">基準板 & ロット板</option>
          </select>
        </div>
        <div class="modal-buttons">
          <button @click="saveChosenColors">保存</button>
          <button @click="closeColorModal">キャンセル</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { db } from '../firebase';
import { collection, getDocs, doc, updateDoc, Timestamp, query, where } from 'firebase/firestore';
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
const showEmailModal = ref(false);
const emailTemplate = ref('');
const approvedTransactionId = ref('');
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

    approvedTransactionId.value = tx.data["transaction id"];
    const caOtdUsers = await getCAOtDUsers();
    generateEmailTemplate(tx, caOtdUsers);

    await fetchData();
  } catch (err) {
    console.error('Error:', err);
    error.value = '承認中にエラーが発生しました。';
  }
}

async function getCAOtDUsers() {
  const users = [];
  try {
    const q = query(collection(db, "users"), where("role", "==", "CA OtD"));
    const querySnapshot = await getDocs(q);
    querySnapshot.forEach((doc) => {
      users.push(doc.data().Name);
    });
  } catch (err) {
    console.error("Error getting CA OtD users:", err);
  }
  return users;
}

function generateEmailTemplate(tx, caOtdUsers) {
  const caOtdNames = caOtdUsers.join("さん、");
  const colorCodes = tx.data["color_code"] ? tx.data["color_code"].join(", ") : "";

  emailTemplate.value = `
CA OtD ${caOtdNames}さん

お世話になっております。

${colorCodes}の色板貸し出しの準備が完了いたしました。

よろしくお願いいたします。
`;
  showEmailModal.value = true;
}

function closeErrorModal() {
  showErrorModal.value = false;
}

function closeEmailModal() {
  showEmailModal.value = false;
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

function copyTemplateToClipboard() {
  navigator.clipboard.writeText(emailTemplate.value)
    .then(() => {
      message.value = 'メールテンプレートをコピーしました！'
      setTimeout(() => {
        message.value = ''
      }, 2000)
    })
    .catch(err => {
      console.error('Failed to copy: ', err)
      error.value = 'コピーに失敗しました。'
      setTimeout(() => {
        error.value = ''
      }, 2000)
    })
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
      "color_code": editColorCode.value ? editColorCode.value.split(',').map(code => code.trim()) : [],
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

/* メールテンプレートモーダルのヘッダー */
.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
}

/* コピーボタン */
.copy-button {
  background-color: #00897b;
  color: #fff;
  border: none;
  border-radius: 4px;
  padding: 5px 10px;
  font-size: 12px;
  font-weight: bold;
  cursor: pointer;
}

.copy-button:hover {
  background-color: #00796b;
}

/* メールの件名 */
.email-subject {
  margin-bottom: 5px;
  font-size: 14px;
}

/* メールテンプレートのスタイル */
.modal-content pre {
  white-space: pre-wrap;
  font-family: 'Roboto', sans-serif;
  font-size: 14px;
  color: #333;
  margin-bottom: 20px;
}

/* 編集モーダルのスタイル */
.modal-content .form-group {
  margin-bottom: 15px;
}

.modal-content label {
  display: block;
  margin-bottom: 5px;
  font-weight: bold;
  text-align: left;
}

.modal-content input[type="text"],
.modal-content select {
  width: 90%;
  padding: 8px;
  border: 1px solid #ccc;
  border-radius: 4px;
  box-sizing: border-box;
}

.modal-content .button-group {
  display: flex;
  justify-content: space-between;
  margin-top: 20px;
}

.modal-content .save-button {
  background-color: #4caf50;
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: 5px;
  cursor: pointer;
  font-size: 14px;
}

.modal-content .save-button:hover {
  background-color: #45a049;
}

.modal-buttons button {
  margin-top: 10px;
  padding: 5px 10px;
  border: none;
  border-radius: 5px;
  background-color: #00695c;
  color: white;
  cursor: pointer;
}

.modal-buttons button:hover {
  background-color: #00796b;
}

.color-options {
  margin-bottom: 15px;
}

.plate-type-options {
  margin-bottom: 15px;
}
</style>