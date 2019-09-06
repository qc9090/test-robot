import mongoose from 'mongoose'

const Schema = mongoose.Schema

var RewardSchema = new Schema({
  roomid: String,
  cid: String,
  taskid: Number,
  point: Number
})

export default mongoose.model('Repeat', RewardSchema)