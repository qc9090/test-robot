const rpm = require('request-promise')
const crypto = require('crypto')
const random = require('string-random')

const apiLogin = 'http://api.aiheisha.com/foreign/auth/login.html'
const apiGetInfo = 'http://api.aiheisha.com/foreign/user/getInfo.html'
const apiScan = 'http://api.aiheisha.com/foreign/message/scanNew.html'
const apiSetUrl = 'http://api.aiheisha.com/foreign/user/setUrl.html'

const TOKEN = '13b36d7778b6fdbd4dbfca8af909a6ce38342c3375b7b5e9c2e2bc11c57c4784'
const baseUrl = 'http://140.143.223.100:8091'

const QRCODE_URL = `${baseUrl}/api/qrcode`
const MESSAGE_LOG = `${baseUrl}/api/messagelog`
const CROWD_LOG = `${baseUrl}/api/crowdlog`
const ADD_FRIEND_LOG = `${baseUrl}/api/addfriendlog`
const WACAT_OUT = `${baseUrl}/api/wacatout`
const ADD_GROUP_LOG = `${baseUrl}/api/addgrouplog`

/* wechat handler api*/
const apiSendUrl = 'http://api.aiheisha.com/foreign/message/sendUrl.html'
const apiSendChat = 'http://api.aiheisha.com/foreign/message/send.html'
const apiGroupAt = 'http://api.aiheisha.com/foreign/group/groupAt.html'
const apiGetOwner = 'http://api.aiheisha.com/foreign/group/owner.html'
const apiGetTimeline = 'http://api.aiheisha.com/foreign/FriendCircle/newgetList.html'
const apiGetGroupMember = `http://api.aiheisha.com/foreign/group/info.html`
const apiNewWechatinfo = `http://api.aiheisha.com/foreign/wacat/newGetWacatInfo.html`

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

// 发送消息
export function sendChat (apikey, myAccount, toAccount, content) {
  return rp({
    method: 'POST',
    url: apiSendChat,
    headers: {
      apikey
    },
    formData: {
      my_account: myAccount,
      to_account: toAccount,
      content,
      content_type: 2,
    },
    json: true
  })
}

// 群聊@
export function groupAt (apikey, myAccount, account, atUser, content) {
  return rp({
    method: 'POST',
    url: apiGroupAt,
    headers: {
      apikey
    },
    formData: {
      my_account: myAccount,
      account,
      atUser,
      content
    },
    json: true
  })
}

// 发送卡片链接
export function sendUrl (apikey, myAccount, toAccount, url, roomIndex, rank) {
  return rp({
    method: 'POST',
    url: apiSendUrl,
    headers: {
      apikey
    },
    formData: {
      my_account: myAccount,
      to_account: toAccount,
      url,
      title: `本群当前挖矿指数已累计${roomIndex}，排名第${rank}！`,
      describe: '在群内回答问题即可获得挖矿指数',
      type: 2,
      thumb: 'https://static.chain.pro/chain/praad.gif'
    },
    json: true
  })
}

// 获得微信群主
export function getOwner (apikey, myAccount, gNumber) {
  return rp({
    method: 'POST',
    url: apiGetOwner,
    headers: {
      apikey
    },
    formData: {
      my_account: myAccount,
      g_number: gNumber
    },
    json: true
  })
}

// 获取朋友圈
export function getTimeline (apikey, myAccount, toAccount, checkType, callbackUrl, statusid, extend) {
  return rp({
    method: 'POST',
    url: apiGetTimeline,
    headers: {
      apikey
    },
    formData: {
      my_account: myAccount,
      to_account: toAccount,
      check_type: checkType,
      callback_url: callbackUrl,
      statusid,
      extend
    },
    json: true
  })
}

// 获取群成员
export function getGroupMember (apikey, myAccount, gNumber) {
  return rp({
    method: 'POST',
    url: apiGetGroupMember,
    headers: {
      apikey
    },
    formData: {
      my_account: myAccount,
      g_number: gNumber
    },
    json: true
  })
}

// 获取用户信息
export function getWechatInfo (apikey, myAccount, account) {
  return rp({
    method: 'POST',
    url: apiNewWechatinfo,
    headers: {
      apikey
    },
    formData: {
      my_account: myAccount,
      account
    },
    json: true
  })
}

