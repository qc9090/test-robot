import mongoose from 'mongoose'

const Schema = mongoose.Schema

var RewardSchema = new Schema({
  roomid: String,
  cid: String,
  point: Number
})

export default mongoose.model('Repeat', RewardSchema)