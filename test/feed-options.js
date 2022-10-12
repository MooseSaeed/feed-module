const createFeed = (type = 'rss2') => ({
  create (feed) {
    feed.options = feedOptions
    feed.addItem({
      title: 'Test Title',
      id: Math.random().toString(36).substring(2, 10),
      link: 'https://example.com',
      description: 'Test Description',
      content: 'Test Content',
      extra: {
        'extraTest': 'extraTest',
        'extraTest2': 'extraTest2'
      }
    })
  },
  type
})

const feedOptions = {
  title: 'Feed Title',
  description: 'This is my personal feed!',
  id: 'http://example.com/',
  link: 'http://example.com/',
  image: 'http://example.com/image.png',
  favicon: 'http://example.com/favicon.ico',
  updated: new Date(Date.UTC(2000, 6, 14)), // optional, default = today
  copyright: 'All rights reserved 2013, John Doe',
  generator: 'awesome', // optional, default = 'https://github.com/nuxt-community/feed-module'
  feedLinks: {
    json: 'https://example.com/json',
    atom: 'https://example.com/atom'
  },
  author: {
    name: 'John Doe',
    email: 'johndoe@example.com',
    link: 'https://example.com/johndoe'
  }
}

module.exports = {
  createFeed,
  feedOptions
}
