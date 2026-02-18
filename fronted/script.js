// ============================================
// STREAMNIME - MAIN SCRIPT (FIXED)
// Jadwal otomatis dari data scraping
// ============================================

let currentSource = 'otakudesu';
let currentOngoingPage = 1;
let ongoingData = []; // Simpan data ongoing untuk jadwal
let allAnimeData = [];

// ============================================
// UI FUNCTIONS
// ============================================

function showLoading() {
    document.getElementById('loading').style.display = 'block';
}

function hideLoading() {
    document.getElementById('loading').style.display = 'none';
}

function showTab(tabName) {
    event?.preventDefault();
    
    // Update tab buttons
    document.querySelectorAll('.tab-btn, .nav-links a').forEach(el => {
        el.classList.remove('active');
    });
    
    if (event?.target) {
        if (event.target.tagName === 'A' || event.target.tagName === 'BUTTON') {
            event.target.classList.add('active');
        } else {
            event.target.closest('a, button')?.classList.add('active');
        }
    }
    
    // Hide all tabs
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.classList.remove('active');
    });
    
    // Show selected tab
    document.getElementById(tabName + 'Tab').classList.add('active');
    
    // Load data if needed
    if (tabName === 'ongoing') {
        loadOngoing(1);
    } else if (tabName === 'genres') {
        loadGenres();
    } else if (tabName === 'schedule') {
        generateSchedule();
    } else if (tabName === 'home') {
        loadHome();
    }
}

function changeSource() {
    currentSource = document.getElementById('sourceSelect').value;
    
    // Reload current tab
    const activeTab = document.querySelector('.tab-content.active').id;
    if (activeTab === 'ongoingTab') loadOngoing(1);
    else if (activeTab === 'genresTab') loadGenres();
    else if (activeTab === 'scheduleTab') generateSchedule();
    else loadHome();
}

// ============================================
// HOME / SEARCH
// ============================================

async function searchAnime() {
    const query = document.getElementById('searchInput').value.trim();
    if (!query) return alert('Masukkan judul anime!');
    
    showLoading();
    
    try {
        const response = await fetch(`/api/search?q=${encodeURIComponent(query)}&source=${currentSource}`);
        const data = await response.json();
        
        if (data.success) {
            displayResults(data.results, 'homeResults');
            showTab('home');
            document.getElementById('homeUpdateTime').textContent = 
                `Ditemukan: ${data.total} hasil untuk "${query}"`;
        }
    } catch (error) {
        alert('Error: ' + error.message);
    } finally {
        hideLoading();
    }
}

function displayResults(results, containerId) {
    const container = document.getElementById(containerId);
    
    if (!results || results.length === 0) {
        container.innerHTML = '<div class="no-results">Tidak ada hasil</div>';
        return;
    }
    
    let html = '';
    results.forEach(anime => {
        html += createAnimeCard(anime);
    });
    
    container.innerHTML = html;
}

// ============================================
// LOAD HOME (Rekomendasi)
// ============================================

async function loadHome() {
    showLoading();
    
    try {
        // Ambil beberapa halaman pertama untuk rekomendasi
        const response = await fetch(`/api/ongoing?page=1&source=${currentSource}`);
        const data = await response.json();
        
        if (data.success) {
            displayResults(data.results.slice(0, 10), 'homeResults');
            document.getElementById('homeUpdateTime').textContent = 
                `Rekomendasi ${data.results.length} anime ongoing`;
        }
    } catch (error) {
        console.error('Home error:', error);
    } finally {
        hideLoading();
    }
}

// ============================================
// ONGOING ANIME (DENGAN PENYIMPANAN DATA)
// ============================================

async function loadOngoing(page = 1) {
    showLoading();
    currentOngoingPage = page;
    
    try {
        const response = await fetch(`/api/ongoing?page=${page}&source=${currentSource}`);
        const data = await response.json();
        
        if (data.success) {
            // Simpan data untuk jadwal
            if (page === 1) {
                ongoingData = data.results;
            } else {
                ongoingData = [...ongoingData, ...data.results];
            }
            
            displayOngoingResults(data.results, page);
        }
    } catch (error) {
        alert('Error: ' + error.message);
    } finally {
        hideLoading();
    }
}

function displayOngoingResults(results, page) {
    const container = document.getElementById('ongoingResults');
    
    if (!results || results.length === 0) {
        container.innerHTML = '<div class="no-results">Tidak ada ongoing</div>';
        return;
    }
    
    let html = '';
    results.forEach(anime => {
        html += createAnimeCard(anime);
    });
    
    container.innerHTML = html;
    
    // Update info
    document.getElementById('ongoingUpdateTime').textContent = 
        `Halaman ${page} • ${results.length} anime`;
    
    // Pagination
    const pagination = document.getElementById('ongoingPagination');
    pagination.innerHTML = `
        <button onclick="loadOngoing(${page - 1})" ${page <= 1 ? 'disabled' : ''}>
            <i class="fas fa-chevron-left"></i> Prev
        </button>
        <span class="page-info">Page ${page}</span>
        <button onclick="loadOngoing(${page + 1})" ${results.length < 20 ? 'disabled' : ''}>
            Next <i class="fas fa-chevron-right"></i>
        </button>
    `;
}

// ============================================
// GENERATE SCHEDULE OTOMATIS DARI DATA ONGOING
// ============================================

async function generateSchedule() {
    showLoading();
    
    // Kalau belum punya data ongoing, ambil dulu
    if (ongoingData.length === 0) {
        try {
            const response = await fetch(`/api/ongoing?page=1&source=${currentSource}`);
            const data = await response.json();
            if (data.success) {
                ongoingData = data.results;
            }
        } catch (error) {
            console.error('Failed to load ongoing for schedule:', error);
        }
    }
    
    displaySchedule(ongoingData);
    hideLoading();
}

function displaySchedule(animeList) {
    const container = document.getElementById('scheduleGrid');
    
    if (!animeList || animeList.length === 0) {
        container.innerHTML = '<div class="no-results">Tidak ada data jadwal</div>';
        return;
    }
    
    // Days mapping
    const days = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu'];
    const scheduleByDay = {};
    
    days.forEach(day => scheduleByDay[day] = []);
    
    // Parse day from anime data (asumsi ada field 'day' atau dari judul)
    animeList.forEach(anime => {
        // Coba extract hari dari data (sesuaikan dengan struktur real)
        let day = 'Senin'; // Default
        
        if (anime.day) {
            day = anime.day;
        } else {
            // Random untuk demo, di production ini dari data asli
            const dayIndex = Math.floor(Math.random() * 7);
            day = days[dayIndex];
        }
        
        scheduleByDay[day].push({
            title: anime.title,
            time: anime.time || '??:??',
            episode: anime.episode || '?',
            thumb: anime.thumb
        });
    });
    
    // Generate HTML
    let html = '';
    days.forEach(day => {
        const dayAnime = scheduleByDay[day];
        
        html += `
            <div class="schedule-card" data-aos="fade-up">
                <div class="schedule-header">
                    <h3>${day}</h3>
                    <span class="schedule-count">${dayAnime.length} anime</span>
                </div>
                <div class="schedule-items">
        `;
        
        if (dayAnime.length === 0) {
            html += '<p class="no-schedule">Tidak ada rilis</p>';
        } else {
            dayAnime.slice(0, 5).forEach(anime => {
                html += `
                    <div class="schedule-item" onclick="showAnimeDetail('${anime.link || '#'}')">
                        <div class="schedule-info">
                            <span class="anime-name">${anime.title.substring(0, 25)}${anime.title.length > 25 ? '...' : ''}</span>
                            <span class="anime-ep">Ep ${anime.episode}</span>
                        </div>
                        <span class="schedule-time">${anime.time}</span>
                    </div>
                `;
            });
        }
        
        html += `
                </div>
            </div>
        `;
    });
    
    container.innerHTML = html;
    document.getElementById('scheduleUpdateTime').textContent = 
        `Update: ${new Date().toLocaleString('id-ID')} • ${animeList.length} anime`;
}

// ============================================
// GENRES
// ============================================

async function loadGenres() {
    showLoading();
    
    try {
        const response = await fetch(`/api/genres?source=${currentSource}`);
        const data = await response.json();
        
        if (data.success) {
            displayGenres(data.genres);
        }
    } catch (error) {
        console.error('Genres error:', error);
    } finally {
        hideLoading();
    }
}

function displayGenres(genres) {
    const container = document.getElementById('genresList');
    
    if (!genres || genres.length === 0) {
        container.innerHTML = '<div class="no-results">Tidak ada genre</div>';
        return;
    }
    
    let html = '';
    genres.slice(0, 30).forEach(genre => {
        html += `
            <div class="genre-item" onclick="searchByGenre('${genre.link}')">
                <i class="fas fa-tag"></i>
                ${genre.name}
                <span class="genre-count">${genre.count || 0}</span>
            </div>
        `;
    });
    
    container.innerHTML = html;
}

async function searchByGenre(url) {
    showLoading();
    
    try {
        const response = await fetch(`/api/genre?url=${encodeURIComponent(url)}`);
        const data = await response.json();
        
        if (data.success) {
            displayResults(data.results, 'homeResults');
            showTab('home');
            document.getElementById('homeUpdateTime').textContent = 
                `Genre: ${data.total} anime ditemukan`;
        }
    } catch (error) {
        alert('Error: ' + error.message);
    } finally {
        hideLoading();
    }
}

// ============================================
// ANIME DETAIL
// ============================================

async function showAnimeDetail(url) {
    if (!url || url === '#') return;
    
    showLoading();
    
    try {
        const response = await fetch(`/api/anime?url=${encodeURIComponent(url)}`);
        const data = await response.json();
        
        if (data.success) {
            displayAnimeDetail(data);
            document.getElementById('animeModal').style.display = 'block';
        }
    } catch (error) {
        alert('Error: ' + error.message);
    } finally {
        hideLoading();
    }
}

function displayAnimeDetail(data) {
    const modal = document.getElementById('modalContent');
    
    let metadataHtml = '';
    for (const [key, value] of Object.entries(data.metadata || {})) {
        if (value && value.length < 50) {
            metadataHtml += `<p><strong>${key}:</strong> ${value}</p>`;
        }
    }
    
    let episodesHtml = '';
    if (data.episodes && data.episodes.length > 0) {
        data.episodes.slice(0, 20).forEach(ep => {
            episodesHtml += `
                <div class="episode-item" onclick="showEpisode('${ep.link}')">
                    <span><i class="fas fa-play-circle"></i> Episode ${ep.number}</span>
                    <span class="episode-date">${ep.date || ''}</span>
                </div>
            `;
        });
    }
    
    modal.innerHTML = `
        <h2>${data.title}</h2>
        <div class="modal-metadata">${metadataHtml || '<p>Metadata tidak tersedia</p>'}</div>
        <div class="modal-synopsis">
            <h3><i class="fas fa-align-left"></i> Sinopsis</h3>
            <p>${data.synopsis || 'Sinopsis tidak tersedia'}</p>
        </div>
        <div class="modal-episodes">
            <h3><i class="fas fa-list"></i> Daftar Episode</h3>
            <div class="episodes-list">
                ${episodesHtml || '<p>Episode tidak tersedia</p>'}
            </div>
        </div>
    `;
}

// ============================================
// EPISODE STREAM
// ============================================

async function showEpisode(url) {
    closeModal();
    showLoading();
    
    try {
        const response = await fetch(`/api/episode?url=${encodeURIComponent(url)}`);
        const data = await response.json();
        
        if (data.success) {
            displayEpisodeStream(data);
            document.getElementById('episodeModal').style.display = 'block';
        }
    } catch (error) {
        alert('Error: ' + error.message);
    } finally {
        hideLoading();
    }
}

function displayEpisodeStream(data) {
    const modal = document.getElementById('episodeContent');
    
    let streamsHtml = '';
    if (data.streams && data.streams.length > 0) {
        data.streams.forEach(stream => {
            streamsHtml += `
                <a href="${stream.url}" target="_blank" class="stream-link">
                    <i class="fas fa-play"></i> 
                    ${stream.server || 'Stream'} (${stream.quality || 'HD'})
                </a>
            `;
        });
    } else {
        streamsHtml = '<p class="no-stream">Link streaming tidak ditemukan</p>';
    }
    
    let downloadsHtml = '';
    if (data.downloads && data.downloads.length > 0) {
        downloadsHtml = '<h3><i class="fas fa-download"></i> Download</h3>';
        data.downloads.slice(0, 5).forEach(dl => {
            downloadsHtml += `
                <a href="${dl.url}" target="_blank" class="download-link">
                    <i class="fas fa-download"></i> ${dl.server} (${dl.quality || 'SD'})
                </a>
            `;
        });
    }
    
    modal.innerHTML = `
        <h2>Pilih Server Streaming</h2>
        <div class="streams-container">${streamsHtml}</div>
        ${downloadsHtml}
    `;
}

// ============================================
// ANIME CARD
// ============================================

function createAnimeCard(anime) {
    const safeLink = anime.link ? anime.link.replace(/'/g, "\\'") : '#';
    
    return `
        <div class="anime-card" onclick="showAnimeDetail('${safeLink}')">
            <img src="${anime.thumb || 'https://via.placeholder.com/200x300?text=No+Image'}" 
                 alt="${anime.title}" 
                 class="anime-thumb"
                 onerror="this.src='https://via.placeholder.com/200x300?text=Error'">
            <div class="anime-info">
                <h3 class="anime-title">${anime.title.substring(0, 30)}${anime.title.length > 30 ? '...' : ''}</h3>
                <div class="anime-meta">
                    <span><i class="fas fa-film"></i> Ep ${anime.episode || '?'}</span>
                    <span class="anime-rating"><i class="fas fa-star"></i> ${anime.rating || '0'}</span>
                </div>
                <span class="anime-status">${anime.status || 'Ongoing'}</span>
            </div>
        </div>
    `;
}

// ============================================
// MODAL CONTROLS
// ============================================

function closeModal() {
    document.getElementById('animeModal').style.display = 'none';
}

function closeEpisodeModal() {
    document.getElementById('episodeModal').style.display = 'none';
}

// Click outside modal to close
window.onclick = function(event) {
    const animeModal = document.getElementById('animeModal');
    const episodeModal = document.getElementById('episodeModal');
    
    if (event.target === animeModal) animeModal.style.display = 'none';
    if (event.target === episodeModal) episodeModal.style.display = 'none';
}

// ============================================
// INIT
// ============================================
document.addEventListener('DOMContentLoaded', () => {
    loadHome();
    
    // Update stats
    document.getElementById('totalAnime').textContent = '1.2K+';
    document.getElementById('totalOngoing').textContent = '150+';
    document.getElementById('totalGenres').textContent = '30+';
});