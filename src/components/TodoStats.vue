<template>
  <a-card class="todo-stats" title="할 일 통계">
    <a-spin v-if="!authReady" />
    <a-empty v-else-if="!user" description="로그인하면 통계를 볼 수 있어요." />
    <a-empty v-else-if="todos.length === 0" description="아직 통계를 낼 데이터가 없어요. 할 일을 추가해보세요." />

    <div v-else class="charts">
      <div class="chart-box">
        <h4>완료 현황</h4>
        <Doughnut :data="statusChartData" :options="doughnutOptions" />
      </div>
      <div class="chart-box">
        <h4>날짜별 등록 개수</h4>
        <Bar :data="dailyChartData" :options="barOptions" />
      </div>
      <div class="chart-box chart-box-wide">
        <h4>날짜별 완료/미완료 현황 (피벗)</h4>
        <Bar :data="pivotChartData" :options="pivotOptions" />
      </div>
    </div>
  </a-card>
</template>

<script>
import { Doughnut, Bar } from 'vue-chartjs'
import {
  Chart as ChartJS,
  ArcElement,
  BarElement,
  CategoryScale,
  LinearScale,
  Tooltip,
  Legend
} from 'chart.js'
import {
  auth,
  db,
  onAuthStateChanged,
  collection,
  query,
  where,
  orderBy,
  onSnapshot
} from '../firebase'

ChartJS.register(ArcElement, BarElement, CategoryScale, LinearScale, Tooltip, Legend)

export default {
  name: 'TodoStats',
  components: { Doughnut, Bar },
  data() {
    return {
      authReady: false,
      user: null,
      todos: [],
      unsubscribeAuth: null,
      unsubscribeTodos: null,
      doughnutOptions: { responsive: true, maintainAspectRatio: false },
      barOptions: {
        responsive: true,
        maintainAspectRatio: false,
        scales: { y: { beginAtZero: true, ticks: { precision: 0 } } }
      },
      pivotOptions: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          x: { stacked: true },
          y: { stacked: true, beginAtZero: true, ticks: { precision: 0 } }
        }
      }
    }
  },
  computed: {
    statusChartData() {
      const done = this.todos.filter(t => t.done).length
      const remaining = this.todos.length - done
      return {
        labels: ['완료', '미완료'],
        datasets: [{
          data: [done, remaining],
          backgroundColor: ['#42b983', '#e0e0e0']
        }]
      }
    },
    dailyChartData() {
      const counts = {}
      this.todos.forEach(todo => {
        if (!todo.createdAt) return
        const day = todo.createdAt.toDate().toISOString().slice(0, 10)
        counts[day] = (counts[day] || 0) + 1
      })
      const labels = Object.keys(counts).sort()
      return {
        labels,
        datasets: [{
          label: '등록 개수',
          data: labels.map(day => counts[day]),
          backgroundColor: '#42b983'
        }]
      }
    },
    pivotChartData() {
      // 행: 날짜, 열: 완료/미완료, 값: 개수 -- 피벗 테이블을 누적 막대 차트로 표현
      const doneCounts = {}
      const remainingCounts = {}
      this.todos.forEach(todo => {
        if (!todo.createdAt) return
        const day = todo.createdAt.toDate().toISOString().slice(0, 10)
        const bucket = todo.done ? doneCounts : remainingCounts
        bucket[day] = (bucket[day] || 0) + 1
      })
      const labels = [...new Set([...Object.keys(doneCounts), ...Object.keys(remainingCounts)])].sort()
      return {
        labels,
        datasets: [
          { label: '완료', data: labels.map(day => doneCounts[day] || 0), backgroundColor: '#42b983' },
          { label: '미완료', data: labels.map(day => remainingCounts[day] || 0), backgroundColor: '#e0e0e0' }
        ]
      }
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
    subscribeTodos() {
      if (this.unsubscribeTodos) {
        this.unsubscribeTodos()
        this.unsubscribeTodos = null
      }
      this.todos = []
      if (!this.user) return

      const todosQuery = query(
        collection(db, 'todos'),
        where('uid', '==', this.user.uid),
        orderBy('createdAt', 'asc')
      )
      this.unsubscribeTodos = onSnapshot(todosQuery, (snapshot) => {
        this.todos = snapshot.docs.map(d => ({ id: d.id, ...d.data() }))
      })
    }
  }
}
</script>

<style scoped>
.todo-stats {
  max-width: 700px;
  margin: 40px auto 0;
  text-align: left;
}

.charts {
  display: flex;
  flex-wrap: wrap;
  gap: 24px;
}

.chart-box {
  flex: 1;
  min-width: 260px;
  height: 260px;
}

.chart-box-wide {
  flex-basis: 100%;
}

.chart-box h4 {
  margin: 0 0 8px;
  font-size: 14px;
  color: #555;
}
</style>
