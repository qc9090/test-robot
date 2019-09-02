import multipart from 'connect-multiparty';
import { version } from '../../package.json';
import { Router } from 'express';
import facets from './facets';
import * as robotApi from './robot'

export default ({ config, db }) => {
	let api = Router();
	const multipartMiddleware = multipart();

	// mount the facets resource
	api.use('/facets', facets({ config, db }));

	// perhaps expose some API metadata at the root
	api.get('/', async (req, res) => {
		try {
			const rs = await robotApi.login('16601149089', '123456')
			if (rs.code === 1) {
				const { apikey } = rs.data
				req.session.apikey = apikey

				const rss = await robotApi.getWechatQrcode(apikey)
				console.log(rss, 'login')

				res.json({ version, rss });
			}
		} catch (e) {
			console.log(e)
		}
	});

	api.post('/qrcode', multipartMiddleware, async (req, res) => {
		console.log(req, 'qrcode req')
		const { data } = req.body
		console.log(JSON.parse(data), 'got qrcode successfully')

		// set url
		const rs = await robotApi.setUrl(req.session.apikey)
		console.log(rs, 'set url---')
		res.json({
			result: true
		})
	})

	api.post('/crowdlog', multipartMiddleware, async (req, res) => {
		console.log('crowd log', req.body)
		res.json({ test: 'test' })
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
