<template>
  <a-card class="todo-list" title="할 일 목록">
    <a-spin v-if="!authReady" />

    <div v-else-if="!user" class="login-box">
      <p>Google 계정으로 로그인하면 할 일이 클라우드에 저장되고,<br>다른 기기에서도 똑같이 볼 수 있어요.</p>
      <a-button type="primary" @click="login">Google로 로그인</a-button>
      <a-alert v-if="authError" type="error" :message="authError" show-icon style="margin-top: 12px;" />
    </div>

    <div v-else>
      <div class="user-bar">
        <a-avatar :src="user.photoURL" :size="28">{{ (user.displayName || user.email || '?')[0] }}</a-avatar>
        <span class="user-name">{{ user.displayName || user.email }}</span>
        <a-button type="link" size="small" @click="logout">로그아웃</a-button>
      </div>

      <a-form layout="inline" class="todo-form" @submit.prevent="addTodo">
        <a-input
          v-model:value="newTodoText"
          placeholder="할 일을 입력하세요"
          aria-label="새 할 일"
          @press-enter="addTodo"
        />
        <a-button type="primary" @click="addTodo">추가</a-button>
      </a-form>

      <a-alert v-if="todoError" type="error" :message="todoError" show-icon style="margin: 12px 0;" />

      <a-spin v-if="loadingTodos" />
      <a-empty v-else-if="todos.length === 0" description="아직 할 일이 없어요." />

      <a-list v-else :data-source="todos" size="small">
        <template #renderItem="{ item }">
          <a-list-item>
            <a-checkbox :checked="item.done" @change="toggleDone(item)">
              <span :class="{ done: item.done }">{{ item.text }}</span>
            </a-checkbox>
            <template #actions>
              <a-button type="text" danger size="small" @click="removeTodo(item)" aria-label="삭제">✕</a-button>
            </template>
          </a-list-item>
        </template>
      </a-list>

      <p v-if="todos.length > 0" class="summary">
        {{ remainingCount }}개 남음 / 총 {{ todos.length }}개
      </p>
    </div>
  </a-card>
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
      todoError: '',
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
      this.todoError = ''
      const todosQuery = query(
        collection(db, 'todos'),
        where('uid', '==', this.user.uid),
        orderBy('createdAt', 'asc')
      )
      this.unsubscribeTodos = onSnapshot(todosQuery, (snapshot) => {
        this.todos = snapshot.docs.map(d => ({ id: d.id, ...d.data() }))
        this.loadingTodos = false
      }, (err) => {
        this.loadingTodos = false
        this.todoError = this.describeFirestoreError(err)
      })
    },
    async addTodo() {
      const text = this.newTodoText.trim()
      if (!text || !this.user) return
      this.newTodoText = ''
      this.todoError = ''
      try {
        await addDoc(collection(db, 'todos'), {
          uid: this.user.uid,
          text,
          done: false,
          createdAt: serverTimestamp()
        })
      } catch (err) {
        this.todoError = this.describeFirestoreError(err)
      }
    },
    async toggleDone(todo) {
      this.todoError = ''
      try {
        await updateDoc(doc(db, 'todos', todo.id), { done: !todo.done })
      } catch (err) {
        this.todoError = this.describeFirestoreError(err)
      }
    },
    async removeTodo(todo) {
      this.todoError = ''
      try {
        await deleteDoc(doc(db, 'todos', todo.id))
      } catch (err) {
        this.todoError = this.describeFirestoreError(err)
      }
    },
    describeFirestoreError(err) {
      if (err && err.code === 'permission-denied') {
        return '저장/조회 권한이 없어요. Firebase 콘솔 → Firestore Database → 규칙에 firestore.rules 내용이 게시되어 있는지 확인해주세요.'
      }
      return '문제가 발생했어요: ' + (err && err.message ? err.message : String(err))
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

.login-box {
  text-align: center;
}

.user-bar {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 16px;
}

.user-name {
  flex: 1;
  font-size: 14px;
  color: #555;
}

.todo-form {
  display: flex;
  gap: 8px;
  margin-bottom: 8px;
}

.todo-form :deep(.ant-input) {
  flex: 1;
}

.done {
  text-decoration: line-through;
  color: #aaa;
}

.summary {
  margin-top: 12px;
  font-size: 13px;
  color: #888;
}
</style>
