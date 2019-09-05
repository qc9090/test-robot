import multipart from 'connect-multiparty';
import { Router } from 'express';

import msgController from '../controllers/crowdlog'
import homeController from '../controllers/home'

export default ({ config, db }) => {
	let api = Router();
	
	const multipartMiddleware = multipart();

	// perhaps expose some API metadata at the root
	api.get('/', homeController);

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
