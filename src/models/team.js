import mongoose from 'mongoose'

const Schema = mongoose.Schema

var TeamSchema = new Schema({
  roomid: String,
  taskid: Number,
  compose: String,
  ask: String,
  answer: String
})

export default mongoose.model('Team', TeamSchema)