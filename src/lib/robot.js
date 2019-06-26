import { login, getWechatQrcode } from '../api/robot'

(async () => {
  try {
    const res = await login('16601149089', '123456')
    if (res.code === 1) {
      const rs = await getWechatQrcode('http://127.0.0.1:8080/api/qrcode', res.data.apikey)
      console.log(rs, 'qrcode')
    }
  } catch (e) {
    console.log(e)
  }
})()