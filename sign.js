'use strict'
const { exit } = require('process')
const axios = require('axios')
const sendMail = require('./sendMail')
const [juejin_cookie, user, pass, to] = process.argv.slice(2)
process.env.user = user
process.env.pass = pass

if (!juejin_cookie) {
  exit(1)
}

const juejin_headers = {
  'accept-language': 'zh-CN,zh;q=0.9,en;q=0.8,zh-TW;q=0.7',
  'content-type': 'application/json',
  cookie: juejin_cookie,
  referer: 'https://juejin.cn/',
  accept: '*/*',
  'sec-ch-ua':
    '"Chromium";v="94", "Google Chrome";v="94", ";Not A Brand";v="99"',
  'sec-ch-ua-mobile': '?0',
  'user-agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/94.0.4606.81 Safari/537.36'
}

const instance = axios.create({
  baseURL: 'https://api.juejin.cn/growth_api/v1',
  headers: juejin_headers
})

// 掘金抽奖
const drawFn = () => {
  //     let canDraw = true // 是否可以抽奖
  instance
    .get('/lottery_config/get')
    .then(res => {
      console.log('第一个请求')
      const free = res.data
      if (free.err_no !== 0) {
        console.log('查询今日是否已免费抽奖失败')
      }
      if (free.data.free_count === 0) {
        //           canDraw = false
        console.log('今日已免费抽奖')
      }
    })
  // .then(
  // () => {
  //         if (!canDraw) return
  instance.post('/lottery/draw').then(res => {
    console.log('第二个请求')
    const draw = res.data
    if (draw.err_no !== 0) {
      console.log('免费抽奖失败')
      return
    }
    if (draw.data.lottery_name) {
      console.log(`恭喜抽到：${draw.data.lottery_name}`)
    }
  })
  // }
  // )
}

  // 掘金签到
  ; (() => {
    let canCheckIn = true
    instance
      .get('/get_today_status')
      .then(res => {
        console.log('第三个请求')
        const today_status = res.data
        if (today_status.err_no !== 0) {
          canCheckIn = false
          console.log('查询今日是否已签到失败')
        }
        if (today_status.data) {
          canCheckIn = false
          console.log('今日已经签到')
        }
      })
      .then(() => {
        if (!canCheckIn) return
        instance.post('/check_in').then(res => {
          console.log('第四个请求')
          const check_in = res.data
          if (check_in.err_no !== 0) {
            console.log('签到异常')
            try {
              sendMail({
                from: '掘金',
                to,
                subject: '定时任务',
                html: `
                <h1 style="text-align: center">掘金自动签到通知</h1>
                <p style="text-indent: 2em">签到异常</p><br/>
              `
              })
            } catch (error) {
              console.error(error)
              console.log('邮件发送失败')
            }
          }
          if (check_in.data && check_in.data.sum_point) {
            console.log(`签到成功，当前积分：${check_in.data.sum_point}`)
          }
        })
      })
      .then(() => {
        drawFn()
        if (!canCheckIn) return
        instance.get('/get_cur_point').then(res => {
          console.log('第五个请求')
          console.log('最新分数', res.data.data)
        })
      })
  })()
