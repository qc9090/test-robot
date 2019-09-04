import multipart from 'connect-multiparty';
import { version } from '../../package.json';
import { Router } from 'express';
import facets from './facets';
// import { essay } from '../lib/essay'
import msgController from '../controllers/crowdlog'

// let thisapikey
// let chatAnalytics = {}
// let session = []
// let curStep = 0
// let roomEassy = {}
// const curTaskId = 4

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

	api.post('/crowdlog', multipartMiddleware, msgController)

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
