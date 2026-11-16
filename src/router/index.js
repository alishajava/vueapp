import { createRouter, createWebHashHistory } from 'vue-router'

// Each page is its own chunk, so e.g. the home page doesn't download the board's grid library.
const routes = [
  { path: '/', name: 'home', component: () => import(/* webpackChunkName: "home" */ '../views/HomeView.vue') },
  { path: '/todos', name: 'todos', component: () => import(/* webpackChunkName: "todos" */ '../views/TodoView.vue') },
  { path: '/board', name: 'board', component: () => import(/* webpackChunkName: "board" */ '../views/BoardView.vue') },
  { path: '/board/:id', name: 'post-detail', component: () => import(/* webpackChunkName: "post" */ '../views/PostDetailView.vue') }
]

const router = createRouter({
  history: createWebHashHistory(),
  routes
})

export default router
