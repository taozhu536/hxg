// 云函数入口文件
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()
const _ = db.command

/**
 * friends 云函数
 * 动作:
 *   add     - 添加好友（通过邀请码）
 *   list    - 获取好友列表（含昵称头像和打卡统计）
 *   remove  - 删除好友
 *   checkins - 获取好友某天的打卡状态（用于日历）
 *   myCode  - 获取自己的邀请码
 */
exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const openid = wxContext.OPENID
  const { action, ...data } = event

  try {
    switch (action) {
      case 'myCode':
        return await getMyInviteCode(openid)
      case 'add':
        return await addFriend(openid, data)
      case 'list':
        return await getFriendList(openid)
      case 'remove':
        return await removeFriend(openid, data)
      case 'checkins':
        return await getFriendCheckins(openid, data)
      default:
        return { code: -1, msg: '未知动作' }
    }
  } catch (err) {
    console.error(err)
    return { code: -1, msg: err.message }
  }
}

// 生成邀请码（4位，基于openid的MD5）
function genInviteCode(openid) {
  const crypto = require('crypto')
  const hash = crypto.createHash('md5').update(openid).digest('hex')
  const chars = '0123456789ABCDEFGHJKLMNPQRSTUVWXYZ'
  let code = ''
  for (let i = 0; i < 4; i++) {
    const idx = parseInt(hash.substring(i * 2, i * 2 + 2), 16) % chars.length
    code += chars[idx]
  }
  return code
}

// 通过邀请码查找 openid
async function findOpenidByCode(inviteCode) {
  const res = await db.collection('users').where({ inviteCode }).get()
  return res.data[0] ? res.data[0].openid : null
}

// 获取自己的邀请码
async function getMyInviteCode(openid) {
  const userRes = await db.collection('users').where({ openid }).get()
  let user = userRes.data[0]

  if (!user) {
    return { code: -1, msg: '用户不存在' }
  }

  // 如果没有邀请码，生成一个
  if (!user.inviteCode) {
    let code = genInviteCode(openid)
    // 检查是否唯一
    const exist = await db.collection('users').where({ inviteCode: code }).get()
    if (exist.data.length > 0) {
      // 碰撞了，在末尾加一位
      code = code + openid.slice(-1).toUpperCase()
    }
    await db.collection('users').doc(user._id).update({
      data: { inviteCode: code }
    })
    user.inviteCode = code
  }

  return { code: 0, data: { inviteCode: user.inviteCode } }
}

// 添加好友
async function addFriend(openid, data) {
  const { inviteCode } = data
  if (!inviteCode) return { code: -1, msg: '请输入邀请码' }

  // 通过邀请码查找对方 openid
  const friendRes = await db.collection('users').where({ inviteCode }).get()
  if (friendRes.data.length === 0) {
    return { code: -1, msg: '邀请码无效，请确认后重试' }
  }

  const friendOpenid = friendRes.data[0].openid

  if (friendOpenid === openid) {
    return { code: -1, msg: '不能添加自己为好友' }
  }

  // 检查是否已经是好友
  const existing = await db.collection('friends').where({
    openid,
    friendOpenid
  }).get()

  if (existing.data.length > 0) {
    return { code: -1, msg: '已经是好友了' }
  }

  // 添加好友关系（双向）
  await db.collection('friends').add({
    data: {
      openid,
      friendOpenid,
      createdAt: db.serverDate()
    }
  })

  // 同时也添加反向关系
  const existingReverse = await db.collection('friends').where({
    openid: friendOpenid,
    friendOpenid: openid
  }).get()

  if (existingReverse.data.length === 0) {
    await db.collection('friends').add({
      data: {
        openid: friendOpenid,
        friendOpenid: openid,
        createdAt: db.serverDate()
      }
    })
  }

  const friendUser = friendRes.data[0]
  return {
    code: 0,
    msg: `添加成功！🎉`,
    data: {
      nickName: friendUser.nickName || '好友',
      avatarUrl: friendUser.avatarUrl || ''
    }
  }
}

// 获取好友列表（含最近打卡信息）
async function getFriendList(openid) {
  const friendsRes = await db.collection('friends')
    .where({ openid })
    .get()

  if (friendsRes.data.length === 0) {
    return { code: 0, data: [] }
  }

  const friendOpenids = friendsRes.data.map(f => f.friendOpenid)

  // 获取好友个人信息
  const usersRes = await db.collection('users')
    .where({ openid: _.in(friendOpenids) })
    .get()

  const userMap = {}
  usersRes.data.forEach(u => {
    userMap[u.openid] = {
      nickName: u.nickName || '好友',
      avatarUrl: u.avatarUrl || ''
    }
  })

  // 获取好友的打卡统计
  const today = getDateStr()
  const result = []

  for (const fOpenid of friendOpenids) {
    // 今日打卡数
    const todayRes = await db.collection('checkins')
      .where({ openid: fOpenid, date: today })
      .count()

    // 总打卡数
    const totalRes = await db.collection('checkins')
      .where({ openid: fOpenid })
      .count()

    result.push({
      openid: fOpenid,
      ...(userMap[fOpenid] || { nickName: '好友', avatarUrl: '' }),
      todayCheckins: todayRes.total,
      totalCheckins: totalRes.total
    })
  }

  return { code: 0, data: result }
}

// 删除好友
async function removeFriend(openid, data) {
  const { friendOpenid } = data
  if (!friendOpenid) return { code: -1, msg: '缺少好友信息' }

  // 删除双向关系
  await db.collection('friends').where({ openid, friendOpenid }).remove()
  await db.collection('friends').where({ openid: friendOpenid, friendOpenid: openid }).remove()

  return { code: 0, msg: '已删除好友' }
}

// 获取好友某天的打卡状态（用于日历显示）
async function getFriendCheckins(openid, data) {
  const { date } = data
  if (!date) return { code: -1, msg: '缺少日期' }

  // 获取好友列表
  const friendsRes = await db.collection('friends')
    .where({ openid })
    .get()

  if (friendsRes.data.length === 0) {
    return { code: 0, data: [] }
  }

  const friendOpenids = friendsRes.data.map(f => f.friendOpenid)

  // 获取这些好友在指定日期的打卡记录
  const checkinsRes = await db.collection('checkins')
    .where({
      openid: _.in(friendOpenids),
      date
    })
    .get()

  // 获取好友的用户信息
  const usersRes = await db.collection('users')
    .where({ openid: _.in(friendOpenids) })
    .get()

  const userMap = {}
  usersRes.data.forEach(u => {
    userMap[u.openid] = {
      nickName: u.nickName || '好友',
      avatarUrl: u.avatarUrl || ''
    }
  })

  // 按好友分组统计打卡数
  const checkinCount = {}
  checkinsRes.data.forEach(c => {
    if (!checkinCount[c.openid]) {
      checkinCount[c.openid] = 0
    }
    checkinCount[c.openid]++
  })

  const result = friendOpenids
    .filter(fid => checkinCount[fid] > 0)
    .map(fid => ({
      openid: fid,
      ...(userMap[fid] || { nickName: '好友', avatarUrl: '' }),
      checkinCount: checkinCount[fid]
    }))

  return { code: 0, data: result }
}

function getDateStr() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
}
