CREATE TABLE playlists (
    id serial PRIMARY KEY, 
    name VARCHAR(150), 
    songs integer, 
    spotifyid VARCHAR(80)); 

CREATE TABLE songs (
  id serial PRIMARY KEY, 
  name VARCHAR(150), 
  spotifyid VARCHAR(80), 
  playlistkey integer REFERENCES playlists(id));
     
