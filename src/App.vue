<template>
  <div id="app">
    <img alt="Vue logo" src="./assets/logo.png">
    <HelloWorld msg="당신의 Vue.js 앱에 오신 것을 환영합니다"/>
    <TodoList/>
    <TodoStats/>
    <PostBoard/>
  </div>
</template>

<script>
import HelloWorld from './components/HelloWorld.vue'
import TodoList from './components/TodoList.vue'
import TodoStats from './components/TodoStats.vue'
import PostBoard from './components/PostBoard.vue'

export default {
  name: 'App',
  components: {
    HelloWorld,
    TodoList,
    TodoStats,
    PostBoard
  }
}
</script>

<style>
#app {
  font-family: Avenir, Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-align: center;
  color: #2c3e50;
  margin-top: 60px;
}
</style>
