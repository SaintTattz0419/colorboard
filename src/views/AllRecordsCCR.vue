<template>
  <div class="container">
    <div class="header">
      <button @click="goBackToDashboard" class="back-button">ダッシュボードへ戻る</button>
      <h1 class="main-title">全履歴</h1>
    </div>
    <!-- フィルター群 -->
    <div class="filters">
      <div class="filter-group">
        <label>状況:</label>
        <select v-model="statusFilter">
          <option value="">すべて</option>
          <option value="CCR承認要">CCR承認要</option>
          <option value="貸出中">貸出中</option>
          <option value="返却済">返却済</option>
          <option value="採番要">採番要</option>
        </select>
      </div>
      <div class="filter-group">
        <label>申請日:</label>
        <input v-model="requestDateFilter" type="text" placeholder="申請日で検索">
      </div>
      <div class="filter-group">
        <label>カラーコード:</label>
        <input v-model="colorCodeFilter" type="text" placeholder="カラーコードで検索" @input="colorCodeFilter = colorCodeFilter.toUpperCase()">
      </div>
      <div class="filter-group">
        <label>素材タイプ:</label>
        <select v-model="materialTypeFilter">
          <option value="">すべて</option>
          <option value="メタリック">メタリック</option>
          <option value="ソリッド">ソリッド</option>
        </select>
      </div>
      <div class="filter-group">
        <label>色板タイプ:</label>
        <select v-model="plateTypeFilter">
          <option value="">すべて</option>
          <option value="基準板">基準板</option>
          <option value="ロット板">ロット板</option>
          <option value="基準板 & ロット板">基準板 & ロット板</option>
        </select>
      </div>
      <div class="filter-group">
        <label>設定色:</label>
        <input v-model="chosenColorFilter" type="text" placeholder="設定色で検索" @input="chosenColorFilter = chosenColorFilter.toUpperCase()">
      </div>
      <div class="filter-group">
        <label>親コード:</label>
        <input v-model="parentCodeFilter" type="text" placeholder="親コードで検索" @input="parentCodeFilter = parentCodeFilter.toUpperCase()">
      </div>
      <div class="filter-group">
        <label>貸出先CC:</label>
        <input v-model="serviceCentreFilter" type="text" placeholder="貸出先CCで検索">
      </div>
    </div>

    <div class="content-area">
      <div v-if="loadingAll" class="loading-message">読み込み中...</div>
      <div v-else-if="errorAll" class="error-message">{{ errorAll }}</div>
      <div v-else>
        <!-- ダウンロードアイコン -->
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
              <th style="width:6%;">申請日</th>
              <th style="width:14%;">カラーコード</th>
              <th style="width:10%;">素材タイプ</th>
              <th style="width:8%;">色板タイプ</th>
              <th style="width: 5%;">親コード</th>
              <th style="width:10%;">設定色</th>
              <th style="width:8%;">貸出先CC</th>
              <th style="width:8%;">CC担当者名</th>
              <th style="width:12%;">顧客会社名</th>
              <th style="width:7%;">返却予定</th>
              <th style="width:7%;">返却実績日</th>
              <th style="width:5%;">状況</th>
            </tr>
          </thead>
          <tbody class="records-container">
            <tr 
              v-for="tx in filteredTransactions" 
              :key="tx.id"
              @dblclick="editRecord(tx.id)"
              class="hover-row"
            >
              <td>{{ tx.data["transaction id"] }}</td>
              <td>{{ formatDate(tx.data["Request Date_CA OtD"]?.toDate()) }}</td>
              <td>{{ tx.data["color_code"] ? tx.data["color_code"].join(", ") : "" }}</td>
              <td>{{ tx.data["material_type"] || "" }}</td>
              <td>{{ tx.data["plate_type"] || "" }}</td>
              <td>{{ tx.data["parent_color"] }}</td>
              <td>{{ tx.data["chosen_color"] ? tx.data["chosen_color"].join(", ") : "" }}</td>
              <td>{{ tx.data["Service Centre Name"] }}</td>
              <td>{{ tx.data["Customer Name"] }}</td>
              <td>{{ tx.data["end_user_company"] }}</td>
              <td>{{ formatDate(tx.data["Return Date"]?.toDate()) }}</td>
              <td>{{ formatDate(tx.data["Actual Return Date"]?.toDate()) }}</td>
              <td :style="getStatusCellStyle(tx.data)">{{ getStatusText(tx.data) }}</td>
            </tr>
          </tbody>
        </table>
        <div v-if="filteredTransactions.length === 0" class="no-data-message">該当するデータがありません。</div>
      </div>

      <!-- 編集モーダル -->
      <div v-if="editMode" class="modal-overlay" @click="cancelEdit">
        <div class="modal-content" @click.stop>
          <div class="modal-header">
            <h2>レコード編集</h2>
            <button @click="deleteRecord" class="delete-button">レコード削除</button>
          </div>
          <div v-if="editData" class="edit-form">
            <div class="form-group">
              <label>トランザクションID:</label>
              <span>{{ editData["transaction id"] }}</span>
            </div>

            <div class="form-group">
              <label>カラーコード (カンマ区切り):</label>
              <textarea v-model="editData['color_code_input']" @input="toUpperCase('color_code_input')" placeholder="複数カラーコードをカンマ(,)で区切って入力"></textarea>
            </div>

            <div class="form-group">
              <label>素材タイプ：</label>
              <select v-model="editData['material_type']">
                <option value="ソリッド">ソリッド</option>
                <option value="メタリック">メタリック</option>
                <option value="ソリッド & メタリック">ソリッド & メタリック</option>
              </select>
            </div>

            <div class="form-group">
              <label>色板タイプ:</label>
              <select v-model="editData['plate_type_input']">
                <option value="基準板">基準板</option>
                <option value="ロット板">ロット板</option>
                <option value="基準板 & ロット板">基準板 & ロット板</option>
              </select>
            </div>

            <div class="form-group">
              <label>設定色:</label>
              <textarea v-model="editData['chosen_color_input']" @input="toUpperCase('chosen_color_input')" placeholder="複数設定色をカンマ(,)で区切って入力"></textarea>
            </div>

            <!-- 親コード入力欄 -->
            <div v-if="editData['new_color_picker']" class="form-group">
              <label>親コード:</label>
              <input v-model="editData['parent_color']" type="text" @input="toUpperCase('parent_color')" placeholder="親コードを入力">
            </div>

            <!-- 採番ステータス選択欄 -->
            <div v-if="editData['new_color_picker']" class="form-group">
              <label>採番ステータス:</label>
              <select v-model="numberingStatus">
                <option value="採番中">採番中</option>
                <option value="採番完了">採番完了</option>
              </select>
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
import { ref, computed, onMounted } from 'vue';
import { db } from '../firebase';
import { collection, getDocs, doc, updateDoc, deleteDoc, Timestamp } from 'firebase/firestore';
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
const materialTypeFilter = ref(''); // 素材タイプフィルター用の変数を追加
const plateTypeFilter = ref('');
const chosenColorFilter = ref('');
const serviceCentreFilter = ref('');
const parentCodeFilter = ref('');

const editMode = ref(false);
const editData = ref(null);
let editDocId = null;
const returnDateInput = ref('');
// 採番ステータス
const numberingStatus = ref("採番中"); // デフォルト値を設定

const role = sessionStorage.getItem('role');
const ccrName = sessionStorage.getItem('name'); // CCRログインユーザー名を取得

onMounted(() => {
  if (role !== 'CCR') {
    router.push('/login');
  } else {
    fetchAllHistory();
  }
});

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

    // 申請日が新しい順に並べ替え
    tmp.sort((a, b) => {
      const dateA = a.data["Request Date_CA OtD"]?.toDate() || new Date(0);
      const dateB = b.data["Request Date_CA OtD"]?.toDate() || new Date(0);
      return dateB - dateA;
    });

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

function getStatusText(d) {
  if (d["new_color_picker"]) return "採番要";
  if (!d["Approved Date_CCR"]) return "CCR承認要";
  if (!d["Actual Return Date"]) return "貸出中";
  if (!d["Return Check_CCR"]) return "CCR承認要";
  return "返却済";
}

function getStatusCellStyle(d) {
  const status = getStatusText(d);
  if (status === "貸出中") return { 'background-color': '#d93054', 'color': '#fff' };
  if (status === "CCR承認要") return { 'background-color': '#46c75d', 'color': '#fff' };
  if (status === "採番要") return { 'background-color': '#4596e8', 'color': '#fff' };
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

    // ステータスフィルタ
    if (statusFilter.value) {
      const st = getStatusText(d);
      if (st !== statusFilter.value) return false;
    }

    // 申請日フィルター(部分一致)
    if (requestDateFilter.value && !formatDate(d["Request Date_CA OtD"]?.toDate()).includes(requestDateFilter.value)) {
      return false;
    }

    // カラーコードフィルター(部分一致かつ大文字に変換)
    if (colorCodeFilter.value && !(d["color_code"] || []).join(", ").toUpperCase().includes(colorCodeFilter.value.toUpperCase())) {
      return false;
    }

    // 素材タイプフィルター
    if (materialTypeFilter.value && d["material_type"] !== materialTypeFilter.value) {
      return false;
    }

    // 色板タイプフィルター(完全一致)
    if (plateTypeFilter.value && d["plate_type"] !== plateTypeFilter.value) {
      return false;
    }

    // 設定色フィルター(部分一致かつ大文字に変換)
    if (chosenColorFilter.value && !((d["chosen_color"] || []).join(", ").toUpperCase().includes(chosenColorFilter.value.toUpperCase()))) {
      return false;
    }

    // 親コードフィルター(部分一致かつ大文字に変換)
    if (parentCodeFilter.value && !(d["parent_color"] || '').toUpperCase().includes(parentCodeFilter.value.toUpperCase())) {
      return false;
    }

    // 依頼組織フィルター(部分一致)
    if (serviceCentreFilter.value && !((d["Service Centre Name"] || '').toUpperCase().includes(serviceCentreFilter.value.toUpperCase()))) {
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
    const material_type_str = record.data["material_type"] || '';

    editData.value = {
      ...record.data,
      color_code_input: color_code_str,
      chosen_color_input: chosen_color_str,
      plate_type_input: plate_type_str,
      material_type: material_type_str,
      parent_color: record.data["parent_color"] || '', // 親コードの初期値を設定
      new_color_picker: record.data["new_color_picker"] || false
    };
    editDocId = record.id;
    if (editData.value["Return Date"]) {
      const rDate = editData.value["Return Date"].toDate();
      returnDateInput.value = formatDate(rDate);
    } else {
      returnDateInput.value = '';
    }

    // 採番ステータスの初期値を設定
    numberingStatus.value = editData.value["new_color_picker"] ? "採番中" : "";
  }
}

async function updateRecord() {
  if (!editDocId || !editData.value) return;
  try {
    const docRef = doc(db, 'colorboards', editDocId);

    // color_code と chosen_color の値を大文字に変換
    const updatedColorCodes = editData.value.color_code_input.split(',')
      .map(c => c.trim().toUpperCase()) // 大文字に変換
      .filter(c => c);
    const updatedChosenColors = editData.value.chosen_color_input.split(',')
      .map(c => c.trim().toUpperCase()) // 大文字に変換
      .filter(c => c);
    
    const updatedPlateType = editData.value.plate_type_input;
    const updatedMaterialType = editData.value.material_type;

    let returnDateUpdate = null;
    if (returnDateInput.value) {
      const [y, m, d] = returnDateInput.value.split('-');
      returnDateUpdate = Timestamp.fromDate(new Date(Number(y), Number(m) - 1, Number(d)));
    }

    // 採番ステータスが「採番完了」なら new_color_picker を false に設定
    const newColorPickerUpdate = numberingStatus.value === "採番完了" ? false : editData.value["new_color_picker"];

    const updates = {
      "color_code": updatedColorCodes,
      "chosen_color": updatedChosenColors.length > 0 ? updatedChosenColors : null,
      "plate_type": updatedPlateType || null,
      "material_type": updatedMaterialType || null,
      "Customer Name": editData.value["Customer Name"],
      "Service Centre Name": editData.value["Service Centre Name"],
      "Status": editData.value["Status"],
      "note": editData.value["note"] || null,
      "Return Date": returnDateUpdate,
      "parent_color": editData.value["parent_color"] || null,
      "new_color_picker": newColorPickerUpdate
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

async function deleteRecord() {
  if (!editDocId) return;

  if (!confirm('本当に削除しますか？')) {
    return;
  }

  try {
    const docRef = doc(db, 'colorboards', editDocId);
    await deleteDoc(docRef);

    message.value = 'レコードが削除されました。';
    await fetchAllHistory(); // データを再取得して表示を更新
    cancelEdit(); // モーダルを閉じる
  } catch (err) {
    console.error(err);
    errorAll.value = '削除中にエラーが発生しました。';
  }
}

function cancelEdit() {
  editMode.value = false;
  editData.value = null;
  editDocId = null;
  returnDateInput.value = '';
  numberingStatus.value = "採番中"; // 採番ステータスをリセット
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
      "素材タイプ": d["material_type"] || "",
      "色板タイプ": d["plate_type"] || "",
      "親コード": d["parent_color"] || "",
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
    "素材タイプ": "",
    "色板タイプ": "",
    "親コード": "",
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

// 英字を大文字に変換する関数
function toUpperCase(field) {
  if (editData.value && editData.value[field]) {
    editData.value[field] = editData.value[field].toUpperCase();
  }
}
</script>

<style scoped>
.download-icon {
  width: 1.6%;
  height: 1.6%;
  cursor: pointer;
  margin-right: 10px;
  transition: transform 0.2s;
  vertical-align: middle;
}

.download-icon:hover {
  transform: scale(1.1);
}

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

.records-container{
  cursor: pointer;
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
  padding: 10px;
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

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
  padding-right: 10px;
}

.modal-header h2 {
  font-size: 18px;
  margin: 0;
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
  align-items: center;
  gap: 5px;
  margin-top: 10px;
}

.update-button {
  background-color: #00897b;
  color: #fff;
  border: none;
  padding: 2% 8%;
  border-radius: 4px;
  font-weight: bold;
  cursor: pointer;
  font-size: 12px;
}

.update-button:hover {
  background-color: #00796b;
}

.cancel-button {
  background-color: #df8a0b;
  color: #fff;
  border: none;
  padding: 2% 4%;
  border-radius: 4px;
  font-weight: bold;
  cursor: pointer;
  font-size: 12px;
}

.cancel-button:hover {
  background-color: #bb7102;
}

.delete-button {
  background-color: #dc3545;
  color: #fff;
  border: none;
  padding: 2% 3%;
  border-radius: 4px;
  font-weight: bold;
  cursor: pointer;
  font-size: 12px;
}

.delete-button:hover {
  background-color: #c82333;
}
</style>