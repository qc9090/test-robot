import Reward from '../models/reward'
import Repeat from '../models/repeat'
import * as external from '../lib/external'
import * as robotApi from '../api/robot'

let session = []
let curStep = 0
let roomEassy = {}

export default async (req, res) => {
  console.log('crowd log', req.session, req.body)
  const { data } = req.body
  if (!data) return
  const msg = JSON.parse(data)

  const myAccount = msg.my_account
  const roomid = msg.g_number
  const roomName = msg.g_name
  const id = msg.to_account
  const contactName = msg.to_name
  const roomkey = `${roomid}${id}`

  let reason = ''
  let curSession = session[curStep] || {}

  if (!roomEassy[roomid]) {
    const { data: cdata } = await external.getQuestion(roomid)
    roomEassy[roomid] = cdata
    console.log(cdata, 'cur essay---')
  }
  let curEassy = roomEassy[roomid]

  // 问答广告
  // if (msg.content === essay[curStep]['q'].trim()) {
  if (msg.content === curEassy['question']) {
    console.log(msg.content, 'question----')
    if (!curSession.ask) {
      curSession['ask'] = id
      curSession['askName'] = contactName
      session[curStep] = curSession
    } else {
      reason = '问题已被问过'
      const rs = await external.updateReason({room_id: roomid, wxid: id, task_id: curEassy.task_id, reason })
      console.log(rs, reason)
    }

  }

  if (msg.content.includes(curEassy['answer']) && msg.content.includes(`@${curSession['askName']}`)) {
    console.log(msg.content, curSession['askName'], '--answer-----')
    const { ask, askName, answer } = curSession
    if (!answer) {
      if (!ask) {
        reason = '问题还没抛出'
      } else if (id === ask) {
        reason = '您不能回答自己的问题'
      } else {
        const curTeam = `${ask}${id}`
        let teams = []
        let count = 1
        // 判断组合是否出现过
        session.forEach(v => {
          if (v) {
            const team = `${v.ask}${v.answer}`
            teams.push(team)
          }
        })
        if (teams.includes(curTeam)) {
          let { point } = await Repeat.findOne({ roomid, cid: curTeam }).exec()
          if (!point) point = 1
          console.log(point, 'cur point')
          let newPoint = point / 2
          if (newPoint <= 0.1) newPoint = 0.01

          count = newPoint

          // 更新point
          Repeat.updateOne({ roomid, cid: curTeam }, { $set: { point: newPoinnt } }, { upsert: true }, (err) => {
            if (err) console.log(err)
          })
        }
        // 不重复的情况
        {
          curSession['ask'] = ask
          curSession['answer'] = id
          curSession['isFinished'] = true

          session[curStep] = curSession
          curStep++

          reason = `成功+1`

          // 计算回答者得分
          let askRs = await Reward.findOne({ roomkey }).exec()
          console.log(askRs, '---mongodb userdata----')
          let askData
          if (askRs) {
            askData = askRs.data
            askData.count += count
          } else {
            askData = { count, contactName }
          }

          Reward.updateOne({ roomkey }, { $set: { data: askData } }, { upsert: true }, (err) => {
            if (err) console.log(err)
          })
          const userRs = await external.updateReward(roomid, id, roomName, contactName, askData.count, 'newfeiyang', curEassy.task_id, reason, 2, curEassy.id)
          console.log(askData, userRs, 'answer reward---')

          // 计算提问者得分
          const userKey = `${roomid}${ask}`
          let answerRs = await Reward.findOne({ roomkey: userKey }).exec()
          let answerData
          if (answerRs) {
            answerData = answerRs.data
            answerData.count += count
          } else {
            answerData = { count, contactName: askName }
          }

          Reward.updateOne({ roomkey: userKey }, { $set: { data: answerData } }, { upsert: true }, (err) => {
            if (err) console.log(err)
          })

          const user1Rs = await external.updateReward(roomid, ask, roomName, answerData.contactName, answerData.count, 'newfeiyang', curEassy.task_id, reason, 1, curEassy.id)
          console.log(answerData, user1Rs, 'ask reward---')

          console.log(session, 'session --------')

          // 计算群主奖励
          const gs = await robotApi.getOwner(thisapikey, myAccount, roomid)
          console.log(gs, '获取群主信息')
          if (gs.msg) {
            const { author } = gs.data
            const ownerkey = `${roomid}${author}`
            let ownerRs = await Reward.findOne({ roomkey: ownerkey }).exec()
            let ownerData
            if (ownerRs) {
              ownerData = ownerRs.data
              ownerData.count += 0.5 * count
            } else {
              ownerData = { count: 0.5 * count }
            }

            const ors = await external.updateReward(roomid, author, roomName, '群主', ownerData.count, 'newfeiyang', curEassy.task_id, reason, 3, curEassy.id)
            console.log(ownerData, ors, 'owner reward---')

            Reward.updateOne({ roomkey: ownerkey }, { $set: { data: ownerData } }, { upsert: true }, (err) => {
              if (err) console.log(err)
            })
          }

          // 更新问题
          const newQs = await external.getQuestion(roomid)
          roomEassy[roomid] = newQs.data
          console.log(newQs, 'update new question ---')          

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
    console.log(global.thisapikey, 'key----')
    let thisapikey = global.thisapikey
    if (thisapikey) {
      console.log(thisapikey, 'apikey------')
      const { data: { report } } = await external.getMintHistory(roomid, curEassy.task_id)
      const url = `https://prabox.net/wechat-task/#/qa?roomid=${roomid}&taskid=4`
      const rs = await robotApi.sendUrl(thisapikey, myAccount, roomid, url, report.room_index, report.ranking)
      console.log(rs, '挖矿')
    }
  }

  res.json({})
}
