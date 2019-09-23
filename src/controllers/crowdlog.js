import fs from 'fs'
import path from 'path'
import { mnemonicGenerate } from '@polkadot/util-crypto'
import Keyring from '@polkadot/keyring'
import testKeyring from '@polkadot/keyring/testing'
import { ApiPromise, WsProvider } from '@polkadot/api'
import { u8aToHex } from '@polkadot/util'

import Reward from '../models/reward'
import Repeat from '../models/repeat'
import Team from '../models/team'
import { formatNum, didToHex } from '../lib/util'
import * as external from '../lib/external'
import * as robotApi from '../lib/robot'

let roomEassy = {}
let roomSession = {}

const WS_PROVIDER = 'wss://substrate.chain.pro/ws'
const provider = new WsProvider(WS_PROVIDER)
let api
ApiPromise.create({
  provider,
  types: {
    "MetadataRecord": {
      "address": "AccountId",
      "superior": "Hash",
      "creator": "AccountId"
    }
  }
}).then(res => {
  api = res
  console.log('api created')
}).catch(e => {
  console.error(e, 'create api error')
})

const createDid = (wxid, superior) => {
  console.log(wxid, 'current wxid')
  const mnemonicPhrase = mnemonicGenerate()
  const keyring = new Keyring({ type: 'sr25519' })

  keyring.addFromMnemonic(mnemonicPhrase)
  console.log(`Generated mnemonic: ${mnemonicPhrase}`)

  keyring
  .getPairs()
  .forEach(async (pair, index) => {
    const tkeyring = testKeyring()
    const { address, publicKey } = pair
    const pairKeystore = JSON.stringify(keyring.toJson(address, 'test123456'), null, 2)
    const pairSeed = JSON.stringify({ address, seed: mnemonicPhrase })
    newAccount = address
    console.log(address, 'new address')

    const ALICE = '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY'
    const nonce = await api.query.system.accountNonce(ALICE)
    const alicePair = tkeyring.getPair(ALICE)

    // const superior = 'did:pra:p2kjSaV9dxqqZG6SLNEgSucK5ZAt6pKq1iEXBr47gad4M'
    const mySuperior = didToHex(superior)

    const pubkey = u8aToHex(publicKey)

    api.tx.did.create(pubkey, address, mySuperior)
    .signAndSend(alicePair, { nonce }, ({ events = [], status }) => {
      console.log('Transaction status:', status.type)

      if (status.isFinalized) {
        console.log('Completed at block hash', status.asFinalized.toHex())
        console.log('Events:')

        events.forEach(({ phase, event: { data, method, section } }) => {
          console.log('\t', phase.toString(), `: ${section}.${method}`, data.toString())
        })

      }
    })

    const basePath = path.join(process.cwd(), './static')
    console.log(basePath, 'bath path')
    fs.writeFile(`${basePath}/key_stores/${address}.json`, pairKeystore, err => {
      if(err) return console.log(err)
      console.log('create key pair successfully')
    })

    fs.writeFile(`${basePath}/keys/${address}.json`, pairSeed, err => {
      if(err) return console.log(err)
      console.log('save pair seed successfully')
    })
    
  })
}

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
      const rs = await robotApi.sendUrl(apikey, myAccount, roomid, url, report.room_index, report.ranking)
      console.log(rs, '挖矿')
    }
  }

  if (msg.content.trim() === '创建账号') {
    createDid(id, 'did:pra:p2kjSaV9dxqqZG6SLNEgSucK5ZAt6pKq1iEXBr47gad4M')
  }

  res.json({})
}
