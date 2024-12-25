<!--App.vue-->
<template>
  <div>
    <!-- Headerコンポーネントを使用 -->
    <Header />
    <router-view></router-view>
  </div>
</template>

<script setup>
import Header from './components/Header.vue' // Headerコンポーネントをインポート
</script>
