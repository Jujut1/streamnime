// ============================================
// STREAMNIME - TERMUX EDITION
// Dengan Anime Scraper Terintegrasi
// ============================================

const express = require('express');
const cors = require('cors');
const path = require('path');
const os = require('os');
const animeScraper = require('./anime-scraper');

const app = express();
const PORT = 8010; // Port untuk Termux
const HOST = '0.0.0.0';

// ============================================
// MIDDLEWARE
// ============================================
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'frontend')));

// Logging
app.use((req, res, next) => {
    console.log(`[${new Date().toLocaleTimeString()}] ${req.method} ${req.url}`);
    next();
});

// ============================================
// HELPER FUNCTIONS
// ============================================

function getLocalIP() {
    const interfaces = os.networkInterfaces();
    for (const name in interfaces) {
        for (const iface of interfaces[name]) {
            if (iface.family === 'IPv4' && !iface.internal) {
                return iface.address;
            }
        }
    }
    return '127.0.0.1';
}

// ============================================
// API ENDPOINTS
// ============================================

// Status Termux
app.get('/api/status', (req, res) => {
    res.json({
        status: 'online',
        platform: 'Termux',
        version: '2.0.0',
        source: animeScraper.source,
        localIP: getLocalIP(),
        port: PORT,
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        timestamp: new Date().toISOString()
    });
});

// Search Anime
app.get('/api/search', async (req, res) => {
    try {
        const { q, source = 'otakudesu' } = req.query;
        
        if (!q) {
            return res.status(400).json({ 
                success: false, 
                error: 'Parameter q wajib diisi' 
            });
        }
        
        console.log(`[SEARCH] Mencari: ${q} dari ${source}`);
        animeScraper.setSource(source);
        const result = await animeScraper.searchAnime(q);
        res.json(result);
        
    } catch (error) {
        console.error('[SEARCH ERROR]', error.message);
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
});

// Ongoing Anime
app.get('/api/ongoing', async (req, res) => {
    try {
        const { page = 1, source = 'otakudesu' } = req.query;
        
        console.log(`[ONGOING] Page ${page} dari ${source}`);
        animeScraper.setSource(source);
        const result = await animeScraper.getOngoingAnime(parseInt(page));
        res.json(result);
        
    } catch (error) {
        console.error('[ONGOING ERROR]', error.message);
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
});

// Anime Detail
app.get('/api/anime', async (req, res) => {
    try {
        const { url } = req.query;
        
        if (!url) {
            return res.status(400).json({ 
                success: false, 
                error: 'Parameter url wajib diisi' 
            });
        }
        
        console.log(`[DETAIL] Mengambil detail dari: ${url.substring(0, 50)}...`);
        const result = await animeScraper.getAnimeDetail(url);
        res.json(result);
        
    } catch (error) {
        console.error('[DETAIL ERROR]', error.message);
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
});

// Episode Stream
app.get('/api/episode', async (req, res) => {
    try {
        const { url } = req.query;
        
        if (!url) {
            return res.status(400).json({ 
                success: false, 
                error: 'Parameter url wajib diisi' 
            });
        }
        
        console.log(`[EPISODE] Mengambil stream dari: ${url.substring(0, 50)}...`);
        const result = await animeScraper.getEpisodeStream(url);
        res.json(result);
        
    } catch (error) {
        console.error('[EPISODE ERROR]', error.message);
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
});

// Genres
app.get('/api/genres', async (req, res) => {
    try {
        const { source = 'otakudesu' } = req.query;
        
        console.log(`[GENRES] Mengambil genre dari ${source}`);
        animeScraper.setSource(source);
        const result = await animeScraper.getGenres();
        res.json(result);
        
    } catch (error) {
        console.error('[GENRES ERROR]', error.message);
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
});

// Ganti Source
app.post('/api/source', (req, res) => {
    try {
        const { source } = req.body;
        
        if (!source) {
            return res.status(400).json({ 
                success: false, 
                error: 'Parameter source wajib diisi' 
            });
        }
        
        const success = animeScraper.setSource(source);
        
        if (success) {
            res.json({ 
                success: true, 
                source, 
                message: `Source diganti ke ${source}` 
            });
        } else {
            res.status(400).json({ 
                success: false, 
                error: 'Source tidak valid' 
            });
        }
        
    } catch (error) {
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
});

// List Sources
app.get('/api/sources', (req, res) => {
    res.json({
        success: true,
        sources: animeScraper.getSources()
    });
});

// ============================================
// SERVE FRONTEND
// ============================================
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'frontend', 'index.html'));
});

// ============================================
// START SERVER
// ============================================
app.listen(PORT, HOST, () => {
    const localIP = getLocalIP();
    
    console.log('\x1b[36m%s\x1b[0m', '╔══════════════════════════════════════════════╗');
    console.log('\x1b[36m%s\x1b[0m', '║     📱 STREAMNIME - TERMUX EDITION          ║');
    console.log('\x1b[36m%s\x1b[0m', '╠══════════════════════════════════════════════╣');
    console.log('\x1b[32m%s\x1b[0m', '║  ✅ SERVER BERHASIL JALAN!                   ║');
    console.log('\x1b[36m%s\x1b[0m', '╠══════════════════════════════════════════════╣');
    console.log('\x1b[33m%s\x1b[0m', `║  📍 Localhost: http://localhost:${PORT}       `);
    console.log('\x1b[33m%s\x1b[0m', `║  📍 Network IP: http://${localIP}:${PORT}      `);
    console.log('\x1b[33m%s\x1b[0m', `║  🔧 Source: ${animeScraper.source}                `);
    console.log('\x1b[36m%s\x1b[0m', '╠══════════════════════════════════════════════╣');
    console.log('\x1b[0m%s\x1b[0m', '║  📡 API Endpoints:                            ║');
    console.log('\x1b[0m%s\x1b[0m', '║     • GET /api/status                        ║');
    console.log('\x1b[0m%s\x1b[0m', '║     • GET /api/search?q=naruto               ║');
    console.log('\x1b[0m%s\x1b[0m', '║     • GET /api/ongoing                       ║');
    console.log('\x1b[0m%s\x1b[0m', '║     • GET /api/genres                        ║');
    console.log('\x1b[0m%s\x1b[0m', '║     • GET /api/sources                       ║');
    console.log('\x1b[36m%s\x1b[0m', '╠══════════════════════════════════════════════╣');
    console.log('\x1b[31m%s\x1b[0m', '║  ⏹️  Stop: Ctrl+C                            ║');
    console.log('\x1b[36m%s\x1b[0m', '╚══════════════════════════════════════════════╝');
    console.log('\n📱 Buka di browser HP: \x1b[4m\x1b[34mhttp://' + localIP + ':' + PORT + '\x1b[0m\n');
});
