<template>
  <div>
    <HelloWorld msg="당신의 Vue.js 앱에 오신 것을 환영합니다"/>
    <HomeHighlights/>
    <TodoStats/>
  </div>
</template>

<script>
import HelloWorld from '../components/HelloWorld.vue'
import HomeHighlights from '../components/HomeHighlights.vue'
import TodoStats from '../components/TodoStats.vue'

export default {
  name: 'HomeView',
  components: {
    HelloWorld,
    HomeHighlights,
    TodoStats
  }
}
</script>
