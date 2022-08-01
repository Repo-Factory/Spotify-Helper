/**
 * HOUSES ALL SPOTIFY FUNCTIONS
 */


const redirect_uri = 'http://127.0.0.1:5500';
const authUrl = 'https://accounts.spotify.com/authorize';
const tokenUrl = 'https://accounts.spotify.com/api/token';
const playlistUrl = 'https://api.spotify.com/v1/me/playlists?limit=50';
const tracksUrl = "https://api.spotify.com/v1/playlists/{{PlaylistId}}/tracks";


class User {
    constructor(client_id, client_secret, access_token) {
        this.client_id = client_id; 
        this.client_secret = client_secret;
        this.access_token = access_token;
        this.scope = 'playlist-read-private playlist-read-collaborative playlist-modify-public playlist-modify-private user-library-read'; //Specific desired permissions from spotify
    }
    set(client_id) {this.client_id = client_id} 
    set(client_secret) {this.client_secret = client_secret}
    set_access_token(access_token) {this.access_token = access_token}
    get_client_id() {return this.client_id} 
    get_client_secret() {return this.client_secret}
    get_access_token() {return this.access_token}
}

//necessary global to keep track of access_token for API requests
var currentUser;


/**
 * Authorization Section
 * 
 * Retrieves user and password data from frontend to send to Spotify for authentication
 * and access_token
  */


//executed on form submission, sends request to spotify authorize URl
function requestAuthorization() {
    let user = createUser();
    url = buildAuthUrl(user);
    window.location.href = url;
}


//makes a new user object with id and secret information from form
function createUser() {
    let client_id = getFormclient_id();
    let client_secret = getFormSecret();
    setStorage(client_id, client_secret)
    let user = new User(client_id, client_secret, null) 
    return user
}


//URL used to make authorization request to Spotify
function buildAuthUrl(user) {
    let url = authUrl +
    '?client_id=' + user.client_id +
    '&response_type=code' +
    '&redirect_uri=' + encodeURI(redirect_uri) +
    '&show_dialog=true' +
    '&scope=' + user.scope;
    return url
}


// executed on initial page load and redirect back to website, initial load won't call functions until authentication
//on the redirect, function will be called to populate postgres database with playlists and songs
async function onPageLoad() {
    
    let client_id = get_client_id();
    let client_secret = get_client_secret();
    let user = new User(client_id, client_secret, access_token=null);
    user = await authorizeUser(user); //try to authorize user on page load
    currentUser = user; 

    if (user.access_token == null) {
        document.getElementById("login").style.display = 'block';
        document.getElementById("functions").style.display = 'none';
    }
    else {
        document.getElementById("functions").style.display = 'block';
        document.getElementById("login").style.display = 'none';
    }
}

//cleans URL and requests access token, if valid request made, sets access token
async function authorizeUser(user) {
    let code = getCode(); // using URL paramter
    if (code != null) {
        let access_token = await requestAccessToken(code, user);
        window.history.pushState('', '', redirect_uri);
        user.set_access_token(access_token);
        let authorizedUser = user;
        return authorizedUser;
    }
    return user
}


//creates body for token request and returns the token
async function requestAccessToken(code, user) {
    body = buildBody(code, user);
    json = await callAuthApi(body, user);
    user.access_token = json.access_token;
    return user.access_token;
}


//URL used to make request to Spotify for access token
function buildBody(code, user) {
    let body = "grant_type=authorization_code" +
    "&code=" + code +
    "&redirect_uri=" + encodeURI(redirect_uri) +
    "&client_id=" + user.client_id +
    "&client_secret=" + user.client_secret;
    return body;
} 


//makes request to spotify token API page for authorization
async function callAuthApi(body, user) {
    try {
        const request = await fetch(tokenUrl, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Authorization': 'Basic ' + btoa(user.client_id + ':' + user.client_secret),
        },
        body : body
    })
    const json = await request.json();
    console.log(json)
    return json
    }
    catch(err) {
        throw err;
    }
}


//once user has access token, this general API call function can be used; all of the calls are similar in format
async function callSpotifyApi(method, url, body, access_token) {
    try {
        const request = await fetch(url, {
        method: method,
        headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + access_token,
        },
        body : body
    })
    const json = await request.json();
    return json
    }
    catch(err) {

    }
}


//general api call for postgres requests
async function callApi(method, url, body) {
    try {
        const request = await fetch(url, {
        method: method,
        headers: {
            'Content-Type': 'application/json',
        },
        body : body
    })
    const json = await request.json();
    return json
    }
    catch(err) {
        console.log(err);
    }
}


///////////////Authorize Helpers////////////////


//grab data from form to set id and password
function getFormclient_id() {
    let client_id = document.getElementById('client_id').value;
    return client_id
}
function getFormSecret() {
    client_secret = document.getElementById('client_secret').value;
    return client_secret
}


//have to set storage with form data to preserve it through browser redirect
function setStorage(client_id, client_secret) {
    localStorage.setItem('client_id', client_id);
    localStorage.setItem('client_secret', client_secret);
    sleep(300)
}
//getters for local storage items
function get_client_id() {
    let client_id = localStorage.getItem("client_id");
    return client_id    
}
function get_client_secret() {
    let client_secret = localStorage.getItem("client_secret");
    return client_secret    
}


//gets code sent from spotify as query param for access token
function getCode() {
    let code = null;
    const queryString = window.location.search;
    if(queryString.length > 0) {
        const urlParams = new URLSearchParams(queryString);
        code = urlParams.get('code')
    }
    return code;
}


/**
 * Playlist Section
 * 
 * Contains functions to include adding the list to the front end as well as committing them to the
 * postgres database
 */


//resets database to avoid duplicates, must delete songs before playlists because of foreign key relation
async function deleteSongs() {
    try { 
        const request = await fetch('http://localhost:5500/songs', {
            method: 'DELETE',
        })
        return request
    }
    catch(err) {
        console.log(err)
    }
}
async function deletePlaylists() {
    try { 
        const request = await fetch('http://localhost:5500/playlists', {
            method: 'DELETE',
        })
        return request
    }
    catch(err){
        console.log(err)
    }
}
async function resetDatabase() {
    const songsDeleted = await deleteSongs();
    const playlistsDeleted = await deletePlaylists();
    return [songsDeleted, playlistsDeleted];
}


//performs get request to spotify to get playlists associated with the user
async function populatePlaylists() {
    await resetDatabase();
    let json = await callSpotifyApi('GET', playlistUrl, null, currentUser.access_token);
    return json.items.forEach(item => postPlaylist(item));
}


//makes post request to postgres database with the playlist info to include title, number of tracks, and its id on spotify
//this info is used to construct query to database
async function postPlaylist(item) {
    let title = item.name;
    let tracks = item.tracks.total;
    let spotifyId = item.id;
    const playlistDetails = {title, tracks, spotifyId};
    return request = await fetch('http://localhost:5500/playlists', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(Object.values(playlistDetails)),
        })
}


//view user playlists on frontend
async function viewPlaylists() {
    let json = await callSpotifyApi('GET', playlistUrl, null, currentUser.access_token);
    return json.items.forEach(item => addPlaylist(item));
}


//puts playlists into pick list on HTML page
function addPlaylist(item) {
    let node = document.createElement("option");
    node.value = item.id;
    node.innerHTML = item.name + " ("+ item.tracks.total +")";
    document.getElementById("playlists").appendChild(node); 
}


//instead of making another request to spotify's API, playlists can be fetched from postgres clone database
async function getPostgresPlaylists() {
    let playlistIds = [];
    let json = await callApi('GET', `http://localhost:5500/playlists`, null);
    json.forEach(item => playlistIds.push(item.spotifyid))
    return playlistIds
}


/**
 * Song Section 
 * 
 * Defines functions for adding songs to the frontend aand commiting them to the database
 */


//for each playlist, makes a get request to spotify api to get the songs of that playlist to be commited to postgres
//database in later functions
async function populateSongs() {
    let playlistIds = await getPostgresPlaylists();
    for (i=0; i < playlistIds.length; i++) {
        let json = await getPlaylistSongs(playlistIds[i]);
        let url = storeUrl(json)
        json.items.forEach(item => postSong(item, url));
    }
}


//retrieves songs of a given playlist from Spotify
async function getPlaylistSongs(playlist) {
    let json = await callSpotifyApi('GET', `https://api.spotify.com/v1/playlists/${playlist}/tracks?limit=100`, null, currentUser.access_token);
    return json
}


//after gettings songs, spotify will send a response that doesn't directly contain the playlist id, this is a problem
//because we need that id to put the song in the database with the correct foreign key relation, postgres has to know
//the spotify id to look up the primary key of that playlist and associate the song to it. The response does however
//send the href of the site visited to get that song details which does contain the id for the playlist, so this function
//does some string manipulation to get that id and pass it into the next function in a loop which commits the songs to the
//database
function storeUrl(playlistResponse) {
    let url = playlistResponse.href;
    url = url.split('playlists/');
    url = url[1].split('/');
    url = url[0];
    return url
}


//makes post request to the postgres database with the songname, spotifyid of the song, and the playlist id foreign key relation
//which is used to construct the query
async function postSong(item, url) {
    let songname = item.track.name;
    let songid = item.track.id;
    let id = url;
    const songDetails = {songname, songid, id};
    return request = await fetch('http://localhost:5500/songs', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(Object.values(songDetails)),
        })
}


//refreshes the picklist in the frontend as well as adding the songs, using the value of the playlist to call API
//for correct playlist
async function viewSongs() {
    let playlist_id = document.getElementById("playlists").value;
    if (playlist_id.length > 0){
        url = tracksUrl.replace("{{PlaylistId}}", playlist_id);
        let json = await callSpotifyApi("GET", url, null, currentUser.access_token);
        removeItems("songs");
        return json.items.forEach((item, index) => addSong(item,index));
    }
}


//gets the element picklist and appends it with new song
function addSong(item, index) {
    let node = document.createElement("option");
    node.value = index;
    node.innerHTML = item.track.name + " (" + item.track.artists[0].name + ")";
    document.getElementById("songs").appendChild(node); 
}


/**
 * Data Manipulation Section
 * 
 * Now that the database can be cloned with the above functions, this section creates the clone and uses the data
 * within it to be able to perform desired manipulations.
 * This section could be build upon but I use it mainly to automatically create a new playlists with songs
 * that are recommended from spotify
 */


//clones playlists and songs of users spotify account and commits them to the postgres database 
async function populateAccount() {
    showWaitingText('Cloning Account...')
    await populatePlaylists();
    await populateSongs();
    return document.getElementById("created").textContent = "Account Cloned!";   
}


//executes all functions to create a new playlist based on recommendations collected from the Spotify API based on 
//info in the postgres database
async function discoverMusic() {
    showWaitingText('Creating Playlist...');
    let playlistsIds = await getPostgresPlaylists();
    let newMusic = await findNewMusic(playlistsIds);
    let playlist = await createPlaylist();
    for (let i =0; i < newMusic.length; i++){
        await addSongtoPlaylist(newMusic[i], playlist);
        sleep(125)
    }
    return document.getElementById("created").textContent = "Playlist Created!";  
}

function showWaitingText(string) {
    document.getElementById("created").style.display = "inline";  
    document.getElementById("created").textContent = string;
}


/**
 * Part I: Find song recommendations
 */



//gets songs from one playlist from postgres database based on the playlistId
async function getPostgresSongs(url) {
    let songs = await callApi('GET', `http://localhost:5500/songs/byplaylist/${url}`, null);
    return songs;
}


//creates and fills a list with song recommendations based on seed songs randomly picked from songs in postgres database
async function findNewMusic(playlistIds) {
    let newSongs = [];
    for (let i=0; i < playlistIds.length;i++) {
        let songs = await getPostgresSongs(playlistIds[i]);
        songSeeds = pickFiveSongs(songs);
        seedString = createSeedString(songSeeds);
        recommendation = await getRecommendation(seedString);
        newSongs.push(recommendation);
    }
    return newSongs
}


//spotify gives recommendations based on seed songs, can take a maximum of 5 seed parameters
function pickFiveSongs(songs) {
    if (songs.length < 5) {
        randomLower = 0;
        randomUpper = songs.length - 1
    }
    else {
        randomLower = Math.floor(Math.random()*(songs.length-5-1)) //max limit of 100 songs for spotify playlist return
        randomUpper = randomLower + 5
    }
    songSeeds = songs.slice(randomLower, randomUpper)
    return songSeeds
}


//creates a list of all the songs in the playlist seperated by commas, this is the format needed to pass into the 
//spotify API at the recommend songs endpoint, then calls function to get recommendations 
function createSeedString(songSeeds) {
    let randomSongStrings = ''
    songSeeds.forEach(item => randomSongStrings += (item.spotifyid + ','))
    randomSongStrings = randomSongStrings.slice(0, -1)
    return randomSongStrings
}


//get request to recommendations endpoint of spotify API, passed in url made from handlePostres function
//response gives back a list of 20 recommended songs, this function chooses one and adds it to a list of songs to be added 
async function getRecommendation(seedTrackList) {
    try {
        let recommendations = await callSpotifyApi('GET', `https://api.spotify.com/v1/recommendations?seed_tracks=${seedTrackList}`, null, currentUser.access_token)
        let recommendation = recommendations.tracks[randomNumberBetweenZeroAnd(19)].id
        return recommendation
    }
    catch(err) {
        console.log("Couldn't Recommend Track")
    }
}


//helper to pick random song
function randomNumberBetweenZeroAnd(number) {
    randomNumber = Math.floor(Math.random() * (number + 1))
    return randomNumber
}


/**
 * Part II: With songs recommendations collected, make a new playlist in spotify and add each song to that playlist
 */


//retrieves user id which is needed to make a new playlist
async function getUserDetails() {
    let json = await callSpotifyApi('GET', 'https://api.spotify.com/v1/me', null, currentUser.access_token)
    return json.id
}


//post request to spotify api to make playlist in account; note that user_id is different from client_id for authorization
//to get user_id make get request to 'https://api.spotify.com/v1/me'
async function createPlaylist() {
    let date = new Date();
    let user_id = await getUserDetails();
    body = {
            "name": `Discover Music ${date}`,
            "description": "Automatically generated playlist for new music",
            "public": false
           }
    let response = await callSpotifyApi('POST', `https://api.spotify.com/v1/users/${user_id}/playlists`, JSON.stringify(body), currentUser.access_token)
    let createdPlaylistId = response.id;
    return createdPlaylistId;
}


//post request to spotify api to add song that takes in the spotifyid of the song and the playlist to add it to
async function addSongtoPlaylist(song, playlist) {
    let response = await callSpotifyApi('POST', `https://api.spotify.com/v1/playlists/${playlist}/tracks?uris=spotify:track:${song}`, null, currentUser.access_token)
    return response
}


/**
 * Helper Section
 */


//a javascript sleep mimic to help with adding songs to playlist; if the songs are added too fast spotify will give an error
function sleep(milliseconds) {
    const date = Date.now();
    let currentDate = null;
    do {
      currentDate = Date.now();
    } while (currentDate - date < milliseconds);
}


//removes items from picklist in frontend
function removeItems(elementId){
    let node = document.getElementById(elementId);
    while (node.firstChild) {
        node.removeChild(node.firstChild);
    }
}
