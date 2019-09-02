const rpm = require('request-promise')
const crypto = require('crypto')
const random = require('string-random')

const apiLogin = 'http://api.aiheisha.com/foreign/auth/login.html'
const apiGetInfo = 'http://api.aiheisha.com/foreign/user/getInfo.html'
const apiScan = 'http://api.aiheisha.com/foreign/message/scanNew.html'
const apiSetUrl = 'http://api.aiheisha.com/foreign/user/setUrl.html'

const TOKEN = '13b36d7778b6fdbd4dbfca8af909a6ce38342c3375b7b5e9c2e2bc11c57c4784'
const baseUrl = `http://140.143.223.100:8091`

const QRCODE_URL = `${baseUrl}/api/qrcode`
const MESSAGE_LOG = `${baseUrl}/api/messagelog`
const CROWD_LOG = `${baseUrl}/api/crowdlog`
const ADD_FRIEND_LOG = `${baseUrl}/api/addfriendlog`
const WACAT_OUT = `${baseUrl}/api/wacatout`
const ADD_GROUP_LOG = `${baseUrl}/api/addgrouplog`

const hswebtime = parseInt(Date.now() / 1000) + '_' + random(32)
const hash = crypto.createHash('md5')
hash.update(`${hswebtime}${TOKEN}`)

const rp = rpm.defaults({
  headers: {
    token: hash.digest('hex'),
    hswebtime
  }
})

export function login (phone, password) {
  return rp({
    method: 'POST',
    url: apiLogin,
    formData: {
      phone,
      password
    },
    json: true
  })
}

export function getInfo (apikey) {
  return rp({
    method: 'POST',
    url: apiGetInfo,
    headers: {
      // token: hash.digest('hex'),
      // hswebtime,
      apikey
    },
    json: true
  })
}

export function getWechatQrcode (apikey) {
  return rp({
    method: 'POST',
    url: apiScan,
    headers: {
      apikey
    },
    formData: {
      callback_url: QRCODE_URL
    },
    json: true
  })
}

export function setUrl (apikey) {
  return rp({
    method: 'POST',
    url: apiSetUrl,
    headers: {
      apikey
    },
    formData: {
      messagelog: MESSAGE_LOG,
      crowdlog: CROWD_LOG,
      addfriendlog: ADD_FRIEND_LOG,
      wecatout: WACAT_OUT,
      addgrouplog: ADD_GROUP_LOG
    },
    json: true
  })
}
