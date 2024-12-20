<!--ReturnRequest.vue-->
<template>
 <!--<div class="return-container">
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
            <th>素材タイプ</th>
            <th>色板タイプ</th>
            <th>CC担当者名</th>
            <th>貸出先CC</th>
            <th>顧客会社名</th>
            <th>状況</th>
            <th class="color-registration-column">色登録</th>
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
            <td>{{ formatDate(tx.data["Request Date_CA OtD"]?.toDate()) }}</td>
            <td>{{ tx.data["color_code"] ? tx.data["color_code"].join(", ") : "" }}</td>
            <td>{{ tx.data["material_type"] }}</td>
            <td>{{ tx.data["plate_type"] || "" }}</td>
            <td>{{ tx.data["Customer Name"] }}</td>
            <td>{{ tx.data["Service Centre Name"] }}</td>
            <td>{{ tx.data["end_user_company"] }}</td>
            <td :style="getStatusCellStyle(tx.data)">{{ getStatusText(tx.data) }}</td>
            <td>-->
              <!-- ラジオボタンで「単・複数色」or「新規色作成」を選択 
              <div class="radio-group">
                <label>
                  <input 
                    type="radio" 
                    name="colorChoice-{{tx.id}}" 
                    value="multi" 
                    v-model="colorMode[tx.id]"
                    @change="onColorModeChange(tx.id)"
                  >
                  単・複数色
                </label>
                <label>
                  <input 
                    type="radio" 
                    name="colorChoice-{{tx.id}}" 
                    value="new" 
                    v-model="colorMode[tx.id]"
                    @change="onColorModeChange(tx.id)"
                  >
                  新規色作成
                </label>
              </div>-->

              <!-- 単・複数色選択時 
              <div v-if="colorMode[tx.id] === 'multi'">
                <div v-if="!(chosenColors[tx.id] && chosenColors[tx.id].length) || chosenColors[tx.id].includes('新規色作成')">-->
                  <!-- 色が未選択の場合や「新規色作成」が含まれる場合はクリア
                  <button class="set-color-button" @click.stop="openColorModal(tx.id, tx.data.color_code)">色登録</button>
                </div>
                <div v-else> -->
                  <!-- 選択済みの色を表示 
                  <span class="chosen-colors">{{ chosenColors[tx.id].join(", ") }}</span>
                  <button class="set-color-button" @click.stop="openColorModal(tx.id, tx.data.color_code)">再設定</button>
                </div>
              </div>-->

              <!-- 新規色作成選択時 
              <div v-else-if="colorMode[tx.id] === 'new'">
                <span class="chosen-colors">新規色作成</span>
              </div>
            </td>
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
    <div v-if="messageReturn" class="success-message">{{ messageReturn }}</div>-->

    <!-- 色登録用モーダル 
    <div v-if="showColorModal" class="modal-overlay" @click="closeColorModal">
      <div class="modal-content" @click.stop>
        <h3>色登録</h3>
        <p>カラーコードから複数選択、または「新規色作成」を選択してください。</p>
        <div class="color-options">
          <label 
            v-for="c in currentColorOptions" 
            :key="c" 
            class="color-option"
          >
            <input 
              type="checkbox" 
              :value="c" 
              v-model="tempChosenColors" 
              :disabled="c === '新規色作成' && tempChosenColors.length > 0 && !tempChosenColors.includes('新規色作成')"
            >
            {{ c }}
          </label>
        </div>
        <div class="modal-buttons">
          <button @click="saveChosenColors">保存</button>
          <button @click="closeColorModal">キャンセル</button>
        </div>
      </div>
    </div>
  </div>-->
</template>

<script setup>
/*import { ref, onMounted } from 'vue';
import { db } from '../firebase';
import { collection, getDocs, query, where, doc, updateDoc, Timestamp } from 'firebase/firestore';

const returnTransactions = ref([]);
const loadingReturn = ref(false);
const errorReturn = ref('');
const messageReturn = ref('');
const selectedTransactionId = ref('');
const actualReturnDateInput = ref('');
const chosenColors = ref({}); // 各トランザクションごとの設定色
const showColorModal = ref(false);
const currentTxId = ref('');
const currentColorOptions = ref([]);
const tempChosenColors = ref([]);
const colorMode = ref({}); // 各トランザクション毎に 'multi' or 'new' を保持

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
    } else {
      tmp.forEach(tx => {
        if (!chosenColors.value[tx.id]) {
          chosenColors.value[tx.id] = [];
        }
        // 初期値は単・複数色を選択状態に
        if (!colorMode.value[tx.id]) {
          colorMode.value[tx.id] = 'multi';
        }
      });
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
  if (!chosenColors.value[id]) {
    chosenColors.value[id] = [];
  }
}

function openColorModal(id, colors) {
  currentTxId.value = id;
  currentColorOptions.value = [...(colors || []), "新規色作成"];
  tempChosenColors.value = [...(chosenColors.value[id] || [])];
  showColorModal.value = true;
}

function closeColorModal() {
  showColorModal.value = false;
  currentTxId.value = '';
  currentColorOptions.value = [];
  tempChosenColors.value = [];
}

function saveChosenColors() {
  // 新規色作成が含まれる場合は、それ以外はクリア
  if (tempChosenColors.value.includes("新規色作成")) {
    tempChosenColors.value = ["新規色作成"];
  }
  chosenColors.value[currentTxId.value] = [...tempChosenColors.value];
  closeColorModal();
}

function onColorModeChange(id) {
  // モードが「新規色作成」に切り替わった場合、他の色はクリア
  if (colorMode.value[id] === 'new') {
    chosenColors.value[id] = [];
  }
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
    const chosen = chosenColors.value[selectedTransactionId.value] || [];
    let finalChosenColor = chosen;

    // 新規色作成が選ばれていた場合はnullを登録
    if (colorMode.value[selectedTransactionId.value] === 'new' || chosen.includes("新規色作成")) {
      finalChosenColor = null;
    }

    const chosenDate = new Date(actualReturnDateInput.value);
    await updateDoc(docRef, {
      "Actual Return Date": Timestamp.fromDate(chosenDate),
      "Status": true,
      "chosen_color": finalChosenColor
    });
    messageReturn.value = '返却が登録されました。';
    await fetchReturnList();
    selectedTransactionId.value = '';
    actualReturnDateInput.value = '';
  } catch (err) {
    console.error(err);
    errorReturn.value = '返却登録中にエラーが発生しました。';
  }
}*/
</script>

<style scoped>
.return-container {
  padding: 20px;
  font-family: 'Arial', serif; /*Merriweather*/
  background: linear-gradient(to bottom, #fdfcf9, #f7f4ed);
  color: #000000;
  max-width: 80%; /* 幅を拡大 */
  margin: 0 auto;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
}

.title {
  font-size: 28px;
  text-align: center;
  font-weight: bold;
  color: #5b3923;
  margin-bottom: 20px;
  text-shadow: 1px 1px 3px rgba(0, 0, 0, 0.2);
}

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
  font-size: 14px;
  border: 1px solid #ddd;
  text-transform: uppercase;
}

.styled-table td {
  padding: 10px;
  border: 1px solid #ddd;
  font-size: 14px;
}

.styled-table tr:nth-child(even) {
  background-color: #f7f4ed;
}

.styled-table tr:hover {
  background-color: #f0e6d2;
}

.transaction-id-column {
  width: 11%;
}

.color-registration-column {
  width: 20%; /* 色登録カラムの幅を広げる */
}

.return-button-cell {
  text-align: center;
}

.return-button {
  background-color: #7c513a;
  color: #fff;
  border: none;
  padding: 6px 10px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
  font-weight: bold;
}

.return-button:hover {
  background-color: #5b3923;
}

.error-message {
  color: red;
  font-weight: bold;
  margin-top: 10px;
  text-align: center;
}

.success-message {
  color: green;
  font-weight: bold;
  margin-top: 10px;
  text-align: center;
}

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

.submit-button {
  background-color: #7c513a;
  color: #fff;
  border: none;
  padding: 6px 10px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
  font-weight: bold;
}

.submit-button:hover {
  background-color: #5b3923;
}

.set-color-button {
  background-color: #8b6a5e;
  color: #fff;
  border: none;
  padding: 4px 8px;
  font-size: 12px;
  border-radius: 4px;
  cursor: pointer;
}

.set-color-button:hover {
  background-color: #5b3923;
}

.radio-group {
  margin-bottom: 8px;
  display: flex;
  gap: 10px;
}

.radio-group label {
  font-size: 12px;
  cursor: pointer;
}

.radio-group input[type="radio"] {
  margin-right: 4px;
}

.chosen-colors {
  font-size: 12px;
  color: #333;
  margin-right: 5px;
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
  max-width: 300px;
  width: 90%;
  box-shadow: 0 4px 8px rgba(0,0,0,0.1);
  text-align: center;
}

.modal-content h3 {
  margin-top: 0;
  margin-bottom: 10px;
  font-size: 16px;
}

.modal-content p {
  font-size: 12px;
  margin-bottom: 10px;
}

.color-options {
  text-align: left;
  max-height: 150px;
  overflow-y: auto;
  margin-bottom: 20px;
}

.color-option {
  display: block;
  margin-bottom: 5px;
  font-size: 12px;
}

.color-option input[type="checkbox"] {
  margin-right: 4px;
}

.modal-buttons {
  display: flex;
  gap: 10px;
  justify-content: center;
}

.modal-buttons button {
  background-color: #7c513a;
  color: #fff;
  border: none;
  padding: 6px 12px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
  font-weight: bold;
}

.modal-buttons button:hover {
  background-color: #5b3923;
}

@media (max-width: 768px) {
  .styled-table th, .styled-table td {
    font-size: 10px;
    padding: 5px;
  }

  .return-button, .submit-button, .set-color-button {
    font-size: 10px;
    padding: 4px 6px;
  }

  .radio-group label {
    font-size: 10px;
  }

  .chosen-colors {
    font-size: 10px;
  }

  .modal-content {
    max-width: 250px;
  }

  .color-option {
    font-size: 10px;
  }
}
</style>
