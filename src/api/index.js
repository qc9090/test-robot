import multipart from 'connect-multiparty';
import { version } from '../../package.json';
import { Router } from 'express';
import facets from './facets';
import * as robotApi from './robot'
import { essay } from '../lib/essay'

export default ({ config, db }) => {
	let api = Router();

	let chatAnalytics = {}
	let session = []
	let curStep = 0

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

				const rss = await robotApi.getWechatQrcode(apikey)
				console.log(rss, 'login')

				// set url
				const rsSet = await robotApi.setUrl(apikey)
				console.log(rsSet, 'set url---')

				res.json({ version, rss });
			}
		} catch (e) {
			console.log(e)
		}
	});

	api.post('/qrcode', multipartMiddleware, async (req, res) => {
		console.log(req.session, 'qrcode req')
		const { data } = req.body
		console.log(JSON.parse(data), 'got qrcode successfully')

		res.json({
			result: true
		})
	})

	api.post('/crowdlog', multipartMiddleware, async (req, res) => {
		console.log('crowd log', req.body)
		const { data } = req.body
		const msg = JSON.parse(data)
		const roomid = msg.g_number
		const id = msg.to_account
    const roomkey = `${roomid}${id}`

		let reason = ''
		let curSession = session[curStep] || {}

		// 问答广告
		if (msg.content === essay[curStep]['q'].trim()) {
			console.log(msg.content, 'question----')
			if (!curSession.ask) {
				curSession['ask'] = id
				session[curStep] = curSession
			} else {
				reason = '此问题已经被问过了'
			}

			console.log(reason, '---reason----')
		}

		if (msg.content === essay[curStep]['a'].trim()) {
			console.log(msg.content, 'answer-----')
			const { ask, answer } = curSession
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

						// 计算回答者得分
						let userData = chatAnalytics[roomkey]
						if (userData) {
							userData.count++
						} else {
							userData = { count: 1, contactName }
						}

						chatAnalytics[roomkey] = userData

						console.log(userData, 'answer reward---')

						// 计算提问者得分
						const userKey = `${roomid}${ask}`
						let userData1 = chatAnalytics[userKey]
						if (userData1) {
							userData1.count++
						} else {
							userData1 = { count: 1, contactName }
						}

						chatAnalytics[userKey] = userData1

						console.log(userData1, 'ask reward---')

						console.log(session, 'session --------')

					}
				}
			} else {
				reason = '问题已被回答'
			}

			console.log(reason, '---reason----')
		}
	})

	api.post('/messagelog', multipartMiddleware, (req) => {
		console.log('message log', req.body)
	})

	api.post('/addfriendlog', multipartMiddleware, (req) => {
		console.log('add friendship', req.body)
	})

	api.post('/wacatout', multipartMiddleware, (req) => {
		console.log('bot status', req.body)
	})

	api.post('/addgrouplog', multipartMiddleware, (req) => {
		console.log('add group', req.body)
	})

	return api;
}
