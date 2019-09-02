import http from 'http';
import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import bodyParser from 'body-parser';
import cookieParser from 'cookie-parser';
import redis from 'redis'
import session from 'express-session';

import initializeDb from './db';
import middleware from './middleware';
import api from './api';
import config from './config.json';

let app = express();
app.server = http.createServer(app);

// logger
app.use(morgan('dev'));

app.use(cookieParser());

let RedisStore = require('connect-redis')(session)
let client = redis.createClient()

client.on("error", function (err) {
	console.log("Error " + err);
})

app.use(session({
  store: new RedisStore({
    client: redis,
    prefix: 'hgk'
  }),
  cookie: { maxAge: 1 * 60 * 60 * 1000 }, //默认1小时
  secret: 'sessionprochain',
  resave: true,
  saveUninitialized: true
}));

// 3rd party middleware
app.use(cors({
	exposedHeaders: config.corsHeaders,
	credentials: true
}));

app.use(bodyParser.json({
	limit : config.bodyLimit
}));

app.use(bodyParser.urlencoded({ extended: false }));

// connect to db
initializeDb( db => {

	// internal middleware
	app.use(middleware({ config, db }));

	// api router
	app.use('/api', api({ config, db }));

	app.server.listen(process.env.PORT || config.port, async () => {
		console.log(`Started on port ${app.server.address().port}`);
	});
});

export default app;
