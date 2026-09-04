import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
import { initLiff } from './services/liffService'
import './assets/main.css'

initLiff().catch((err) => {
  console.warn('LIFF initialization caught error:', err)
})

createApp(App).use(router).mount('#app')

