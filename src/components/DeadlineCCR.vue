<template>
    <div class="deadline-card">
      <h2>返却期限が近いレコード</h2>
      <div v-if="loading" class="loading-message">読み込み中...</div>
      <div v-else-if="errorMessage" class="error-message">{{ errorMessage }}</div>
      <div v-else>
        <table>
          <thead>
            <tr>
              <th class="transaction-id-column">トランザクションID</th>
              <th class="color-code-column">カラーコード</th>
              <th>申請日</th>
              <th>依頼者</th>
              <th>依頼組織</th>
              <th>返却期限</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="tx in transactions" :key="tx.id">
              <td>{{ tx["transaction id"] }}</td>
              <td>{{ tx["color_code"]?.join(", ") }}</td>
              <td>{{ formatDate(tx["Request Date_CA OtD"]?.toDate()) }}</td>
              <td>{{ tx["Customer Name"] }}</td>
              <td>{{ tx["Service Centre Name"] }}</td>
              <td>
                {{ formatDate(tx["Return Date"]?.toDate()) }}
                <span v-if="daysLeft(tx['Return Date']) !== null">
                  (残り
                  <span :style="{ color: 'red', fontWeight: 'bold' }">{{ daysLeft(tx['Return Date']) }}日</span>)
                </span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </template>
  
  <script setup>
  import { ref, onMounted } from "vue";
  import { db } from "../firebase";
  import { collection, query, where, getDocs } from "firebase/firestore";
  
  const transactions = ref([]);
  const errorMessage = ref("");
  const loading = ref(false);
  
  onMounted(async () => {
    loading.value = true;
    try {
      const q = query(collection(db, "colorboards"), where("Status", "==", false));
      const snap = await getDocs(q);
  
      transactions.value = snap.docs
        .map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }))
        .filter((tx) => tx["Return Date"]) // Return Dateがあるものだけ
        .sort((a, b) => a["Return Date"].toDate() - b["Return Date"].toDate()); // 返却期限が近い順にソート
    } catch (error) {
      console.error("Error fetching transactions:", error);
      errorMessage.value = "データの取得中にエラーが発生しました。";
    } finally {
      loading.value = false;
    }
  });
  
  // 日付をフォーマットする関数
  function formatDate(date) {
    if (!date) return "不明"; // デフォルト値を設定
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }
  
  // 残り日数を計算する関数
  function daysLeft(returnDate) {
    if (!returnDate) return null;
    const today = new Date();
    const targetDate = returnDate.toDate();
    const diffTime = targetDate - today;
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24)); // 日数に変換
  }
  </script>
  
  <style scoped>
  .deadline-card {
    width: 70%;
    margin: 50px auto;
    padding: 17px;
    background-color: #fff;
    border: 1px solid #ccc;
    border-radius: 8px;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  }
  
  .loading-message,
  .error-message {
    text-align: center;
    margin-top: 20px;
    font-size: 16px;
    color: #666;
  }
  
  table {
    width: 100%;
    border-collapse: collapse;
    text-align: left;
  }
  
  thead th {
    background-color: #135d8b;
    color: white;
    padding: 10px;
  }
  
  tbody td {
    padding: 10px;
    border-bottom: 1px solid #dddddd;
  }
  
  tbody tr:hover {
    background-color: #f9f9f9;
  }
  
  .transaction-id-column {
    width: 15%;
  }
  
  .color-code-column {
    width: 20%;
  }
  </style>
  