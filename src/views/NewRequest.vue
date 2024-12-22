<template>
  <div class="wrapper">
    <div class="container">
      <h1 class="title">新規申請</h1>
      <form v-if="!showSuccessMessage" @submit.prevent="showConfirmation = true">
        <div class="form-group">
          <label>Color Codes：</label>
          <div class="color-input">
            <input
              v-model="newColorCode"
              type="text"
              placeholder="カラーコードを入力"
              @input="validateColorCode"
            />
            <button class="add-button" type="button" @click="addColorCode">追加</button>
          </div>
          <ul class="added-color-code">
            <li v-for="(code, index) in colorCodes" :key="index">
              {{ code }}
              <button type="button" @click="removeColorCode(index)">削除</button>
            </li>
          </ul>
        </div>

        <div class="form-group">
          <label>素材タイプ：</label>
          <select v-model="material_type">
            <option value="Solid">ソリッド</option>
            <option value="Metallic">メタリック</option>
          </select>
        </div>

        <div class="form-group">
          <label>貸出先CC：</label>
          <input v-model="serviceCentreName" type="text" required />
        </div>

        <div class="form-group">
          <label>CC担当者名：</label>
          <input v-model="customerName" type="text" required />
        </div>

        <div class="form-group">
          <label>顧客会社名：</label>
          <input v-model="end_user_company" type="text" />
        </div>

        <div class="form-group">
          <label>Return Date：</label>
          <input v-model="returnDateInput" :max="maxReturnDate" type="date" required />
        </div>

        <div class="form-group">
          <label>Note：</label>
          <textarea v-model="note" placeholder="メモを入力"></textarea>
        </div>

        <div class="button-group">
          <button type="submit">申請</button>
          <button type="button" class="dashboard-button" @click="goBackToDashboard">ダッシュボードに戻る</button>
        </div>

        <div v-if="formError" class="error-message">{{ formError }}</div>
      </form>

      <div v-if="showConfirmation" class="modal-overlay" @click="closeModal">
        <div class="modal-content" @click.stop>
          <h2>新規申請の確認</h2>
          <p>以下の内容で新規申請しますか？</p>
          <ul class="confirm-list">
            <li><strong>Color Codes:</strong> {{ colorCodes.join(", ") }}</li>
            <li><strong>素材タイプ:</strong> {{ material_type === "Metallic" ? "メタリック" : "ソリッド" }}</li>
            <li><strong>貸出先CC:</strong> {{ serviceCentreName }}</li>
            <li><strong>CC担当者名:</strong> {{ customerName }}</li>
            <li><strong>顧客会社名:</strong> {{ end_user_company }}</li>
            <li><strong>返却予定日:</strong> {{ returnDateInput }}</li>
            <li><strong>Note:</strong> {{ note }}</li>
          </ul>
          <div class="button-group">
            <button @click="confirmSend">OK</button>
            <button @click="closeModal">Cancel</button>
          </div>
        </div>
      </div>

      <div v-if="showEmailTemplate" class="modal-overlay" @click="closeEmailTemplateModal">
        <div class="modal-content" @click.stop>
          <div class="modal-header">
            <h2>メールテンプレート</h2>
            <button class="copy-button" @click="copyTemplateToClipboard">
              コピー
            </button>
          </div>
          <p class="email-subject"><strong>件名:</strong> {{ emailSubject }}</p>
          <pre>{{ emailTemplate }}</pre>
          <div class="button-group">
            <button @click="closeEmailTemplateModal">閉じる</button>
          </div>
        </div>
      </div>

      <div v-if="isLoading" class="loading">
        <p>Loading...</p>
      </div>

      <div v-if="showSuccessMessage" class="success-message">
        <p>申請が送信されました。</p>
        <div class="button-group">
          <button class="another-request-button" @click="continueApplication">続けて申請</button>
          <button class="dashboard-button" @click="goBackToDashboard">ダッシュボードに戻る</button>
        </div>
      </div>

      <div v-if="error" class="error-message">{{ error }}</div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { db } from '../firebase'
import { collection, addDoc, Timestamp, getDocs, query, where } from 'firebase/firestore'
import { useRouter } from 'vue-router'

const name = sessionStorage.getItem('name')
const role = sessionStorage.getItem('role')

const colorCodes = ref([])
const newColorCode = ref('')
const serviceCentreName = ref('')
const customerName = ref('')
const end_user_company = ref('')
const returnDateInput = ref('')
const note = ref('')
const material_type = ref('Solid')
const today = new Date()
const maxDate = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 90)
const maxReturnDate = maxDate.toISOString().split('T')[0]
const error = ref('')
const formError = ref('')
const router = useRouter()
const showConfirmation = ref(false)
const showEmailTemplate = ref(false)
const emailTemplate = ref('')
const emailSubject = ref('')
const loggedInUserName = ref('')
const ccrUsers = ref([])
const transactionId = ref('')
const isLoading = ref(false)
const showSuccessMessage = ref(false)

async function fetchLoggedInUserName() {
  try {
    const usersCollection = collection(db, 'users')
    const userQuery = query(usersCollection, where("Name", "==", name))
    const querySnapshot = await getDocs(userQuery)
    if (!querySnapshot.empty) {
      loggedInUserName.value = querySnapshot.docs[0].data().Name
    } else {
      console.error('User not found')
    }
  } catch (err) {
    console.error('Error fetching user:', err)
  }
}

async function fetchCCRUsers() {
  try {
    const usersCollection = collection(db, 'users')
    const ccrQuery = query(usersCollection, where("role", "==", "CCR"))
    const querySnapshot = await getDocs(ccrQuery)
    ccrUsers.value = querySnapshot.docs.map(doc => doc.data().Name)
  } catch (err) {
    console.error('Error fetching CCR users:', err)
  }
}

function generateTransactionId(yearYY) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  let result = ''
  for (let i = 0; i < 5; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return result + '_' + yearYY
}

function validateColorCode() {
  newColorCode.value = newColorCode.value.toUpperCase().replace(/[^A-Z0-9]/g, '')
}

function addColorCode() {
  if (newColorCode.value.trim() && !colorCodes.value.includes(newColorCode.value.trim())) {
    colorCodes.value.push(newColorCode.value.trim())
    newColorCode.value = ''
  }
}

function removeColorCode(index) {
  colorCodes.value.splice(index, 1)
}

function closeModal() {
  showConfirmation.value = false
}

function closeEmailTemplateModal() {
  showEmailTemplate.value = false
}

async function confirmSend() {
  if (!serviceCentreName.value.trim()) {
    formError.value = 'サービスセンター名を入力してください。'
    closeModal()
    return
  }
  if (!customerName.value.trim()) {
    formError.value = '依頼者名を入力してください。'
    closeModal()
    return
  }
  if (!returnDateInput.value) {
    formError.value = '返却日を選択してください。'
    closeModal()
    return
  }

  isLoading.value = true
  showConfirmation.value = false

  // 1.5秒の遅延をシミュレート
  await new Promise(resolve => setTimeout(resolve, 1500))

  try {
    const requestDate = new Date()
    const yearYY = String(requestDate.getFullYear()).slice(-2)
    transactionId.value = generateTransactionId(yearYY)
    const chosenDate = new Date(returnDateInput.value)

    await addDoc(collection(db, 'colorboards'), {
      "Approved Date_CCR": null,
      "color_code": colorCodes.value,
      "Customer Name": customerName.value,
      "Request Date_CA OtD": Timestamp.fromDate(requestDate),
      "Return Date": Timestamp.fromDate(chosenDate),
      "Service Centre Name": serviceCentreName.value,
      "Status": false,
      "transaction id": transactionId.value,
      "CA OtD Name": name,
      "Actual Return Date": null,
      "Return Check_CCR": null,
      "note": note.value || null,
      "material_type": material_type.value === "Solid" ? "ソリッド" : "メタリック",
      "end_user_company": end_user_company.value || null,
      "new_color_picker": false
    })

    if (colorCodes.value.length > 0) {
      const ccrUsersStr = ccrUsers.value.join('さん、')
      emailSubject.value = `${transactionId.value}の件`
      emailTemplate.value = `
CCR
${ccrUsersStr}さん

お世話になっております。

${serviceCentreName.value}_${customerName.value}さんより"${colorCodes.value.join(", ")}"の色板貸し出し依頼がありました。
お手数ですがご手配をいただけますでしょうか。

宜しくお願いいたします。

CA OtD
${loggedInUserName.value}
      `
      showEmailTemplate.value = true
    }

    showSuccessMessage.value = true
    resetForm()
  } catch (err) {
    console.error(err)
    error.value = '申請送信中にエラーが発生しました。'
  } finally {
    isLoading.value = false
  }
}

function resetForm() {
  colorCodes.value = []
  serviceCentreName.value = ''
  customerName.value = ''
  returnDateInput.value = ''
  note.value = ''
  material_type.value = 'Solid'
  end_user_company.value = ''
}

function goBackToDashboard() {
  router.push('/')
}

function copyTemplateToClipboard() {
  const textToCopy = `件名: ${emailSubject.value}\n\n${emailTemplate.value}`
  navigator.clipboard.writeText(textToCopy)
    .then(() => {
      error.value = 'メールテンプレートをコピーしました！'
      setTimeout(() => {
        error.value = ''
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

function continueApplication() {
  showSuccessMessage.value = false
}

fetchLoggedInUserName()
fetchCCRUsers()
</script>

<style scoped>
/* 以前のスタイルから変更なし */
html, body {
  height: 100%;
  margin: 0;
  padding: 0;
}

body {
  background-color: #e9edf2;
}

.wrapper {
  position: relative;
  min-height: 100vh;
  padding-bottom: 80px; /* ボタンが被らないよう余白確保 */
}

.container {
  position: relative;
  max-width: 600px;
  margin: 0 auto;
  padding: 2%;
  background-color: #f8f9fa;
  border: 1px solid #ddd;
  border-radius: 8px;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
  margin-top: 1.2%; /* トップに少し余白 */
  /* フォームを中央に配置するためのスタイルを追加 */
  display: flex;
  flex-direction: column;
  align-items: center;
}

.title {
  text-align: center;
  font-size: 28px;
  font-weight: bold;
  margin-bottom: 1.5%;
  color: #333;
  text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.1);
  margin-top: -2%;
}

/* フォームのスタイル */
form {
  width: 60%; /* フォームの幅を設定 */
  margin: 0 auto; /* 水平方向に中央揃え */
}

/* 各フォームグループのスタイル */
.form-group {
  margin-bottom: 15px;
  text-align: center; /* labelなどを中央寄せにする */
}

.form-group label {
  display: block;
  font-weight: bold;
  margin-bottom: 3px;
  color: #333;
  text-align: left;
}

.add-button{
  background-color: #3b2ad3;
  color: #e3f2fd;
  cursor: pointer;
  padding-left: 4%;
  padding-right: 4%;
}

.add-button:hover{
  background-color: #284fb9;
}

.added-color-code{
  width: 100%;
}

.another-request-button {
  padding: 3% 15px;
  font-size: large;
  font-weight: bold;
  background-color: #db1557;
  color: white;
  cursor: pointer;
}

.another-request-button:hover{
  background-color: #fa6395 ;
}

.form-group input,
.form-group textarea,
.form-group select {
  width: 100%;
  padding: 8px;
  border: 1px solid #ccc;
  border-radius: 4px;
  font-size: 14px;
  box-sizing: border-box; /* widthにpaddingとborderを含める */
}

textarea {
  resize: vertical;
}

button[type="submit"] {
  padding: 2% 8%;
  background-color: #e4390f;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-weight: bold;
}

button[type="submit"]:hover {
  background-color: #ec6c4c;
}

/* カラーコードの入力 */
.color-input {
  width: 90%;
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
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 2px;
  background-color: #e3f2fd;
  margin-bottom: 3px;
  border-radius: 4px;
}

ul li button {
  background-color: #d93054;
  padding: 2px 10px;
  font-size: 12px;
  color: #fff;
}

ul li button:hover {
  background-color: #b71c1c;
}

/* エラーメッセージ */
.error-message {
  color: red;
  font-weight: bold;
  margin-top: 10px;
  text-align: center;
}

/* 成功メッセージ */
.success-message {
  color: green;
  font-weight: bold;
  margin-top: 10px;
  text-align: center;
}

/* ボタン配置用グループ */
.button-group {
  display: flex;
  gap: 10px;
  margin-top: 20px;
  justify-content: flex-end; /* ボタンを右端に寄せる */
}

/* ダッシュボードへ戻るボタン（申請ボタンの隣） */
.dashboard-button {
  padding: 10px 12px;
  background-color: #6b8e23;
  color: #fff;
  border: none;
  border-radius: 4px;
  font-weight: bold;
  cursor: pointer;
  box-shadow: 0 3px 6px rgba(0,0,0,0.1);
  margin-left: auto;
}

.dashboard-button:hover {
  background-color: #7f9a3a;
}

/* 確認モーダルのスタイル */
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

.confirm-list {
  list-style-type: none;
  padding: 0;
  margin-bottom: 20px;
}

.confirm-list li {
  margin-bottom: 5px;
  font-size: 14px;
  color: #333;
}

.confirm-list strong {
  margin-right: 5px;
  font-weight: bold;
}

.modal-content .button-group {
  display: flex;
  gap: 10px;
  justify-content: flex-end;
}

.modal-content .button-group button {
  padding: 8px 12px;
  border: none;
  border-radius: 4px;
  font-size: 12px;
  font-weight: bold;
  cursor: pointer;
}

.modal-content .button-group button:first-child {
  background-color: #00897b;
  color: #fff;
}

.modal-content .button-group button:first-child:hover {
  background-color: #00796b;
}

.modal-content .button-group button:last-child {
  background-color: #b71c1c;
  color: #fff;
}

.modal-content .button-group button:last-child:hover {
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

/* ローディング表示のスタイル */
.loading {
  text-align: center;
  margin-top: 20px;
  font-weight: bold;
}
</style>