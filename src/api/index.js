import { version } from '../../package.json';
import { Router } from 'express';
import facets from './facets';

export default ({ config, db }) => {
	let api = Router();

	// mount the facets resource
	api.use('/facets', facets({ config, db }));

	// perhaps expose some API metadata at the root
	api.get('/', (req, res) => {
		res.json({ version });
	});

	api.post('/qrcode', (req, res) => {
		console.log('request')
		res.json({
			result: true,
			data: {
				qr: 'www.baidu.com'
			}
		})
	})

	api.post('/crowdlog', (req, res) => {
		console.log('crowd log')
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
