<template>
  <div class="todo-list">
    <h3>할 일 목록</h3>
    <form class="todo-form" @submit.prevent="addTodo">
      <input
        v-model="newTodoText"
        type="text"
        placeholder="할 일을 입력하세요"
        aria-label="새 할 일"
      >
      <button type="submit">추가</button>
    </form>

    <p v-if="todos.length === 0" class="empty">아직 할 일이 없어요.</p>

    <ul v-else class="items">
      <li v-for="todo in todos" :key="todo.id" :class="{ done: todo.done }">
        <label>
          <input type="checkbox" v-model="todo.done">
          <span>{{ todo.text }}</span>
        </label>
        <button type="button" class="remove" @click="removeTodo(todo.id)" aria-label="삭제">✕</button>
      </li>
    </ul>

    <p v-if="todos.length > 0" class="summary">
      {{ remainingCount }}개 남음 / 총 {{ todos.length }}개
    </p>
  </div>
</template>

<script>
const STORAGE_KEY = 'vueapp-todos'

export default {
  name: 'TodoList',
  data() {
    return {
      newTodoText: '',
      todos: JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]')
    }
  },
  computed: {
    remainingCount() {
      return this.todos.filter(todo => !todo.done).length
    }
  },
  watch: {
    todos: {
      deep: true,
      handler(todos) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(todos))
      }
    }
  },
  methods: {
    addTodo() {
      const text = this.newTodoText.trim()
      if (!text) return
      this.todos.push({ id: Date.now(), text, done: false })
      this.newTodoText = ''
    },
    removeTodo(id) {
      this.todos = this.todos.filter(todo => todo.id !== id)
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

.empty {
  color: #888;
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
