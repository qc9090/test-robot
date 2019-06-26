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
				console.log(rss, 'qrcode')
			}
		} catch (e) {
			console.log(e)
		}
		res.json({ version });
	});

	api.post('/qrcode', async (req, res) => {
		console.log('request', req.session.apikey)
		const rs = await robotApi.setUrl(req.session.apikey)
		console.log(rs)
		res.json({
			result: true,
			data: {}
		})
	})

	api.post('/crowdlog', multipartMiddleware, async (req, res) => {
		console.log('crowd log', req.body)
		res.json({ test: 'test' })
	})

	api.post('/messagelog', () => {
		console.log('message log')
	})

	api.post('/addfriendlog', () => {
		console.log('add friendship')
	})

	api.post('/wacatout', () => {
		console.log('bot status')
	})

	api.post('/addgrouplog', () => {
		console.log('add group')
	})

	return api;
}
