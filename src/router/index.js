import { createRouter, createWebHashHistory } from 'vue-router'
import HomeView from '../views/HomeView.vue'
import TodoView from '../views/TodoView.vue'
import BoardView from '../views/BoardView.vue'

const routes = [
  { path: '/', name: 'home', component: HomeView },
  { path: '/todos', name: 'todos', component: TodoView },
  { path: '/board', name: 'board', component: BoardView }
]

const router = createRouter({
  history: createWebHashHistory(),
  routes
})

export default router
