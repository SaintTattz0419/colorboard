<template>
  <div class="history-container">
    <h2 class="title">全履歴</h2>
    <div v-if="loadingAll" class="loading-message">読み込み中...</div>
    <div v-else-if="errorAll" class="error-message">{{ errorAll }}</div>
    <div v-else>
      <!-- ダッシュボードに戻るボタン -->
      <div class="dashboard-button-container">
        <button @click="goBackToDashboard" class="dashboard-button">ダッシュボードに戻る</button>
      </div>
      <table class="styled-table">
        <thead>
          <tr>
            <th class="transaction-id-column">トランザクションID</th>
            <th class="requested-date-column">申請日</th>
            <th class="color-code-column">カラーコード</th>
            <th class="material-type-column">素材タイプ</th>
            <th class="plate-type-column">色板タイプ</th>
            <th class="chosen-color-column">設定色</th>
            <th>CC担当者名</th>
            <th>貸出先CC</th>
            <th class="end-user-company-column">顧客会社名</th>
            <th>返却予定日</th>
            <th>返却日</th>
            <th>状況</th>
          </tr>
        </thead>
        <tbody>
          <tr 
            v-for="tx in filteredTransactions" 
            :key="tx.id"
            class="hover-row"
          >
            <td>{{ tx.data["transaction id"] }}</td>
            <td>{{ formatDate(tx.data["Request Date_CA OtD"]?.toDate()) }}</td>
            <td>{{ tx.data["color_code"] ? tx.data["color_code"].join(", ") : "" }}</td>
            <td>{{ tx.data["material_type"] }}</td>
            <td>{{ tx.data["plate_type"] || "" }}</td>
            <td>{{ tx.data["chosen_color"] ? tx.data["chosen_color"].join(", ") : "" }}</td>
            <td>{{ tx.data["Customer Name"] }}</td>
            <td>{{ tx.data["Service Centre Name"] }}</td>
            <td>{{ tx.data["end_user_company"] }}</td>
            <td>{{ formatDate(tx.data["Return Date"]?.toDate()) }}</td>
            <td>{{ formatDate(tx.data["Actual Return Date"]?.toDate()) }}</td>
            <td :style="getStatusCellStyle(tx.data)">{{ getStatusText(tx.data) }}</td>
          </tr>
        </tbody>
      </table>
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

// フィルタ用のデータ（必要に応じて追加してください）
const statusFilter = ref('');
const requestDateFilter = ref('');
const colorCodeFilter = ref('');
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

    // 申請日が今日に近いものを上に並べ替え
    tmp.sort((a, b) => {
      const dateA = a.data["Request Date_CA OtD"]?.toDate() || new Date(0);
      const dateB = b.data["Request Date_CA OtD"]?.toDate() || new Date(0);
      return dateB - dateA; // 降順に並べ替え
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

    // 親コードフィルター(部分一致)
    if (parentCodeFilter.value && !(d["parent_color"] || '').toLowerCase().includes(parentCodeFilter.value.toLowerCase())) {
      return false;
    }

    // 依頼組織フィルター(部分一致)
    if (serviceCentreFilter.value && !( (d["Service Centre Name"] || '').toLowerCase().includes(serviceCentreFilter.value.toLowerCase()) )) {
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
  max-width: 85%;
  margin: 0 auto;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
  border-radius: 10px;
  margin-top: 1%;
}

/* タイトルのスタイル */
.title {
  font-size: 28px;
  text-align: center;
  font-weight: bold;
  margin-bottom: 20px;
  text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.1);
}

/* ダッシュボードに戻るボタン */
.dashboard-button-container {
  text-align: right;
  margin-bottom: 3px;
}

.dashboard-button {
  background-color: #262727; /*#003366*/
  color: #ffffff;
  padding: 6px 11px;
  font-size: 14px;
  font-weight: bold;
  border: none;
  border-radius: 5px;
  cursor: pointer;
  transition: background-color 0.3s ease;
}

.dashboard-button:hover {
  background-color: #00509e;
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
  background-color: #e4d502;/*#339715;*/
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
  width: 10%;
}

.plate-type-column{
  width: 6%;
}

.material-type-column{
  width: 6%;
}

.end-user-company-column{
  width: 14%;
}

.requested-date-column{
  width: 6.5%;
}

.chosen-color-column{
  width: 10%;
}

.color-code-column{
  width: 13%;
}

/* レスポンシブ対応 */
@media (max-width: 768px) {
  .styled-table th, .styled-table td {
    font-size: 12px;
    padding: 8px;
  }

  .transaction-id-column {
    width: 11%;
  }

}
</style>