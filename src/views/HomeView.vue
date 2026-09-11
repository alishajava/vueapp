<template>
  <div>
    <HelloWorld msg="당신의 Vue.js 앱에 오신 것을 환영합니다"/>
    <TodoStats/>
    <PostBoard/>
  </div>
</template>

<script>
import HelloWorld from '../components/HelloWorld.vue'
import TodoStats from '../components/TodoStats.vue'
import PostBoard from '../components/PostBoard.vue'

export default {
  name: 'HomeView',
  components: {
    HelloWorld,
    TodoStats,
    PostBoard
  }
}
</script>
