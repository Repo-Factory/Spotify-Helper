const Pool = require('pg').Pool
const pool = new Pool({
  user: 'spotify',
  host: 'db',
  database: 'spotify',
  password: 'spotify',
  port: 5432,
})

/**
 * 
 * Queries file contains functions for CRUD operations on the postgreSQL database. The databasse name is spotify and it 
 * contains a playlists table and a song table. The song table is related to the playlist table with a foreign key 
 * integer 'playlist key 'that references the id of the associated playlist.
 */


const getPlaylists = (request, response) => {
pool.query('SELECT * FROM playlists ORDER BY id ASC', (error, results) => {
    if (error) {
    throw error
    }
    response.status(200).json(results.rows)
})
}

const getPlaylistById = (request, response) => {
    const id = parseInt(request.params.id)
    pool.query('SELECT * FROM playlists WHERE id = $1', [id], (error, results) => {
        if (error) {
        throw error
        }
        response.status(200).json(results.rows)
    })
    }


//all songs
const getSongs = (request, response) => {
    pool.query('SELECT * FROM songs ORDER BY id ASC', (error, results) => {
        if (error) {
        throw error
        }
        response.status(200).json(results.rows)
    })
    }

// all songs from one playlist
const getSongByPlaylistId = (request, response) => {
    const id = request.params.id.toString()
    pool.query('SELECT * FROM songs WHERE playlistkey = (SELECT id FROM playlists WHERE spotifyid = $1)', [id], (error, results) => {
        if (error) {
        throw error
        }
        response.status(200).json(results.rows)
    })
    }


const createPlaylist = (request, response) => {
    const [name, songs, spotifyId] = request.body
    pool.query('INSERT INTO playlists (name, songs, spotifyid) VALUES ($1, $2, $3) RETURNING *', [name, songs, spotifyId], (error, results) => {
        if (error) {
        throw error
        }
        response.status(201).send(`Playlists added with ID: ${results.rows[0].id}`)
    })
}


const createSong = (request, response) => {
    const [name, spotifyId, id] = request.body
    pool.query('INSERT INTO songs (name, spotifyid, playlistkey) VALUES ($1, $2, (SELECT id from playlists WHERE spotifyid=$3)) RETURNING *', [name, spotifyId, id], (error, results) => {
        if (error) {
        throw error
        }
        response.status(201).send(`Playlists added with ID: ${results.rows[0].id}`)
    })
}


const deletePlaylist = (request, response) => {
    const id = parseInt(request.params.id)
    pool.query('DELETE FROM playlists WHERE id = $1', [id], (error, results) => {
        if (error) {
        throw error
        }
        response.status(200).send(`Playlists deleted with ID: ${id}`)
    })
}


const deleteSong = (request, response) => {
    const id = parseInt(request.params.id)
    pool.query('DELETE FROM songs WHERE id = $1', [id], (error, results) => {
        if (error) {
        throw error
        }
        response.status(200).send(`Song deleted with ID: ${id}`)
    })
}


const deletePlaylists = (request, response) => {
    pool.query('DELETE FROM playlists', (error, results) => {
        if (error) {
        throw error
        }
        response.status(200).send(`Playlists deleted}`)
    })
}


const deleteSongs = (request, response) => {
    pool.query('DELETE FROM songs', (error, results) => {
        if (error) {
        throw error
        }
        response.status(200).send(`Songs deleted`)
    })
}


module.exports = {
    getPlaylists,
    getPlaylistById,
    getSongs,
    getSongByPlaylistId,
    createPlaylist,
    createSong,
    deletePlaylist,
    deleteSong,
    deletePlaylists,
    deleteSongs,
}