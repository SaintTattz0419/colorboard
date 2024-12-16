<template>
  <div class="container">
    <h1 class="title">新規申請</h1>
        <form @submit.prevent="sendRequest">
      <!-- カラーコード入力 -->
      <div class="form-group">
        <label>Color Codes：</label>
        <div class="color-input">
          <input 
            v-model="newColorCode" 
            type="text" 
            placeholder="カラーコードを入力 (大文字英字・数字のみ)" 
            @input="validateColorCode" 
          />
          <button type="button" @click="addColorCode">追加</button>
        </div>
        <ul>
          <li v-for="(code, index) in colorCodes" :key="index">
            {{ code }}
            <button type="button" @click="removeColorCode(index)">削除</button>
          </li>
        </ul>
      </div>

      <!-- サービスセンター名 -->
      <div class="form-group">
        <label>Service Centre Name：</label>
        <input v-model="serviceCentreName" type="text" required />
      </div>

      <!-- 依頼者名 -->
      <div class="form-group">
        <label>Customer Name：</label>
        <input v-model="customerName" type="text" required />
      </div>

      <!-- 返却日 -->
      <div class="form-group">
        <label>Return Date：</label>
        <input v-model="returnDateInput" :max="maxReturnDate" type="date" required />
      </div>

      <!-- メモ入力 -->
      <div class="form-group">
        <label>Note：</label>
        <textarea v-model="note" placeholder="メモを入力"></textarea>
      </div>

      <button type="submit">申請</button>

      <!-- エラーメッセージ表示 -->
      <div v-if="formError" class="error-message">{{ formError }}</div>
    </form>

    <!-- メッセージ表示 -->
    <div v-if="message" class="success-message">{{ message }}</div>
    <div v-if="error" class="error-message">{{ error }}</div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { db } from '../firebase'
import { collection, addDoc, Timestamp } from 'firebase/firestore'
import { useRouter } from 'vue-router'

const name = sessionStorage.getItem('name')
const role = sessionStorage.getItem('role')

const colorCodes = ref([]) // カラーコードのリスト
const newColorCode = ref('') // 新しく入力するカラーコード用
const serviceCentreName = ref('') // サービスセンター名
const customerName = ref('') // 依頼者名
const returnDateInput = ref('') // 返却日
const note = ref('') // メモ

const today = new Date()
const maxDate = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 90)
const maxReturnDate = maxDate.toISOString().split('T')[0] // 最大返却日（90日以内）

const message = ref('') // 成功メッセージ
const error = ref('') // エラーメッセージ
const formError = ref('') // バリデーションエラーメッセージ
const router = useRouter()

function generateTransactionId(yearYY) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  let result = ''
  for (let i = 0; i < 5; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return result + '_' + yearYY
}

function validateColorCode() {
  // 入力された文字を強制的に大文字にし、英字と数字以外を除去
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

async function sendRequest() {
  message.value = ''
  error.value = ''
  formError.value = '' // エラーメッセージをリセット

  // 入力必須項目のバリデーションチェック
  if (colorCodes.value.length === 0) {
    formError.value = 'カラーコードを1つ以上追加してください。'
    return
  }
  if (!serviceCentreName.value.trim()) {
    formError.value = 'サービスセンター名を入力してください。'
    return
  }
  if (!customerName.value.trim()) {
    formError.value = '依頼者名を入力してください。'
    return
  }
  if (!returnDateInput.value) {
    formError.value = '返却日を選択してください。'
    return
  }

  try {
    const requestDate = new Date()
    const yearYY = String(requestDate.getFullYear()).slice(-2)
    const transactionId = generateTransactionId(yearYY)
    const chosenDate = new Date(returnDateInput.value)

    await addDoc(collection(db, 'colorboards'), {
      "Approved Date_CCR": null,
      "color_code": colorCodes.value,
      "Customer Name": customerName.value,
      "Request Date_CA OtD": Timestamp.fromDate(requestDate),
      "Return Date": Timestamp.fromDate(chosenDate),
      "Service Centre Name": serviceCentreName.value,
      "Status": false,
      "transaction id": transactionId,
      "CA OtD Name": name,
      "Actual Return Date": null,
      "Return Check_CCR": null,
      "note": note.value || null
    })

    message.value = '申請が送信されました。'
    resetForm()
  } catch (err) {
    console.error(err)
    error.value = '申請送信中にエラーが発生しました。'
  }
}

function resetForm() {
  colorCodes.value = []
  serviceCentreName.value = ''
  customerName.value = ''
  returnDateInput.value = ''
  note.value = ''
}

</script>

<style scoped>
/* 全体のフォームのスタイル */
form {
  max-width: 600px;
  margin: 0 auto;
  padding: 30px;
  background-color: #f8f9fa;
  border: 1px solid #ddd;
  border-radius: 8px;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
}

.title {
  text-align: center;
  font-size: 32px;
  font-weight: bold;
  margin-bottom: 30px;
  color: #333;
  text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.1);
}


/* 各フォームグループのスタイル */
.form-group {
  margin-bottom: 20px;
}

.form-group label {
  display: block;
  font-weight: bold;
  margin-bottom: 5px;
  color: #333;
}

.form-group input,
.form-group textarea {
  width: 100%;
  padding: 8px;
  border: 1px solid #ccc;
  border-radius: 4px;
  font-size: 14px;
}

textarea {
  resize: vertical;
}

button {
  padding: 10px 15px;
  background-color: #1e3c72;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-weight: bold;
}

button:hover {
  background-color: #3e92cc;
}

/* カラーコードの入力 */
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
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 5px;
  background-color: #e3f2fd;
  margin-bottom: 5px;
  border-radius: 4px;
}

ul li button {
  background-color: #d93054;
  padding: 5px 10px;
  font-size: 12px;
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

</style>
