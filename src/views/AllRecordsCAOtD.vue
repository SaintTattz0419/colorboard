<template>
  <div class="history-container">
    <div class="header">
      <button @click="goBackToDashboard" class="dashboard-button">ダッシュボードに戻る</button>
      <h1 class="title">全履歴</h1>
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
        <input v-model="requestDateFilter" type="text" placeholder="申請日で検索" />
      </div>
      <div class="filter-group">
        <label>カラーコード:</label>
        <input v-model="colorCodeFilter" type="text" placeholder="カラーコードで検索" @input="colorCodeFilter = colorCodeFilter.toUpperCase()" />
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
        <input v-model="chosenColorFilter" type="text" placeholder="設定色で検索" @input="chosenColorFilter = chosenColorFilter.toUpperCase()" />
      </div>
      <div class="filter-group">
        <label>親コード:</label>
        <input v-model="parentCodeFilter" type="text" placeholder="親コードで検索" />
      </div>
      <div class="filter-group">
        <label>貸出先CC:</label>
        <input v-model="serviceCentreFilter" type="text" placeholder="貸出先CCで検索" />
      </div>
    </div>
    <div v-if="loadingAll" class="loading-message">読み込み中...</div>
    <div v-else-if="errorAll" class="error-message">{{ errorAll }}</div>
    <div v-else>
      <table class="styled-table">
        <thead>
          <tr>
            <th class="transaction-id-column">トランザクションID</th>
            <th class="requested-date-column">申請日</th>
            <th class="color-code-column">カラーコード</th>
            <th class="material-type-column">素材タイプ</th>
            <th class="plate-type-column">色板タイプ</th>
            <th class="parent-code-column">親コード</th>
            <th class="chosen-color-column">設定色</th>
            <th>貸出先CC</th>
            <th>CC担当者名</th>
            <th class="end-user-company-column">顧客会社名</th>
            <th>返却予定日</th>
            <th>返却日</th>
            <th>状況</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="tx in filteredTransactions" :key="tx.id" class="hover-row">
            <td>{{ tx.data["transaction id"] }}</td>
            <td>{{ formatDate(tx.data["Request Date_CA OtD"]?.toDate()) }}</td>
            <td>{{ tx.data["color_code"] ? tx.data["color_code"].join(", ") : "" }}</td>
            <td>{{ tx.data["material_type"] }}</td>
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
      <div v-if="filteredTransactions.length === 0" class="no-data-message">
        該当するデータがありません。
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { db } from '../firebase';
import { collection, getDocs } from 'firebase/firestore';
import { useRouter } from 'vue-router';

const allTransactions = ref([]);
const loadingAll = ref(false);
const errorAll = ref('');
const router = useRouter();

// フィルタ用のデータ
const statusFilter = ref('');
const requestDateFilter = ref('');
const colorCodeFilter = ref('');
const materialTypeFilter = ref(''); // 素材タイプフィルター用の変数を追加
const plateTypeFilter = ref('');
const chosenColorFilter = ref('');
const serviceCentreFilter = ref('');
const parentCodeFilter = ref('');

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

    // 親コードフィルター(部分一致)
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

function formatDate(date) {
  if (!date) return '';
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
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

function goBackToDashboard() {
  router.push('/'); // ダッシュボードへの遷移
}
</script>

<style scoped>
/* 全体のコンテナ */
.history-container {
  padding: 20px;
  font-family: 'Arial', sans-serif;
  background: #f4f4f9;
  color: #333;
  max-width: 90%;
  margin: 0 auto;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
  border-radius: 10px;
  margin-top: 1%;
}

/* ヘッダーのスタイル */
.header {
  display: flex;
  align-items: center; /* 要素を垂直方向に中央揃え */
  margin-bottom: 20px;
  position: relative;
}

.title {
  font-size: 28px;
  font-weight: bold;
  text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.1);
  margin: 0 auto; /* 上下マージンは 0、左右は auto で中央寄せ */
  text-align: center; /* テキストを中央揃え */
  position: absolute;
  left: 50%;
  transform: translateX(-50%);
  width: 100%;
}

/* ダッシュボードに戻るボタン */
.dashboard-button {
  background-color: #262727;
  color: #ffffff;
  padding: 6px 11px;
  font-size: 14px;
  font-weight: bold;
  border: none;
  border-radius: 5px;
  cursor: pointer;
  transition: background-color 0.3s ease;
  z-index: 10;
  margin-left: auto; /* 左マージンを auto に設定 */
}

.dashboard-button:hover {
  background-color: #00509e;
}

/* フィルター群 */
.filters {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-bottom: 20px;
}

.filter-group {
  margin-bottom: 10px;
}

.filter-group label {
  display: block;
  margin-bottom: 5px;
  font-weight: bold;
  font-size: 14px;
}

.filter-group input, .filter-group select {
  padding: 5px;
  border: 1px solid #ccc;
  border-radius: 4px;
  font-size: 14px;
}

/* テーブルのスタイル */
.styled-table {
  width: 100%;
  border-collapse: collapse;
  margin-bottom: 20px;
  text-align: left;
  background: #ffffff;
  border: 1px solid #ddd;
}

.styled-table th {
  background-color: #e4d502;
  color: #424141;
  padding: 12px;
  font-size: 14px;
  border: 1px solid #ddd;
  text-transform: uppercase;
}

.styled-table td {
  padding: 10px;
  border: 1px solid #ddd;
  font-size: 14px;
  background-color: #f9f9f9;
}

.styled-table tr:nth-child(even) {
  background-color: #f0f0f5;
}

.styled-table tr:hover {
  background-color: #e6e6fa;
  cursor: pointer;
}

/* トランザクションID列の幅を縮小 */
.transaction-id-column {
  width: 9.5%;
}

.plate-type-column {
  width: 6%;
}

.material-type-column {
  width: 6%;
}

.end-user-company-column {
  width: 14%;
}

.requested-date-column {
  width: 6.5%;
}

.chosen-color-column {
  width: 10%;
}

.color-code-column {
  width: 13%;
}

.plate-type-column{
  width: 8%;
}

/* レスポンシブ対応 */
@media (max-width: 768px) {
  .styled-table th,
  .styled-table td {
    font-size: 12px;
    padding: 8px;
  }

  .transaction-id-column {
    width: 11%;
  }
}

/* メッセージ用のスタイル */
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

</style>