import Reward from '../models/reward'

export default (req, res) => {
  const reward = new Reward(req.body)
  reward.save((err) => {
    if (err) return console.log(err)
    res.json({
      result: true
    })
  })
}
