<template>
  <div class="hello">
    <h1>{{ msg }}</h1>
    <p>
      이 프로젝트를 설정하고 커스터마이징하는 방법에 대한 가이드와 예제는<br>
      아래
      <a href="https://cli.vuejs.org" target="_blank" rel="noopener">vue-cli 공식 문서</a>를 확인하세요.
    </p>
    <h3>{{date}}</h3>
    <h3>설치된 CLI 플러그인</h3>
    <ul>
      <li><a href="https://github.com/vuejs/vue-cli/tree/dev/packages/%40vue/cli-plugin-babel" target="_blank" rel="noopener">babel</a></li>
      <li><a href="https://github.com/vuejs/vue-cli/tree/dev/packages/%40vue/cli-plugin-eslint" target="_blank" rel="noopener">eslint</a></li>
    </ul>
    <h3>주요 링크</h3>
    <ul>
      <li><a href="https://vuejs.org" target="_blank" rel="noopener">공식 문서</a></li>
      <li><a href="https://forum.vuejs.org" target="_blank" rel="noopener">포럼</a></li>
      <li><a href="https://chat.vuejs.org" target="_blank" rel="noopener">커뮤니티 채팅</a></li>
      <li><a href="https://twitter.com/vuejs" target="_blank" rel="noopener">트위터</a></li>
      <li><a href="https://news.vuejs.org" target="_blank" rel="noopener">뉴스</a></li>
    </ul>
    <h3>생태계</h3>
    <ul>
      <li><a href="https://router.vuejs.org" target="_blank" rel="noopener">vue-router</a></li>
      <li><a href="https://vuex.vuejs.org" target="_blank" rel="noopener">vuex</a></li>
      <li><a href="https://github.com/vuejs/vue-devtools#vue-devtools" target="_blank" rel="noopener">vue-devtools</a></li>
      <li><a href="https://vue-loader.vuejs.org" target="_blank" rel="noopener">vue-loader</a></li>
      <li><a href="https://github.com/vuejs/awesome-vue" target="_blank" rel="noopener">awesome-vue</a></li>
    </ul>
  </div>
</template>

<script>
export default {
  name: 'HelloWorld',
  props: {
    msg: String,
    date : new Date()
  }
}
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped>
h3 {
  margin: 40px 0 0;
}
ul {
  list-style-type: none;
  padding: 0;
}
li {
  display: inline-block;
  margin: 0 10px;
}
a {
  color: #42b983;
}
</style>
