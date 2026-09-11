<template>
  <div>
    <TodoList/>
  </div>
</template>

<script>
import TodoList from '../components/TodoList.vue'

export default {
  name: 'TodoOnlyView',
  components: {
    TodoList
  }
}
</script>
