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

//this.user_id = getUserDetails();  //name of user in spotify, different from client_id provided by Spotify Developers page


var playlistIds = [];
var songsToBeAdded = [];


/**
 * Authorization Section
 * 
 * Retrieves user and password data from frontend to send to Spotify for authentication
 * and access_token
  */


//executed on form submission, sends request to spotify authorize URzl
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
    let user = new User(client_id, client_secret, access_token=null)
    await authorizeUser(user)

    if (user.access_token == null) {
        document.getElementById("login").style.display = 'block';
        document.getElementById("functions").style.display = 'none';
    }
    else {
        document.getElementById("functions").style.display = 'block';
        document.getElementById("login").style.display = 'none';

        //getUserDetails();
    }
}

//cleans URL and requests access token
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


//creates body for token request
async function requestAccessToken(code, user) {
    body = buildBody(code, user);
    json = await callAuthApi(body, user);
    user.access_token = json.access_token;
    return user.access_token;
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
async function callApi(method, url, body, access_token) {
    try {
        const request = await fetch(url, {
        method: method,
        headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + access_token,
        },
        body : JSON.stringify(body)
    })
    const json = request.json();
    return json
    }
    catch(err) {
        throw err;
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
    try {fetch('http://localhost:5500/songs', {
            method: 'DELETE',
            body: null
        })
    }
    catch(err) {
        console.log(err)
    }
}
async function deletePlaylists() {
    try {fetch('http://localhost:5500/playlists', {
        method: 'DELETE',
        body: null
        })
    }
    catch(err){
    }
}
async function resetDatabase() {
    const songsDeleted = await deleteSongs();
    const playlistsDeleted = await deletePlaylists();
    return Promise.all(songsDeleted, playlistsDeleted)
}


//performs get request to spotify to get playlists associated with the user
async function populatePlaylists() {
    await resetDatabase();
    json = await callApi('GET', playlistUrl, null);
    return json.items.forEach(item => postPlaylist(item));
}


//makes post request to postgres database with the playlist info to include title, number of tracks, and its id on spotify
//this info is used to construct query to database
async function postPlaylist(item) {
    title = item.name;
    tracks = item.tracks.total;
    spotifyId = item.id;
    const playlistDetails = {title, tracks, spotifyId};
    return request = await fetch('http://localhost:5500/playlists', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(Object.values(playlistDetails)),
        })
}


function viewPlaylists() {
    callApi('GET', playlistUrl, null, handleViewPlaylistResponse);
}


function handleViewPlaylistResponse() {
    if (this.status == 200) {
        var data = JSON.parse(this.responseText);
        console.log(data);
        data.items.forEach(item => addPlaylist(item));
    }
    else if ( this.status == 401 ){
        refreshAccessToken();
    }
    else {
        console.log(this.responseText);
        alert(this.responseText);
    }
}


//puts playlists into pick list on HTML page
function addPlaylist(item) {
    let node = document.createElement("option");
    node.value = item.id;
    node.innerHTML = item.name + " ("+ item.tracks.total +")";
    document.getElementById("playlists").appendChild(node); 
}


//instead of making another request to spotify's API, playlists can be fetched from postgres clone database
function getPostgresPlaylists() {
    callApi('GET', `http://localhost:5500/playlists`, null, handleGetPostgresPlaylists)
}


function handleGetPostgresPlaylists() {
    playlistIds =[];
    var data = JSON.parse(this.responseText);
    data.forEach(item => playlistIds.push(item.spotifyid));
    console.log(playlistIds)
}


/**
 * Song Section 
 * 
 * Defines functions for adding songs to the frontend aand commiting them to the database
 */


//for each playlist, makes a get request to spotify api to get the songs of that playlist to be commited to postgres
//database in later functions
function populateSongs() {
    getPostgresPlaylists();
    setTimeout(() => {loopThroughPlaylists()}, 1000);    
}


//helper for populateSongs()
function loopThroughPlaylists() {
    for (i=0; i < playlistIds.length; i++) {
        callApi('GET', `https://api.spotify.com/v1/playlists/${playlistIds[i]}/tracks?limit=5`, null, handleSongResponse);
    }
}


//after gettings songs, spotify will send a response that doesn't directly contain the playlist id, this is a problem
//because we need that id to put the song in the database with the correct foreign key relation, postgres has to know
//the spotify id to look up the primary key of that playlist and associate the song to it. The response does however
//send the href of the site visited to get that song details which does contain the id for the playlist, so this function
//does some string manipulation to get that id and pass it into the next function in a loop which commits the songs to the
//database
function handleSongResponse() {
    var url = this.responseURL;
    url = url.split('playlists/');
    url = url[1].split('/');
    url = url[0];

    if (this.status == 200) {
        var data = JSON.parse(this.responseText);
        console.log(data);
        data.items.forEach(item => postSong(item, url));
    }
    else if ( this.status == 401 ){
        refreshAccessToken();
    }
    else {
        console.log(this.responseText);
        alert(this.responseText);
    }
}


//makes post request to the postgres database with the songname, spotifyid of the song, and the playlist id foreign key relation
//which is used to construct the query
function postSong(item, url) {
    songname = item.track.name;
    songid = item.track.id;
    id = url;
    const songDetails = {songname, songid, id};
    request = fetch('http://localhost:5500/songs', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(Object.values(songDetails)),
        })
}


//based on the playlist selected in the frontend, sends API request for songs in that playlist
function viewSongs() {
    let playlist_id = document.getElementById("playlists").value;
    if (playlist_id.length > 0){
        url = tracksUrl.replace("{{PlaylistId}}", playlist_id);
        callApi("GET", url, null, handleViewSongResponse);
    }
}


//verfies song request validity and refreshes the picklist in the frontend as well as adding the songs
function handleViewSongResponse() {
    if (this.status == 200){
        var data = JSON.parse(this.responseText);
        console.log(data);
        removeItems("songs");
        data.items.forEach( (item, index) => addSong(item, index));
    }
    else if (this.status == 401){
        refreshAccessToken()
    }
    else {
        console.log(this.responseText);
        alert(this.responseText);
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
function populateAccount() {
    populatePlaylists();
    setTimeout(() => {populateSongs();}, 1000);
}


//executes all functions to create a new playlist based on recommendations collected from the Spotify API based on 
//info in the postgres database
function discoverMusic() {
    getPostgresPlaylists()
    setTimeout(() => {findNewMusic();}, 300);
    setTimeout(() => {createPlaylist();}, 6000);
    setTimeout(() => {document.getElementById("created").style.display = "inline";}, 9000);
    
}


/**
 * Part I: Find song recommendations
 */


//sets off a chain of getting songs from database and then getting recommended song
function findNewMusic() {
    for (let i=0; i < playlistIds.length;i++) {
        getPostgresSongs(playlistIds[i])
    }
}


//gets songs from one playlist from postgres database based on the playlistId
function getPostgresSongs(url) {
    callApi('GET', `http://localhost:5500/songs/byplaylist/${url}`, null, handleGetPostgresSongs)
}


//creates a list of all the songs in the playlist seperated by commas, this is the format needed to pass into the 
//spotify API at the recommend songs endpoint, then calls function to get recommendations 
function handleGetPostgresSongs() {
    randomSongStrings = ''
    var data = JSON.parse(this.responseText);
    console.log(data)
    data.forEach(item => randomSongStrings += (item.spotifyid + ','))
    randomSongStrings = randomSongStrings.slice(0, -1)
    getRecommendations(randomSongStrings)
}


//get request to recommendations endpoint of spotify API, passed in url made from handlePostres function
function getRecommendations(seedTrackList) {
    callApi('GET', `https://api.spotify.com/v1/recommendations?seed_tracks=${seedTrackList}`, null, handleRecommendationsResponse)
}


//response gives back a list of 20 recommended songs, this function chooses one and adds it to a list of songs to be added 
function handleRecommendationsResponse() {
    if (this.status == 200) {
        var data = JSON.parse(this.responseText);
        console.log(data);
        console.log(data.tracks[randomNumberBetweenZeroAnd(4)].id)
        songsToBeAdded.push(data.tracks[randomNumberBetweenZeroAnd(4)].id)
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

//post request to spotify api to make playlist in account; note that user_id is different from client_id for authorization
//to get user_id make get request to 'https://api.spotify.com/v1/me' 
function createPlaylist() {
    body = {
            "name": "Discover Music",
            "description": "Automatically generated playlist for new music",
            "public": false
           }
    callApiJSON('POST', `https://api.spotify.com/v1/users/${user_id}/playlists`, JSON.stringify(body), handleCreatePlaylistResponse)
}


//When playlist is created, the response will send back info which is then parsed by this function to get the id, 
//addSongtoPlaylist function in a loop to add each song in the list to the playlist of id which is passed in
function handleCreatePlaylistResponse() {
    createdPlaylistId = JSON.parse(this.responseText).id
    for (let i =0; i < songsToBeAdded.length; i++){
        addSongtoPlaylist(songsToBeAdded[i], createdPlaylistId);
        sleep(125)
    }
}


//post request to spotify api that takes in the spotifyid of the song and the playlist
function addSongtoPlaylist(song, playlist) {
    callApiJSON('POST', `https://api.spotify.com/v1/playlists/${playlist}/tracks?uris=spotify:track:${song}`, null, handleAddSongRequest)
}


//simple message to see if the song was added succesfully
function handleAddSongRequest() {
    console.log((this.responseText))
}


/**
 * Helper Section
 */

//URL used to make request to Spotify for access token
function buildBody(code, user) {
    let body = "grant_type=authorization_code" +
    "&code=" + code +
    "&redirect_uri=" + encodeURI(redirect_uri) +
    "&client_id=" + user.client_id +
    "&client_secret=" + user.client_secret;
    return body;
}


//takes the type of token(access/refresh) and puts them in storage to be used 
function setToken(token, tokenString) {
    if (token != undefined) {
        this.token = token;
        localStorage.setItem(tokenString, this.token);
}}

    


//a javascript sleep mimic to help with adding songs to playlist; if the songs are added too fast spotify will give an error
function sleep(milliseconds) {
    const date = Date.now();
    let currentDate = null;
    do {
      currentDate = Date.now();
    } while (currentDate - date < milliseconds);
}


//retrieves user id which is needed to make a new playlist
function getUserDetails() {
    json = callApi('GET', 'https://api.spotify.com/v1/me', null)
}
function handleUserResponse() {
    user_id = JSON.parse(this.responseText).id
    console.log(user_id)
}

//removes items from picklist in frontend
function removeItems(elementId){
    let node = document.getElementById(elementId);
    while (node.firstChild) {
        node.removeChild(node.firstChild);
    }
}
