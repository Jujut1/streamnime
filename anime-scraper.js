// ============================================
// ANIME SCRAPER - TERMUX EDITION
// Optimized untuk Android / Termux
// ============================================

const axios = require('axios');
const cheerio = require('cheerio');

// ============================================
// KONFIGURASI SUMBER
// ============================================
const SOURCES = {
    otakudesu: {
        name: 'OtakuDesu',
        baseUrl: 'https://otakudesu.lol',
        endpoints: {
            search: '/?s={query}&post_type=anime',
            ongoing: '/ongoing-anime/page/{page}/',
            anime: '/anime/{slug}/',
            episode: '/episode/{slug}/',
            genre: '/genre-list/'
        }
    },
    samehadaku: {
        name: 'Samehadaku',
        baseUrl: 'https://samehadaku.email',
        endpoints: {
            search: '/?s={query}',
            ongoing: '/ongoing-anime/page/{page}/',
            anime: '/anime/{slug}/',
            episode: '/{slug}/',
            genre: '/genre-list/'
        }
    },
    anoboy: {
        name: 'Anoboy',
        baseUrl: 'https://anoboy.ch',
        endpoints: {
            search: '/?s={query}',
            ongoing: '/page/{page}/',
            anime: '/anime/{slug}/',
            episode: '/episode/{slug}/',
            genre: '/genre/'
        }
    }
};

// ============================================
// USER AGENTS (Mobile Focus)
// ============================================
const USER_AGENTS = [
    'Mozilla/5.0 (Linux; Android 14; SM-S918B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 13; Xiaomi 13 Pro) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36',
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Mobile/15E148 Safari/604.1',
    'Mozilla/5.0 (Linux; Android 12; SM-G998B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36'
];

// ============================================
// CACHE SEDERHANA (untuk Termux)
// ============================================
const cache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 menit

class AnimeScraper {
    constructor() {
        this.source = 'otakudesu';
        this.timeout = 8000; // Timeout lebih pendek untuk mobile
    }

    // ============================================
    // HELPER FUNCTIONS
    // ============================================
    
    _getUserAgent() {
        return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
    }

    _cleanText(text) {
        if (!text) return '';
        return text.replace(/\s+/g, ' ').trim();
    }

    _extractNumber(text) {
        if (!text) return null;
        const match = text.match(/\d+/);
        return match ? parseInt(match[0]) : null;
    }

    // ============================================
    // REQUEST DENGAN TIMEOUT
    // ============================================
    
    async _request(url) {
        // Cek cache dulu
        if (cache.has(url)) {
            const { data, timestamp } = cache.get(url);
            if (Date.now() - timestamp < CACHE_TTL) {
                console.log(`[CACHE] Using cached: ${url.substring(0, 50)}...`);
                return data;
            }
            cache.delete(url);
        }

        try {
            console.log(`[REQUEST] Fetching: ${url.substring(0, 60)}...`);
            
            const response = await axios({
                method: 'get',
                url: url,
                timeout: this.timeout,
                headers: {
                    'User-Agent': this._getUserAgent(),
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                    'Accept-Language': 'id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7',
                    'Referer': 'https://www.google.com/',
                    'Connection': 'keep-alive'
                }
            });

            // Simpan ke cache
            cache.set(url, {
                data: response.data,
                timestamp: Date.now()
            });

            return response.data;
            
        } catch (error) {
            console.log(`[ERROR] ${error.message}`);
            throw error;
        }
    }

    // ============================================
    // SEARCH ANIME
    // ============================================
    
    async searchAnime(query) {
        try {
            const source = SOURCES[this.source];
            const searchUrl = source.baseUrl + source.endpoints.search.replace('{query}', encodeURIComponent(query));
            
            const html = await this._request(searchUrl);
            const $ = cheerio.load(html);
            const results = [];

            // Selector untuk berbagai sumber
            $('.venz, article, .listupd article, .animpost').each((i, el) => {
                const title = $(el).find('h2 a, .entry-title a, .title a').first().text().trim();
                const link = $(el).find('a').first().attr('href');
                const thumb = $(el).find('img').first().attr('src') || 
                             $(el).find('img').first().attr('data-src');
                
                const epText = $(el).find('.ep, .episode, .luf').text().trim();
                const episode = this._extractNumber(epText) || '?';
                
                const rating = $(el).find('.rating, .score, .numscore').text().trim() || '0';
                const status = $(el).find('.status, .type').first().text().trim() || 'Unknown';

                if (title && link) {
                    results.push({
                        title: this._cleanText(title),
                        link: link.startsWith('http') ? link : source.baseUrl + link,
                        thumb: thumb || 'https://via.placeholder.com/200x300?text=No+Image',
                        episode: episode.toString(),
                        rating: rating,
                        status: status,
                        source: this.source
                    });
                }
            });

            return {
                success: true,
                query,
                total: results.length,
                results: results.slice(0, 15) // Max 15 hasil
            };
            
        } catch (error) {
            return {
                success: false,
                error: error.message,
                results: []
            };
        }
    }

    // ============================================
    // ONGOING ANIME
    // ============================================
    
    async getOngoingAnime(page = 1) {
        try {
            const source = SOURCES[this.source];
            const url = source.baseUrl + source.endpoints.ongoing.replace('{page}', page);
            
            const html = await this._request(url);
            const $ = cheerio.load(html);
            const results = [];

            $('.detpost, article, .listupd article').each((i, el) => {
                const title = $(el).find('h2 a, .entry-title a, .title a').first().text().trim();
                const link = $(el).find('a').first().attr('href');
                const thumb = $(el).find('img').first().attr('src') || 
                             $(el).find('img').first().attr('data-src');
                
                const epText = $(el).find('.ep, .episode, .luf').text().trim();
                const episode = this._extractNumber(epText) || '?';
                
                const day = $(el).find('.day, .daytime').text().trim() || 'Unknown';
                const time = $(el).find('.time, .jam').text().trim() || '??:??';

                if (title && link) {
                    results.push({
                        title: this._cleanText(title),
                        link: link.startsWith('http') ? link : source.baseUrl + link,
                        thumb: thumb || 'https://via.placeholder.com/200x300?text=Ongoing',
                        episode: episode.toString(),
                        day: day,
                        time: time,
                        status: 'Ongoing',
                        source: this.source
                    });
                }
            });

            return {
                success: true,
                page,
                total: results.length,
                results: results.slice(0, 20)
            };
            
        } catch (error) {
            return {
                success: false,
                error: error.message,
                results: []
            };
        }
    }

    // ============================================
    // ANIME DETAIL
    // ============================================
    
    async getAnimeDetail(animeUrl) {
        try {
            const html = await this._request(animeUrl);
            const $ = cheerio.load(html);
            
            const title = $('h1, .entry-title, .post-title').first().text().trim() || 'Unknown';
            
            let synopsis = '';
            $('.sinopsis, .desc, .entry-content p').each((i, el) => {
                const text = $(el).text().trim();
                if (text.length > 50) {
                    synopsis = this._cleanText(text);
                    return false;
                }
            });

            const metadata = {};
            $('.info p, .spe p, .data-single tr').each((i, el) => {
                const text = $(el).text().trim();
                const parts = text.split(':');
                if (parts.length > 1) {
                    const key = parts[0].trim().replace(/[^\w\s]/g, '');
                    const value = parts.slice(1).join(':').trim();
                    if (key && value) metadata[key] = this._cleanText(value);
                }
            });

            const episodes = [];
            $('.episodelist li a, .list-episode li a').each((i, el) => {
                const epLink = $(el).attr('href');
                const epText = $(el).text().trim();
                
                if (epLink && epText) {
                    const epNumber = this._extractNumber(epText) || episodes.length + 1;
                    episodes.push({
                        number: epNumber,
                        title: this._cleanText(epText.substring(0, 40)),
                        link: epLink.startsWith('http') ? epLink : new URL(epLink, animeUrl).href,
                        date: 'Unknown'
                    });
                }
            });

            episodes.sort((a, b) => b.number - a.number);

            return {
                success: true,
                title: this._cleanText(title),
                synopsis: synopsis || 'Sinopsis tidak tersedia',
                metadata,
                totalEpisodes: episodes.length,
                episodes: episodes.slice(0, 30)
            };
            
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }

    // ============================================
    // EPISODE STREAM
    // ============================================
    
    async getEpisodeStream(episodeUrl) {
        try {
            const html = await this._request(episodeUrl);
            const $ = cheerio.load(html);
            
            const streams = [];
            const downloads = [];

            // Cari iframe
            $('iframe').each((i, el) => {
                const src = $(el).attr('src');
                if (src && src.length > 5) {
                    streams.push({
                        type: 'iframe',
                        url: src,
                        server: 'Player',
                        quality: 'HD'
                    });
                }
            });

            // Cari link download
            $('.download a, .downloadlink a').each((i, el) => {
                const link = $(el).attr('href');
                const text = $(el).text().trim();
                if (link && text && link !== '#') {
                    downloads.push({
                        server: this._cleanText(text).substring(0, 30),
                        url: link,
                        quality: 'SD'
                    });
                }
            });

            return {
                success: true,
                streams: streams.slice(0, 5),
                downloads: downloads.slice(0, 10)
            };
            
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }

    // ============================================
    // GET GENRES
    // ============================================
    
    async getGenres() {
        try {
            const source = SOURCES[this.source];
            const url = source.baseUrl + source.endpoints.genre;
            
            const html = await this._request(url);
            const $ = cheerio.load(html);
            const genres = [];

            $('.genres a, .genre-list a').each((i, el) => {
                const name = $(el).text().trim();
                const link = $(el).attr('href');
                
                if (name && link && name.length < 30) {
                    genres.push({
                        name: this._cleanText(name),
                        link: link.startsWith('http') ? link : source.baseUrl + link,
                        count: Math.floor(Math.random() * 50) + 10 // Random count
                    });
                }
            });

            return {
                success: true,
                total: genres.length,
                genres: genres.slice(0, 30)
            };
            
        } catch (error) {
            return {
                success: false,
                error: error.message,
                genres: []
            };
        }
    }

    // ============================================
    // CHANGE SOURCE
    // ============================================
    
    setSource(source) {
        if (SOURCES[source]) {
            this.source = source;
            return true;
        }
        return false;
    }

    // ============================================
    // GET SOURCES
    // ============================================
    
    getSources() {
        return Object.keys(SOURCES).map(key => ({
            id: key,
            name: SOURCES[key].name
        }));
    }

    // ============================================
    // CLEAR CACHE
    // ============================================
    
    clearCache() {
        cache.clear();
        console.log('[CACHE] Cleared');
    }
}

module.exports = new AnimeScraper();        name: 'Samehadaku',
        baseUrl: 'https://samehadaku.email',
        endpoints: {
            search: '/?s={query}',
            ongoing: '/ongoing-anime/page/{page}/',
            anime: '/anime/{slug}/',
            episode: '/{slug}/',
            genre: '/genre-list/',
            genrePage: '/genres/{genre}/page/{page}/'
        },
        selectors: {
            search: '.animpost, article, .post-box',
            ongoing: '.animpost, .post-box',
            animeDetail: '.info, .spe, .data-single',
            episodeList: '.episodelist, .list-episode',
            episodeItem: 'li, tr',
            genreList: '.genres a, .genre-links a'
        }
    },
    
    // Anoboy - Backup Source
    anoboy: {
        name: 'Anoboy',
        baseUrl: 'https://anoboy.ch',
        endpoints: {
            search: '/?s={query}',
            ongoing: '/page/{page}/',
            anime: '/anime/{slug}/',
            episode: '/episode/{slug}/',
            genre: '/genre/',
            genrePage: '/genre/{genre}/page/{page}/'
        },
        selectors: {
            search: 'article, .listupd article',
            ongoing: 'article, .listupd article',
            animeDetail: '.infox, .spe, .data-single',
            episodeList: '.episodelist, .list-episode',
            episodeItem: 'li, a[href*="episode"]',
            genreList: '.genres a, .genre-links a'
        }
    },
    
    // Kusonime - Source Tambahan
    kusonime: {
        name: 'Kusonime',
        baseUrl: 'https://kusonime.com',
        endpoints: {
            search: '/?s={query}',
            ongoing: '/ongoing-anime/page/{page}/',
            anime: '/anime/{slug}/',
            episode: '/episode/{slug}/',
            genre: '/genre-list/',
            genrePage: '/genres/{genre}/page/{page}/'
        },
        selectors: {
            search: '.kover, article, .listupd article',
            ongoing: '.kover, article',
            animeDetail: '.info, .spe, .data-single',
            episodeList: '.episodelist, .list-episode',
            episodeItem: 'li, a[href*="episode"]',
            genreList: '.genres a, .genre-links a'
        }
    }
};

// ============================================
// USER AGENTS ROTATION
// ============================================
const USER_AGENTS = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Safari/605.1.15',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Mobile/15E148 Safari/604.1',
    'Mozilla/5.0 (iPad; CPU OS 17_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Mobile/15E148 Safari/604.1',
    'Mozilla/5.0 (Linux; Android 14; SM-S918B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36'
];

// ============================================
// CACHE SYSTEM
// ============================================
const cache = new Map();
const CACHE_TTL = 10 * 60 * 1000; // 10 menit

class AnimeScraper {
    constructor() {
        this.source = 'otakudesu';
        this.timeout = 15000;
        this.retries = 3;
        this.retryDelay = 2000;
    }

    // ============================================
    // HELPER FUNCTIONS
    // ============================================
    
    _getUserAgent() {
        return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
    }

    _getCacheKey(url, params = {}) {
        return `${this.source}_${url}_${JSON.stringify(params)}`;
    }

    _getFromCache(key) {
        if (cache.has(key)) {
            const { data, timestamp } = cache.get(key);
            if (Date.now() - timestamp < CACHE_TTL) {
                console.log(`[CACHE] Hit: ${key.substring(0, 50)}...`);
                return data;
            }
            cache.delete(key);
        }
        return null;
    }

    _setCache(key, data) {
        cache.set(key, {
            data,
            timestamp: Date.now()
        });
        // Cleanup cache jika terlalu besar
        if (cache.size > 100) {
            const oldestKey = [...cache.entries()].sort((a, b) => a[1].timestamp - b[1].timestamp)[0][0];
            cache.delete(oldestKey);
        }
    }

    _cleanText(text) {
        if (!text) return '';
        return text
            .replace(/\s+/g, ' ')
            .replace(/[^\w\s\-.,!?()\/@&:]/g, '')
            .trim();
    }

    _extractNumber(text) {
        if (!text) return null;
        const match = text.match(/\d+/);
        return match ? parseInt(match[0]) : null;
    }

    _extractEpisodeNumber(text) {
        if (!text) return null;
        // Cari pola episode number (Eps, Episode, Ep, #)
        const patterns = [
            /(?:episode|eps|ep|e)\s*(\d+)/i,
            /#(\d+)/,
            /(\d+)\s*(?:episode|eps|ep)/i,
            /\[(\d+)\]/,
            /\((\d+)\)/
        ];
        
        for (const pattern of patterns) {
            const match = text.match(pattern);
            if (match) return parseInt(match[1]);
        }
        
        // Fallback: ambil angka pertama
        const numbers = text.match(/\d+/g);
        return numbers ? parseInt(numbers[0]) : null;
    }

    // ============================================
    // REQUEST WITH RETRY
    // ============================================
    
    async _request(url, options = {}) {
        const cacheKey = this._getCacheKey(url, options);
        const cached = this._getFromCache(cacheKey);
        if (cached) return cached;

        let lastError;
        for (let i = 0; i < this.retries; i++) {
            try {
                console.log(`[REQUEST] Attempt ${i + 1}/${this.retries}: ${url.substring(0, 100)}...`);
                
                const response = await axios({
                    method: 'get',
                    url: url,
                    timeout: this.timeout,
                    headers: {
                        'User-Agent': this._getUserAgent(),
                        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                        'Accept-Language': 'id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7',
                        'Referer': 'https://www.google.com/',
                        'DNT': '1',
                        'Connection': 'keep-alive',
                        'Upgrade-Insecure-Requests': '1',
                        'Cache-Control': 'no-cache',
                        'Pragma': 'no-cache',
                        ...options.headers
                    },
                    maxRedirects: 5,
                    validateStatus: status => status < 500,
                    ...options
                });

                if (response.status === 200) {
                    this._setCache(cacheKey, response.data);
                    return response.data;
                } else if (response.status === 404) {
                    throw new Error('Page not found (404)');
                } else if (response.status === 403) {
                    throw new Error('Access forbidden (403)');
                } else {
                    console.log(`[WARNING] Status ${response.status} for ${url}`);
                    if (i === this.retries - 1) {
                        throw new Error(`HTTP ${response.status}`);
                    }
                }
            } catch (error) {
                lastError = error;
                console.log(`[ERROR] Attempt ${i + 1} failed: ${error.message}`);
                
                if (i < this.retries - 1) {
                    const delay = this.retryDelay * (i + 1);
                    console.log(`[RETRY] Waiting ${delay}ms...`);
                    await new Promise(resolve => setTimeout(resolve, delay));
                }
            }
        }
        
        throw lastError || new Error('Request failed after retries');
    }

    // ============================================
    // SEARCH ANIME
    // ============================================
    
    async searchAnime(query) {
        try {
            const source = SOURCES[this.source];
            const searchUrl = source.baseUrl + source.endpoints.search.replace('{query}', encodeURIComponent(query));
            
            console.log(`[SEARCH] URL: ${searchUrl}`);
            const html = await this._request(searchUrl);
            const $ = cheerio.load(html);
            const results = [];

            // Coba beberapa selector
            const selectors = source.selectors.search.split(', ');
            let found = false;
            
            for (const selector of selectors) {
                const elements = $(selector);
                if (elements.length > 0) {
                    elements.each((i, el) => {
                        if (results.length >= 20) return false; // Max 20 results
                        
                        const title = this._cleanText(
                            $(el).find('h2 a, .entry-title a, .title a, .jdl a').first().text() || 
                            $(el).attr('title') || 
                            $(el).find('a').first().attr('title')
                        );
                        
                        const link = $(el).find('a').first().attr('href');
                        const thumb = $(el).find('img').first().attr('src') || 
                                     $(el).find('img').first().attr('data-src') ||
                                     $(el).find('img').first().attr('data-lazy-src');
                        
                        // Extract episode
                        let episode = '?';
                        const epText = $(el).find('.ep, .episode, .luf, .epz').text().trim();
                        if (epText) {
                            const epNum = this._extractEpisodeNumber(epText);
                            if (epNum) episode = epNum.toString();
                        }
                        
                        // Extract rating
                        let rating = '0';
                        const ratingText = $(el).find('.rating, .score, .numscore, .rt').text().trim();
                        if (ratingText) {
                            const ratingMatch = ratingText.match(/\d+(?:\.\d+)?/);
                            if (ratingMatch) rating = ratingMatch[0];
                        }
                        
                        // Extract status
                        let status = $(el).find('.status, .type, .zt, .typez').first().text().trim() || 'Unknown';
                        
                        if (title && link && title.length > 2) {
                            results.push({
                                title: title,
                                link: link.startsWith('http') ? link : source.baseUrl + link,
                                thumb: thumb || 'https://via.placeholder.com/200x300?text=No+Image',
                                episode: episode,
                                rating: rating,
                                status: status,
                                source: this.source
                            });
                        }
                    });
                    if (results.length > 0) {
                        found = true;
                        break;
                    }
                }
            }

            // Jika masih kosong, coba ambil dari semua link
            if (!found || results.length === 0) {
                $('a[href*="anime"], a[href*="episode"]').each((i, el) => {
                    if (results.length >= 20) return false;
                    
                    const title = $(el).text().trim();
                    const link = $(el).attr('href');
                    
                    if (title && link && title.length > 5 && title.length < 100) {
                        results.push({
                            title: this._cleanText(title),
                            link: link.startsWith('http') ? link : source.baseUrl + link,
                            thumb: 'https://via.placeholder.com/200x300?text=Anime',
                            episode: '?',
                            rating: '0',
                            status: 'Unknown',
                            source: this.source
                        });
                    }
                });
            }

            // Filter unique results
            const unique = [];
            const seen = new Set();
            for (const item of results) {
                if (!seen.has(item.link)) {
                    seen.add(item.link);
                    unique.push(item);
                }
            }

            console.log(`[SEARCH] Found ${unique.length} results for "${query}"`);
            
            return {
                success: true,
                query,
                total: unique.length,
                results: unique
            };
            
        } catch (error) {
            console.error('[SEARCH ERROR]', error.message);
            return {
                success: false,
                error: error.message,
                results: []
            };
        }
    }

    // ============================================
    // GET ONGOING ANIME
    // ============================================
    
    async getOngoingAnime(page = 1) {
        try {
            const source = SOURCES[this.source];
            const url = source.baseUrl + source.endpoints.ongoing.replace('{page}', page);
            
            console.log(`[ONGOING] URL: ${url}`);
            const html = await this._request(url);
            const $ = cheerio.load(html);
            const results = [];

            // Coba selector yang mungkin
            const selectors = source.selectors.ongoing.split(', ');
            
            for (const selector of selectors) {
                const elements = $(selector);
                if (elements.length > 0) {
                    elements.each((i, el) => {
                        if (results.length >= 30) return false;
                        
                        const title = this._cleanText(
                            $(el).find('h2 a, .entry-title a, .title a, .jdl a').first().text() ||
                            $(el).find('a[rel="bookmark"]').first().text()
                        );
                        
                        const link = $(el).find('a').first().attr('href');
                        const thumb = $(el).find('img').first().attr('src') ||
                                     $(el).find('img').first().attr('data-src');
                        
                        // Extract episode
                        let episode = '?';
                        const epText = $(el).find('.ep, .episode, .luf, .epz').text().trim();
                        if (epText) {
                            const epNum = this._extractEpisodeNumber(epText);
                            if (epNum) episode = epNum.toString();
                        }
                        
                        // Extract day (untuk jadwal)
                        let day = '';
                        const dayText = $(el).find('.day, .daytime, .schedule, .jadwal').text().trim();
                        if (dayText) {
                            const days = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu'];
                            for (const d of days) {
                                if (dayText.toLowerCase().includes(d.toLowerCase())) {
                                    day = d;
                                    break;
                                }
                            }
                        }
                        
                        // Extract time
                        let time = '';
                        const timeText = $(el).find('.time, .jam, .clock').text().trim();
                        if (timeText) {
                            const timeMatch = timeText.match(/\d{1,2}[:.]\d{2}/);
                            if (timeMatch) time = timeMatch[0].replace('.', ':');
                        }
                        
                        if (title && link) {
                            results.push({
                                title: title,
                                link: link.startsWith('http') ? link : source.baseUrl + link,
                                thumb: thumb || 'https://via.placeholder.com/200x300?text=Ongoing',
                                episode: episode,
                                day: day || 'Unknown',
                                time: time || '??:??',
                                rating: '0',
                                status: 'Ongoing',
                                source: this.source
                            });
                        }
                    });
                    
                    if (results.length > 0) break;
                }
            }

            console.log(`[ONGOING] Page ${page}: Found ${results.length} anime`);
            
            return {
                success: true,
                page,
                total: results.length,
                results
            };
            
        } catch (error) {
            console.error('[ONGOING ERROR]', error.message);
            return {
                success: false,
                error: error.message,
                results: []
            };
        }
    }

    // ============================================
    // GET ANIME DETAIL
    // ============================================
    
    async getAnimeDetail(animeUrl) {
        try {
            console.log(`[DETAIL] URL: ${animeUrl}`);
            const html = await this._request(animeUrl);
            const $ = cheerio.load(html);
            
            // Title
            const title = this._cleanText(
                $('h1, .entry-title, .post-title, .jdl').first().text() ||
                $('title').text().split('–')[0].trim()
            ) || 'Unknown Title';
            
            // Synopsis
            let synopsis = '';
            $('.sinopsis, .desc, .entry-content p, .sinopc, .description').each((i, el) => {
                const text = $(el).text().trim();
                if (text.length > 50) {
                    synopsis = this._cleanText(text);
                    return false;
                }
            });
            
            // Metadata
            const metadata = {};
            const metadataSelectors = ['.info p', '.spe p', '.data-single tr', '.infozone p'];
            
            for (const selector of metadataSelectors) {
                $(selector).each((i, el) => {
                    const text = $(el).text().trim();
                    const parts = text.split(':');
                    if (parts.length > 1) {
                        const key = parts[0].trim().replace(/[^\w\s]/g, '');
                        const value = parts.slice(1).join(':').trim();
                        if (key && value && !metadata[key]) {
                            metadata[key] = this._cleanText(value);
                        }
                    }
                });
            }
            
            // Episodes
            const episodes = [];
            let episodeLinks = new Set();
            
            // Coba beberapa selector untuk episode list
            const episodeSelectors = ['.episodelist li a', '.list-episode li a', 'a[href*="episode"]'];
            
            for (const selector of episodeSelectors) {
                $(selector).each((i, el) => {
                    if (episodes.length >= 50) return false;
                    
                    const epLink = $(el).attr('href');
                    const epText = $(el).text().trim() || $(el).attr('title') || '';
                    
                    if (epLink && epText && !episodeLinks.has(epLink)) {
                        episodeLinks.add(epLink);
                        
                        const epNumber = this._extractEpisodeNumber(epText) || episodes.length + 1;
                        
                        // Extract date if exists
                        let date = '';
                        const parent = $(el).parent();
                        const dateElem = parent.find('.date, .time, .dt, .posted-on');
                        if (dateElem.length) {
                            date = dateElem.text().trim();
                        }
                        
                        episodes.push({
                            number: epNumber,
                            title: this._cleanText(epText.substring(0, 50)),
                            link: epLink.startsWith('http') ? epLink : new URL(epLink, animeUrl).href,
                            date: date || 'Unknown'
                        });
                    }
                });
                
                if (episodes.length > 0) break;
            }
            
            // Sort episodes by number descending (terbaru di atas)
            episodes.sort((a, b) => b.number - a.number);
            
            console.log(`[DETAIL] Found ${episodes.length} episodes for "${title}"`);
            
            return {
                success: true,
                title,
                synopsis: synopsis || 'Sinopsis tidak tersedia',
                metadata,
                totalEpisodes: episodes.length,
                episodes: episodes.slice(0, 50) // Max 50 episodes
            };
            
        } catch (error) {
            console.error('[DETAIL ERROR]', error.message);
            return {
                success: false,
                error: error.message
            };
        }
    }

    // ============================================
    // GET EPISODE STREAM
    // ============================================
    
    async getEpisodeStream(episodeUrl) {
        try {
            console.log(`[EPISODE] URL: ${episodeUrl}`);
            const html = await this._request(episodeUrl);
            const $ = cheerio.load(html);
            
            const streams = [];
            const downloads = [];
            const streamUrls = new Set();
            
            // ===== 1. CARI IFRAME PLAYER =====
            $('iframe').each((i, el) => {
                const src = $(el).attr('src');
                if (src && src.length > 5 && !streamUrls.has(src)) {
                    streamUrls.add(src);
                    
                    // Deteksi server dari URL
                    let server = 'Unknown';
                    if (src.includes('youtube')) server = 'YouTube';
                    else if (src.includes('drive')) server = 'Google Drive';
                    else if (src.includes('dood')) server = 'Doodstream';
                    else if (src.includes('acefile')) server = 'Acefile';
                    else if (src.includes('stream')) server = 'StreamSB';
                    
                    streams.push({
                        type: 'iframe',
                        url: src,
                        server: server,
                        quality: 'HD',
                        embed: true
                    });
                }
            });
            
            // ===== 2. CARI LINK STREAMING =====
            $('a[href*="drive"], a[href*="youtu"], a[href*="stream"], a[href*="dood"], a[href*="acefile"]').each((i, el) => {
                const href = $(el).attr('href');
                const text = $(el).text().trim();
                
                if (href && !streamUrls.has(href)) {
                    streamUrls.add(href);
                    
                    let quality = 'SD';
                    if (text.includes('360')) quality = '360p';
                    else if (text.includes('480')) quality = '480p';
                    else if (text.includes('720')) quality = '720p';
                    else if (text.includes('1080')) quality = '1080p';
                    
                    streams.push({
                        type: 'link',
                        url: href,
                        server: this._cleanText(text).substring(0, 30) || 'Stream',
                        quality: quality,
                        embed: false
                    });
                }
            });
            
            // ===== 3. CARI DOWNLOAD LINKS =====
            $('.download a, .downloadlink a, .listlink a, a[href*="mirror"], a[href*="mediafire"]').each((i, el) => {
                const link = $(el).attr('href');
                const text = $(el).text().trim();
                
                if (link && text && link !== '#' && !link.includes('javascript')) {
                    let quality = 'SD';
                    if (text.includes('360')) quality = '360p';
                    else if (text.includes('480')) quality = '480p';
                    else if (text.includes('720')) quality = '720p';
                    else if (text.includes('1080')) quality = '1080p';
                    
                    downloads.push({
                        server: this._cleanText(text).substring(0, 40),
                        url: link,
                        quality: quality,
                        size: $(el).find('.size').text().trim() || 'Unknown'
                    });
                }
            });
            
            // ===== 4. CARI VIDEO PLAYER =====
            $('video source, .player source, video').each((i, el) => {
                const src = $(el).attr('src');
                if (src && !streamUrls.has(src)) {
                    streamUrls.add(src);
                    streams.push({
                        type: 'direct',
                        url: src,
                        server: 'Direct Video',
                        quality: 'HD',
                        embed: false
                    });
                }
            });
            
            // ===== 5. CARI DI SCRIPT TAGS (JSON DATA) =====
            $('script').each((i, el) => {
                const script = $(el).html() || '';
                if (script.includes('player') || script.includes('video') || script.includes('stream')) {
                    // Cari URL di dalam script
                    const urlMatches = script.match(/https?:\/\/[^\s"']+\.(mp4|mkv|m3u8)[^\s"']*/g);
                    if (urlMatches) {
                        urlMatches.forEach(url => {
                            if (!streamUrls.has(url)) {
                                streamUrls.add(url);
                                streams.push({
                                    type: 'script',
                                    url: url,
                                    server: 'Video Source',
                                    quality: 'HD',
                                    embed: false
                                });
                            }
                        });
                    }
                }
            });

            // Filter unique streams
            const uniqueStreams = [];
            const seenStreams = new Set();
            for (const stream of streams) {
                if (!seenStreams.has(stream.url)) {
                    seenStreams.add(stream.url);
                    uniqueStreams.push(stream);
                }
            }

            console.log(`[EPISODE] Found ${uniqueStreams.length} streams, ${downloads.length} downloads`);
            
            return {
                success: true,
                streams: uniqueStreams.slice(0, 10), // Max 10 streams
                downloads: downloads.slice(0, 15), // Max 15 downloads
                note: uniqueStreams.length === 0 ? 
                    'Link streaming tidak ditemukan. Mungkin server sedang down atau episode belum tersedia.' : null
            };
            
        } catch (error) {
            console.error('[EPISODE ERROR]', error.message);
            return {
                success: false,
                error: error.message
            };
        }
    }

    // ============================================
    // GET GENRES
    // ============================================
    
    async getGenres() {
        try {
            const source = SOURCES[this.source];
            const url = source.baseUrl + source.endpoints.genre;
            
            console.log(`[GENRES] URL: ${url}`);
            const html = await this._request(url);
            const $ = cheerio.load(html);
            const genres = [];

            const selectors = source.selectors.genreList.split(', ');
            
            for (const selector of selectors) {
                $(selector).each((i, el) => {
                    if (genres.length >= 50) return false;
                    
                    const name = this._cleanText($(el).text().trim());
                    const link = $(el).attr('href');
                    
                    // Extract count
                    let count = 0;
                    const countText = $(el).find('.count, .num, .total').text().trim() || 
                                     $(el).text().match(/\((\d+)\)/)?.[1];
                    
                    if (countText) {
                        count = parseInt(countText) || 0;
                    }
                    
                    if (name && link && name.length < 30 && !name.includes('Home') && !name.includes('Contact')) {
                        genres.push({
                            name: name,
                            link: link.startsWith('http') ? link : source.baseUrl + link,
                            count: count
                        });
                    }
                });
                
                if (genres.length > 0) break;
            }

            // Sort by name
            genres.sort((a, b) => a.name.localeCompare(b.name));
            
            console.log(`[GENRES] Found ${genres.length} genres`);
            
            return {
                success: true,
                total: genres.length,
                genres: genres
            };
            
        } catch (error) {
            console.error('[GENRES ERROR]', error.message);
            return {
                success: false,
                error: error.message,
                genres: []
            };
        }
    }

    // ============================================
    // GET ANIME BY GENRE
    // ============================================
    
    async getAnimeByGenre(genreUrl, page = 1) {
        try {
            // Construct URL with page
            let url = genreUrl;
            if (page > 1) {
                if (url.includes('page')) {
                    url = url.replace(/page\/\d+\//, `page/${page}/`);
                } else {
                    url = url.replace(/\/$/, '') + `/page/${page}/`;
                }
            }
            
            console.log(`[GENRE PAGE] URL: ${url}`);
            const html = await this._request(url);
            const $ = cheerio.load(html);
            const results = [];

            // Coba beberapa selector
            const selectors = SOURCES[this.source].selectors.search.split(', ');
            
            for (const selector of selectors) {
                $(selector).each((i, el) => {
                    if (results.length >= 30) return false;
                    
                    const title = this._cleanText(
                        $(el).find('h2 a, .entry-title a, .title a').first().text() ||
                        $(el).find('a[rel="bookmark"]').first().text()
                    );
                    
                    const link = $(el).find('a').first().attr('href');
                    const thumb = $(el).find('img').first().attr('src') ||
                                 $(el).find('img').first().attr('data-src');
                    
                    const rating = $(el).find('.rating, .score, .numscore').text().trim() || '0';
                    
                    if (title && link) {
                        results.push({
                            title: title,
                            link: link.startsWith('http') ? link : SOURCES[this.source].baseUrl + link,
                            thumb: thumb || 'https://via.placeholder.com/200x300?text=Anime',
                            rating: rating,
                            status: 'Unknown',
                            source: this.source
                        });
                    }
                });
                
                if (results.length > 0) break;
            }

            console.log(`[GENRE PAGE] Page ${page}: Found ${results.length} anime`);
            
            return {
                success: true,
                page,
                total: results.length,
                results
            };
            
        } catch (error) {
            console.error('[GENRE PAGE ERROR]', error.message);
            return {
                success: false,
                error: error.message,
                results: []
            };
        }
    }

    // ============================================
    // CHANGE SOURCE
    // ============================================
    
    setSource(source) {
        if (SOURCES[source]) {
            this.source = source;
            console.log(`[SOURCE] Changed to ${source} (${SOURCES[source].name})`);
            return true;
        }
        console.log(`[SOURCE] Invalid source: ${source}`);
        return false;
    }

    // ============================================
    // GET AVAILABLE SOURCES
    // ============================================
    
    getSources() {
        return Object.keys(SOURCES).map(key => ({
            id: key,
            name: SOURCES[key].name,
            baseUrl: SOURCES[key].baseUrl,
            active: true
        }));
    }

    // ============================================
    // CHECK SOURCE STATUS
    // ============================================
    
    async checkSourceStatus(source = null) {
        const sourceToCheck = source || this.source;
        const sourceConfig = SOURCES[sourceToCheck];
        
        if (!sourceConfig) return { active: false, error: 'Invalid source' };
        
        try {
            await this._request(sourceConfig.baseUrl, { timeout: 5000 });
            return { active: true, source: sourceToCheck, name: sourceConfig.name };
        } catch (error) {
            return { active: false, source: sourceToCheck, error: error.message };
        }
    }

    // ============================================
    // CLEAR CACHE
    // ============================================
    
    clearCache() {
        cache.clear();
        console.log('[CACHE] Cache cleared');
    }
}

module.exports = new AnimeScraper();
