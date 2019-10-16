import socketio from 'socket.io-client'
import Reward from '../models/reward'
import Repeat from '../models/repeat'
import Team from '../models/team'
import { formatNum } from '../lib/util'
import * as external from '../lib/external'
import * as robotApi from '../lib/robot'

const APPID = 'wx48f51627bef8bcdf'
const REDIRECT_URI = 'https://chain.pro/wechat-task'

let roomEassy = {}
let roomSession = {}
let roomOwner = {}
let creationInfo = {}

console.log('crowdlog---------------')

const socket = socketio('http://123.207.140.69:8091/')
socket.on('connect', () => {
  console.log('connect successfully')

  socket.on('succeed', async message => {
    const { origin, msg, extend } = JSON.parse(message)
    console.log(message, 'succeed message')
    if (origin == 'sns') {
      const { sid, exists } = extend
      const { apikey, myAccount, roomid, wxid, contactName, code } = creationInfo[sid]
      if (!exists) {
        // const redirectUri = encodeURIComponent(`${REDIRECT_URI}/#/my-reward`)
        // const url = `https://open.weixin.qq.com/connect/oauth2/authorize?appid=${APPID}&redirect_uri=${redirectUri}&response_type=code&scope=snsapi_base&state=123#wechat_redirect`
    
        const content = `@${contactName} 恭喜您创建PRA账户成功！\nPRA账户基于DID理念，使您的微信账号与PRA账号绑定，方便您在微信中立即获得PRA广告收益！\n回复“钱包”即可获得您的钱包管理入口`
        const rs = await robotApi.groupAt(apikey, myAccount, roomid, wxid, content)
        console.log(rs, '创建账号成功')
      }

      const { data: userInfo } = await robotApi.getWechat(apikey, myAccount, wxid)
      console.log(userInfo, 'user info')
      const data = await external.chainBindSn(code, wxid, userInfo.thumb)
      console.log(data, 'bind sn code result')
    }
  })

  socket.on('failed', msg => {
    console.log(msg, 'failed msg')
  })

})

socket.on('disconnect', function(){
  console.log('disconnect')
  socket.close()
})

export default async (req, res) => {
  console.log('crowd log', req.body)
  const apikey = global.thisapikey
  const { data } = req.body
  if (!data) return
  const msg = JSON.parse(data)

  const myAccount = msg.my_account
  const roomid = msg.g_number
  const roomName = msg.g_name
  const id = msg.to_account_alias || msg.to_account
  const contactName = msg.to_name
  const roomkey = `${roomid}${id}`

  let reason = ''
  let curSession = roomSession[roomid] || {}

  if (!roomEassy[roomid]) {
    const { data: cdata } = await external.getQuestion(roomid)
    roomEassy[roomid] = cdata
    console.log(cdata, 'cur essay---')
  }
  let curEassy = roomEassy[roomid]

  if (!roomOwner[roomid]) {
    const gs = await robotApi.getOwner(apikey, myAccount, roomid)
    console.log(gs, roomName, '获取群主信息ownerid')
    if (gs.msg) {
      roomOwner[roomid] = gs.data.author
    }
  }
    
  // 问答广告
  // if (msg.content === essay[curStep]['q'].trim()) {
  if (msg.content === curEassy['question']) {
    console.log(msg.content, 'question----')
    if (!curSession.ask) {
      curSession['ask'] = id
      curSession['askName'] = contactName
      roomSession[roomid] = curSession
    } else {
      reason = '问题已被问过'
      const rs = await external.updateReason({room_id: roomid, wxid: id, task_id: curEassy.task_id, reason })
      console.log(rs, reason)
    }

  }

  if (msg.content.trim() === curEassy['answer'].trim()) {
    console.log(msg.content, curSession['askName'], '--answer-----')
    const { ask, askName, answer } = curSession
    if (!answer) {
      if (!ask) {
        reason = '问题还没抛出'
      } else if (id === ask) {
        reason = '自问自答'
      } else {
        const curTeam = `${ask}${id}`
        let trs = await Team.findOne({ roomid, compose: curTeam, taskid: curEassy.task_id }).exec()
        // let teams = []
        let count = 1
        // 判断组合是否出现过
        if (trs) {
          let prs = await Repeat.findOne({ roomid, cid: curTeam, taskid: curEassy.task_id }).exec()
          let point = !prs ? 1 : prs.point
          console.log(point, 'cur point')
          let newPoint = point / 2
          if (newPoint <= 0.1) newPoint = 0.01

          count = newPoint

          // 更新point
          Repeat.updateOne({ roomid, cid: curTeam, taskid: curEassy.task_id }, { $set: { point: newPoint } }, { upsert: true }, (err) => {
            if (err) console.log(err)
          })
        }
        // 不重复的情况
        {
          curSession['ask'] = ask
          curSession['answer'] = id
          curSession['isFinished'] = true

          roomSession[roomid] = curSession

          reason = `成功 +${formatNum(count, 3)}`

          // 计算回答者得分
          let askRs = await Reward.findOne({ roomkey, taskid: curEassy.task_id }).exec()
          console.log(askRs, '---mongodb userdata----')
          let askData
          if (askRs) {
            askData = askRs.data
            askData.count += count
          } else {
            askData = { count, contactName }
          }

          Reward.updateOne({ roomkey, taskid: curEassy.task_id }, { $set: { data: askData } }, { upsert: true }, (err) => {
            if (err) console.log(err)
          })
          const userRs = await external.updateReward(roomid, id, roomName, contactName, askData.count, 'newfeiyang', curEassy.task_id, reason, 2, curEassy.id)
          console.log(askData, userRs, 'answer reward---')

          // 计算提问者得分
          const userKey = `${roomid}${ask}`
          let answerRs = await Reward.findOne({ roomkey: userKey, taskid: curEassy.task_id }).exec()
          let answerData
          if (answerRs) {
            answerData = answerRs.data
            answerData.count += count
          } else {
            answerData = { count, contactName: askName }
          }

          Reward.updateOne({ roomkey: userKey, taskid: curEassy.task_id }, { $set: { data: answerData } }, { upsert: true }, (err) => {
            if (err) console.log(err)
          })

          const user1Rs = await external.updateReward(roomid, ask, roomName, answerData.contactName, answerData.count, 'newfeiyang', curEassy.task_id, reason, 1, curEassy.id)
          console.log(answerData, user1Rs, 'ask reward---')

          console.log(roomSession[roomid], 'session --------')

          // 计算群主奖励
          const gs = await robotApi.getOwner(apikey, myAccount, roomid)
          console.log(gs, '获取群主信息')
          if (gs.msg) {
            const { author } = gs.data
            const ownerkey = `${roomid}${author}`
            const ownerName = '群主'
            let ownerRs = await Reward.findOne({ roomkey: ownerkey, taskid: curEassy.task_id }).exec()
            let ownerData
            let ownerCount = 0.5 * count
            if (ownerRs) {
              ownerData = ownerRs.data
              ownerData.count += ownerCount
            } else {
              ownerData = { count: ownerCount, contactName: ownerName }
            }

            const ors = await external.updateReward(roomid, author, roomName, ownerName, ownerData.count, 'newfeiyang', curEassy.task_id, `成功 +${formatNum(ownerCount, 3)}`, 3, curEassy.id)
            console.log(ownerData, ors, 'owner reward---')

            Reward.updateOne({ roomkey: ownerkey, taskid: curEassy.task_id }, { $set: { data: ownerData } }, { upsert: true }, (err) => {
              if (err) console.log(err)
            })
          }

          // 更新组合
          Team.updateOne({ roomid, compose: curTeam, taskid: curEassy.task_id }, { $set: { ask: answerData.contactName, answer: contactName } }, { upsert: true }, (err) => {
            if (err) console.log(err)
          })

          // 更新问题
          roomEassy[roomid]['timePast'] = 0
          if (roomEassy[roomid]['qTimer']) clearInterval(roomEassy[roomid]['qTimer'])
          roomEassy[roomid]['qTimer'] = setInterval(async () => {
            console.log(roomEassy[roomid]['timePast'], 'time past -----')
            if (roomEassy[roomid]['timePast'] > 5 * 60) {
              const newQs = await external.getQuestion(roomid)
              console.log(newQs, 'update new question ---')
              const old = roomEassy[roomid]
              if (old.question !== newQs.data.question) {
                clearInterval(roomEassy[roomid]['qTimer'])
                roomEassy[roomid] = newQs.data
                roomSession[roomid] = {}
              }
            }
            roomEassy[roomid]['timePast']++
          }, 1000)
        }
      }
    } else {
      reason = '问题已被回答'
    }

    console.log(reason, '---reason----')
    const rs = await external.updateReason({room_id: roomid, wxid: id, task_id: curEassy.task_id, reason })
    console.log(rs, reason)
  }

  if (msg.content.trim() === '挖矿') {
    if (apikey) {
      const { data: { report } } = await external.getMintHistory(roomid, curEassy.task_id)
      const url = `https://prabox.net/wechat-task/#/qa?roomid=${roomid}&taskid=${curEassy.task_id}`
      const title = `本群当前挖矿指数已累计${report.room_index}，排名第${report.ranking}！`
      const describe = '在群内回答问题即可获得挖矿指数'
      const rs = await robotApi.sendUrl(apikey, myAccount, roomid, url, report.room_index, report.ranking, title, describe)
      console.log(rs, '挖矿')
    }
  }

  if (msg.content.trim() === '钱包') {
    if (apikey) {
      const redirectUri = encodeURIComponent(`${REDIRECT_URI}/#/my-reward`)
      const url = `https://open.weixin.qq.com/connect/oauth2/authorize?appid=${APPID}&redirect_uri=${redirectUri}&response_type=code&scope=snsapi_base&state=123#wechat_redirect`
      
      const title = '点击进入您的钱包'
      const describe = '快速转账、收款、抵押'
      const rs = await robotApi.sendUrl(apikey, myAccount, roomid, url, 0, 0, title, describe)
      console.log(rs, '钱包')
    }
  }

  if (msg.content.trim() === '头像检测') {
    if (apikey) {
      const redirectUri = encodeURIComponent(`${REDIRECT_URI}/#/wallet/decode`)
      const url = `https://open.weixin.qq.com/connect/oauth2/authorize?appid=${APPID}&redirect_uri=${redirectUri}&response_type=code&scope=snsapi_userinfo&state=123#wechat_redirect`
      
      const title = '点击进入检测您的头像'
      const describe = '检测头像是否已经关联了区块链账号'
      const rs = await robotApi.sendUrl(apikey, myAccount, roomid, url, 0, 0, title, describe)
      console.log(rs, '头像检测')
    }
  }

  if (msg.content.trim() === '创建账号') {
    // const data = JSON.stringify({
    //   type: 'wechat',
    //   sid: id,
    //   socialSuperior: roomOwner[roomid],
    // })

    // creationInfo[id] = {
    //   wxid: id,
    //   apikey,
    //   myAccount,
    //   roomid,
    //   contactName
    // }

    // socket.emit('create_by_sns', data)
  }

  if (/^\d{6}$/.test(msg.content.trim())) {
    const data = JSON.stringify({
      type: 'wechat',
      sid: id,
      socialSuperior: roomOwner[roomid],
    })

    creationInfo[id] = {
      wxid: id,
      apikey,
      myAccount,
      roomid,
      contactName,
      code: msg.content.trim()
    }

    socket.emit('create_by_sns', data)
    
    // const { data: userInfo } = await robotApi.getWechat(apikey, myAccount, id)
    // console.log(userInfo, 'user info')
    // const data = await external.chainBindSn(msg.content.trim(), id, userInfo.thumb)
    // console.log(data, 'bind sn code result')
  }

  res.json({})
}
