<template>
  <div class="app">
    <Header /> <!-- ヘッダーコンポーネント -->
    <router-view /> <!-- ページコンテンツ -->
  </div>
</template>

<script setup>
import Header from './components/Header.vue'
</script>

<style scoped>
/* アプリ全体の背景色をクリーム色に設定 */
.app {
  background-color: #f3f0d1; /* 薄いクリーム色 */
  min-height: 100vh; /* 全画面の高さを確保 */
  margin: 0;
  padding: 0;
  font-family: 'Arial', sans-serif;
  color: #333; /* デフォルトの文字色 */
}
</style>
