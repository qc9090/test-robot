export default callback => {
	const mongoose = require('mongoose')
	mongoose.connect('mongodb://localhost/chat_question_log', {useNewUrlParser: true})

	const db = mongoose.connection
	// connect to a database if needed, then pass it to `callback`:
	callback(db);
}
