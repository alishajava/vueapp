<template>
  <a-card class="post-detail">
    <a-button type="link" class="back-link" @click="goBack">← 목록으로</a-button>

    <a-spin v-if="!authReady || loading" />
    <a-empty v-else-if="!user" description="게시판은 로그인 후 이용할 수 있어요." />
    <a-empty v-else-if="notFound" description="글을 찾을 수 없어요." />

    <template v-else-if="post">
      <a-alert v-if="boardError" type="error" :message="boardError" show-icon style="margin-bottom: 12px;" />

      <template v-if="!editing">
        <h2 class="title">{{ post.title }}</h2>
        <div class="meta">{{ post.author }} · {{ createdAtText }}</div>
        <p class="content">{{ post.content }}</p>
        <div v-if="isOwn" class="actions">
          <a-button @click="startEdit">수정</a-button>
          <a-button danger @click="removePost">삭제</a-button>
        </div>
      </template>

      <template v-else>
        <a-input v-model:value="editTitle" placeholder="제목" class="edit-title" />
        <a-textarea v-model:value="editContent" placeholder="내용" :rows="8" class="edit-content" />
        <div class="actions">
          <a-button type="primary" @click="saveEdit">저장</a-button>
          <a-button @click="cancelEdit">취소</a-button>
        </div>
      </template>
    </template>
  </a-card>
</template>

<script>
import {
  auth,
  db,
  onAuthStateChanged,
  onSnapshot,
  updateDoc,
  deleteDoc,
  doc
} from '../firebase'

export default {
  name: 'PostDetail',
  data() {
    return {
      authReady: false,
      user: null,
      post: null,
      notFound: false,
      loading: false,
      boardError: '',
      editing: false,
      editTitle: '',
      editContent: '',
      unsubscribeAuth: null,
      unsubscribePost: null
    }
  },
  computed: {
    isOwn() {
      return !!this.user && !!this.post && this.post.uid === this.user.uid
    },
    createdAtText() {
      return this.post && this.post.createdAt ? this.post.createdAt.toDate().toLocaleString('ko-KR') : ''
    }
  },
  mounted() {
    this.unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      this.authReady = true
      this.user = user
      this.subscribePost()
    })
  },
  beforeUnmount() {
    if (this.unsubscribeAuth) this.unsubscribeAuth()
    if (this.unsubscribePost) this.unsubscribePost()
  },
  methods: {
    subscribePost() {
      if (this.unsubscribePost) {
        this.unsubscribePost()
        this.unsubscribePost = null
      }
      this.post = null
      this.notFound = false
      if (!this.user) return

      this.loading = true
      this.unsubscribePost = onSnapshot(doc(db, 'posts', this.$route.params.id), (snap) => {
        this.loading = false
        if (!snap.exists()) {
          this.notFound = true
          this.post = null
          return
        }
        this.post = { id: snap.id, ...snap.data() }
      }, (err) => {
        this.loading = false
        this.boardError = this.describeError(err)
      })
    },
    goBack() {
      this.$router.push('/board')
    },
    startEdit() {
      this.editTitle = this.post.title
      this.editContent = this.post.content
      this.editing = true
    },
    cancelEdit() {
      this.editing = false
    },
    async saveEdit() {
      const title = this.editTitle.trim()
      const content = this.editContent.trim()
      if (!title) return
      this.boardError = ''
      try {
        await updateDoc(doc(db, 'posts', this.post.id), { title, content })
        this.editing = false
      } catch (err) {
        this.boardError = this.describeError(err)
      }
    },
    async removePost() {
      this.boardError = ''
      try {
        await deleteDoc(doc(db, 'posts', this.post.id))
        this.$router.push('/board')
      } catch (err) {
        this.boardError = this.describeError(err)
      }
    },
    describeError(err) {
      if (err && err.code === 'permission-denied') {
        return '권한이 없어요. Firestore 보안 규칙(firestore.rules)에 posts 컬렉션 규칙이 게시되어 있는지 확인해주세요.'
      }
      return '문제가 발생했어요: ' + (err && err.message ? err.message : String(err))
    }
  }
}
</script>

<style scoped>
.post-detail {
  max-width: 800px;
  margin: 40px auto 0;
  text-align: left;
}

.back-link {
  padding-left: 0;
  margin-bottom: 8px;
}

.title {
  margin-bottom: 4px;
}

.meta {
  color: #888;
  font-size: 13px;
  margin-bottom: 20px;
}

.content {
  white-space: pre-wrap;
  line-height: 1.6;
  margin-bottom: 20px;
}

.edit-title {
  margin-bottom: 12px;
}

.edit-content {
  margin-bottom: 12px;
}

.actions {
  display: flex;
  gap: 8px;
}
</style>
