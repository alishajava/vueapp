<template>
  <a-config-provider :locale="koKR">
  <a-layout id="app">
    <a-layout-sider
      :width="200"
      collapsible
      breakpoint="lg"
      collapsed-width="0"
    >
      <a-menu
        mode="inline"
        theme="dark"
        :selected-keys="[$route.path]"
        @click="onMenuClick"
      >
        <a-menu-item key="/">홈</a-menu-item>
        <a-menu-item key="/todos">할 일 목록</a-menu-item>
        <a-menu-item key="/board">게시판</a-menu-item>
      </a-menu>
    </a-layout-sider>
    <a-layout>
      <a-layout-content class="content">
        <router-view/>
      </a-layout-content>
    </a-layout>
  </a-layout>
  </a-config-provider>
</template>

<script>
import koKR from 'ant-design-vue/es/locale/ko_KR'

export default {
  name: 'App',
  data() {
    return { koKR }
  },
  methods: {
    onMenuClick({ key }) {
      if (this.$route.path !== key) this.$router.push(key)
    }
  }
}
</script>

<style>
#app {
  font-family: Avenir, Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  color: #2c3e50;
  min-height: 100vh;
}

.content {
  text-align: center;
  padding: 40px 24px;
}
</style>
