import { createApp } from 'vue'
import Antd from 'ant-design-vue'
import dayjs from 'dayjs'
import 'dayjs/locale/ko'
import 'ant-design-vue/dist/reset.css'
import App from './App.vue'
import router from './router'

dayjs.locale('ko')

createApp(App).use(Antd).use(router).mount('#app')
