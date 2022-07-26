const express = require('express')
const db = require('./queries')
var cors = require("cors");
const bodyParser = require('body-parser')
require('dotenv').config()
const app = express()
const port = 5500

app.use(cors());
app.use(express.static('public'));
app.use(bodyParser.json())
app.use(
  bodyParser.urlencoded({
    extended: true,
  })
)

app.get('/')
app.get('/playlists', db.getPlaylists);
app.get('/songs', db.getSongs);
app.get('/songs/byplaylist/:id', db.pickSongs);
app.get('/playlists/:id', db.getPlaylistById);
app.post('/playlists', db.createPlaylist);
app.post('/songs', db.createSong);
app.put('/playlists/:id', db.updatePlaylist);
app.delete('/playlists/:id', db.deletePlaylist);
app.delete('/playlists', db.deletePlaylists)
app.delete('/songs', db.deleteSongs)

app.listen(port, () => {
    console.log(`App running on port ${port}.`)
  })