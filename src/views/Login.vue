<!--Login.vue-->
<template>
  <div class="login-container">
    <div class="login-card">
      <h1>Log In</h1>
      <form @submit.prevent="login">
        <div class="form-group">
          <label for="uid">ID：</label>
          <input v-model="userUid" id="uid" type="text" required />
        </div>
        <div class="form-group">
          <label for="password">Password：</label>
          <input v-model="userPassword" id="password" type="password" required />
        </div>
        <button type="submit" class="login-button">ログイン</button>
      </form>
      <div v-if="error" class="error-message">{{ error }}</div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { db } from '../firebase';
import { doc, getDoc } from 'firebase/firestore';
import { useRouter } from 'vue-router';

const userUid = ref('');
const userPassword = ref('');
const error = ref('');
const router = useRouter();

async function login() {
  error.value = '';
  try {
    const docRef = doc(db, 'users', userUid.value);
    const snap = await getDoc(docRef);

    if (!snap.exists()) {
      error.value = 'ユーザーが見つかりません。';
      return;
    }

    const userData = snap.data();
    if (userData.Password === userPassword.value) {
      sessionStorage.setItem('uid', userData.uid);
      sessionStorage.setItem('role', userData.role);
      sessionStorage.setItem('name', userData.Name);

      if (userData.role === 'CA OtD') {
        router.push('/');
      } else if (userData.role === 'CCR') {
        router.push('/dashboard-ccr');
      } else {
        router.push('/login'); // roleが不明な場合はログイン画面へ
      }
    } else {
      error.value = 'パスワードが違います。';
    }
  } catch (err) {
    console.error(err);
    error.value = 'ログイン中にエラーが発生しました。';
  }
}
</script>

<style scoped>
body {
  background-color: #faf4e1; /* 薄いクリーム色 */
  font-family: Arial, sans-serif;
  margin: 0;
}

header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: #eee;
  padding: 10px 20px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

header h1 {
  margin: 0;
  font-size: 24px;
}

header button {
  background-color: #ff5722;
  color: white;
  border: none;
  padding: 10px 20px;
  font-size: 14px;
  cursor: pointer;
  border-radius: 5px;
  transition: background-color 0.3s ease;
}

header button:hover {
  background-color: #e64a19;
}

.login-container {
  display: flex;
  justify-content: center;
  align-items: center;
  height: calc(100vh - 120px); /* ヘッダーと少し上に配置 */
  margin-top: -50px; /* 上に移動 */
}

.login-card {
  background: white;
  padding: 20px;
  border-radius: 10px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  width: 300px;
}

h1 {
  font-size: 24px;
  margin-bottom: 20px;
  text-align: center;
}

.form-group {
  margin-bottom: 15px;
}

label {
  display: block;
  margin-bottom: 5px;
  font-weight: bold;
}

input {
  width: 100%;
  padding: 8px;
  border: 1px solid #ccc;
  border-radius: 5px;
  box-sizing: border-box;
}

.login-button {
  width: 100%;
  background-color: #007bff;
  color: white;
  border: none;
  padding: 10px;
  border-radius: 5px;
  font-size: 16px;
  cursor: pointer;
  transition: background-color 0.3s ease;
}

.login-button:hover {
  background-color: #0056b3;
}

.error-message {
  color: red;
  margin-top: 10px;
  text-align: center;
}
</style>
