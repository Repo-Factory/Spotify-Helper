const Pool = require('pg').Pool
const pool = new Pool({
  user: 'spotify',
  host: 'db',
  database: 'spotify',
  password: 'spotify',
  port: 5432,
})

function createDb() {

pool.query('CREATE TABLE playlists (id serial PRIMARY KEY, name VARCHAR(150), songs integer, spotifyid VARCHAR(80)); CREATE TABLE songs ( id serial PRIMARY KEY, name VARCHAR(150), spotifyid VARCHAR(80) playlistkey = FOREIGN KEY(id) REFERENCES playlists(id);')
}

module.exports = {
   createDb,
}

createDb()