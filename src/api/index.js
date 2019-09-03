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
				const rst = await local.getTopicRecord(3)
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

		const { data: cdata } = await external.getQuestion(roomid)
		let curEassy = cdata
		console.log(curEassy, 'cur essay---')

		// 问答广告
		// if (msg.content === essay[curStep]['q'].trim()) {
		if (msg.content === curEassy['question']) {
			console.log(msg.content, 'question----')
			if (!curSession.ask) {
				curSession['ask'] = id
				curSession['askName'] = contactName
				session[curStep] = curSession
			} else {
				reason = '此问题已经被问过了'
			}

			console.log(reason, '---reason----')
		}

		if (msg.content === curEassy['answer']) {
			console.log(msg.content, 'answer-----')
			const { ask, askName, answer } = curSession
			if (!answer) {
				if (!ask) {
					reason = '问题还没有抛出'
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
						reason = '您已经回答过别人的问题'
					} else {
						curSession['ask'] = ask
						curSession['answer'] = id
						curSession['isFinished'] = true

						session[curStep] = curSession
						curStep++

						// 更新问题
						const newQs = await external.getQuestion(roomid)
						curEassy = newQs.data
						console.log(newQs, 'update new question ---')

						// 计算回答者得分
						let userData = chatAnalytics[roomkey]
						if (userData) {
							userData.count++
						} else {
							userData = { count: 1, contactName }
						}

						chatAnalytics[roomkey] = userData
						const userRs = await external.updateReward(roomid, id, roomName, contactName, userData.count, 'newfeiyang', curEassy.task_id, reason, 0, curEassy,id)
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
						const user1Rs = await external.updateReward(roomid, id, roomName, userData1.contactName, userData1.count, 'newfeiyang', curEassy.task_id, reason, 0, curEassy.id)
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
							const ownerRs = await external.updateReward(roomid, id, roomName, '', ownerData.count, 'newfeiyang', curEassy.task_id, reason, 0, curEassy.id)
							console.log(ownerData, ownerRs, 'owner reward---')
						}

					}
				}
			} else {
				reason = '问题已被回答'
			}

			console.log(reason, '---reason----')
		}

		if (msg.content === '查询挖矿奖励') {
			if (thisapikey) {
				console.log(thisapikey, 'apikey------')
				const { data: { report } } = await external.getMintHistory(roomid, curEassy.id)
				const url = `https://prabox.net/wechat-task/#/qa?roomid=${roomid}`
				const rs = await robotApi.sendUrl(thisapikey, myAccount, roomid, url, report.room_index, report.ranking)
				console.log(rs, '查询挖矿奖励')
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
  local.updateTopicRecord(3, { topicId: 3, chatAnalytics })
});