
import bs58 from 'bs58'
import { u8aToHex } from '@polkadot/util'
/**	Creates a callback that proxies node callback style arguments to an Express Response object.
 *	@param {express.Response} res	Express HTTP Response
 *	@param {number} [status=200]	Status code to send on success
 *
 *	@example
 *		list(req, res) {
 *			collection.find({}, toRes(res));
 *		}
 */
export function toRes(res, status=200) {
	return (err, thing) => {
		if (err) return res.status(500).send(err);

		if (thing && typeof thing.toObject==='function') {
			thing = thing.toObject();
		}
		res.status(status).json(thing);
	};
}

export function getRandomNum (m, n) {
  return Math.floor(Math.random() * (m - n) + n)
}

export function formatNum (num, len) {
  return num.toFixed(len)
}

export function didToHex(did) {
  const bytes = bs58.decode(did.substring(9))
  return u8aToHex(bytes)
}

export function hexToDid(hex) {
  const bytes = Buffer.from(hex.slice(2), 'hex')
  const address = bs58.encode(bytes)
  const did = `did:pra:p${address}`
  
  return did
}