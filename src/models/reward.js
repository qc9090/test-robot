import mongoose from 'mongoose'

const Schema = mongoose.Schema

var RewardSchema = new Schema({
  roomkey: String,
  taskid: Number,
  data: {
    type: Object,
    default: {}
  },
})

export default mongoose.model('Reward', RewardSchema)