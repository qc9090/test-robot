const path = require('path')
const Datastore = require('nedb')

const basePath = process.cwd()
const topicPath = path.join(basePath, './topics.db')

const topics = new Datastore({ filename: topicPath, autoload: true })


// 获取奖励记录
export function getTopicRecord (topicId) {
  return new Promise((resolve, reject) => {
    topics.findOne({ topicId }, {_id: 0}, (err, docs) => {
      if (err) {
        logger.error('get record failed')
        reject('get record failed')
      } else {
        resolve(docs || {})
      }
    })
  })
}

// 更新
export function updateTopicRecord (topicId, record) {
  return new Promise((resolve, reject) => {
    topics.update({ topicId }, record, { upsert: true }, (err) => {
      if (err) {
        reject('update record failed')
      } else {
        resolve({
          success: true
        })
      }
    })
  })
}
