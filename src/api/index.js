import multipart from 'connect-multiparty';
import { version } from '../../package.json';
import { Router } from 'express';
import facets from './facets';
import * as robotApi from './robot'
// import { essay } from '../lib/essay'
import * as external from '../lib/external'
import * as local from '../lib/localDb'

let thisapikey
let chatAnalytics = {}
let session = []
let curStep = 0
let roomEassy = {}
const curTaskId = 4

export default ({ config, db }) => {
	let api = Router();
	
	const multipartMiddleware = multipart();

	// mount the facets resource
	api.use('/facets', facets({ config, db }));

	// perhaps expose some API metadata at the root
	api.get('/', async (req, res) => {
		try {
			const rs = await robotApi.login('16601149089', '123456')
			console.log(rs, 'login rs---')
			if (rs.code === 1) {
				const { apikey } = rs.data
				req.session.apikey = apikey
				thisapikey = apikey

				const rss = await robotApi.getWechatQrcode(apikey)
				console.log(rss, 'login')

				// set url
				const rsSet = await robotApi.setUrl(apikey)
				console.log(rsSet, 'set url---')

				// 查找历史记录
				const rst = await local.getTopicRecord(curTaskId)
				chatAnalytics = rst['chatAnalytics'] || {}
				console.log(chatAnalytics, 'chat------------')

				res.json({ version, rss });
			}
		} catch (e) {
			console.log(e)
		}
	});

	api.post('/qrcode', multipartMiddleware, async (req, res) => {
		const { data } = req.body
		console.log(JSON.parse(data), 'got qrcode successfully')

		res.json({
			result: true
		})
	})

	api.post('/crowdlog', multipartMiddleware, async (req, res) => {
		console.log('crowd log', req.session, req.body)
		const { data } = req.body
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

		if (msg.content === curEassy['answer'] && msg.content.includes(`@${curSession['ask']}`)) {
			console.log(msg.content, 'answer-----')
			const { ask, askName, answer } = curSession
			if (!answer) {
				if (!ask) {
					reason = '问题还没抛出'
				} else if (id === ask) {
					reason = '您不能回答自己的问题'
				} else {
					const curTeam = `${ask}${id}`
					let teams = []
					// 判断组合是否出现过
					session.forEach(v => {
						if (v) {
							const team = `${v.ask}${v.answer}`
							teams.push(team)
						}
					})
					if (teams.includes(curTeam)) {
						reason = '组合重复'
					} else {
						curSession['ask'] = ask
						curSession['answer'] = id
						curSession['isFinished'] = true

						session[curStep] = curSession
						curStep++

						reason = ''

						// 计算回答者得分
						let userData = chatAnalytics[roomkey]
						if (userData) {
							userData.count++
						} else {
							userData = { count: 1, contactName }
						}

						chatAnalytics[roomkey] = userData
						const userRs = await external.updateReward(roomid, id, roomName, contactName, userData.count, 'newfeiyang', curEassy.task_id, reason, 2, curEassy.id)
						console.log(userData, userRs, 'answer reward---')

						// 计算提问者得分
						const userKey = `${roomid}${ask}`
						let userData1 = chatAnalytics[userKey]
						if (userData1) {
							userData1.count++
						} else {
							userData1 = { count: 1, contactName: askName }
						}

						chatAnalytics[userKey] = userData1
						const user1Rs = await external.updateReward(roomid, ask, roomName, userData1.contactName, userData1.count, 'newfeiyang', curEassy.task_id, reason, 1, curEassy.id)
						console.log(userData1, user1Rs, 'ask reward---')

						console.log(session, 'session --------')

						// 计算群主奖励
						const gs = await robotApi.getOwner(thisapikey, myAccount, roomid)
						console.log(gs, '获取群主信息')
						if (gs.msg) {
							const { author } = gs.data
							const ownerkey = `${roomid}${author}`
							let ownerData = chatAnalytics[ownerkey]
							if (ownerData) {
								ownerData.count += 0.5
							} else {
								ownerData = { count: 0.5 }
							}

							chatAnalytics[ownerkey] = ownerData
							const ownerRs = await external.updateReward(roomid, author, roomName, '', ownerData.count, 'newfeiyang', curEassy.task_id, reason, 3, curEassy.id)
							console.log(ownerData, ownerRs, 'owner reward---')
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
			if (thisapikey) {
				console.log(thisapikey, 'apikey------')
				const { data: { report } } = await external.getMintHistory(roomid, curEassy.id)
				const url = `https://prabox.net/wechat-task/#/qa?roomid=${roomid}&taskid=4`
				const rs = await robotApi.sendUrl(thisapikey, myAccount, roomid, url, report.room_index, report.ranking)
				console.log(rs, '挖矿')
			}
		}

		res.json({})
	})

	api.post('/messagelog', multipartMiddleware, (req, res) => {
		console.log('message log', req.session, req.body)

		res.json({})
	})

	api.post('/addfriendlog', multipartMiddleware, (req, res) => {
		console.log('add friendship', req.session, req.body)

		res.json({})
	})

	api.post('/wacatout', multipartMiddleware, (req) => {
		console.log('bot status', req.body)
	})

	api.post('/addgrouplog', multipartMiddleware, (req) => {
		console.log('add group', req.body)
	})

	return api;
}

process.on('exit', (code) => {
	console.log(`退出码: ${code}`);
	// 同步统计数据
  local.updateTopicRecord(curTaskId, { topicId: curTaskId, chatAnalytics })
});