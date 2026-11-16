module.exports = {
  publicPath: process.env.NODE_ENV === 'production' ? '/vueapp/' : '/',
  chainWebpack: (config) => {
    config.plugin('html').tap((args) => {
      args[0].title = '할 일 · 게시판'
      return args
    })
  }
}
