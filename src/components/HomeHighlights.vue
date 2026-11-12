<template>
  <div class="highlights">
    <a-card class="highlight-card" title="할 일 목록 TOP 3" size="small">
      <a-spin v-if="!authReady" />
      <a-empty v-else-if="!user" description="로그인하면 볼 수 있어요." />
      <a-empty v-else-if="topTodos.length === 0" description="아직 할 일이 없어요." />
      <ul v-else class="mini-list">
        <li v-for="todo in topTodos" :key="todo.id" :class="{ done: todo.done }">
          <span class="dot" :class="{ filled: todo.done }"></span>
          <span class="mini-text">{{ todo.text }}</span>
          <span v-if="todo.dueDate && !todo.done" class="mini-due" :class="dueStatus(todo, today)">{{ shortDue(todo.dueDate) }}</span>
        </li>
      </ul>
      <router-link v-if="user" to="/todos" class="more-link">전체보기 →</router-link>
    </a-card>

    <a-card class="highlight-card" title="게시판 TOP 3" size="small">
      <a-spin v-if="!authReady" />
      <a-empty v-else-if="!user" description="로그인하면 볼 수 있어요." />
      <a-empty v-else-if="topPosts.length === 0" description="아직 게시글이 없어요." />
      <ul v-else class="mini-list">
        <li v-for="post in topPosts" :key="post.id">
          <router-link :to="`/board/${post.id}`" class="mini-text mini-link">{{ post.title }}</router-link>
          <span class="mini-author">{{ post.author }}</span>
        </li>
      </ul>
      <router-link v-if="user" to="/board" class="more-link">전체보기 →</router-link>
    </a-card>
  </div>
</template>

<script>
import {
  auth,
  db,
  onAuthStateChanged,
  collection,
  query,
  where,
  onSnapshot
} from '../firebase'
import { todayString, dueStatus } from '../utils/due'

export default {
  name: 'HomeHighlights',
  data() {
    return {
      today: todayString(),
      authReady: false,
      user: null,
      todos: [],
      posts: [],
      unsubscribeAuth: null,
      unsubscribeTodos: null,
      unsubscribePosts: null
    }
  },
  computed: {
    topTodos() {
      return [...this.todos]
        .sort((a, b) => this.orderValue(a) - this.orderValue(b))
        .slice(0, 3)
    },
    topPosts() {
      return [...this.posts]
        .sort((a, b) => this.orderValue(a) - this.orderValue(b))
        .slice(0, 3)
    }
  },
  mounted() {
    this.unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      this.authReady = true
      this.user = user
      this.subscribeTodos()
      this.subscribePosts()
    })
  },
  beforeUnmount() {
    if (this.unsubscribeAuth) this.unsubscribeAuth()
    if (this.unsubscribeTodos) this.unsubscribeTodos()
    if (this.unsubscribePosts) this.unsubscribePosts()
  },
  methods: {
    dueStatus,
    shortDue(dueDate) {
      return dueDate.slice(5).replace('-', '/') + ' 마감'
    },
    orderValue(item) {
      if (typeof item.order === 'number') return item.order
      return item.createdAt ? item.createdAt.toMillis() : 0
    },
    subscribeTodos() {
      if (this.unsubscribeTodos) {
        this.unsubscribeTodos()
        this.unsubscribeTodos = null
      }
      this.todos = []
      if (!this.user) return

      const todosQuery = query(
        collection(db, 'todos'),
        where('uid', '==', this.user.uid)
      )
      this.unsubscribeTodos = onSnapshot(todosQuery, (snapshot) => {
        this.todos = snapshot.docs.map(d => ({ id: d.id, ...d.data() }))
      })
    },
    subscribePosts() {
      if (this.unsubscribePosts) {
        this.unsubscribePosts()
        this.unsubscribePosts = null
      }
      this.posts = []
      if (!this.user) return

      const postsQuery = query(collection(db, 'posts'))
      this.unsubscribePosts = onSnapshot(postsQuery, (snapshot) => {
        this.posts = snapshot.docs.map(d => ({ id: d.id, ...d.data() }))
      })
    }
  }
}
</script>

<style scoped>
.highlights {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  max-width: 1300px;
  margin: 24px auto 0;
}

.highlight-card {
  flex: 1;
  min-width: 300px;
  text-align: left;
}

.mini-list {
  list-style: none;
  margin: 0;
  padding: 0;
}

.mini-list li {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 0;
  border-bottom: 1px solid #f0f0f0;
}

.mini-list li:last-child {
  border-bottom: none;
}

.dot {
  flex-shrink: 0;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  border: 1px solid #42b983;
}

.dot.filled {
  background: #42b983;
}

.mini-text {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 14px;
}

.mini-link {
  color: inherit;
}

.mini-link:hover {
  color: #1677ff;
}

.done .mini-text {
  text-decoration: line-through;
  color: #aaa;
}

.mini-due {
  flex-shrink: 0;
  font-size: 12px;
  color: #999;
}

.mini-due.overdue {
  color: #c0392b;
  font-weight: 600;
}

.mini-due.today {
  color: #d46b08;
  font-weight: 600;
}

.mini-author {
  flex-shrink: 0;
  font-size: 12px;
  color: #999;
}

.more-link {
  display: inline-block;
  margin-top: 10px;
  font-size: 13px;
  color: #1677ff;
}
</style>
