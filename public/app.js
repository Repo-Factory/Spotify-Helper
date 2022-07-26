var access_token = null;
var refresh_token = null;
var redirect_uri = 'http://172.26.50.242:5500';
var scope = 'playlist-read-private playlist-read-collaborative playlist-modify-public playlist-modify-private user-library-read';

const authUrl = 'https://accounts.spotify.com/authorize';
const tokenUrl = 'https://accounts.spotify.com/api/token';
const playlistUrl = 'https://api.spotify.com/v1/me/playlists?limit=50';

var client_id ='';
var client_secret ='';

var user_id = ''
var playlistIds = [];
var songsToBeAdded = [];


////////////////////////////////////////////////////////AUTHORIZE///////////////////////////////////////////////////////////


// executed on form submission, sends request to spotify authorize URL
function requestAuthorization() {
    getFormData(); // client id/secret from HTML form
    setStorage();
    sleep(300)
    url = buildUrl();
    window.location.href = url;
}


// executed on initial page load and redirect back to website, initial load won't call functions until authentication
//on the redirect, function will be called to populate postgres database with playlists and songs
function onPageLoad() {
    getStorage();
    if (window.location.search.length > 0) {
        handleRedirect();
    }
    else {
        access_token = localStorage.getItem("access_token");
        if (access_token == null) {
            document.getElementById("container").style.display = 'block';
        }
        else {
            getUserDetails();
            populatePlaylists();
            setTimeout(() => {populateSongs();}, 1000);
        }
    }
}


//cleans URL and requests access token
function handleRedirect() {
    let code = getCode(); // using URL paramter
    requestAccessToken(code);
    window.history.pushState('', '', redirect_uri);
}


//creates body for token request
function requestAccessToken(code) {
    body = buildBody(code)
    callAuthApi(body);
}


//makes request to spotify token API page
function callAuthApi(body) {
    let request = new XMLHttpRequest();
    request.open('POST', tokenUrl, true);
    request.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded')
    request.setRequestHeader('Authorization', 'Basic ' + btoa(client_id + ':' + client_secret)); 
    request.send(body);
    request.onload = handleAuthResponse;
}


//stores data from response
function handleAuthResponse() {
    if (this.status == 200) {
        var data = JSON.parse(this.responseText);
        console.log(data);
        setToken(data.access_token, 'access_token')
        setToken(data.refresh_token, 'refresh_token')
        onPageLoad();
    }
    else{
        console.log(this.responseText);
    }
}


//token times out after 3600 seconds, this reauthorizes with refresh token in local storage
function refreshAccessToken(){
    refresh_token = localStorage.getItem("refresh_token");
    let body = "grant_type=refresh_token" +
    "&refresh_token=" + refresh_token +
    "&client_id=" + client_id;
    callAuthApi(body);
}


//general API call function; all of the calls are similar in format
function callApi(method, url, body, callback) {
    let request = new XMLHttpRequest();
    request.open(method, url, true);
    request.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded')
    request.setRequestHeader('Authorization', 'Bearer ' + access_token); 
    request.send(body);
    request.onload = callback;
}


//general api call in JSON format for post requests to spotify to create playlists/songs
function callApiJSON(method, url, body, callback) {
    let request = new XMLHttpRequest();
    request.open(method, url, true);
    request.setRequestHeader('Accept', 'application/json')
    request.setRequestHeader('Content-Type', 'application/json')
    request.setRequestHeader('Authorization', 'Bearer ' + access_token); 
    request.send(body);
    request.onload = callback;
}


/////////////////////////////////////////////////////////PLAYLISTS////////////////////////////////////////////////////////


//get request to spotify to get playlists associated with the user, deletes songs in database first due to foreign key
//relation, can't delete playlists without deleting songs
function populatePlaylists() {
    fetch('http://localhost:5500/songs', {
            method: 'DELETE',
            body: null
        })
    callApi('GET', playlistUrl, null, handlePlaylistResponse);
}


//first deletes entries of the postgres playlist database to eliminate duplicates, then for each playlist performs desired
//actions 
function handlePlaylistResponse() {
    fetch('http://localhost:5500/playlists', {
        method: 'DELETE',
        body: null
    })
    if (this.status == 200) {
        var data = JSON.parse(this.responseText);
        console.log(data);
        data.items.forEach(item => commitPlaylist(item));
    }
    else if ( this.status == 401 ){
        refreshAccessToken()
    }
    else {
        console.log(this.responseText);
        alert(this.responseText);
    }
    console.log(playlistIds)
}


//puts playlists into pick list on HTML page
function addPlaylist(item) {
    let node = document.createElement("option");
    node.value = item.id;
    node.innerHTML = item.name + " ("+ item.tracks.total +")";
    document.getElementById("playlists").appendChild(node); 
}


//makes post request to postgres database with the playlist info to include title, number of tracks, and its id on spotify
function postPlaylist(item) {
    title = item.name
    tracks = item.tracks.total
    spotifyId = item.id
    const playlistDetails = {title, tracks, spotifyId};
    request = fetch('http://localhost:5500/playlists', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(Object.values(playlistDetails)),
        })
}
 

//puts playlists id into list to keep track of for later
function storePlaylistsId(item) {
    playlistId = item.id;
    playlistIds.push(playlistId);
}


//performs playlist data manipulation functions and called from callback in a loop
function commitPlaylist(item) {
    storePlaylistsId(item);
    addPlaylist(item);
    postPlaylist(item);
}


//////////////////////////////SONGS////////////////////////////////


//for each playlist, makes a get request to spotify api to get the songs of that playlist to be commited to postgres
//database in later functions
function populateSongs() {
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
        refreshAccessToken()
    }
    else {
        console.log(this.responseText);
        alert(this.responseText);
    }
}

//makes post request to the postgres database with the songname, spotifyid of the song, and the playlist id foreign key relation
function postSong(item, url) {
    songname = item.track.name
    songid = item.track.id
    id = url
    const songDetails = {songname, songid, id};
    request = fetch('http://localhost:5500/songs', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(Object.values(songDetails)),
        })
}


/////////////////////////////////////////////////////RECOMMENDATIONS//////////////////////////////////////////////////////


/////////PART 1/////////


//sets off a chain of getting songs from database and then getting recommended song
function addNewMusic() {
    for (let i=0; i < playlistIds.length;i++) {
        getPostgresSongs(playlistIds[i])
    }
}


//gets songs from one playlist from postgres database based on the playlistId
function getPostgresSongs(url) {
    let request = new XMLHttpRequest();
    request.open('GET', `http://localhost:5500/songs/byplaylist/${url}`, true);
    request.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded')
    request.send(null);
    request.onload = handlePostgres;
}


//creates a list of all the songs in the playlist seperated by commas, this is the format needed to pass into the 
//spotify API at the recommend songs endpoint, then calls function to get recommendations 
function handlePostgres() {
    randomSongStrings = ''
    var data = JSON.parse(this.responseText);
    data.forEach(item => randomSongStrings += (item.spotifyid + ','))
    randomSongStrings = randomSongStrings.slice(0, -1)
    getRecommendations(randomSongStrings)
}


//get request to recommendations endpoint of spotify API, passed in url made from handlePostres function
function getRecommendations(url) {
    callApi('GET', `https://api.spotify.com/v1/recommendations?seed_tracks=${url}`, null, handleRecommendationsResponse)
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


//////////////Part 2////////////////


//post request to spotify api to make playlist in account; note that user_id is different from client_id for authorization
//to get user_id make get request to 'https://api.spotify.com/v1/me' 
function createPlaylist() {
    user_id = 'conner.sommerfield'
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


/////////////////////////HELPERS////////////////////////////////


//
function getFormData() {
    client_id = document.getElementById('clientId').value;
    client_secret = document.getElementById('clientSecret').value;
}

function setStorage() {
    localStorage.setItem('client_id', client_id);
    localStorage.setItem('client_secret', client_secret);
    localStorage.setItem('redirect_uri', redirect_uri);
}

function getStorage() {
    client_id = localStorage.getItem("client_id");
    client_secret = localStorage.getItem("client_secret");
}


function buildUrl() {
    let url = authUrl +
    '?client_id=' + client_id +
    '&response_type=code' +
    '&redirect_uri=' + encodeURI(redirect_uri) +
    '&show_dialog=true' +
    '&scope=' + scope;
    return url
}


function buildBody(code) {
    let body = "grant_type=authorization_code" +
    "&code=" + code +
    "&redirect_uri=" + encodeURI(redirect_uri) +
    "&client_id=" + client_id +
    "&client_secret=" + client_secret;
    return body;
}


function setToken(token, tokenString) {
    if (token != undefined) {
        this.token = token;
        localStorage.setItem(tokenString, this.token);
}}

    
function getCode() {
    let code = null;
    const queryString = window.location.search;
    if( queryString.length > 0) {
        const urlParams = new URLSearchParams(queryString);
        code = urlParams.get('code')
    }
    return code;
}


function sleep(milliseconds) {
    const date = Date.now();
    let currentDate = null;
    do {
      currentDate = Date.now();
    } while (currentDate - date < milliseconds);
}


function getUserDetails() {
    callApi('GET', 'https://api.spotify.com/v1/me', null, handleUserResponse)
}

function handleUserResponse() {
    user_id = JSON.parse(this.responseText).id
    console.log(user_id)
}
