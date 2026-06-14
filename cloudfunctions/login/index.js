// 云函数入口文件
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()
const _ = db.command

// 云函数入口函数
exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const openid = wxContext.OPENID
  const { action, nickName, avatarUrl } = event

  try {
    switch (action) {
      case 'login':
        return await doLogin(openid)
      case 'updateProfile':
        return await updateProfile(openid, nickName, avatarUrl)
      case 'getProfile':
        return await getProfile(openid)
      default:
        // 兼容旧调用（不带 action）
        return { openid }
    }
  } catch (err) {
    console.error(err)
    return { code: -1, msg: err.message }
  }
}

// 登录：获取 openid，同时确保 users 表有该用户记录
async function doLogin(openid) {
  const userRes = await db.collection('users').where({ openid }).get()
  let user = userRes.data[0] || null

  if (!user) {
    // 新用户，创建记录
    const result = await db.collection('users').add({
      data: {
        openid,
        nickName: '戒瘾勇士',
        avatarUrl: '',
        createdAt: db.serverDate(),
        updatedAt: db.serverDate()
      }
    })
    user = {
      _id: result._id,
      openid,
      nickName: '戒瘾勇士',
      avatarUrl: ''
    }
  }

  return {
    code: 0,
    openid,
    user: {
      _id: user._id,
      nickName: user.nickName || '戒瘾勇士',
      avatarUrl: user.avatarUrl || ''
    }
  }
}

// 更新用户资料（微信昵称和头像）
async function updateProfile(openid, nickName, avatarUrl) {
  const userRes = await db.collection('users').where({ openid }).get()
  
  if (userRes.data.length > 0) {
    await db.collection('users').doc(userRes.data[0]._id).update({
      data: {
        nickName: nickName || '戒瘾勇士',
        avatarUrl: avatarUrl || '',
        updatedAt: db.serverDate()
      }
    })
  } else {
    await db.collection('users').add({
      data: {
        openid,
        nickName: nickName || '戒瘾勇士',
        avatarUrl: avatarUrl || '',
        createdAt: db.serverDate(),
        updatedAt: db.serverDate()
      }
    })
  }

  return { code: 0, msg: '更新成功' }
}

// 获取用户资料
async function getProfile(openid) {
  const userRes = await db.collection('users').where({ openid }).get()
  const user = userRes.data[0] || { nickName: '戒瘾勇士', avatarUrl: '' }
  
  return {
    code: 0,
    user: {
      nickName: user.nickName || '戒瘾勇士',
      avatarUrl: user.avatarUrl || ''
    }
  }
}
