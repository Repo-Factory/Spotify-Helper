const express = require('express')
var cors = require("cors");
const bodyParser = require('body-parser')
const app = express()
const db = require('./queries')
const port = 5500


app.use(cors());
app.use(express.static('public'));
app.use(bodyParser.json())
app.use(
  bodyParser.urlencoded({
    extended: true,
  })
)

app.get('/', (request, response) => {
    response.send("Hello");
})


app.get('/playlists', db.getPlaylists);
app.get('/songs', db.getSongs);
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