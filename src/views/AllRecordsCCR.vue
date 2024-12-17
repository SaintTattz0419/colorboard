<template>
  <div class="container">
    <div class="header">
      <button @click="goBackToDashboard" class="back-button">ダッシュボードへ戻る</button>
      <h1 class="main-title">全履歴</h1>
    </div>

    <!-- フィルター群 -->
    <div class="filters">
      <div class="filter-group">
        <label>状況フィルター:</label>
        <select v-model="statusFilter">
          <option value="">すべて</option>
          <option value="CCR承認要">CCR承認要</option>
          <option value="貸出中">貸出中</option>
          <option value="返却済">返却済</option>
        </select>
      </div>
      <div class="filter-group">
        <label>申請日フィルター(YYYY-MM-DDで部分一致可):</label>
        <input v-model="requestDateFilter" type="text" placeholder="申請日で検索">
      </div>
      <div class="filter-group">
        <label>カラーコードフィルター:</label>
        <input v-model="colorCodeFilter" type="text" placeholder="カラーコードで検索">
      </div>
      <div class="filter-group">
        <label>色板タイプフィルター:</label>
        <input v-model="plateTypeFilter" type="text" placeholder="色板タイプで検索">
      </div>
      <div class="filter-group">
        <label>設定色フィルター:</label>
        <input v-model="chosenColorFilter" type="text" placeholder="設定色で検索">
      </div>
      <div class="filter-group">
        <label>依頼組織フィルター:</label>
        <input v-model="serviceCentreFilter" type="text" placeholder="依頼組織で検索">
      </div>
    </div>

    <div class="content-area">
      <div v-if="loadingAll" class="loading-message">読み込み中...</div>
      <div v-else-if="errorAll" class="error-message">{{ errorAll }}</div>
      <div v-else>
        <!-- ダウンロード画像アイコンをNote列上付近に配置 -->
        <div class="download-container">
          <img 
            src="../assets/download.png" 
            alt="Download Icon" 
            class="download-icon"
            @click="downloadCSV"
          >
        </div>
        <table class="styled-table">
          <thead>
            <tr>
              <th style="width:8%;">トランザクションID</th>
              <th style="width:8%;">申請日</th>
              <th style="width:14%;">カラーコード</th>
              <th style="width:8%;">色板タイプ</th>
              <th style="width:12%;">設定色</th>
              <th style="width:12%;">貸出先CC</th>
              <th style="width:10%;">CC担当者名</th>
              <th style="width:10%;">顧客会社名</th>
              <th style="width:8%;">返却予定</th>
              <th style="width:6%;">状況</th>
              <th style="width:22%;">Note</th>
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
              <td>{{ tx.data["plate_type"] || "" }}</td>
              <td>{{ tx.data["chosen_color"] ? tx.data["chosen_color"].join(", ") : "" }}</td>
              <td>{{ tx.data["Service Centre Name"] }}</td>
              <td>{{ tx.data["Customer Name"] }}</td>
              <td>{{ tx.data["end_user_company"] }}</td>
              <td>{{ formatDate(tx.data["Return Date"]?.toDate()) }}</td>
              <td :style="getStatusCellStyle(tx.data)">{{ getStatusText(tx.data) }}</td>
              <td>{{ tx.data.note }}</td>
            </tr>
          </tbody>
        </table>
        <div v-if="filteredTransactions.length === 0" class="no-data-message">該当するデータがありません。</div>
      </div>

      <!-- 編集モーダル -->
      <div v-if="editMode" class="modal-overlay" @click="cancelEdit">
        <div class="modal-content" @click.stop>
          <h2>レコード編集</h2>
          <div v-if="editData" class="edit-form">
            <div class="form-group">
              <label>トランザクションID:</label>
              <span>{{ editData["transaction id"] }}</span>
            </div>

            <div class="form-group">
              <label>カラーコード (カンマ区切り):</label>
              <textarea v-model="editData['color_code_input']" placeholder="複数カラーコードをカンマ(,)で区切って入力"></textarea>
            </div>

            <div class="form-group">
              <label>色板タイプ:</label>
              <input v-model="editData['plate_type_input']" type="text" placeholder="例: 基準板, ロット板">
            </div>

            <div class="form-group">
              <label>設定色 (カンマ区切り):</label>
              <textarea v-model="editData['chosen_color_input']" placeholder="複数設定色をカンマ(,)で区切って入力"></textarea>
            </div>

            <div class="form-group">
              <label>依頼組織:</label>
              <input v-model="editData['Service Centre Name']" type="text">
            </div>

            <div class="form-group">
              <label>依頼者:</label>
              <input v-model="editData['Customer Name']" type="text">
            </div>

            <div class="form-group">
              <label>返却予定日:</label>
              <input v-model="returnDateInput" type="date">
            </div>

            <div class="form-group">
              <label>状況:</label>
              <select v-model="editData['Status']">
                <option :value="true">返却済</option>
                <option :value="false">貸出中</option>
              </select>
            </div>

            <div class="form-group">
              <label>Note:</label>
              <input v-model="editData['note']" type="text">
            </div>

            <div class="button-group">
              <button @click="updateRecord" class="update-button">更新</button>
              <button @click="cancelEdit" class="cancel-button">キャンセル</button>
            </div>
          </div>
        </div>
      </div>

    </div>
    <div v-if="message" class="success-message">{{ message }}</div>
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

// フィルタ用
const statusFilter = ref('');
const requestDateFilter = ref('');
const colorCodeFilter = ref('');
const plateTypeFilter = ref('');
const chosenColorFilter = ref('');
const serviceCentreFilter = ref('');

const editMode = ref(false);
const editData = ref(null);
let editDocId = null;
const returnDateInput = ref('');

const role = sessionStorage.getItem('role');
const ccrName = sessionStorage.getItem('name'); // CCRログインユーザー名を取得

function goBackToDashboard() {
  router.push('/dashboard-ccr'); // CCRダッシュボードへ戻る
}

async function fetchAllHistory() {
  loadingAll.value = true;
  errorAll.value = '';
  allTransactions.value = [];
  message.value = '';

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

function formatDate(date) {
  if (!date) return '';
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

const filteredTransactions = computed(() => {
  return allTransactions.value.filter(tx => {
    const d = tx.data;

    // ステータスフィルター
    if (statusFilter.value) {
      const st = getStatusText(d);
      if (st !== statusFilter.value) return false;
    }

    // 申請日フィルター(部分一致)
    if (requestDateFilter.value && !formatDate(d["Request Date_CA OtD"]?.toDate()).includes(requestDateFilter.value)) {
      return false;
    }

    // カラーコードフィルター(部分一致)
    if (colorCodeFilter.value && !(d["color_code"] || []).join(", ").toLowerCase().includes(colorCodeFilter.value.toLowerCase())) {
      return false;
    }

    // 色板タイプフィルター(部分一致)
    if (plateTypeFilter.value && !(d["plate_type"] || '').toLowerCase().includes(plateTypeFilter.value.toLowerCase())) {
      return false;
    }

    // 設定色フィルター(部分一致)
    if (chosenColorFilter.value && !( (d["chosen_color"] || []).join(", ").toLowerCase().includes(chosenColorFilter.value.toLowerCase()) )) {
      return false;
    }

    // 依頼組織フィルター(部分一致)
    if (serviceCentreFilter.value && !( (d["Service Centre Name"] || '').toLowerCase().includes(serviceCentreFilter.value.toLowerCase()) )) {
      return false;
    }

    return true;
  });
});

function editRecord(id) {
  const record = allTransactions.value.find(tx => tx.id === id);
  if (record) {
    editMode.value = true;
    const color_code_str = (record.data["color_code"] || []).join(", ");
    const chosen_color_str = (record.data["chosen_color"] || []).join(", ");
    const plate_type_str = record.data["plate_type"] || '';

    editData.value = { 
      ...record.data,
      color_code_input: color_code_str,
      chosen_color_input: chosen_color_str,
      plate_type_input: plate_type_str
    };
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
    const updatedColorCodes = editData.value.color_code_input.split(',')
      .map(c => c.trim())
      .filter(c => c);
    const updatedChosenColors = editData.value.chosen_color_input.split(',')
      .map(c => c.trim())
      .filter(c => c);
    const updatedPlateType = editData.value.plate_type_input.trim();

    let returnDateUpdate = null;
    if (returnDateInput.value) {
      const [y, m, d] = returnDateInput.value.split('-');
      returnDateUpdate = Timestamp.fromDate(new Date(Number(y), Number(m) - 1, Number(d)));
    }

    const updates = {
      "color_code": updatedColorCodes,
      "chosen_color": updatedChosenColors.length > 0 ? updatedChosenColors : null,
      "plate_type": updatedPlateType || null,
      "Customer Name": editData.value["Customer Name"],
      "Service Centre Name": editData.value["Service Centre Name"],
      "Status": editData.value["Status"],
      "note": editData.value["note"] || null,
      "Return Date": returnDateUpdate
    };

    if (editData.value["Status"] === true) {
      const now = Timestamp.fromDate(new Date());
      updates["Return Check_CCR"] = now;
      updates["Actual Return Date"] = now;
      updates["CA OtD Name"] = ccrName;
    }

    await updateDoc(docRef, updates);
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

function downloadCSV() {
  const dataForCSV = filteredTransactions.value.map(tx => {
    const d = tx.data;
    return {
      "トランザクションID": d["transaction id"] || "",
      "申請日": formatDate(d["Request Date_CA OtD"]?.toDate()),
      "返却予定日": formatDate(d["Return Date"]?.toDate()),
      "返却実績日": formatDate(d["Actual Return Date"]?.toDate()),
      "CA申請者": d["CA OtD Name"] || "",
      "カラーコード": (d["color_code"] || []).join(", "),
      "色板タイプ": d["plate_type"] || "",
      "設定色": (d["chosen_color"] || []).join(", "),
      "依頼組織": d["Service Centre Name"] || "",
      "依頼者": d["Customer Name"] || "",
      "顧客会社名": d["end_user_company"] || "",
      "ステータス": getStatusText(d),
      "コメント": d["note"] || ""
    };
  });

  const header = Object.keys(dataForCSV[0] || {
    "トランザクションID": "",
    "申請日": "",
    "返却予定日": "",
    "返却実績日": "",
    "CA申請者": "",
    "カラーコード": "",
    "色板タイプ": "",
    "設定色": "",
    "依頼組織": "",
    "依頼者": "",
    "顧客会社名": "",
    "ステータス": "",
    "コメント": ""
  }).join(",");

  const rows = dataForCSV.map(row => {
    return Object.values(row).map(val => `"${val.replace(/"/g, '""')}"`).join(",");
  });

  const csvContent = [header, ...rows].join("\r\n");

  const bom= '\uFEFF';
  const csvWithBom = bom + csvContent;

  const blob = new Blob([csvWithBom], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);

  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  const fileName = `Color Board Management_${yyyy}${mm}${dd}.csv`;

  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
</script>

<style scoped>
/* 前回と同様のスタイルで、差分としてdownload-iconを追加 */

/* download-iconのスタイルを追加 */
.download-icon {
  width: 28px; /* 画像サイズを調整 */
  height: 28px;
  cursor: pointer;
  margin-right: 10px;
  transition: transform 0.2s;
  vertical-align: middle;
}

.download-icon:hover {
  transform: scale(1.1);
}

/* それ以外のスタイルは変更なし */
.container {
  position: relative;
  min-height: 100vh;
  background: #e1e5ea;
  background-image: 
    linear-gradient(45deg, rgba(255,255,255,0.2) 25%, transparent 25%, transparent 75%, rgba(255,255,255,0.2) 75%, rgba(255,255,255,0.2)), 
    linear-gradient(45deg, rgba(255,255,255,0.2) 25%, transparent 25%, transparent 75%, rgba(255,255,255,0.2) 75%, rgba(255,255,255,0.2));
  background-size: 60px 60px;
  background-position: 0 0, 30px 30px;
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
  padding: 20px;
  box-sizing: border-box;
}

.header {
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  margin-bottom: 20px;
}

.back-button {
  position: absolute;
  left: 0;
  top: 50%;
  transform: translateY(-50%);
  background: linear-gradient(to right, #6b8e23, #556b2f);
  color: #fff;
  border: none;
  padding: 8px 12px;
  border-radius: 4px;
  font-weight: bold;
  cursor: pointer;
}

.back-button:hover {
  background: linear-gradient(to right, #7f9a3a, #667b30);
}

.main-title {
  font-size: 24px;
  font-weight: bold;
  color: #333;
  text-shadow: 1px 1px 2px #aaa;
  margin: 0;
}

.filters {
  display: flex;
  flex-wrap: wrap;
  gap: 20px;
  margin-bottom: 20px;
  align-items: flex-end;
}

.filter-group {
  display: flex;
  flex-direction: column;
  font-size: 14px;
}

.filter-group label {
  margin-bottom: 5px;
  font-weight: bold;
  color: #333;
}

.filter-group input, .filter-group select {
  padding: 5px;
  border-radius: 4px;
  border: 1px solid #ccc;
}

.content-area {
  background: rgba(255,255,255,0.8);
  border-radius: 8px;
  padding: 20px;
  box-shadow: 0 4px 8px rgba(0,0,0,0.1);
  min-height: 60vh;
  overflow: auto;
}

.loading-message,
.error-message,
.success-message,
.no-data-message {
  text-align: center;
  font-weight: bold;
  margin-top: 20px;
}

.error-message {
  color: red;
}

.success-message {
  color: green;
}

.no-data-message {
  color: #333;
}

.download-container {
  text-align: right;
  margin-bottom: 10px;
}

.styled-table {
  width: 100%;
  border-collapse: collapse;
  margin-bottom: 20px;
  text-align: left;
  background-color: #fff;
  font-size: 14px;
  table-layout: fixed;
}

.styled-table th, .styled-table td {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.styled-table th {
  background-color: #333;
  color: #fff;
  padding: 8px;
  font-weight: bold;
  border: 1px solid #ddd;
  text-transform: uppercase;
  font-size: 12px;
}

.styled-table td {
  padding: 8px;
  border: 1px solid #ddd;
  background-color: #f9f9f9;
}

.styled-table tr:nth-child(even) td {
  background-color: #f0f0f5;
}

.hover-row:hover td {
  background-color: #e6e6fa;
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
  background-image: 
    linear-gradient(90deg, rgba(255,255,255,0.2) 1px, transparent 1px),
    linear-gradient(rgba(255,255,255,0.2) 1px, transparent 1px);
  background-size: 20px 20px;
}

.modal-content h2 {
  margin-top: 0;
  margin-bottom: 10px;
  font-size: 18px;
}

.edit-form {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.form-group {
  display: flex;
  flex-direction: column;
  font-size: 14px;
}

.form-group label {
  font-weight: bold;
  margin-bottom: 5px;
  color: #333;
}

.form-group input, .form-group textarea, .form-group select {
  padding: 5px;
  border-radius: 4px;
  border: 1px solid #ccc;
  font-size: 14px;
}

.button-group {
  display: flex;
  justify-content: space-between;
  margin-top: 10px;
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
</style>
