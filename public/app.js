var client_id = 'b6d3067e6472428abf71eb27213a2ca4';
var client_secret = 'cf7ebd54374644ce9591f3675277ff2e';
var redirect_uri = 'http://172.26.50.242:5500';
var scope = 'playlist-read-private playlist-read-collaborative playlist-modify-public playlist-modify-private user-library-read';
var access_token = null;
var refresh_token = null;

const authUrl = 'https://accounts.spotify.com/authorize';
const tokenUrl = 'https://accounts.spotify.com/api/token';
const playlistUrl = 'https://api.spotify.com/v1/me/playlists?limit=50';
const tracksUrl = 'https://api.spotify.com/v1/playlists/{playlist_id}/tracks';


var playlistIds = [];
var songsToBeAdded = []


///////////////////////AUTHORIZE///////////////////////////

// executed on form submission, sends request to spotify authorize URL
function requestAuthorization() {
    getFormData(); // client id/secret from HTML form
    setStorage();
    url = buildUrl();
    window.location.href = url;
}


// executed on redirect back to website 
function onPageLoad() {
    setStorage(); // resets after redirect since storage will be dumped
    if (window.location.search.length > 0) {
        handleRedirect();
    }
    else {
        access_token = localStorage.getItem("access_token");
        if ( access_token == null ) {
            document.getElementById("container").style.display = 'block';
        }
        else {
                fetch('http://localhost:5500/songs', {
                method: 'DELETE',
                })
                getPlaylists();
                //setTimeout(() => {testPopulate();}, 8000);
                setTimeout(() => {populateSongs();}, 4000);
        }
       
    }
}


//function testPopulate() {
   // songname = 'fuck me babe'
   // songid = 'dfgherty'
   // const playlistDetails = {songname, songid};
   // request = fetch ('http://localhost:5500/songs/id?id=6PWSEAWhrOnaXBDd5zAUQ8', {
    //    method: 'POST',
    //    headers: {'Content-Type': 'application/json'},
    //    body: JSON.stringify(Object.values(playlistDetails)),
    //    })
  //  console.log(JSON.stringify(Object.values(playlistDetails)))
//}

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


//token times out after 3600 seconds, this reauthorizes with refresh token in local storage
function refreshAccessToken(){
    refresh_token = localStorage.getItem("refresh-token");
    let body = "grant_type=refresh_token" +
    "&refresh_token=" + refresh_token +
    "&client_id=" + client_id;
    callAuthorizationApi(body);
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
        var data = JSON.parse(this.responseText);
        if ( data.access_token != undefined ){
            access_token = data.access_token;
            localStorage.setItem("access_token", access_token);
        }
        if ( data.refresh_token  != undefined ){
            refresh_token = data.refresh_token;
            localStorage.setItem("refresh_token", refresh_token);
        }
        onPageLoad();
    }
    else{
        console.log(this.responseText);
    }
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

function callApiJSON(method, url, body, callback) {
    let request = new XMLHttpRequest();
    request.open(method, url, true);
    request.setRequestHeader('Accept', 'application/json')
    request.setRequestHeader('Content-Type', 'application/json')
    request.setRequestHeader('Authorization', 'Bearer ' + access_token); 
    request.send(body);
    request.onload = callback;
}

////////////////////RECOMMENDATIONS///////////////

function getRecommendations(url) {
    callApi('GET', `https://api.spotify.com/v1/recommendations?seed_tracks=${url}`, null, handleRecommendationsResponse)
}


function getUserDetails() {
    callApi('GET', 'https://api.spotify.com/v1/me', null, handleUserResponse)
}

function handleUserResponse() {
    console.log(this.responseText)
}


//get postgres data
//choose postgres data where playlistid = 
//make request to recommendations with 5 songs
//pick random song from response
//

function createPlaylist() {
    user_id = 'conner.sommerfield'
    body = {
            "name": "Discover Music",
            "description": "Automatically generated playlist for new music",
            "public": false
           }
    callApiJSON('POST', `https://api.spotify.com/v1/users/${user_id}/playlists`, JSON.stringify(body), handleCreatePlaylistResponse)
}

var createdPlaylistId = ''

function handleCreatePlaylistResponse() {
    createdPlaylistId = JSON.parse(this.responseText).id
    for (let i =0; i < songsToBeAdded.length; i++){
        addSongtoPlaylist(songsToBeAdded[i])
    }
   

}

function addSongtoPlaylist(song) {
    callApiJSON('POST', `https://api.spotify.com/v1/playlists/${createdPlaylistId}/tracks?uris=spotify:track:${song}`, null, handleCreateSongRequest)
}

function handleCreateSongRequest() {
    console.log((this.responseText))
}

function addNewMusic() {
    for (let i=0; i < playlistIds.length;i++) {
        postgresTest(playlistIds[i])
    }
}

function postgresTest(url) {
    let request = new XMLHttpRequest();
    request.open('GET', `http://localhost:5500/songs/byplaylist/${url}`, true);
    request.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded')
    request.send(null);
    request.onload = handlePostgres;
    request.onload
}

function handlePostgres(){
    randomSongStrings = ''
    var data = JSON.parse(this.responseText);
    console.log(data);
    data.forEach(item => randomSongStrings += (item.spotifyid + ','))
    randomSongStrings = randomSongStrings.slice(0, -1)
    console.log(randomSongStrings)
    getRecommendations(randomSongStrings)
}
   


function handlegetSongDetails() {
    if (this.status == 200) {
        var data = JSON.parse(this.responseText);
        console.log(data);
    }
}

function randomNumberBetweenZeroAnd(number) {
    randomNumber = Math.floor(Math.random() * (number + 1))
    return randomNumber
}

function handleRecommendationsResponse() {
    if (this.status == 200) {
        var data = JSON.parse(this.responseText);
        console.log(data);
        console.log(data.tracks[randomNumberBetweenZeroAnd(4)].id)
        songsToBeAdded.push(data.tracks[randomNumberBetweenZeroAnd(4)].id)
    }
}
///////////////////////////////PLAYLISTS/////////////////////////////////////


function getPlaylists() {
    callApi('GET', playlistUrl, null, handlePlaylistResponse);
}


function handlePlaylistResponse() {
    
    fetch('http://localhost:5500/playlists', {
        method: 'DELETE',
        })
    if (this.status == 200) {
        var data = JSON.parse(this.responseText);
        console.log(data);
        data.items.forEach(item => doPlaylist(item));
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


function addPlaylist(item) {
    let node = document.createElement("option");
    node.value = item.id;
    node.innerHTML = item.name + " ("+ item.tracks.total +")";
    document.getElementById("playlists").appendChild(node); 
}

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
    console.log(JSON.stringify(Object.values(playlistDetails)))
}
 

function storePlaylistsId(item) {
    playlistId = item.id;
    playlistIds.push(playlistId);
}



function doPlaylist(item) {
    console.log(item);
    storePlaylistsId(item);
    addPlaylist(item);
    postPlaylist(item);
}


//////////////////////////////SONGS////////////////////////////////



function populateSongs() {
    for (i=0; i < playlistIds.length; i++) {
        callApi('GET', `https://api.spotify.com/v1/playlists/${playlistIds[i]}/tracks?limit=5`, null, handleSongResponse);
    }
}


function handleSongResponse() {
    console.log(this);
    var url = this.responseURL;
    url = url.split('playlists/');
    url = url[1].split('/');
    url = url[0];
    console.log(url)

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


function postSong(item, url) {
    console.log(item)
    songname = item.track.name
    songid = item.track.id
    id = url
    const playlistDetails = {songname, songid, id};
    request = fetch('http://localhost:5500/songs', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(Object.values(playlistDetails)),
        })
    console.log(JSON.stringify(Object.values(playlistDetails)))
}


/////////////////////////HELPERS////////////////////////////////
function getFormData() {
    client_id = document.getElementById('clientId').value;
    client_secret = document.getElementById('clientSecret').value;
}


function setStorage() {
    localStorage.setItem('client_id', client_id);
    localStorage.setItem('client_secret', client_secret);
    localStorage.setItem('redirect_uri', redirect_uri);
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


function setToken(type, typestring) {
    if (type != undefined) {
        token = type;
        localStorage.setItem(typestring, token);
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



