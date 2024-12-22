<template>
  <div class="wrapper">
    <div class="container">
      <h1 class="title">新規申請</h1>
      <form @submit.prevent="showConfirmation = true">
        <div class="form-group">
          <label>Color Codes：</label>
          <div class="color-input">
            <input
              v-model="newColorCode"
              type="text"
              placeholder="カラーコードを入力 (大文字英字・数字のみ)"
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

        <!--
        <div class="form-group">
          <label>色板タイプ：</label>
          <select v-model="type_of_plate">
            <option value="基準板">基準板</option>
            <option value="ロット板">ロット板</option>
            <option value="両方">基準板 & ロット板</option>
          </select>
        </div>
        -->

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
            <!--<li><strong>色板タイプ:</strong> {{ type_of_plate }}</li>-->
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

      <div v-if="message" class="success-message">{{ message }}</div>
      <div v-if="error" class="error-message">{{ error }}</div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
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
//const type_of_plate = ref('基準板')
const material_type = ref('Solid')
const today = new Date()
const maxDate = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 90)
const maxReturnDate = maxDate.toISOString().split('T')[0]
const message = ref('')
const error = ref('')
const formError = ref('')
const router = useRouter()
const showConfirmation = ref(false)
const showEmailTemplate = ref(false)
const emailTemplate = ref('')
const emailSubject = ref('') // メール件名用の ref を追加
const loggedInUserName = ref('')
const ccrUsers = ref([])
const transactionId = ref('') // トランザクションID用の ref を追加

onMounted(async () => {
  await fetchLoggedInUserName()
  await fetchCCRUsers()
})

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
  // バリデーションチェック
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

  try {
    const requestDate = new Date()
    const yearYY = String(requestDate.getFullYear()).slice(-2)
    transactionId.value = generateTransactionId(yearYY) // トランザクションIDを生成
    const chosenDate = new Date(returnDateInput.value)

    // Firestore にデータを追加
    await addDoc(collection(db, 'colorboards'), {
      "Approved Date_CCR": null,
      "color_code": colorCodes.value,
      "Customer Name": customerName.value,
      "Request Date_CA OtD": Timestamp.fromDate(requestDate),
      "Return Date": Timestamp.fromDate(chosenDate),
      "Service Centre Name": serviceCentreName.value,
      "Status": false,
      "transaction id": transactionId.value, // 生成したトランザクションIDを登録
      "CA OtD Name": name,
      "Actual Return Date": null,
      "Return Check_CCR": null,
      "note": note.value || null,
      //"plate_type": type_of_plate.value,
      "material_type": material_type.value === "Solid" ? "ソリッド" : "メタリック", // ★★★ ここで変換 ★★★
      "end_user_company": end_user_company.value || null,
      "new_color_picker": false // new_color_picker フィールドを追加し、false を設定
    })

    message.value = '申請が送信されました。'

    // メールテンプレートの作成と表示 (colorCodes が存在する場合のみ)
    if (colorCodes.value.length > 0) {
      const ccrUsersStr = ccrUsers.value.join('さん、')
      emailSubject.value = `${transactionId.value}の件` // トランザクションIDを件名に含める
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

    resetForm()
  } catch (err) {
    console.error(err)
    error.value = '申請送信中にエラーが発生しました。'
  }
  closeModal()
}

function resetForm() {
  colorCodes.value = []
  serviceCentreName.value = ''
  customerName.value = ''
  returnDateInput.value = ''
  note.value = ''
  //type_of_plate.value = '基準板'
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
</script>

<style scoped>
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

/* 各フォームグループのスタイル */
.form-group {
  margin-bottom: 15px;
}

.form-group label {
  display: block;
  font-weight: bold;
  margin-bottom: 3px;
  color: #333;
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
  width: 40%;
}

.form-group input,
.form-group textarea,
.form-group select {
  width: 60%;
  padding: 8px;
  border: 1px solid #ccc;
  border-radius: 4px;
  font-size: 14px;
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
  width: 65%;
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
</style>