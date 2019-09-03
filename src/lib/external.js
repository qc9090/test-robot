const rp =require('request-promise')

const baseUrl = 'https://block.chain.pro/discovery-ad'
// const baseUrl = 'http://192.168.1.170:18909/ad'

const apiUpdateReward = `${baseUrl}/api/v1/chat/bot/set_question_user_index`
const apiGetMintRecord = `${baseUrl}/api/v1/chat/bot/get_user_index_by_roomid`
const apiGetQuestion = `${baseUrl}/api/v1/chat/bot/question`

export async function getQuestion (roomid) {
  return rp({
    method: 'GET',
    url: apiGetQuestion,
    qs: {
      room_id: roomid
    },
    json: true
  })
}

export async function updateReward (roomid, wxid, roomName, nickName, index, hlevel, taskId, reason, type, qid) {
  console.log(roomid, wxid, roomName, nickName, index, hlevel, taskId, reason, type, qid, '---prams-------')
  return rp({
    method: 'POST',
    url: apiUpdateReward,
    body: {
      q_id: qid,
      type,
      room_id: roomid,
      wxid,
      room_name: roomName,
      nick_name: nickName,
      task_id: taskId,
      index,
      hlevel,
      reason
    },
    json: true
  })
}

export async function getMintHistory (roomid, taskId) {
  return rp({
    method: 'GET',
    url: apiGetMintRecord,
    qs: {
      roomid,
      task_id: taskId
    },
    json: true
  })
}

