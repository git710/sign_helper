'use strict'
const fetch = require('node-fetch')
const sendMail = require('./sendMail')

const [juejin_cookie, tieba_cookie, user, pass, to] = process.argv.slice(2)
process.env.user = user
process.env.pass = pass
let score = 0

const juejin_headers = {
  'accept-encoding': 'gzip, deflate, br',
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

const tieba_headers = {
  'accept-encoding': 'gzip, deflate, br',
  'accept-language': 'zh-CN,zh;q=0.9,en;q=0.8',
  // 'content-type': 'application/json',
  cookie: tieba_cookie,
  referer: 'https://tieba.baidu.com/',
  accept: '*/*',
  'sec-ch-ua':
    '"Chromium";v="94", "Google Chrome";v="94", ";Not A Brand";v="99"',
  'sec-ch-ua-mobile': '?0',
  'user-agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/94.0.4606.81 Safari/537.36'
}

// 掘金抽奖
const drawFn = async () => {
  // 查询今日是否有免费抽奖机会
  const today = await fetch(
    'https://api.juejin.cn/growth_api/v1/lottery_config/get',
    {
      headers: juejin_headers,
      method: 'GET',
      credentials: 'include'
    }
  ).then(res => res.json())
  console.log(
    `查询今日是否有免费抽奖机会：${today.data
      ? today.data.free_count != null
        ? today.data.free_count
        : today.data
      : today
    }`
  )

  if (today.err_no !== 0) {
    return Promise.reject('已经签到！免费抽奖失败！')
  }

  if (today.data.free_count === 0) {
    return Promise.resolve('签到成功！今日已经免费抽奖！')
  }

  // 免费抽奖
  const draw = await fetch('https://api.juejin.cn/growth_api/v1/lottery/draw', {
    headers: juejin_headers,
    method: 'POST',
    credentials: 'include'
  }).then(res => res.json())
  console.log(
    `免费抽奖：${draw.data
      ? draw.data.lottery_name
        ? draw.data.lottery_name
        : draw.data
      : draw
    }`
  )

  if (draw.err_no !== 0) {
    return Promise.reject('已经签到！免费抽奖异常！')
  }

  if (draw.data.lottery_type === 1) {
    score += 66
  }

  return Promise.resolve(`签到成功！恭喜抽到：${draw.data.lottery_name}`)
}

  // 掘金签到
  ; (async () => {
    // 查询今日是否已经签到
    const today_status = await fetch(
      'https://api.juejin.cn/growth_api/v1/get_today_status',
      {
        headers: juejin_headers,
        method: 'GET',
        credentials: 'include'
      }
    ).then(res => res.json())
    console.log(`查询今日是否已经签到：${today_status.data}`)

    if (today_status.err_no !== 0) {
      try {
        sendMail({
          from: '掘金',
          to,
          subject: '定时任务',
          html: `
          <h1 style="text-align: center">自动签到通知</h1>
          <p style="text-indent: 2em">签到失败！</p><br/>
        `
        })
      } catch (error) {
        console.error(error)
      } finally {
        return Promise.reject('签到失败！')
      }
    }

    if (today_status.data) {
      return Promise.resolve('今日已经签到！')
    }

    // 签到
    const check_in = await fetch('https://api.juejin.cn/growth_api/v1/check_in', {
      headers: juejin_headers,
      method: 'POST',
      credentials: 'include'
    }).then(res => res.json())
    console.log(`签到：${JSON.stringify(check_in.data)}`)

    if (check_in.err_no !== 0) {
      try {
        sendMail({
          from: '掘金',
          to,
          subject: '定时任务',
          html: `
          <h1 style="text-align: center">自动签到通知</h1>
          <p style="text-indent: 2em">签到异常！</p><br/>
        `
        })
      } catch (error) {
        console.error(error)
      } finally {
        return Promise.reject('签到异常！')
      }
    }

    return Promise.resolve(`签到成功！当前积分；${check_in.data.sum_point}`)
  })()
    .then(msg => {
      return fetch('https://api.juejin.cn/growth_api/v1/get_cur_point', {
        headers: juejin_headers,
        method: 'GET',
        credentials: 'include'
      }).then(res => res.json())
    })
    .then(res => {
      console.log(`分数：${res.data ? res.data : res}`)
      score = res.data
      return drawFn()
    })
    .then(msg => {
      console.log(`自动签到通知。签到结果：${msg}当前积分${score}`)
    })
    .catch(error => {
      console.error(`自动签到通知。执行结果：${error}当前积分${score}`)
    })

  // 贴吧签到
  ; (async () => {
    const check_in = await fetch(
      `https://tieba.baidu.com/tbmall/onekeySignin1?_=${new Date().getTime()}`,
      {
        headers: tieba_headers,
        method: 'GET',
        credentials: 'include'
      }
    ).then(res => res.json())
    if (check_in.error && check_in.error === 'success') {
      console.log('签到成功')
    } else {
      try {
        sendMail({
          from: '贴吧',
          to,
          subject: '定时任务',
          html: `
            <h1 style="text-align: center">自动签到通知</h1>
            <p style="text-indent: 2em">签到失败！</p><br/>
          `
        })
      } catch (error) {
        console.error(error)
      } finally {
        // return Promise.reject('签到失败！')
        console.log('签到失败', JSON.stringify(check_in))
      }
    }
    return Promise.resolve(`签到${check_in}`)
  })()