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
        <a-date-picker
          v-model:value="newDueDate"
          value-format="YYYY-MM-DD"
          placeholder="마감일(선택)"
          aria-label="마감일"
          class="due-input"
        />
        <a-button type="primary" @click="addTodo">추가</a-button>
      </a-form>

      <a-alert v-if="todoError" type="error" :message="todoError" show-icon style="margin: 12px 0;" />

      <a-spin v-if="loadingTodos" />
      <a-empty v-else-if="sortedTodos.length === 0" description="아직 할 일이 없어요." />

      <draggable
        v-else
        v-model="sortedTodos"
        item-key="id"
        ghost-class="drag-ghost"
        class="items"
      >
        <template #item="{ element: todo }">
          <div class="item" :class="{ done: todo.done }">
            <a-checkbox :checked="todo.done" @change="toggleDone(todo)">
              <span :class="{ done: todo.done }">{{ todo.text }}</span>
            </a-checkbox>
            <span v-if="dueStatus(todo, today) === 'overdue'" class="due-tag overdue">기한 지남</span>
            <span v-else-if="dueStatus(todo, today) === 'today'" class="due-tag today">오늘 마감</span>
            <a-date-picker
              class="due-picker"
              :class="dueStatus(todo, today)"
              size="small"
              value-format="YYYY-MM-DD"
              placeholder="마감일"
              aria-label="마감일"
              :value="todo.dueDate || null"
              @change="(value) => setDueDate(todo, value)"
            />
            <a-button type="text" danger size="small" class="remove-btn" @click="removeTodo(todo)" aria-label="삭제">✕</a-button>
          </div>
        </template>
      </draggable>

      <p v-if="todos.length > 0" class="summary">
        {{ remainingCount }}개 남음 / 총 {{ todos.length }}개<template v-if="overdueCount > 0"> · <span class="overdue-count">기한 지난 {{ overdueCount }}개</span></template> · 드래그해서 순서를 바꿀 수 있어요
      </p>
    </div>
  </a-card>
</template>

<script>
import draggable from 'vuedraggable'
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
  onSnapshot,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  serverTimestamp
} from '../firebase'
import { todayString, dueStatus } from '../utils/due'

export default {
  name: 'TodoList',
  components: { draggable },
  data() {
    return {
      authReady: false,
      authError: '',
      user: null,
      newTodoText: '',
      newDueDate: null,
      today: todayString(),
      todos: [],
      todoError: '',
      loadingTodos: false,
      unsubscribeAuth: null,
      unsubscribeTodos: null,
      todayTimer: null
    }
  },
  computed: {
    remainingCount() {
      return this.todos.filter(todo => !todo.done).length
    },
    overdueCount() {
      return this.todos.filter(todo => dueStatus(todo, this.today) === 'overdue').length
    },
    sortedTodos: {
      get() {
        return [...this.todos].sort((a, b) => this.orderValue(a) - this.orderValue(b))
      },
      set(newList) {
        this.todos = newList
        this.persistOrder(newList)
      }
    }
  },
  mounted() {
    this.unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      this.authReady = true
      this.user = user
      this.subscribeTodos()
    })
    // Keep "today" fresh if the page stays open past midnight.
    this.todayTimer = setInterval(() => { this.today = todayString() }, 60000)
  },
  beforeUnmount() {
    if (this.unsubscribeAuth) this.unsubscribeAuth()
    if (this.unsubscribeTodos) this.unsubscribeTodos()
    if (this.todayTimer) clearInterval(this.todayTimer)
  },
  methods: {
    dueStatus,
    async setDueDate(todo, value) {
      this.todoError = ''
      try {
        await updateDoc(doc(db, 'todos', todo.id), { dueDate: value || null })
      } catch (err) {
        this.todoError = this.describeFirestoreError(err)
      }
    },
    orderValue(todo) {
      if (typeof todo.order === 'number') return todo.order
      return todo.createdAt ? todo.createdAt.toMillis() : 0
    },
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
      // No orderBy here: ordering is done client-side (sortedTodos) so
      // existing docs without an `order` field (pre-dating drag reorder)
      // still show up instead of being silently excluded by the query.
      const todosQuery = query(
        collection(db, 'todos'),
        where('uid', '==', this.user.uid)
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
      const dueDate = this.newDueDate || null
      this.newTodoText = ''
      this.newDueDate = null
      this.todoError = ''
      const minOrder = this.todos.length > 0
        ? Math.min(...this.todos.map(todo => this.orderValue(todo)))
        : 0
      try {
        await addDoc(collection(db, 'todos'), {
          uid: this.user.uid,
          text,
          done: false,
          dueDate,
          order: minOrder - 1,
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
    async persistOrder(newList) {
      this.todoError = ''
      try {
        await Promise.all(
          newList.map((todo, index) => updateDoc(doc(db, 'todos', todo.id), { order: index }))
        )
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
  max-width: 900px;
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

.items {
  display: flex;
  flex-direction: column;
}

.item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 0;
  border-bottom: 1px solid #eee;
  background: #fff;
  cursor: grab;
}

.drag-ghost {
  opacity: 0.4;
  background: #f5f5f5;
}

.due-input {
  width: 150px;
}

.due-picker {
  width: 130px;
  margin-left: auto;
}

.due-picker.overdue :deep(input) {
  color: #c0392b;
}

.due-picker.today :deep(input) {
  color: #d46b08;
}

.due-tag {
  margin-left: auto;
  padding: 0 8px;
  border-radius: 10px;
  font-size: 12px;
  line-height: 20px;
}

.due-tag + .due-picker {
  margin-left: 0;
}

.due-tag.overdue {
  background: #fdecea;
  color: #c0392b;
}

.due-tag.today {
  background: #fff3e0;
  color: #d46b08;
}

.overdue-count {
  color: #c0392b;
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
