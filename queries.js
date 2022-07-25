const Pool = require('pg').Pool
const pool = new Pool({
  user: 'spotify',
  host: 'localhost',
  database: 'spotify',
  password: '0o0o0o0o)O)O)O)O',
  port: 5432,
})


const getPlaylists = (request, response) => {
pool.query('SELECT * FROM playlists ORDER BY id ASC', (error, results) => {
    if (error) {
    throw error
    }
    response.status(200).json(results.rows)
})
}

const getSongs = (request, response) => {
    pool.query('SELECT * FROM songs ORDER BY id ASC', (error, results) => {
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

const updatePlaylist = (request, response) => {
const id = parseInt(request.params.id)
const { name, songs } = request.body


pool.query(
    'UPDATE playlist SET name = $1, songs = $2 WHERE id = $3',
    [name, songs, id],
    (error, results) => {
    if (error) {
        throw error
    }
    response.status(200).send(`Playlists modified with ID: ${id}`)
    }
)
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

const deletePlaylists = (request, response) => {
    
    pool.query('DELETE FROM playlists')
        if (error) {
        throw error
        }
        response.status(200).send(`Playlists deleted with ID: ${id}`)
    }

    const deleteSongs = (request, response) => {
    
        pool.query('DELETE FROM songs')
            if (error) {
            throw error
            }
            response.status(200).send(`Playlists deleted with ID: ${id}`)
        }

module.exports = {
    getPlaylists,
    getSongs,
    getPlaylistById,
    createPlaylist,
    createSong,
    updatePlaylist,
    deletePlaylist,
    deletePlaylists,
    deleteSongs,
}