<template>
  <a-card class="board" title="게시판">
    <a-spin v-if="!authReady" />
    <a-empty v-else-if="!user" description="게시판은 로그인 후 이용할 수 있어요." />

    <template v-else>
      <a-form layout="inline" class="post-form" @submit.prevent="addPost">
        <a-input v-model:value="newTitle" placeholder="제목" aria-label="제목" @press-enter="addPost" />
        <a-input v-model:value="newContent" placeholder="내용" aria-label="내용" @press-enter="addPost" />
        <a-button type="primary" @click="addPost">등록</a-button>
      </a-form>

      <a-alert v-if="boardError" type="error" :message="boardError" show-icon style="margin: 12px 0;" />

      <div class="grid-wrap">
        <ag-grid-vue
          style="width: 100%; height: 320px;"
          :theme="gridTheme"
          :rowData="posts"
          :columnDefs="columnDefs"
          :defaultColDef="defaultColDef"
          @cell-value-changed="onCellValueChanged"
          @cell-clicked="onCellClicked"
        />
      </div>
      <p class="hint">제목/내용 칸을 더블클릭하면 본인 글은 수정할 수 있어요. 다른 사람 글은 읽기만 가능합니다.</p>
    </template>
  </a-card>
</template>

<script>
import { AgGridVue } from 'ag-grid-vue3'
import { ModuleRegistry, AllCommunityModule, themeQuartz } from 'ag-grid-community'
import {
  auth,
  db,
  onAuthStateChanged,
  collection,
  query,
  orderBy,
  onSnapshot,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  serverTimestamp
} from '../firebase'

ModuleRegistry.registerModules([AllCommunityModule])

export default {
  name: 'PostBoard',
  components: { AgGridVue },
  data() {
    return {
      authReady: false,
      user: null,
      rawPosts: [],
      newTitle: '',
      newContent: '',
      boardError: '',
      unsubscribeAuth: null,
      unsubscribePosts: null,
      gridTheme: themeQuartz,
      defaultColDef: { resizable: true, sortable: true, filter: true }
    }
  },
  computed: {
    posts() {
      return this.rawPosts.map(p => ({
        ...p,
        createdAtText: p.createdAt ? p.createdAt.toDate().toLocaleString('ko-KR') : ''
      }))
    },
    columnDefs() {
      const isOwn = (params) => !!this.user && params.data.uid === this.user.uid
      return [
        { field: 'title', headerName: '제목', editable: isOwn, flex: 2 },
        { field: 'content', headerName: '내용', editable: isOwn, flex: 5 },
        { field: 'author', headerName: '작성자', editable: false, width: 90 },
        { field: 'createdAtText', headerName: '작성일', editable: false, width: 190 },
        {
          headerName: '',
          colId: 'actions',
          width: 70,
          editable: false,
          cellRenderer: (params) => {
            if (!isOwn(params)) return ''
            return '<button type="button" class="grid-delete-btn">삭제</button>'
          }
        }
      ]
    }
  },
  mounted() {
    this.unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      this.authReady = true
      this.user = user
      this.subscribePosts()
    })
  },
  beforeUnmount() {
    if (this.unsubscribeAuth) this.unsubscribeAuth()
    if (this.unsubscribePosts) this.unsubscribePosts()
  },
  methods: {
    subscribePosts() {
      if (this.unsubscribePosts) {
        this.unsubscribePosts()
        this.unsubscribePosts = null
      }
      this.rawPosts = []
      if (!this.user) return

      const postsQuery = query(collection(db, 'posts'), orderBy('createdAt', 'asc'))
      this.unsubscribePosts = onSnapshot(postsQuery, (snapshot) => {
        this.rawPosts = snapshot.docs.map(d => ({ id: d.id, ...d.data() }))
      }, (err) => {
        this.boardError = this.describeError(err)
      })
    },
    async addPost() {
      const title = this.newTitle.trim()
      const content = this.newContent.trim()
      if (!title || !this.user) return
      this.boardError = ''
      try {
        await addDoc(collection(db, 'posts'), {
          uid: this.user.uid,
          author: this.user.displayName || this.user.email,
          title,
          content,
          createdAt: serverTimestamp()
        })
        this.newTitle = ''
        this.newContent = ''
      } catch (err) {
        this.boardError = this.describeError(err)
      }
    },
    async onCellValueChanged(event) {
      if (event.colDef.field !== 'title' && event.colDef.field !== 'content') return
      if (!this.user || event.data.uid !== this.user.uid) return
      this.boardError = ''
      try {
        await updateDoc(doc(db, 'posts', event.data.id), { [event.colDef.field]: event.newValue })
      } catch (err) {
        this.boardError = this.describeError(err)
      }
    },
    async onCellClicked(event) {
      if (event.colDef.colId !== 'actions') return
      if (!event.event.target.classList.contains('grid-delete-btn')) return
      if (!this.user || event.data.uid !== this.user.uid) return
      this.boardError = ''
      try {
        await deleteDoc(doc(db, 'posts', event.data.id))
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
.board {
  max-width: 700px;
  margin: 40px auto 0;
  text-align: left;
}

.hint {
  color: #888;
  font-size: 13px;
}

.post-form {
  display: flex;
  gap: 8px;
  margin-bottom: 12px;
}

.post-form :deep(.ant-input) {
  flex: 1;
}

.grid-wrap :deep(.grid-delete-btn) {
  border: none;
  background: none;
  color: #c0392b;
  cursor: pointer;
  font-size: 13px;
}
</style>
