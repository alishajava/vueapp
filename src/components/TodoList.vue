<template>
  <div class="todo-list">
    <h3>할 일 목록</h3>

    <p v-if="!authReady" class="status">로그인 상태 확인 중...</p>

    <div v-else-if="!user" class="login-box">
      <p>Google 계정으로 로그인하면 할 일이 클라우드에 저장되고,<br>다른 기기에서도 똑같이 볼 수 있어요.</p>
      <button type="button" class="google-btn" @click="login">Google로 로그인</button>
      <p v-if="authError" class="error">{{ authError }}</p>
    </div>

    <div v-else>
      <div class="user-bar">
        <img v-if="user.photoURL" :src="user.photoURL" alt="" class="avatar">
        <span class="user-name">{{ user.displayName || user.email }}</span>
        <button type="button" class="logout-btn" @click="logout">로그아웃</button>
      </div>

      <form class="todo-form" @submit.prevent="addTodo">
        <input
          v-model="newTodoText"
          type="text"
          placeholder="할 일을 입력하세요"
          aria-label="새 할 일"
        >
        <button type="submit">추가</button>
      </form>

      <p v-if="loadingTodos" class="status">불러오는 중...</p>
      <p v-else-if="todos.length === 0" class="empty">아직 할 일이 없어요.</p>

      <ul v-else class="items">
        <li v-for="todo in todos" :key="todo.id" :class="{ done: todo.done }">
          <label>
            <input type="checkbox" :checked="todo.done" @change="toggleDone(todo)">
            <span>{{ todo.text }}</span>
          </label>
          <button type="button" class="remove" @click="removeTodo(todo)" aria-label="삭제">✕</button>
        </li>
      </ul>

      <p v-if="todos.length > 0" class="summary">
        {{ remainingCount }}개 남음 / 총 {{ todos.length }}개
      </p>
    </div>
  </div>
</template>

<script>
import {
  auth,
  db,
  googleProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  serverTimestamp
} from '../firebase'

export default {
  name: 'TodoList',
  data() {
    return {
      authReady: false,
      authError: '',
      user: null,
      newTodoText: '',
      todos: [],
      loadingTodos: false,
      unsubscribeAuth: null,
      unsubscribeTodos: null
    }
  },
  computed: {
    remainingCount() {
      return this.todos.filter(todo => !todo.done).length
    }
  },
  mounted() {
    this.unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      this.authReady = true
      this.user = user
      this.subscribeTodos()
    })
  },
  beforeUnmount() {
    if (this.unsubscribeAuth) this.unsubscribeAuth()
    if (this.unsubscribeTodos) this.unsubscribeTodos()
  },
  methods: {
    async login() {
      this.authError = ''
      try {
        await signInWithPopup(auth, googleProvider)
      } catch (err) {
        this.authError = '로그인에 실패했어요: ' + err.message
      }
    },
    async logout() {
      await signOut(auth)
    },
    subscribeTodos() {
      if (this.unsubscribeTodos) {
        this.unsubscribeTodos()
        this.unsubscribeTodos = null
      }
      this.todos = []
      if (!this.user) return

      this.loadingTodos = true
      const todosQuery = query(
        collection(db, 'todos'),
        where('uid', '==', this.user.uid),
        orderBy('createdAt', 'asc')
      )
      this.unsubscribeTodos = onSnapshot(todosQuery, (snapshot) => {
        this.todos = snapshot.docs.map(d => ({ id: d.id, ...d.data() }))
        this.loadingTodos = false
      }, () => {
        this.loadingTodos = false
      })
    },
    async addTodo() {
      const text = this.newTodoText.trim()
      if (!text || !this.user) return
      this.newTodoText = ''
      await addDoc(collection(db, 'todos'), {
        uid: this.user.uid,
        text,
        done: false,
        createdAt: serverTimestamp()
      })
    },
    async toggleDone(todo) {
      await updateDoc(doc(db, 'todos', todo.id), { done: !todo.done })
    },
    async removeTodo(todo) {
      await deleteDoc(doc(db, 'todos', todo.id))
    }
  }
}
</script>

<style scoped>
.todo-list {
  max-width: 420px;
  margin: 40px auto 0;
  text-align: left;
}

.status,
.empty {
  color: #888;
}

.error {
  color: #c0392b;
  font-size: 13px;
}

.login-box {
  text-align: center;
}

.google-btn {
  padding: 10px 20px;
  border: 1px solid #ccc;
  border-radius: 4px;
  background-color: #fff;
  color: #444;
  font-size: 14px;
  cursor: pointer;
}

.google-btn:hover {
  background-color: #f5f5f5;
}

.user-bar {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 16px;
}

.avatar {
  width: 24px;
  height: 24px;
  border-radius: 50%;
}

.user-name {
  flex: 1;
  font-size: 14px;
  color: #555;
}

.logout-btn {
  border: none;
  background: none;
  color: #42b983;
  cursor: pointer;
  font-size: 13px;
}

.todo-form {
  display: flex;
  gap: 8px;
  margin-bottom: 16px;
}

.todo-form input[type='text'] {
  flex: 1;
  padding: 8px 10px;
  border: 1px solid #ccc;
  border-radius: 4px;
  font-size: 14px;
}

.todo-form button {
  padding: 8px 16px;
  border: none;
  border-radius: 4px;
  background-color: #42b983;
  color: #fff;
  font-size: 14px;
  cursor: pointer;
}

.todo-form button:hover {
  background-color: #369870;
}

.items {
  list-style: none;
  padding: 0;
  margin: 0;
}

.items li {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 0;
  border-bottom: 1px solid #eee;
}

.items li label {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
}

.items li.done span {
  text-decoration: line-through;
  color: #aaa;
}

.remove {
  border: none;
  background: none;
  color: #c0392b;
  cursor: pointer;
  font-size: 14px;
}

.summary {
  margin-top: 12px;
  font-size: 13px;
  color: #888;
}
</style>
