import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { createRouter, createWebHistory } from 'vue-router'
import App from './App.vue'
import './assets/main.css'

// Router setup
const router = createRouter({
  history: createWebHistory('/notes/'),
  routes: [
    {
      path: '/',
      redirect: '/list/inbox'
    },
    {
      path: '/list/:listId',
      name: 'list',
      component: () => import('./components/ListView.vue')
    },
    {
      path: '/quick-add',
      name: 'quick-add',
      component: () => import('./components/QuickAdd.vue')
    },
    {
      path: '/add',
      name: 'add',
      component: () => import('./components/AddFromUrl.vue')
    },
    {
      path: '/settings',
      name: 'settings',
      component: () => import('./components/SettingsView.vue')
    }
  ]
})

const app = createApp(App)
app.use(createPinia())
app.use(router)
app.mount('#app')

// Register service worker
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/notes/sw.js').catch(() => {
      // Service worker registration failed, but app still works
    })
  })
}
