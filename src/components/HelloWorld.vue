<template>
  <div class="hello">
    <h1>{{ msg }}</h1>
  </div>
</template>

<script>
export default {
  name: 'HelloWorld',
  props: {
    msg: String
  }
}
</script>

<style scoped>
h1 {
  word-break: keep-all;
}

@media (max-width: 575px) {
  h1 {
    font-size: 22px;
  }
}
</style>
