<template>
  <a-card class="board" title="게시판">
    <a-spin v-if="!authReady" />
    <a-empty v-else-if="!user" description="게시판은 로그인 후 이용할 수 있어요." />

    <template v-else>
      <div class="post-form">
        <a-input v-model:value="newTitle" placeholder="제목" aria-label="제목" @press-enter="addPost" />
        <a-textarea
          v-model:value="newContent"
          placeholder="내용 (줄바꿈은 Enter, 등록은 Ctrl+Enter)"
          aria-label="내용"
          :auto-size="{ minRows: 2, maxRows: 8 }"
          @keydown.ctrl.enter.prevent="addPost"
          @keydown.meta.enter.prevent="addPost"
        />
        <div class="post-form-actions">
          <a-button type="primary" @click="addPost">등록</a-button>
        </div>
      </div>

      <a-alert v-if="boardError" type="error" :message="boardError" show-icon style="margin: 12px 0;" />

      <div class="grid-wrap">
        <ag-grid-vue
          :style="isNarrow ? 'width: 100%;' : 'width: 100%; height: 520px;'"
          :domLayout="isNarrow ? 'autoHeight' : 'normal'"
          :theme="gridTheme"
          :rowData="posts"
          :columnDefs="columnDefs"
          :defaultColDef="defaultColDef"
          :localeText="localeText"
          :rowDragManaged="true"
          :rowDragEntireRow="!isTouch"
          :stopEditingWhenCellsLoseFocus="true"
          @cell-value-changed="onCellValueChanged"
          @cell-clicked="onCellClicked"
          @row-drag-end="onRowDragEnd"
        />
      </div>
      <p v-if="isNarrow" class="hint">'보기'를 누르면 글 전체와 댓글을 볼 수 있어요.<template v-if="isTouch"> 제목 앞의 점 모양 손잡이를 끌면 순서를 바꿀 수 있어요.</template></p>
      <p v-else class="hint">{{ isTouch ? '제목 앞의 점 모양 손잡이를 끌면 순서를 바꿀 수 있어요.' : '행을 드래그하면 순서를 바꿀 수 있어요.' }} '보기'를 누르면 글 상세보기로 이동해요. '추천'을 누르면 글을 추천하고, 다시 누르면 취소돼요. 제목/내용 칸을 더블클릭하면 본인 글은 바로 수정할 수 있어요(내용 칸은 Shift+Enter로 줄바꿈, Enter로 저장). 다른 사람 글은 읽기만 가능합니다.</p>
    </template>
  </a-card>
</template>

<script>
import { AgGridVue } from 'ag-grid-vue3'
import { ModuleRegistry, AllCommunityModule, themeQuartz } from 'ag-grid-community'
import { Modal } from 'ant-design-vue'
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

ModuleRegistry.registerModules([AllCommunityModule])

const GRID_LOCALE_KO = {
  noRowsToShow: '아직 게시글이 없어요',
  loadingOoo: '불러오는 중...',
  filterOoo: '검색어...',
  contains: '포함',
  notContains: '포함하지 않음',
  equals: '같음',
  notEqual: '같지 않음',
  startsWith: '시작 글자',
  endsWith: '끝 글자',
  blank: '비어 있음',
  notBlank: '비어 있지 않음',
  andCondition: '그리고',
  orCondition: '또는',
  lessThan: '보다 작음',
  greaterThan: '보다 큼',
  inRange: '사이',
  before: '이전',
  after: '이후',
  resetFilter: '초기화',
  applyFilter: '적용'
}

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
      defaultColDef: { resizable: true, sortable: true, filter: true },
      localeText: GRID_LOCALE_KO,
      isNarrow: false,
      isTouch: false
    }
  },
  computed: {
    posts() {
      return [...this.rawPosts].sort((a, b) => this.orderValue(a) - this.orderValue(b))
    },
    columnDefs() {
      const isOwn = (params) => !!this.user && params.data.uid === this.user.uid
      // On touch screens only a handle starts a row drag, so swiping the list scrolls it instead.
      const titleCol = { field: 'title', headerName: '제목', editable: isOwn, rowDrag: this.isTouch }
      const likesCol = {
        headerName: '추천',
        colId: 'likes',
        editable: false,
        filter: false,
        valueGetter: (params) => (params.data.likes || []).length,
        cellRenderer: (params) => {
          const liked = !!this.user && (params.data.likes || []).includes(this.user.uid)
          return `<button type="button" class="grid-like-btn${liked ? ' liked' : ''}">추천 ${params.value}</button>`
        }
      }
      const actionsCol = {
        headerName: '',
        colId: 'actions',
        editable: false,
        cellRenderer: (params) => {
          const viewBtn = '<button type="button" class="grid-view-btn">보기</button>'
          if (!isOwn(params)) return viewBtn
          return viewBtn + '<button type="button" class="grid-delete-btn">삭제</button>'
        }
      }
      if (this.isNarrow) {
        // Phone width: keep title + 추천 + 보기/삭제; the rest is on the detail page.
        return [
          { ...titleCol, flex: 1, minWidth: 120 },
          { ...likesCol, width: 92 },
          { ...actionsCol, width: 128 }
        ]
      }
      return [
        { ...titleCol, flex: 3 },
        {
          field: 'content',
          headerName: '내용',
          editable: isOwn,
          flex: 4,
          cellEditor: 'agLargeTextCellEditor',
          cellEditorPopup: true,
          cellEditorParams: { rows: 6, cols: 50, maxLength: 5000 }
        },
        { field: 'author', headerName: '작성자', editable: false, width: 90 },
        {
          // Real Date values so sorting and filtering go by time, not by the formatted text.
          colId: 'createdAt',
          headerName: '작성일',
          editable: false,
          width: 190,
          filter: 'agDateColumnFilter',
          valueGetter: (params) => (params.data.createdAt ? params.data.createdAt.toDate() : null),
          valueFormatter: (params) => (params.value ? params.value.toLocaleString('ko-KR') : '')
        },
        { ...likesCol, width: 100 },
        { ...actionsCol, width: 120 }
      ]
    }
  },
  mounted() {
    this.mqNarrow = window.matchMedia('(max-width: 640px)')
    this.mqTouch = window.matchMedia('(pointer: coarse)')
    this.onMediaChange = () => {
      this.isNarrow = this.mqNarrow.matches
      this.isTouch = this.mqTouch.matches
    }
    this.onMediaChange()
    this.mqNarrow.addEventListener('change', this.onMediaChange)
    this.mqTouch.addEventListener('change', this.onMediaChange)
    this.unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      this.authReady = true
      this.user = user
      this.subscribePosts()
    })
  },
  beforeUnmount() {
    this.mqNarrow.removeEventListener('change', this.onMediaChange)
    this.mqTouch.removeEventListener('change', this.onMediaChange)
    if (this.unsubscribeAuth) this.unsubscribeAuth()
    if (this.unsubscribePosts) this.unsubscribePosts()
  },
  methods: {
    orderValue(post) {
      if (typeof post.order === 'number') return post.order
      return post.createdAt ? post.createdAt.toMillis() : 0
    },
    subscribePosts() {
      if (this.unsubscribePosts) {
        this.unsubscribePosts()
        this.unsubscribePosts = null
      }
      this.rawPosts = []
      if (!this.user) return

      // No orderBy here: ordering is done client-side (see `posts`
      // computed) so posts without an `order` field (pre-dating drag
      // reorder) still show up instead of being excluded by the query.
      const postsQuery = query(collection(db, 'posts'))
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
      const minOrder = this.rawPosts.length > 0
        ? Math.min(...this.rawPosts.map(post => this.orderValue(post)))
        : 0
      try {
        await addDoc(collection(db, 'posts'), {
          uid: this.user.uid,
          author: this.user.displayName || this.user.email,
          title,
          content,
          order: minOrder - 1,
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
    async toggleLike(post) {
      if (!this.user) return
      const liked = (post.likes || []).includes(this.user.uid)
      this.boardError = ''
      try {
        await updateDoc(doc(db, 'posts', post.id), {
          likes: liked ? arrayRemove(this.user.uid) : arrayUnion(this.user.uid)
        })
      } catch (err) {
        this.boardError = this.describeError(err)
      }
    },
    async onCellClicked(event) {
      if (event.colDef.colId === 'likes') {
        if (event.event.target.classList.contains('grid-like-btn')) await this.toggleLike(event.data)
        return
      }
      if (event.colDef.colId !== 'actions') return
      if (event.event.target.classList.contains('grid-view-btn')) {
        this.$router.push(`/board/${event.data.id}`)
        return
      }
      if (!event.event.target.classList.contains('grid-delete-btn')) return
      if (!this.user || event.data.uid !== this.user.uid) return
      const post = event.data
      Modal.confirm({
        title: '이 글을 삭제할까요?',
        content: `"${post.title}" 글이 삭제되고 되돌릴 수 없어요.`,
        okText: '삭제',
        okType: 'danger',
        cancelText: '취소',
        onOk: () => this.deletePost(post)
      })
    },
    async deletePost(post) {
      this.boardError = ''
      try {
        await deleteDoc(doc(db, 'posts', post.id))
      } catch (err) {
        this.boardError = this.describeError(err)
      }
    },
    async onRowDragEnd(event) {
      const api = event.api
      // While the grid is sorted or filtered the rows on screen are not the board order
      // (or not all of it), so saving them would overwrite everyone's order.
      if (api.isAnyFilterPresent() || api.getColumnState().some(col => col.sort)) return
      const ordered = []
      api.forEachNodeAfterFilterAndSort(node => ordered.push(node.data))
      const changed = ordered
        .map((post, index) => ({ post, index }))
        .filter(({ post, index }) => post.order !== index)
      if (changed.length === 0) return
      this.boardError = ''
      try {
        await Promise.all(
          changed.map(({ post, index }) => updateDoc(doc(db, 'posts', post.id), { order: index }))
        )
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
  max-width: 1100px;
  margin: 40px auto 0;
  text-align: left;
}

.hint {
  color: #888;
  font-size: 13px;
}

.post-form {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 12px;
}

.post-form-actions {
  text-align: right;
}

.grid-wrap :deep(.grid-delete-btn) {
  border: none;
  background: none;
  color: #c0392b;
  cursor: pointer;
  font-size: 13px;
}

.grid-wrap :deep(.grid-like-btn) {
  border: 1px solid #d9d9d9;
  border-radius: 12px;
  background: #fff;
  color: #555;
  cursor: pointer;
  font-size: 12px;
  line-height: 20px;
  padding: 0 10px;
}

.grid-wrap :deep(.grid-like-btn.liked) {
  border-color: #1677ff;
  background: #1677ff;
  color: #fff;
}

.grid-wrap :deep(.grid-view-btn) {
  border: none;
  background: none;
  color: #1677ff;
  cursor: pointer;
  font-size: 13px;
  margin-right: 8px;
}
</style>
