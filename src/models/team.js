import mongoose from 'mongoose'

const Schema = mongoose.Schema

var TeamSchema = new Schema({
  roomid: String,
  compose: String,
  ask: String,
  answer: String
})

export default mongoose.model('Team', TeamSchema)