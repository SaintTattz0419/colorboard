<template>
  <div class="container">
    <div class="header">
      <button @click="goBackToDashboard" class="back-button">ダッシュボードに戻る</button>
      <h1 class="main-title">返却承認</h1>
    </div>

    <!-- ページ説明文 -->
    <div class="page-description">
      <p>・特定色の返却→そのまま承認 ・既存色での合意→設定色を選択 ・新規色の作成→新規色採番 　(ダブルクリックで編集)</p>
    </div>

    <div class="content-area">
      <div v-if="loading" class="loading-message">読み込み中...</div>
      <div v-else-if="error" class="error-message">{{ error }}</div>
      <div v-else>
        <table class="styled-table">
          <thead>
            <tr>
              <th class="transaction_id">トランザクションID</th>
              <th>申請日</th>
              <th class="actual-return-date-column">返却実績日</th>
              <th class="color-code-column">カラーコード</th>
              <th class="material-type-column">素材タイプ</th>
              <th class="chosen-color-column">設定色</th>
              <th class="plate-type-column">色板タイプ</th>
              <th>CC担当者名</th>
              <th>貸出先CC</th>
              <th class="end-user-company-column">顧客会社名</th>
              <th>承認</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="tx in returnList" :key="tx.id" class="hover-row" @dblclick="openColorModal(tx.id, tx.data)">
              <td>{{ tx.data["transaction id"] }}</td>
              <td>{{ formatDate(tx.data["Request Date_CA OtD"]?.toDate()) }}</td>
              <td>{{ formatDate(tx.data["Actual Return Date"]?.toDate()) }}</td>
              <td>{{ tx.data["color_code"] ? tx.data["color_code"].join(", ") : "" }}</td>
              <td>{{ tx.data["material_type"] }}</td>
              <td class="color-cell">
                <span v-if="tx.data.chosen_color && tx.data.chosen_color.length > 0">
                  {{ tx.data.chosen_color.join(", ") }}
                </span>
              </td>
              <td>{{ tx.data["plate_type"] || "" }}</td>
              <td>{{ tx.data["Customer Name"] }}</td>
              <td>{{ tx.data["Service Centre Name"] }}</td>
              <td>{{ tx.data["end_user_company"] }}</td>
              <td><button class="approve-button" @click="approveReturn(tx.id)">承認</button></td>
            </tr>
          </tbody>
        </table>
        <div v-if="returnList.length === 0 && !message" class="no-data-message">
          承認待ちの返却データはありません。
        </div>
      </div>
      <div v-if="message" class="success-message">{{ message }}</div>
    </div>

    <!-- 色登録用モーダル -->
    <div v-if="showColorModal" class="modal-overlay">
      <div class="modal-content edit-modal" @click.stop>
        <h3 class="modal-title">色情報登録</h3>
        <p class="modal-description">カラーコードを選択または新規色を採番してください。</p>
        <div class="color-options">
          <div v-for="c in currentColorOptions" :key="c" class="color-option">
            <button
              type="button"
              :class="{ 'color-button': true, 'selected': tempChosenColors.includes(c) }"
              @click="toggleColorSelection(c)"
            >
              {{ c }}
            </button>
          </div>
          <div class="color-option">
            <button
              type="button"
              :class="{ 'color-button': true, 'new-color': true, 'selected': isNewColorChecked }"
              @click="toggleNewColor"
            >
              新規色採番
            </button>
          </div>
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
import { ref, onMounted } from 'vue'
import { db } from '../firebase'
import { collection, getDocs, doc, updateDoc, setDoc, Timestamp, deleteDoc, query, where } from 'firebase/firestore'
import { useRouter } from 'vue-router'

const router = useRouter()
const role = sessionStorage.getItem('role')
if (role !== 'CCR') {
  router.push('/login')
}

const loading = ref(true)
const error = ref('')
const returnList = ref([])
const message = ref('')
const showColorModal = ref(false);
const currentTxId = ref('');
const currentColorOptions = ref([]);
const tempChosenColors = ref([]);
const isNewColorChecked = ref(false); // 新規色採番のチェック状態

onMounted(fetchData)

async function fetchData() {
  loading.value = true
  error.value = ''
  returnList.value = []
  message.value = ''

  try {
    // クエリを使って条件に合致するドキュメントを取得
    const q = query(
      collection(db, 'colorboards'),
      where('Status', '==', false),
      where('Approved Date_CCR', '!=', null) // null ではないドキュメントを対象にする
    );
    const snap = await getDocs(q);

    const tmp = []
    snap.forEach(docSnap => {
      const d = docSnap.data()
      tmp.push({ id: docSnap.id, data: d })
    })
    returnList.value = tmp
    if (tmp.length === 0) {
      message.value = '承認待ちの返却データはありません。'
    }
  } catch (err) {
    console.error(err)
    error.value = 'データ取得中にエラーが発生しました。'
  }
  loading.value = false
}

async function approveReturn(id) {
  message.value = ''
  error.value = ''

  try {
    // 承認前にchatサブコレクションがある場合は削除
    await deleteChatSubcollection(id)

    const docRef = doc(db, 'colorboards', id)

    // 「新規色採番」が選択されている場合、new_color_picker を true に設定
    // ※ モーダルで「新規色採番」が選択されて「保存」された後に承認ボタンが押された場合のみ、ここでの条件が true になる
    const updates = {
      "Status": true,
      "Actual Return Date": Timestamp.fromDate(new Date()),
      "Return Check_CCR": Timestamp.fromDate(new Date())
    };

    // モーダルでの選択状態を取得
    const modalData = returnList.value.find(tx => tx.id === id)?.data;
    if (modalData && modalData.new_color_picker) {
      updates["new_color_picker"] = true;
    }

    // setDoc を merge: true オプション付きで使用
    await setDoc(docRef, updates, { merge: true });

    message.value = '返却承認しました。';
    await fetchData()
  } catch (err) {
    console.error(err)
    error.value = '承認中にエラーが発生しました。'
  }
}

// chatサブコレクションを削除
async function deleteChatSubcollection(id) {
  const chatRef = collection(db, 'colorboards', id, 'chat')
  const chatSnap = await getDocs(chatRef)
  if (!chatSnap.empty) {
    for (const docItem of chatSnap.docs) {
      await deleteDoc(docItem.ref)
    }
  }
}

function goBackToDashboard() {
  router.push('/dashboard-ccr')
}

function formatDate(date) {
  if (!date) return ''
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function openColorModal(id, data) {
  currentTxId.value = id;
  currentColorOptions.value = data.color_code || [];
  tempChosenColors.value = data.chosen_color || [];
  // 既存のドキュメントに new_color_pick フィールドが存在し、その値が true の場合、チェックボックスをオンにする
  isNewColorChecked.value = !!data.new_color_picker;
  showColorModal.value = true;
}

function closeColorModal() {
  showColorModal.value = false;
  currentTxId.value = '';
  currentColorOptions.value = [];
  tempChosenColors.value = [];
  isNewColorChecked.value = false;
}

function toggleColorSelection(color) {
  if (isNewColorChecked.value) {
    // 「新規色採番」が選択されている場合、他の色の選択を無視
    return;
  }
  if (tempChosenColors.value.includes(color)) {
    tempChosenColors.value = tempChosenColors.value.filter(c => c !== color);
  } else {
    tempChosenColors.value.push(color);
  }
}

function toggleNewColor() {
  isNewColorChecked.value = !isNewColorChecked.value;
  if (isNewColorChecked.value) {
    tempChosenColors.value = []; // 他の色の選択をクリア
  }
}

async function saveChosenColors() {
  try {
    const docRef = doc(db, 'colorboards', currentTxId.value);
    // chosen_color と new_color_picker の両方を更新
    await updateDoc(docRef, {
      chosen_color: tempChosenColors.value,
      new_color_picker: isNewColorChecked.value // 「新規色採番」の選択状態を保存
    });
    message.value = '設定色を保存しました。';
    await fetchData(); // テーブルを再読み込み
  } catch (err) {
    console.error(err);
    error.value = '色情報の保存中にエラーが発生しました。';
  }
  closeColorModal();
}
</script>

<style scoped>
body {
  background: #f7f6f2;
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
}

.container {
  display: flex;
  flex-direction: column;
  height: 100vh;
  padding: 20px;
  box-sizing: border-box;
  background: linear-gradient(to bottom, #fdfcf9, #f7f4ed);
}

.header {
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  margin-bottom: 20px;
}

.transaction_id{
  width: 11.5%;
}

.actual-return-date-column{
  width: 7%;
}

.material-type-column{
  width: 7%;
}

.chosen-color-column{
  width: 10%;
}

.plate-type-column{
  width: 7%;
}

.end-user-company-column{
  width: 13%;
}

.back-button {
  position: absolute;
  left: 0;
  top: 50%;
  transform: translateY(-50%);
  background: linear-gradient(to right, #6b8e23, #556b2f);
  color: #fff;
  border: none;
  padding: 8px 15px;
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

.page-description {
  text-align: center;
  margin-bottom: 0.5%;
  font-size: 0.9rem;
  color: #555;
  background-color: #f8f8f8;
  border: 1px solid #ddd;
  border-radius: 4px;
}

.content-area {
  flex: 1;
  background: #ffffff;
  border: 1px solid #ddd;
  border-radius: 8px;
  padding: 20px;
  box-sizing: border-box;
  overflow-y: auto;
  box-shadow: 0 4px 8px rgba(0,0,0,0.1);
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

.styled-table {
  width: 100%;
  border-collapse: collapse;
  margin-bottom: 20px;
  text-align: left;
  font-size: 14px;
  background-color: #fff;
  box-shadow: 0 2px 5px rgba(0,0,0,0.1);
}

.styled-table th {
  background-color: #8B4513;
  color: #fff;
  padding: 10px;
  font-weight: bold;
  border: 1px solid #ddd;
  text-transform: uppercase;
  font-size: 13px;
}

.styled-table td {
  padding: 10px;
  border: 1px solid #ddd;
  background-color: #f9f9f9;
}

.styled-table tr:nth-child(even) td {
  background-color: #f0f0f5;
}

.hover-row:hover td {
  background-color: #e6e6fa;
  cursor: pointer;
}

.approve-button {
  background-color: #00695c;
  color: #fff;
  border: none;
  padding: 5% 12px;
  border-radius: 4px;
  font-weight: bold;
  cursor: pointer;
  font-size: 12px;
  width: 50%;
  display: block;
  margin: 0 auto;
}

.approve-button:hover {
  background-color: #00796b;
}

/* モーダルスタイル */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000; /* 適切なz-indexを設定 */
}

.modal-content {
  background-color: #fefefe;
  margin: auto;
  border: 1px solid #888;
  width: 80%;
  max-width: 500px;
  border-radius: 5px;
  box-shadow: 0 4px 8px 0 rgba(0,0,0,0.2);
}

.modal-content.edit-modal {
  width: 400px;
  padding: 20px 25px;
}

.modal-title {
  font-size: 1.2rem;
  font-weight: bold;
  margin-bottom: 10px;
  color: #333;
}

.modal-description {
  font-size: 0.9rem;
  color: #666;
  margin-bottom: 20px;
}

.color-options {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-bottom: 20px;
}

.color-option {
  flex: 1 0 48%; /* 2列にする */
  box-sizing: border-box;
}

.color-button {
  width: 100%;
  padding: 10px;
  border: 1px solid #ccc;
  border-radius: 4px;
  background-color: #fff;
  color: #333;
  cursor: pointer;
  transition: background-color 0.3s, color 0.3s;
  text-align: center;
  font-size: 0.9rem;
}

.color-button:hover {
  background-color: #eee;
}

.color-button.selected {
  background-color: #00695c;
  color: #fff;
  border-color: #00695c;
}

.color-button.new-color {
  background-color: #f0f0f0;
  border-color: #ccc;
}

.color-button.new-color:hover {
  background-color: #e0e0e0;
}

.color-button.new-color.selected {
  background-color: #4CAF50; /* 新規色採番が選択された時の色 */
  color: #fff;
  border-color: #4CAF50;
}

.modal-buttons {
  display: flex;
  justify-content: space-between;
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