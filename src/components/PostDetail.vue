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
        <div class="actions">
          <a-button :type="liked ? 'primary' : 'default'" class="like-btn" @click="toggleLike">추천 {{ likeCount }}</a-button>
          <template v-if="isOwn">
            <a-button @click="startEdit">수정</a-button>
            <a-button danger @click="removePost">삭제</a-button>
          </template>
        </div>

        <section class="comments">
          <h3 class="comments-title">댓글 {{ sortedComments.length }}</h3>
          <a-alert v-if="commentError" type="error" :message="commentError" show-icon style="margin-bottom: 12px;" />
          <ul v-if="sortedComments.length > 0" class="comment-list">
            <li v-for="c in sortedComments" :key="c.id" class="comment">
              <div class="comment-head">
                <span class="comment-author">{{ c.author }}</span>
                <span class="comment-time">{{ commentTime(c) }}</span>
                <a-button
                  v-if="user && c.uid === user.uid"
                  type="text"
                  danger
                  size="small"
                  class="comment-delete"
                  @click="removeComment(c)"
                >삭제</a-button>
              </div>
              <p class="comment-text">{{ c.text }}</p>
            </li>
          </ul>
          <p v-else class="comment-empty">아직 댓글이 없어요. 첫 댓글을 남겨보세요.</p>
          <div class="comment-form">
            <a-textarea v-model:value="newComment" placeholder="댓글을 입력하세요" :rows="2" :maxlength="500" />
            <a-button type="primary" @click="addComment">등록</a-button>
          </div>
        </section>
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
  collection,
  query,
  onSnapshot,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  serverTimestamp,
  arrayUnion,
  arrayRemove
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
      comments: [],
      newComment: '',
      commentError: '',
      unsubscribeAuth: null,
      unsubscribePost: null,
      unsubscribeComments: null
    }
  },
  computed: {
    sortedComments() {
      // Comments still waiting for the server timestamp have no createdAt yet; keep them last.
      const millis = (c) => (c.createdAt ? c.createdAt.toMillis() : Number.MAX_SAFE_INTEGER)
      return [...this.comments].sort((a, b) => millis(a) - millis(b))
    },
    isOwn() {
      return !!this.user && !!this.post && this.post.uid === this.user.uid
    },
    likeCount() {
      return this.post && this.post.likes ? this.post.likes.length : 0
    },
    liked() {
      return !!this.user && !!this.post && (this.post.likes || []).includes(this.user.uid)
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
    if (this.unsubscribeComments) this.unsubscribeComments()
  },
  methods: {
    subscribeComments() {
      if (this.unsubscribeComments) {
        this.unsubscribeComments()
        this.unsubscribeComments = null
      }
      this.comments = []
      if (!this.user) return

      const commentsQuery = query(collection(db, 'posts', this.$route.params.id, 'comments'))
      this.unsubscribeComments = onSnapshot(commentsQuery, (snapshot) => {
        this.comments = snapshot.docs.map(d => ({ id: d.id, ...d.data() }))
      }, (err) => {
        this.commentError = this.describeError(err)
      })
    },
    commentTime(comment) {
      return comment.createdAt ? comment.createdAt.toDate().toLocaleString('ko-KR') : ''
    },
    async addComment() {
      const text = this.newComment.trim()
      if (!text || !this.user) return
      this.commentError = ''
      try {
        await addDoc(collection(db, 'posts', this.post.id, 'comments'), {
          uid: this.user.uid,
          author: this.user.displayName || this.user.email,
          text,
          createdAt: serverTimestamp()
        })
        this.newComment = ''
      } catch (err) {
        this.commentError = this.describeError(err)
      }
    },
    async removeComment(comment) {
      this.commentError = ''
      try {
        await deleteDoc(doc(db, 'posts', this.post.id, 'comments', comment.id))
      } catch (err) {
        this.commentError = this.describeError(err)
      }
    },
    subscribePost() {
      if (this.unsubscribePost) {
        this.unsubscribePost()
        this.unsubscribePost = null
      }
      this.post = null
      this.notFound = false
      this.subscribeComments()
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
    async toggleLike() {
      if (!this.user) return
      this.boardError = ''
      try {
        await updateDoc(doc(db, 'posts', this.post.id), {
          likes: this.liked ? arrayRemove(this.user.uid) : arrayUnion(this.user.uid)
        })
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

.comments {
  margin-top: 32px;
  padding-top: 20px;
  border-top: 1px solid #f0f0f0;
}

.comments-title {
  font-size: 16px;
  margin-bottom: 12px;
}

.comment-list {
  list-style: none;
  margin: 0 0 16px;
  padding: 0;
}

.comment {
  padding: 10px 0;
  border-bottom: 1px solid #f5f5f5;
}

.comment-head {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
}

.comment-author {
  font-weight: 600;
}

.comment-time {
  color: #999;
}

.comment-delete {
  margin-left: auto;
}

.comment-text {
  margin: 4px 0 0;
  white-space: pre-wrap;
  line-height: 1.5;
}

.comment-empty {
  color: #999;
  font-size: 14px;
  margin-bottom: 16px;
}

.comment-form {
  display: flex;
  gap: 8px;
  align-items: flex-end;
}

.comment-form :deep(textarea) {
  flex: 1;
}
</style>
