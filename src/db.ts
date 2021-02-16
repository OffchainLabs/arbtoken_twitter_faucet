
import Datastore from 'nedb'

export default new Datastore({ filename: 'access_tokens.db', autoload: true });
