<!-- src/views/Home.vue -->
<template>
  <div style="padding:20px;">
    <div v-if="role === 'CA OtD'">
      <h1>ようこそ {{ name }}さん</h1>
      <button @click="goNewRequest">新規申請</button>
    </div>
    <div v-else-if="role === 'CCR'">
      <h1>ようこそ CCRユーザー</h1>
      <!-- CCR向けの機能があればここで表示 -->
    </div>
    <div v-else>
      <h1>ようこそ</h1>
      <!-- ロールが設定されていない場合など -->
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()
const role = ref(sessionStorage.getItem('role'))
const name = ref(sessionStorage.getItem('name'))

function goNewRequest() {
  router.push('/requests/new')
}
</script>
