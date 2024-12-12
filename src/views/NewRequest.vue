<template>
  <div style="padding:20px;">
    <h1>新規申請</h1>
    <form @submit.prevent="sendRequest">
      <div>
        <label>Color Codes：</label>
        <div style="margin-bottom: 5px;">
          <input v-model="newColorCode" type="text" placeholder="カラーコードを入力" />
          <button type="button" @click="addColorCode">追加</button>
        </div>
        <ul>
          <li v-for="(code, index) in colorCodes" :key="index">
            {{ code }}
            <button type="button" @click="removeColorCode(index)">削除</button>
          </li>
        </ul>
      </div>
      <div>
        <label>Service Centre Name：</label>
        <input v-model="serviceCentreName" type="text" required />
      </div>
      <div>
        <label>Customer Name：</label>
        <input v-model="customerName" type="text" required />
      </div>
      <div>
        <label>Return Date：</label>
        <input v-model="returnDateInput" :max="maxReturnDate" type="date" required />
      </div>
      <div>
        <label>Note：</label><br>
        <textarea v-model="note" placeholder="メモを入力"></textarea>
      </div>
      <button type="submit">申請</button>
    </form>
    <div v-if="message" style="color:green;">{{ message }}</div>
    <div v-if="error" style="color:red;">{{ error }}</div>

    <!-- CA OtDダッシュボードへ戻るボタン -->
    <button @click="goBackToCAOtD">CA OtDダッシュボードへ戻る</button>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { db } from '../firebase'
import { collection, addDoc, Timestamp } from 'firebase/firestore'
import { useRouter } from 'vue-router'

const name = sessionStorage.getItem('name')
const role = sessionStorage.getItem('role')

const colorCodes = ref([]) // 修正：リスト型で管理
const newColorCode = ref('') // 新しく入力するカラーコード用
const serviceCentreName = ref('')
const customerName = ref('')
const returnDateInput = ref('')
const note = ref('')

const today = new Date()
const maxDate = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 90)
const maxReturnDate = maxDate.toISOString().split('T')[0]

const message = ref('')
const error = ref('')
const router = useRouter()

function generateTransactionId(yearYY) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  let result = ''
  for (let i = 0; i < 5; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return result + '_' + yearYY
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

  if (role !== 'CA OtD') {
    error.value = 'CA OtDユーザーのみ申請可能です。'
    return
  }

  const chosenDate = new Date(returnDateInput.value)
  if (chosenDate > maxDate) {
    error.value = 'Return Dateは本日から90日以内に設定してください。'
    return
  }

  try {
    const requestDate = new Date()
    const yearYY = String(requestDate.getFullYear()).slice(-2)
    const transactionId = generateTransactionId(yearYY)

    await addDoc(collection(db, 'colorboards'), {
      "Approved Date_CCR": null,
      "color_code": colorCodes.value, // 修正：リスト型として保存
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
    colorCodes.value = []
    newColorCode.value = ''
    serviceCentreName.value = ''
    customerName.value = ''
    returnDateInput.value = ''
    note.value = ''
  } catch (err) {
    console.error(err)
    error.value = '申請送信中にエラーが発生しました。'
  }
}

function goBackToCAOtD() {
  router.push('/')
}
</script>
