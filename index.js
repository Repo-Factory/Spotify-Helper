const express = require('express')
var cors = require("cors");
const bodyParser = require('body-parser')
const app = express()
const path = require('.')
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
    response.send("yo");
})


app.get('/playlists', db.getPlaylist);
app.get('/playlists/:id', db.getPlaylistById);
app.post('/playlists', db.createPlaylist);
app.put('/playlists/:id', db.updatePlaylist);
app.delete('/playlists/:id', db.deletePlaylist);
app.delete('/playlists', db.deletePlaylists)


app.listen(port, () => {
    console.log(`App running on port ${port}.`)
  })