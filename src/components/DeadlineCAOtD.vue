<!--DealineCAOtD.vue-->
<template>
  <div class="deadline-card">
    <h2>返却期限が近いレコード</h2>
    <div v-if="loading" class="loading-message">読み込み中...</div>
    <div v-else-if="errorMessage" class="error-message">{{ errorMessage }}</div>
    <div v-else>
      <table>
        <thead>
          <tr>
            <th class="transaction-id-column">トランザクションID</th>
            <th class="color-code-column">カラーコード</th>
            <th class="material-type-column">素材タイプ</th>
            <th class="plate-type-column">色板タイプ</th>
            <th>申請日</th>
            <th>CC担当者名</th>
            <th>貸出先CC</th>
            <th class="end-user-company-column">顧客会社名</th>
            <th>返却期限</th>
          </tr>
        </thead>
        <tbody>
          <tr 
            v-for="tx in transactions" 
            :key="tx.id"
            class="clickable-row" 
            @dblclick="openColorEditModal(tx)"
          >
            <td>{{ tx["transaction id"] }}</td>
            <td>{{ tx["color_code"]?.join(", ") }}</td>
            <td>{{ tx["material_type"] }}</td>
            <td>{{ tx["plate_type"] }}</td>
            <td>{{ formatDate(tx["Request Date_CA OtD"]?.toDate()) }}</td>
            <td>{{ tx["Customer Name"] }}</td>
            <td>{{ tx["Service Centre Name"] }}</td>
            <td>{{ tx["end_user_company"] }}</td>
            <td>
              {{ formatDate(tx["Return Date"]?.toDate()) }}
              <span v-if="daysLeft(tx['Return Date']) !== null">
                (残り
                <span :style="{ color: 'red', fontWeight: 'bold' }">{{ daysLeft(tx['Return Date']) }}日</span>)
              </span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- カラーコード編集モーダル -->
    <div v-if="showModal" class="modal-overlay" @click="closeModal">
      <div class="modal-content" @click.stop>
        <h2>カラーコード編集</h2>
        <p>トランザクションID: {{ currentRecord["transaction id"] }}</p>
        <div class="form-group">
          <label>カラーコードを追加：</label>
          <div class="color-input">
            <input 
              v-model="newCode" 
              type="text" 
              placeholder="カラーコードを入力 (大文字英字・数字のみ)" 
              @input="validateColorCode" 
            />
            <button type="button" @click="addColorCode">追加</button>
          </div>
        </div>
        <ul>
          <li v-for="(code, index) in editableColorCodes" :key="index">
            {{ code }}
            <button type="button" @click="removeColorCode(index)">削除</button>
          </li>
        </ul>
        <div class="button-group">
          <button @click="updateColorCodes" class="update-button">更新</button>
          <button @click="closeModal" class="cancel-button">キャンセル</button>
        </div>
        <div v-if="modalError" class="error-message">{{ modalError }}</div>
        <div v-if="modalMessage" class="success-message">{{ modalMessage }}</div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from "vue";
import { db } from "../firebase";
import { collection, query, where, getDocs, doc, updateDoc } from "firebase/firestore";

const transactions = ref([]);
const errorMessage = ref("");
const loading = ref(false);

const showModal = ref(false);
const currentRecord = ref(null);
const editableColorCodes = ref([]);
const newCode = ref('');
const modalError = ref('');
const modalMessage = ref('');

onMounted(async () => {
  loading.value = true;
  try {
    const q = query(collection(db, "colorboards"), where("Status", "==", false));
    const snap = await getDocs(q);

    transactions.value = snap.docs
      .map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }))
      .filter((tx) => tx["Return Date"])
      .sort((a, b) => a["Return Date"].toDate() - b["Return Date"].toDate());
  } catch (error) {
    console.error("Error fetching transactions:", error);
    errorMessage.value = "データの取得中にエラーが発生しました。";
  } finally {
    loading.value = false;
  }
});

function formatDate(date) {
  if (!date) return "";
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function daysLeft(returnDate) {
  if (!returnDate) return null;
  const today = new Date();
  const targetDate = returnDate.toDate();
  const diffTime = targetDate - today;
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

function openColorEditModal(record) {
  currentRecord.value = record;
  editableColorCodes.value = [...(record["color_code"] || [])];
  newCode.value = '';
  modalError.value = '';
  modalMessage.value = '';
  showModal.value = true;
}

function closeModal() {
  showModal.value = false;
  currentRecord.value = null;
  editableColorCodes.value = [];
  newCode.value = '';
  modalError.value = '';
  modalMessage.value = '';
}

function validateColorCode() {
  newCode.value = newCode.value.toUpperCase().replace(/[^A-Z0-9]/g, '')
}

function addColorCode() {
  if (newCode.value.trim() && !editableColorCodes.value.includes(newCode.value.trim())) {
    editableColorCodes.value.push(newCode.value.trim())
    newCode.value = ''
  }
}

function removeColorCode(index) {
  editableColorCodes.value.splice(index, 1)
}

async function updateColorCodes() {
  if (!currentRecord.value) return;
  
  try {
    const docRef = doc(db, 'colorboards', currentRecord.value.id);
    await updateDoc(docRef, {
      "color_code": editableColorCodes.value
    });
    modalMessage.value = 'カラーコードが更新されました。';
    // 現在のレコードにも反映させる
    currentRecord.value["color_code"] = [...editableColorCodes.value];

    // 全体のtransactionsも更新
    const idx = transactions.value.findIndex(tx => tx.id === currentRecord.value.id);
    if (idx > -1) {
      transactions.value[idx]["color_code"] = [...editableColorCodes.value];
    }
  } catch (err) {
    console.error(err);
    modalError.value = '更新中にエラーが発生しました。';
  }
}
</script>

<style scoped>
.deadline-card {
  width: 78%;
  margin: 1.5% auto;
  padding: 17px;
  background-color: #fff;
  border: 1px solid #ccc;
  border-radius: 8px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}

.loading-message,
.error-message {
  text-align: center;
  margin-top: 20px;
  font-size: 16px;
  color: #666;
}

table {
  width: 100%;
  border-collapse: collapse;
  text-align: left;
}

thead th {
  background-color: #8b135d;
  color: white;
  padding: 0.7%;
}

tbody td {
  padding: 0.7%;
  border-bottom: 1px solid #dddddd;
}

/* Hover時のカーソルをhand2(=pointer)にするため、tbody trにcursor: pointer; */
tbody tr:hover {
  background-color: #f9f9f9; 
  cursor: pointer;
}

.transaction-id-column {
  width: 11.5%; 
}

.color-code-column {
  width: 15%; 
}

.plate-type-column {
  width: 9%; 
}

.material-type-column{
  width: 8%;
}

.end-user-company-column{
  width: 14%;
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
  width: 400px;
  max-width: 90%;
  box-shadow: 0 4px 8px rgba(0,0,0,0.1);
  position: relative;
}

.modal-content h2 {
  margin-top: 0;
  margin-bottom: 10px;
  font-size: 18px;
}

.form-group {
  margin-bottom: 15px;
}

.form-group label {
  display: block;
  font-weight: bold;
  margin-bottom: 3px;
  color: #333;
}

.color-input {
  display: flex;
  gap: 10px;
}

.color-input input {
  flex: 1;
}

ul {
  list-style-type: none;
  padding: 0;
}

ul li {
  background-color: #e3f2fd;
  margin-bottom: 5px;
  border-radius: 4px;
  padding: 5px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

ul li button {
  background-color: #d93054;
  padding: 5px 10px;
  font-size: 12px;
}

ul li button:hover {
  background-color: #b71c1c;
}

.button-group {
  display: flex;
  gap: 10px;
  margin-top: 20px;
  justify-content: flex-end;
}

.update-button {
  background-color: #00897b;
  color: #fff;
  border: none;
  padding: 6px 12px;
  border-radius: 4px;
  font-weight: bold;
  cursor: pointer;
  font-size: 12px;
}

.update-button:hover {
  background-color: #00796b;
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

.success-message {
  text-align: center;
  margin-top: 10px;
  color: green;
  font-weight: bold;
}
</style>
