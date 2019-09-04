import mongoose from 'mongoose'

const Schema = mongoose.Schema

var RewardSchema = new Schema({
  roomkey: String,
  data: Object,
})

export default mongoose.model('Reward', RewardSchema)