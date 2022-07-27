const express = require('express');
const db = require('./queries');
var cors = require("cors");
const bodyParser = require('body-parser');
const app = express();
const port = 5500;
 

app.use(cors());
app.use(express.static('public'));
app.use(bodyParser.json());
app.use(
  bodyParser.urlencoded({
    extended: true,
  })
)

app.get('/');
app.get('/playlists', db.getPlaylists);
app.get('/playlists/:id', db.getPlaylistById);
app.get('/songs', db.getSongs);
app.get('/songs/byplaylist/:id', db.pickSongs);
app.post('/playlists', db.createPlaylist);
app.post('/songs', db.createSong);
app.delete('/playlists/:id', db.deletePlaylist);
app.delete('/songs/:id', db.deleteSong);
app.delete('/playlists', db.deletePlaylists);
app.delete('/songs', db.deleteSongs);

app.listen(port, () => {
    console.log(`App running on port ${port}.`);
  })