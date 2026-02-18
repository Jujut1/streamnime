// ============================================
// STREAMNIME - MAIN SERVER (PTERODACTYL READY)
// ============================================

const express = require('express');
const cors = require('cors');
const path = require('path');
const morgan = require('morgan');
const compression = require('compression');
const RateLimit = require('express-rate-limit');
const animeScraper = require('./anime-scraper');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000; // BACA DARI ENVIRONMENT PTERODACTYL
const HOST = '0.0.0.0'; // WAJIB untuk Pterodactyl

// ============================================
// MIDDLEWARE
// ============================================
app.use(compression()); // Kompres response biar cepat
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type']
}));
app.use(express.json());
app.use(morgan('combined')); // Logging

// Rate limiting - 100 request per 15 menit
const limiter = RateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: { error: "Terlalu banyak request, coba lagi nanti" }
});
app.use('/api/', limiter);

// Serve static files dari frontend
app.use(express.static(path.join(__dirname, 'frontend')));

// ============================================
// API ENDPOINTS
// ============================================

// Cek status server
app.get('/api/status', (req, res) => {
    res.json({
        status: 'online',
        server: 'StreamNime',
        version: '1.0.0',
        uptime: process.uptime(),
        timestamp: new Date().toISOString(),
        port: PORT,
        node: process.version
    });
});

// Search anime
app.get('/api/search', async (req, res) => {
    try {
        const { q, source = 'otakudesu' } = req.query;
        
        if (!q) {
            return res.status(400).json({ error: 'Parameter q wajib diisi' });
        }
        
        console.log(`[SEARCH] Query: ${q}, Source: ${source}`);
        animeScraper.setSource(source);
        const result = await animeScraper.searchAnime(q);
        
        res.json(result);
    } catch (error) {
        console.error('[SEARCH ERROR]', error.message);
        res.status(500).json({ 
            success: false, 
            error: 'Gagal mencari anime',
            details: error.message 
        });
    }
});

// Get ongoing anime
app.get('/api/ongoing', async (req, res) => {
    try {
        const { page = 1, source = 'otakudesu' } = req.query;
        
        console.log(`[ONGOING] Page: ${page}, Source: ${source}`);
        animeScraper.setSource(source);
        const result = await animeScraper.getOngoingAnime(parseInt(page));
        
        res.json(result);
    } catch (error) {
        console.error('[ONGOING ERROR]', error.message);
        res.status(500).json({ 
            success: false, 
            error: 'Gagal mengambil ongoing anime' 
        });
    }
});

// Get anime detail
app.get('/api/anime', async (req, res) => {
    try {
        const { url } = req.query;
        
        if (!url) {
            return res.status(400).json({ error: 'Parameter url wajib diisi' });
        }
        
        console.log(`[DETAIL] Anime URL: ${url.substring(0, 50)}...`);
        const result = await animeScraper.getAnimeDetail(url);
        
        res.json(result);
    } catch (error) {
        console.error('[DETAIL ERROR]', error.message);
        res.status(500).json({ 
            success: false, 
            error: 'Gagal mengambil detail anime' 
        });
    }
});

// Get episode stream
app.get('/api/episode', async (req, res) => {
    try {
        const { url } = req.query;
        
        if (!url) {
            return res.status(400).json({ error: 'Parameter url wajib diisi' });
        }
        
        console.log(`[EPISODE] Episode URL: ${url.substring(0, 50)}...`);
        const result = await animeScraper.getEpisodeStream(url);
        
        res.json(result);
    } catch (error) {
        console.error('[EPISODE ERROR]', error.message);
        res.status(500).json({ 
            success: false, 
            error: 'Gagal mengambil link streaming' 
        });
    }
});

// Get genres
app.get('/api/genres', async (req, res) => {
    try {
        const { source = 'otakudesu' } = req.query;
        
        console.log(`[GENRES] Source: ${source}`);
        animeScraper.setSource(source);
        const result = await animeScraper.getGenres();
        
        res.json(result);
    } catch (error) {
        console.error('[GENRES ERROR]', error.message);
        res.status(500).json({ 
            success: false, 
            error: 'Gagal mengambil genre' 
        });
    }
});

// Get anime by genre
app.get('/api/genre', async (req, res) => {
    try {
        const { url, page = 1 } = req.query;
        
        if (!url) {
            return res.status(400).json({ error: 'Parameter url wajib diisi' });
        }
        
        console.log(`[GENRE] URL: ${url.substring(0, 50)}..., Page: ${page}`);
        const result = await animeScraper.getAnimeByGenre(url, parseInt(page));
        
        res.json(result);
    } catch (error) {
        console.error('[GENRE ERROR]', error.message);
        res.status(500).json({ 
            success: false, 
            error: 'Gagal mengambil anime berdasarkan genre' 
        });
    }
});

// Change source
app.post('/api/source', (req, res) => {
    try {
        const { source } = req.body;
        
        if (!source) {
            return res.status(400).json({ error: 'Parameter source wajib diisi' });
        }
        
        const success = animeScraper.setSource(source);
        
        if (success) {
            res.json({ success: true, source, message: `Source changed to ${source}` });
        } else {
            res.status(400).json({ error: 'Source tidak valid' });
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ============================================
// FALLBACK: Semua route lain ke frontend
// ============================================
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'frontend', 'index.html'));
});

// ============================================
// ERROR HANDLER
// ============================================
app.use((err, req, res, next) => {
    console.error('[SERVER ERROR]', err.stack);
    res.status(500).json({ 
        success: false, 
        error: 'Internal server error',
        message: err.message 
    });
});

// ============================================
// START SERVER (PTERODACTYL COMPATIBLE)
// ============================================
app.listen(PORT, HOST, () => {
    console.log(`
╔══════════════════════════════════════════════════════════╗
║                                                          ║
║   🎬 STREAMNIME - READY FOR PTERODACTYL                 ║
║                                                          ║
║   📡 Server: http://${HOST}:${PORT}                         ║
║   📁 Frontend: /frontend                                 ║
║   🔧 Node Version: ${process.version}                       ║
║   ⏰ Started: ${new Date().toLocaleString('id-ID')}          ║
║                                                          ║
║   🚀 API Endpoints:                                      ║
║      • GET  /api/status                                  ║
║      • GET  /api/search?q=naruto                         ║
║      • GET  /api/ongoing                                  ║
║      • GET  /api/anime?url=...                            ║
║      • GET  /api/episode?url=...                          ║
║      • GET  /api/genres                                   ║
║                                                          ║
╚══════════════════════════════════════════════════════════╝
    `);
});

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('\n📴 Shutting down server...');
    process.exit();
});