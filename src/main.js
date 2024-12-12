// src/main.js
import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
import { auth } from './firebase'
import { onAuthStateChanged } from 'firebase/auth'

let app

onAuthStateChanged(auth, (user) => {
  // ユーザーがログインしていたらuserにオブジェクトが入り、していなければnull
  if (!app) {
    // 初回呼び出し時にVueアプリをマウント
    app = createApp(App)
    app.use(router)
    app.mount('#app')
  }
})
