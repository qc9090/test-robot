import * as robotApi from '../lib/robot'
import { version } from '../../package.json';

export default async (req, res) => {
  try {
    const rs = await robotApi.login('16601149089', '123456')
    console.log(rs, 'login rs---')
    if (rs.code === 1) {
      const { apikey } = rs.data
      req.session.apikey = apikey
      global.thisapikey = apikey

      const rss = await robotApi.getWechatQrcode(apikey)
      console.log(rss, 'login')

      // set url
      const rsSet = await robotApi.setUrl(apikey)
      console.log(rsSet, 'set url---')

      res.json({ version, rss });
    }
  } catch (e) {
    console.log(e, 'home error')
    res.json({
      code: 1001,
      msg: 'error'
    })
  }
}
