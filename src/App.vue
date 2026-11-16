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
        :selected-keys="[selectedMenuKey]"
        @click="onMenuClick"
      >
        <a-menu-item key="/">홈</a-menu-item>
        <a-menu-item key="/todos">할 일 목록</a-menu-item>
        <a-menu-item key="/board">게시판</a-menu-item>
      </a-menu>
    </a-layout-sider>
    <a-layout>
      <div class="top-bar">
        <template v-if="authReady">
          <template v-if="user">
            <a-avatar :src="user.photoURL" :size="28">{{ (user.displayName || user.email || '?')[0] }}</a-avatar>
            <span class="top-user-name">{{ user.displayName || user.email }}</span>
            <a-button type="link" size="small" class="logout-btn" @click="logout">로그아웃</a-button>
          </template>
          <a-button v-else type="primary" size="small" class="login-btn" @click="login">Google로 로그인</a-button>
        </template>
      </div>
      <a-layout-content class="content">
        <router-view/>
      </a-layout-content>
    </a-layout>
  </a-layout>
  </a-config-provider>
</template>

<script>
import koKR from 'ant-design-vue/es/locale/ko_KR'
import { message } from 'ant-design-vue'
import { auth, googleProvider, signInWithPopup, signOut, onAuthStateChanged } from './firebase'

export default {
  name: 'App',
  data() {
    return { koKR, authReady: false, user: null, unsubscribeAuth: null }
  },
  computed: {
    // Keep "게시판" highlighted on a post's detail page (/board/:id).
    selectedMenuKey() {
      return this.$route.path.startsWith('/board') ? '/board' : this.$route.path
    }
  },
  mounted() {
    this.unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      this.authReady = true
      this.user = user
    })
  },
  beforeUnmount() {
    if (this.unsubscribeAuth) this.unsubscribeAuth()
  },
  methods: {
    onMenuClick({ key }) {
      if (this.$route.path !== key) this.$router.push(key)
    },
    async login() {
      try {
        await signInWithPopup(auth, googleProvider)
      } catch (err) {
        // Closing the popup is not an error worth showing.
        if (err && (err.code === 'auth/popup-closed-by-user' || err.code === 'auth/cancelled-popup-request')) return
        message.error('로그인에 실패했어요: ' + (err && err.message ? err.message : String(err)))
      }
    },
    async logout() {
      try {
        await signOut(auth)
      } catch (err) {
        message.error('로그아웃에 실패했어요: ' + (err && err.message ? err.message : String(err)))
      }
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

.top-bar {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
  min-height: 48px;
  padding: 0 24px;
}

.top-user-name {
  max-width: 50vw;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 14px;
  color: #555;
}

.content {
  text-align: center;
  padding: 0 24px 40px;
}

/* Below the "lg" breakpoint the sider collapses to a floating menu button; the top bar leaves room for it. */
.ant-layout-sider-zero-width-trigger {
  top: 8px !important;
}

@media (max-width: 991px) {
  .top-bar {
    min-height: 56px;
    padding-left: 56px;
  }
}

@media (max-width: 575px) {
  .top-bar {
    padding-right: 12px;
  }

  .content {
    padding: 0 12px 24px;
  }

  .ant-card-head {
    padding: 0 16px !important;
  }

  .ant-card-body {
    padding: 16px !important;
  }
}
</style>
