// --- Configuration ---
const API_BASE_URL = 'https://music-dl.sayqz.com/api/';
const THEMES = { netease: '#ef4444', qq: '#10b981', kuwo: '#eab308' };
const SOURCE_NAMES = { netease: 'Netease Cloud', qq: 'QQ Music', kuwo: 'Kuwo Music' };

let currentSource = 'netease';
let viewStack = ['playlists'];

// State
let state = { 
    playlist: [],     
    viewList: [],     
    currentIndex: -1, 
    lyrics: [], 
    lIdx: -1, 
    preferredQuality: '320k',
    page: 1,
    keyword: '',
    isSearchMode: false,
    currentTopListId: null,
    playMode: 'sequential' 
};
let lastVolume = 0.8;
let isDragging = false;

const el = {
    audio: document.getElementById('audio'),
    playerBar: document.getElementById('player-bar'),
    fullPlayer: document.getElementById('full-player'),
    progressBar: document.getElementById('progress-bar'),
    fpProgressBar: document.getElementById('fp-progress-bar'),
    mainScroller: document.getElementById('main-scroller'),
    loadMoreBtn: document.getElementById('load-more-container'),
    loadSpinner: document.getElementById('load-spinner'),
    queuePanel: document.getElementById('queue-panel'),
    queueList: document.getElementById('queue-list'),
    queueBadge: document.getElementById('queue-count-badge'),
    queueTotal: document.getElementById('queue-total'),
    toastContainer: document.getElementById('toast-container')
};

// --- Utilities ---

const escapeHtml = (str) => {
    if (!str) return '';
    return String(str).replace(/[&<>"']/g, function(m) {
        const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' };
        return map[m];
    });
};

const handleImgError = (img) => {
    img.onerror = null;
    img.src = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjNTI1MjViIiBzdHJva2Utd2lkdGg9IjIiPjxwYXRoIGQ9Ik05IDl2NmMwIDEuMS45IDIgMiAyaDJ2LTJIOS45OWw1LTVoMi4wMXYyaC0yTDEuNSA5SDl6Ii8+PC9zdmc+'; 
    img.style.backgroundColor = '#27272a';
};

function formatDuration(s) {
    if(!s || isNaN(s)) return '0:00';
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, '0')}`;
}

function showToast(message) {
    if (!el.toastContainer) return;
    const toast = document.createElement('div');
    toast.className = 'bg-[#27272a] text-white px-4 py-2 rounded-full text-sm font-medium shadow-xl border border-white/10 pointer-events-auto animate-fade-in-down flex items-center gap-2';
    toast.innerHTML = `<svg class="w-4 h-4 text-primary" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg> ${escapeHtml(message)}`;
    el.toastContainer.appendChild(toast);
    
    // Auto remove
    setTimeout(() => {
        toast.classList.remove('animate-fade-in-down');
        toast.classList.add('animate-fade-out-up');
        setTimeout(() => { if(toast.parentNode) toast.parentNode.removeChild(toast); }, 300);
    }, 2000);
}

// --- Storage Logic ---

function saveState() {
    try {
        localStorage.setItem('muse_playlist', JSON.stringify(state.playlist));
        localStorage.setItem('muse_settings', JSON.stringify({
            idx: state.currentIndex,
            mode: state.playMode,
            volume: lastVolume
        }));
    } catch (e) {
        console.error("Save state failed:", e);
    }
}

function loadState() {
    try {
        const savedList = localStorage.getItem('muse_playlist');
        if (savedList) state.playlist = JSON.parse(savedList);

        const savedSettings = localStorage.getItem('muse_settings');
        if (savedSettings) {
            const s = JSON.parse(savedSettings);
            state.currentIndex = s.idx !== undefined ? s.idx : -1;
            state.playMode = s.mode || 'sequential';
            if (s.volume !== undefined) lastVolume = s.volume;
        }
        
        updateVolume(lastVolume);
        updateModeUI();
        renderQueue();

        if (state.currentIndex > -1 && state.playlist[state.currentIndex]) {
            const item = state.playlist[state.currentIndex];
            el.playerBar.classList.remove('translate-y-full');
            el.mainScroller.classList.add('mb-24');
            
            const coverUrl = `${API_BASE_URL}?source=${item.source}&id=${item.id}&type=pic`;
            ['bar-cover', 'fp-cover'].forEach(id => {
                const img = document.getElementById(id);
                if(img) {
                    img.src = coverUrl;
                    img.onerror = () => handleImgError(img);
                }
            });
            ['bar-title', 'fp-title', 'fp-title-cover'].forEach(id => {
                const e = document.getElementById(id); if(e) e.textContent = item.name;
            });
            ['bar-artist', 'fp-artist', 'fp-artist-cover'].forEach(id => {
                const e = document.getElementById(id); if(e) e.textContent = item.artist;
            });
            
            el.audio.src = `${API_BASE_URL}?source=${item.source}&id=${item.id}&type=url&br=${state.preferredQuality}`;
            
            fetchApiData({ source: item.source, id: item.id, type: 'lrc' })
                .then(d => parseLrc(d?.lrc || ''))
                .catch(() => parseLrc(''));
                
            updateQueueActive();
        }
    } catch (e) {
        console.error("Load state failed:", e);
    }
}

// --- Init ---

window.addEventListener('load', () => { 
    switchSource('netease'); 
    loadState(); 
});

document.getElementById('kw').addEventListener('keyup', (e) => {
    if(e.key === 'Enter') {
        const val = e.target.value.trim();
        if(val) loadSongs(val, `Search: ${val}`, true);
    }
});

// --- UI Functions ---

function switchSource(source) {
    currentSource = source;
    document.documentElement.style.setProperty('--primary-color', THEMES[source]);
    
    const gradients = {
        netease: 'from-red-900/20',
        qq: 'from-emerald-900/20',
        kuwo: 'from-yellow-900/20'
    };
    
    const bgEl = document.getElementById('bg-gradient');
    if(bgEl) bgEl.className = `absolute top-0 left-0 right-0 h-96 bg-gradient-to-b ${gradients[source]} to-transparent pointer-events-none transition-colors duration-1000`;

    ['netease', 'qq', 'kuwo'].forEach(s => {
        const btn = document.getElementById(`nav-${s}`);
        const mobBtn = document.getElementById(`mob-${s}`);
        const isActive = s === source;
        if (btn) btn.className = isActive ? 'w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors bg-white/10 text-white' : 'w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors text-zinc-400 hover:text-white hover:bg-white/5';
        if (mobBtn) mobBtn.className = isActive ? 'px-3 py-1.5 text-[10px] font-bold rounded-md bg-white/10 text-white transition-colors' : 'px-3 py-1.5 text-[10px] font-bold rounded-md text-zinc-400 transition-colors';
    });
    
    loadPlaylists(source);
    showToast(`Switched to ${SOURCE_NAMES[source]}`);
}

async function fetchApiData(params) {
    try { 
        const u = new URL(API_BASE_URL); 
        Object.keys(params).forEach(k => u.searchParams.append(k, params[k])); 
        const res = await fetch(u);
        if (!res.ok) throw new Error('Network response was not ok');
        if (params.type === 'lrc') return { lrc: await res.text() };
        return await res.json(); 
    } catch (e) { 
        console.error("API Fetch Error:", e);
        if(params.type !== 'lrc') showToast("Network error, please try again");
        return null; 
    }
}

async function loadPlaylists(source) {
    showView('playlists');
    const grid = document.getElementById('playlist-grid');
    grid.innerHTML = '<div class="col-span-full py-12 text-center text-sm text-zinc-500 animate-pulse">Loading charts...</div>';
    
    const data = await fetchApiData({ source, type: 'toplists' });
    grid.innerHTML = '';
    
    if (data?.data?.list) {
        const fragment = document.createDocumentFragment();
        data.data.list.forEach(item => {
            const div = document.createElement('div');
            div.className = "group cursor-pointer space-y-3";
            div.onclick = () => loadSongs(item.id, item.name, false, 1, item.pic);
            
            const safeName = escapeHtml(item.name);
            const safeFreq = escapeHtml(item.updateFrequency || 'Chart');
            
            div.innerHTML = `
                <div class="aspect-square rounded-lg bg-zinc-800 overflow-hidden relative shadow-lg group-hover:shadow-xl transition-all group-hover:-translate-y-1">
                    <img src="${item.pic}" class="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" loading="lazy">
                    <div class="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <div class="w-12 h-12 rounded-full bg-primary flex items-center justify-center shadow-lg text-black transform scale-90 group-hover:scale-100 transition-transform"><svg class="w-5 h-5 ml-0.5" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg></div>
                    </div>
                </div>
                <div>
                    <h3 class="font-medium text-sm text-zinc-200 truncate group-hover:text-white transition-colors">${safeName}</h3>
                    <p class="text-xs text-zinc-500 mt-1">${safeFreq}</p>
                </div>
            `;
            const img = div.querySelector('img');
            img.onerror = () => handleImgError(img);
            
            fragment.appendChild(div);
        });
        grid.appendChild(fragment);
    }
}

async function loadSongs(idOrKw, title, isSearch = false, page = 1, initialCover = null) {
    if (page === 1) {
        showView('songs');
        const list = document.getElementById('song-list-ul');
        list.innerHTML = '<div class="py-12 text-center text-sm text-zinc-500 animate-pulse">Loading tracks...</div>';
        
        document.getElementById('songlist-title').textContent = title;
        document.getElementById('current-source-label').textContent = SOURCE_NAMES[currentSource];
        
        const coverImg = document.getElementById('playlist-cover-art');
        
        if (initialCover) {
            coverImg.src = initialCover;
        } else {
            coverImg.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(title)}&background=18181b&color=fff&size=200`;
        }
        coverImg.onerror = () => handleImgError(coverImg);
        
        el.loadMoreBtn.classList.add('hidden'); 
        
        state.page = 1;
        state.keyword = isSearch ? idOrKw : '';
        state.currentTopListId = isSearch ? null : idOrKw;
        state.isSearchMode = isSearch;
        state.viewList = []; 
    } else {
        el.loadSpinner.classList.remove('hidden');
    }

    const queryLimit = isSearch ? 20 : 100;
    const params = { 
        source: currentSource, 
        type: isSearch ? 'search' : 'toplist', 
        [isSearch ? 'keyword' : 'id']: idOrKw,
        page: page,
        limit: queryLimit
    };
    
    const data = await fetchApiData(params);
    const songs = data?.data?.list || data?.data?.results;

    if (page === 1) document.getElementById('song-list-ul').innerHTML = '';
    el.loadSpinner.classList.add('hidden');

    if (songs && songs.length > 0) {
        const newSongs = songs.map(i => ({ ...i, source: currentSource }));
        
        if (page === 1) {
            state.viewList = newSongs;
            if (!initialCover) {
                const coverUrl = `${API_BASE_URL}?source=${currentSource}&id=${songs[0].id}&type=pic`;
                document.getElementById('playlist-cover-art').src = coverUrl;
            }
        } else {
            state.viewList = [...state.viewList, ...newSongs];
        }
        
        renderSongList(newSongs, page > 1);

        if (isSearch && songs.length >= queryLimit) { 
            el.loadMoreBtn.classList.remove('hidden');
        } else {
            el.loadMoreBtn.classList.add('hidden');
        }

    } else {
        if (page === 1) {
            document.getElementById('song-list-ul').innerHTML = '<div class="py-12 text-center text-sm text-zinc-500">No tracks found.</div>';
            document.getElementById('song-count-label').textContent = '0 Songs';
        }
        el.loadMoreBtn.classList.add('hidden');
    }
    updateActiveRow();
}

async function loadMoreSongs() {
    state.page++;
    const idOrKw = state.isSearchMode ? state.keyword : state.currentTopListId;
    await loadSongs(idOrKw, document.getElementById('songlist-title').textContent, state.isSearchMode, state.page);
}

function renderSongList(dataList, append = false) {
    document.getElementById('song-count-label').textContent = `${state.viewList.length} Songs`;
    const list = document.getElementById('song-list-ul');
    if (!append) list.innerHTML = '';
    
    const fragment = document.createDocumentFragment();
    const startIndex = state.viewList.length - dataList.length;

    dataList.forEach((item, i) => {
        const viewIndex = startIndex + i;
        const li = document.createElement('li');
        // Optimized layout for mobile
        li.className = "group grid grid-cols-[40px_1fr_40px] md:grid-cols-[40px_4fr_3fr_2fr_40px] gap-2 items-center px-4 py-2.5 rounded-md hover:bg-white/5 transition-colors cursor-pointer text-sm text-zinc-400 song-item";
        li.dataset.id = item.id;
        
        const safeName = escapeHtml(item.name);
        const safeArtist = escapeHtml(item.artist || 'Unknown');
        const safeAlbum = escapeHtml(item.album || '');

        li.innerHTML = `
            <div class="text-center font-mono text-xs song-num group-hover:hidden">${viewIndex + 1}</div>
            <div class="text-center hidden group-hover:block song-play-icon text-white"><svg class="w-4 h-4 mx-auto" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg></div>
            
            <div class="min-w-0 flex flex-col justify-center">
                <div class="truncate font-medium text-zinc-200 group-hover:text-white transition-colors text-sm">${safeName}</div>
                <div class="truncate text-xs text-zinc-500 mt-0.5 md:hidden">${safeArtist}</div>
            </div>

            <div class="hidden md:block min-w-0 truncate">${safeArtist}</div>
            <div class="hidden md:block min-w-0 truncate text-xs text-zinc-600">${safeAlbum}</div>
            
            <div class="text-center flex justify-center">
                <button onclick="addToQueue(event, ${viewIndex})" class="p-1.5 rounded-full hover:bg-white/10 text-zinc-500 hover:text-white transition-colors" title="Play Next">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg>
                </button>
            </div>
        `;
        li.onclick = (e) => { 
            if(e.target.closest('button')) return;
            playSingleFromView(viewIndex); 
        };
        fragment.appendChild(li);
    });
    list.appendChild(fragment);
    if (!append) updateActiveRow();
}

function playAll() {
    if (state.viewList.length === 0) return;
    state.playlist = [...state.viewList];
    state.currentIndex = 0;
    playSong();
    renderQueue();
    saveState(); 
    showToast(`Playing ${state.viewList.length} songs`);
}

function playSingleFromView(viewIndex) {
    const song = state.viewList[viewIndex];
    if (!song) return;
    const existingIndex = state.playlist.findIndex(p => p.id === song.id && p.source === song.source);
    
    if (existingIndex > -1) {
        state.currentIndex = existingIndex;
    } else {
        let insertPos = 0;
        if (state.currentIndex > -1) {
            insertPos = state.currentIndex + 1;
        }
        state.playlist.splice(insertPos, 0, song);
        state.currentIndex = insertPos; 
        renderQueue();
    }
    playSong();
    saveState(); 
}

function addToQueue(e, viewIndex) {
    e.stopPropagation();
    const song = state.viewList[viewIndex];
    if (!song) return;

    let insertPos = 0;
    if (state.currentIndex > -1) {
        insertPos = state.currentIndex + 1;
    }
    state.playlist.splice(insertPos, 0, song);
    renderQueue();
    saveState();
    
    showToast("Added to queue");

    const btn = e.currentTarget;
    const originalHTML = btn.innerHTML;
    btn.innerHTML = `<svg class="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>`;
    setTimeout(() => { btn.innerHTML = originalHTML; }, 1000);
}

function playSong() {
    if (state.currentIndex < 0) return;
    const item = state.playlist[state.currentIndex];
    
    el.playerBar.classList.remove('translate-y-full');
    el.mainScroller.classList.add('mb-24');

    const coverUrl = `${API_BASE_URL}?source=${item.source}&id=${item.id}&type=pic`;
    
    ['bar-cover', 'fp-cover'].forEach(id => {
        const img = document.getElementById(id);
        if(img) {
            img.src = coverUrl;
            img.onerror = () => handleImgError(img);
        }
    });
    
    ['bar-title', 'fp-title', 'fp-title-cover'].forEach(id => {
        const e = document.getElementById(id); if(e) e.textContent = item.name;
    });
    ['bar-artist', 'fp-artist', 'fp-artist-cover'].forEach(id => {
        const e = document.getElementById(id); if(e) e.textContent = item.artist;
    });
    
    el.audio.src = `${API_BASE_URL}?source=${item.source}&id=${item.id}&type=url&br=${state.preferredQuality}`;
    
    const playPromise = el.audio.play();
    if (playPromise !== undefined) {
        playPromise.then(() => setPlayState(true)).catch(err => {
            console.warn("Auto-play blocked or failed:", err);
            setPlayState(false);
        });
    }

    const lyricContainer = document.getElementById('fp-lyric-container');
    lyricContainer.innerHTML = '<p class="text-zinc-500/50 text-sm py-2">Loading...</p>';
    lyricContainer.style.transform = 'translateY(0)';
    state.lyrics = [];
    state.lIdx = -1;
    
    fetchApiData({ source: item.source, id: item.id, type: 'lrc' })
        .then(d => parseLrc(d?.lrc || ''))
        .catch(() => parseLrc(''));

    updateActiveRow();
    updateQueueActive();
    saveState(); 

    if ('mediaSession' in navigator) {
        navigator.mediaSession.metadata = new MediaMetadata({
            title: item.name,
            artist: item.artist,
            artwork: [{ src: coverUrl, sizes: '300x300', type: 'image/jpeg' }]
        });
        navigator.mediaSession.setActionHandler('play', togglePlay);
        navigator.mediaSession.setActionHandler('pause', togglePlay);
        navigator.mediaSession.setActionHandler('previoustrack', playPrev);
        navigator.mediaSession.setActionHandler('nexttrack', playNext);
    }
}

function updateActiveRow() {
    document.querySelectorAll('.song-item').forEach(el => el.classList.remove('active-song', 'text-primary'));
    const currentSong = state.playlist[state.currentIndex];
    if (!currentSong) return;
    const rows = document.querySelectorAll(`.song-item[data-id="${currentSong.id}"]`);
    rows.forEach(row => row.classList.add('active-song', 'text-primary'));
}

function setPlayState(playing) {
    ['icon-play', 'fp-icon-play'].forEach(id => document.getElementById(id).classList.toggle('hidden', playing));
    ['icon-pause', 'fp-icon-pause'].forEach(id => document.getElementById(id).classList.toggle('hidden', !playing));
}

function togglePlay() {
    if (el.audio.paused) { 
        el.audio.play().then(()=>setPlayState(true)).catch(()=>setPlayState(false)); 
    } else { 
        el.audio.pause(); 
        setPlayState(false); 
    }
}

function toggleMode() {
    if (state.playMode === 'sequential') {
        state.playMode = 'loop';
        showToast("Loop All");
    } else if (state.playMode === 'loop') {
        state.playMode = 'single';
        showToast("Loop Single");
    } else {
        state.playMode = 'sequential';
        showToast("Sequential");
    }
    updateModeUI();
    saveState(); 
}

function updateModeUI() {
    const mode = state.playMode;
    const setVis = (el, show) => { if(el) el.classList.toggle('hidden', !show); };

    // Footer
    setVis(document.getElementById('icon-mode-sequential'), mode === 'sequential');
    setVis(document.getElementById('icon-mode-loop'), mode === 'loop');
    setVis(document.getElementById('icon-mode-one'), mode === 'single');

    // Full Player
    setVis(document.getElementById('fp-icon-mode-sequential'), mode === 'sequential');
    setVis(document.getElementById('fp-icon-mode-loop'), mode === 'loop');
    setVis(document.getElementById('fp-icon-mode-one'), mode === 'single');
}

function playNext() { 
    if(state.playlist.length === 0) return;

    if (state.playMode === 'sequential' && state.currentIndex >= state.playlist.length - 1) {
        el.audio.pause();
        setPlayState(false);
        return;
    }
    state.currentIndex = (state.currentIndex + 1) % state.playlist.length; 
    playSong(); 
}

function playPrev() { 
    if(state.playlist.length) { 
        state.currentIndex = (state.currentIndex - 1 + state.playlist.length) % state.playlist.length; 
        playSong(); 
    } 
}


function updateVolume(val) {
    el.audio.volume = val;
    const isMute = val === 0;
    
    ['vol-slider-footer', 'vol-slider-full'].forEach(id => {
        const input = document.getElementById(id);
        if(input) input.value = val;
    });

    const pct = val * 100;
    const fillFooter = document.getElementById('vol-fill-footer');
    const fillFull = document.getElementById('vol-fill-full');
    if(fillFooter) fillFooter.style.height = `${pct}%`;
    if(fillFull) fillFull.style.height = `${pct}%`;

    ['vol-icon-high', 'fp-vol-icon-high'].forEach(id => document.getElementById(id).classList.toggle('hidden', isMute));
    ['vol-icon-mute', 'fp-vol-icon-mute'].forEach(id => document.getElementById(id).classList.toggle('hidden', !isMute));

    if (!isMute) lastVolume = val;
    saveState(); 
}

function toggleMute() {
    if (el.audio.volume > 0) {
        lastVolume = el.audio.volume;
        updateVolume(0);
        showToast("Muted");
    } else {
        updateVolume(lastVolume || 0.5);
        showToast("Unmuted");
    }
}

['vol-slider-footer', 'vol-slider-full'].forEach(id => {
    document.getElementById(id).addEventListener('input', (e) => updateVolume(parseFloat(e.target.value)));
});

el.audio.addEventListener('timeupdate', () => {
    const cur = el.audio.currentTime;
    const dur = el.audio.duration || 0;
    const pct = dur > 0 ? (cur / dur) * 100 : 0;
    
    if(!isDragging) {
        el.progressBar.value = pct;
        el.fpProgressBar.value = pct;
        document.getElementById('progress-fill').style.width = pct + '%';
        document.getElementById('fp-progress-fill').style.width = pct + '%';
        document.getElementById('time-current').textContent = formatDuration(cur);
        document.getElementById('fp-time-current').textContent = formatDuration(cur);
    }
    document.getElementById('time-total').textContent = formatDuration(dur);
    document.getElementById('fp-time-total').textContent = formatDuration(dur);

    if (state.lyrics.length > 0) {
        if (state.lIdx < state.lyrics.length - 1 && cur >= state.lyrics[state.lIdx + 1].t) {
            state.lIdx++;
            updateLyricUI(state.lIdx);
        }
        else if (state.lIdx > -1 && cur < state.lyrics[state.lIdx].t) {
            state.lIdx = state.lyrics.findIndex(l => l.t > cur) - 1;
            if (state.lIdx < -1) state.lIdx = -1; 
            updateLyricUI(state.lIdx);
        }
        else if (state.lIdx === -1 && state.lyrics[0] && cur >= state.lyrics[0].t) {
            state.lIdx = 0;
            updateLyricUI(0);
        }
    }
});

function updateLyricUI(index) {
    if (index < 0) return;
    const activeClass = ['text-white', 'text-2xl', 'font-bold', 'scale-105'];
    const normalClass = ['text-zinc-500', 'scale-100'];
    const prevActive = document.querySelector('.lyric-line.text-white');
    if (prevActive) {
        prevActive.classList.remove(...activeClass);
        prevActive.classList.add(...normalClass);
    }
    const currentLine = document.querySelector(`.lyric-line[data-idx="${index}"]`);
    if (currentLine) {
        currentLine.classList.remove(...normalClass);
        currentLine.classList.add(...activeClass);
        const containerWrapper = document.getElementById('lyric-wrapper');
        if(containerWrapper) {
            const containerHeight = containerWrapper.offsetHeight;
            const rowHeight = 40; 
            const offset = (containerHeight / 2) - (index * rowHeight) - 20; 
            document.getElementById('fp-lyric-container').style.transform = `translateY(${offset}px)`;
        }
    }
}

el.audio.addEventListener('ended', () => {
    if (state.playMode === 'single') {
        el.audio.currentTime = 0;
        el.audio.play();
    } else {
        playNext();
    }
});

[el.progressBar, el.fpProgressBar].forEach(bar => {
    bar.addEventListener('input', (e) => { isDragging = true; });
    bar.addEventListener('change', (e) => { 
        el.audio.currentTime = (e.target.value / 100) * el.audio.duration; 
        isDragging = false; 
    });
});

function showView(name) {
    document.getElementById('view-playlists').classList.add('hidden');
    document.getElementById('view-songs').classList.add('hidden');
    document.getElementById(`view-${name}`).classList.remove('hidden');
    
    if (name === 'songs') {
        if (viewStack[viewStack.length - 1] !== 'songs') {
            viewStack.push('songs');
        }
        document.getElementById('nav-back-wrapper').classList.remove('hidden');
    } else {
        viewStack = ['playlists'];
        document.getElementById('nav-back-wrapper').classList.add('hidden');
    }
    el.mainScroller.scrollTop = 0;
}

function goBack() {
    if(viewStack.length > 1) {
        viewStack.pop();
        showView(viewStack[viewStack.length-1]);
    }
}

function parseLrc(text) {
    const container = document.getElementById('fp-lyric-container');
    if (!text) {
        state.lyrics = [];
        container.innerHTML = '<p class="text-zinc-500/50 text-sm py-2">No lyrics available</p>';
        container.style.transform = `translateY(0px)`;
        return;
    }
    state.lyrics = text.split('\n').reduce((acc, line) => {
        const match = line.match(/\[(\d{2}):(\d{2})(\.\d{2,3})?\](.*)/);
        if (match) {
            acc.push({ 
                t: parseInt(match[1])*60 + parseFloat(match[2]) + (parseFloat(match[3])||0), 
                c: match[4].trim() 
            });
        }
        return acc;
    }, []);
    state.lyrics.sort((a,b) => a.t - b.t);
    if (state.lyrics.length > 0) {
        container.innerHTML = state.lyrics.map((l, i) => 
            `<p class="lyric-line text-zinc-500 transition-all duration-300 h-10 flex items-center justify-center md:justify-start px-4 md:px-0 text-center md:text-left leading-none select-none transform origin-center md:origin-left text-lg cursor-pointer hover:text-zinc-300" data-idx="${i}" onclick="seekTo(${l.t})">
                ${escapeHtml(l.c) || '...'}
             </p>`
        ).join('');
        container.style.transform = `translateY(0px)`;
    } else {
        container.innerHTML = '<p class="text-zinc-500/50 text-sm py-2">Pure Music / No Lyrics</p>';
        container.style.transform = `translateY(0px)`;
    }
}

function seekTo(time) {
    if(el.audio) {
        el.audio.currentTime = time;
        if(el.audio.paused) el.audio.play();
    }
}

function openFullPlayer() { el.fullPlayer.classList.remove('minimized'); }
function closeFullPlayer() { 
    el.fullPlayer.classList.add('minimized'); 
    setTimeout(() => {
        if (window.innerWidth < 768) {
            document.getElementById('fp-view-cover').classList.remove('hidden');
            const lView = document.getElementById('fp-view-lyric');
            lView.classList.add('hidden');
            lView.classList.remove('flex');
        }
    }, 300);
}

function toggleMobileLyrics() {
    if (window.innerWidth >= 768) return;
    const coverView = document.getElementById('fp-view-cover');
    const lyricView = document.getElementById('fp-view-lyric');
    const isShowingCover = !coverView.classList.contains('hidden');
    if (isShowingCover) {
        coverView.classList.add('hidden');
        lyricView.classList.remove('hidden');
        lyricView.classList.add('flex');
        setTimeout(() => updateLyricUI(state.lIdx), 50);
    } else {
        coverView.classList.remove('hidden');
        lyricView.classList.add('hidden');
        lyricView.classList.remove('flex');
    }
}

let dlAbort = null;
function openDownload() { if(state.currentIndex > -1) document.getElementById('dl-modal').classList.remove('hidden'); }
function closeDownload() { document.getElementById('dl-modal').classList.add('hidden'); }
async function doDownload(quality) {
    const item = state.playlist[state.currentIndex];
    const link = document.createElement('a');
    link.href = `${API_BASE_URL}?source=${item.source}&id=${item.id}&type=url&br=${quality}`;
    link.download = `${item.name}-${item.artist}.mp3`;
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    closeDownload();
}

function cycleQuality() {
    const map = {'128k':'320k', '320k':'flac', 'flac':'128k'};
    state.preferredQuality = map[state.preferredQuality] || '128k';
    const labels = {'128k':'STD', '320k':'HQ', 'flac':'SQ'};
    document.getElementById('btn-quality').textContent = labels[state.preferredQuality];
    
    showToast(`Quality: ${labels[state.preferredQuality]}`);
    
    if(state.currentIndex > -1) {
        const curTime = el.audio.currentTime;
        const wasPlaying = !el.audio.paused;
        const item = state.playlist[state.currentIndex];
        el.audio.src = `${API_BASE_URL}?source=${item.source}&id=${item.id}&type=url&br=${state.preferredQuality}`;
        el.audio.currentTime = curTime;
        if(wasPlaying) el.audio.play();
    }
}

function toggleQueue() {
    const isShown = el.queuePanel.classList.contains('show');
    if (isShown) {
        el.queuePanel.classList.remove('show');
    } else {
        el.queuePanel.classList.add('show');
        scrollToActiveQueueItem();
    }
}

document.addEventListener('click', (e) => {
    if (el.queuePanel.classList.contains('show') && 
        !el.queuePanel.contains(e.target) && 
        !e.target.closest('button[onclick="toggleQueue()"]')) {
        el.queuePanel.classList.remove('show');
    }
});

function renderQueue() {
    const list = el.queueList;
    list.innerHTML = '';
    const count = state.playlist.length;
    el.queueTotal.textContent = `${count} tracks`;
    if (el.queueBadge) {
        el.queueBadge.textContent = count;
        el.queueBadge.classList.toggle('hidden', count === 0);
    }
    if (count === 0) {
        list.innerHTML = '<div class="text-center text-zinc-600 text-sm py-8">Queue is empty</div>';
        return;
    }
    const fragment = document.createDocumentFragment();
    state.playlist.forEach((item, i) => {
        const div = document.createElement('div');
        div.className = `queue-item group flex items-center justify-between p-3 rounded-lg hover:bg-white/5 cursor-pointer transition-colors ${i === state.currentIndex ? 'bg-white/10' : ''}`;
        div.onclick = () => { state.currentIndex = i; playSong(); };
        div.dataset.qIdx = i;
        const activeClass = i === state.currentIndex ? 'text-primary font-bold' : 'text-zinc-300';
        const artistClass = i === state.currentIndex ? 'text-primary/70' : 'text-zinc-500';
        div.innerHTML = `
            <div class="flex items-center gap-3 min-w-0 flex-1">
                ${i === state.currentIndex 
                    ? `<div class="w-2 h-2 rounded-full bg-primary shrink-0 animate-pulse"></div>` 
                    : `<div class="w-2 h-2 text-zinc-600 text-[10px] opacity-0 group-hover:opacity-100">${i+1}</div>`}
                <div class="min-w-0 flex flex-col">
                    <span class="text-sm truncate ${activeClass}">${escapeHtml(item.name)}</span>
                    <span class="text-xs truncate ${artistClass}">${escapeHtml(item.artist)}</span>
                </div>
            </div>
            <button onclick="removeFromQueue(event, ${i})" class="text-zinc-600 hover:text-red-500 p-2 opacity-0 group-hover:opacity-100 transition-opacity" title="Remove">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
            </button>
        `;
        fragment.appendChild(div);
    });
    list.appendChild(fragment);
}

function updateQueueActive() {
    const items = document.querySelectorAll('.queue-item');
    items.forEach((item, i) => {
        const isActive = i === state.currentIndex;
        if (isActive) item.classList.add('bg-white/10');
        else item.classList.remove('bg-white/10');
    });
    renderQueue(); 
}

function scrollToActiveQueueItem() {
    setTimeout(() => {
        const activeItem = el.queueList.querySelector(`.queue-item[data-qIdx="${state.currentIndex}"]`);
        if (activeItem) {
            activeItem.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    }, 100);
}

function removeFromQueue(e, index) {
    e.stopPropagation();
    state.playlist.splice(index, 1);
    
    if (index < state.currentIndex) {
        state.currentIndex--;
    } 
    else if (index === state.currentIndex) {
        if (state.playlist.length === 0) {
            state.currentIndex = -1;
            el.audio.pause();
            el.audio.src = '';
            setPlayState(false);
            el.progressBar.value = 0;
            document.getElementById('progress-fill').style.width = '0%';
            document.getElementById('time-current').textContent = '0:00';
            document.getElementById('time-total').textContent = '0:00';
            parseLrc('');
            ['bar-cover', 'fp-cover'].forEach(id => {
               const img = document.getElementById(id);
               if(img) img.src = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
            });
            ['bar-title', 'fp-title', 'fp-title-cover'].forEach(id => {
                const e = document.getElementById(id); if(e) e.textContent = 'Select a Song';
            });
            ['bar-artist', 'fp-artist', 'fp-artist-cover'].forEach(id => {
                const e = document.getElementById(id); if(e) e.textContent = 'Artist';
            });
        } else {
            if (state.currentIndex >= state.playlist.length) state.currentIndex = 0;
            playSong();
        }
    }
    
    renderQueue();
    updateActiveRow();
    saveState(); 
}

function clearQueue() {
    if (state.currentIndex > -1 && state.playlist.length > 0) {
        const currentSong = state.playlist[state.currentIndex];
        state.playlist = [currentSong];
        state.currentIndex = 0;
        showToast("Queue cleared (Playing song kept)");
    } else {
        state.playlist = [];
        state.currentIndex = -1;
        el.audio.pause();
        el.audio.src = '';
        setPlayState(false);
        showToast("Queue cleared");
    }

    renderQueue();
    updateActiveRow();
    saveState(); 
}

// --- Keyboard Shortcuts ---

document.addEventListener('keydown', (e) => {
    const target = e.target;
    if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) return;

    const isCtrl = e.ctrlKey || e.metaKey;

    switch (e.code) {
        case 'Space': 
            e.preventDefault(); 
            togglePlay();
            break;

        case 'ArrowLeft':
            if (isCtrl) {
                playPrev();
            } else {
                e.preventDefault();
                if (el.audio && el.audio.duration) {
                    el.audio.currentTime = Math.max(0, el.audio.currentTime - 5);
                }
            }
            break;

        case 'ArrowRight':
            if (isCtrl) {
                playNext();
            } else {
                e.preventDefault();
                if (el.audio && el.audio.duration) {
                    el.audio.currentTime = Math.min(el.audio.duration, el.audio.currentTime + 5);
                }
            }
            break;

        case 'ArrowUp':
            e.preventDefault(); 
            if (el.audio) {
                const newVol = Math.min(1, el.audio.volume + 0.1);
                updateVolume(Math.round(newVol * 10) / 10);
            }
            break;

        case 'ArrowDown':
            e.preventDefault();
            if (el.audio) {
                const newVol = Math.max(0, el.audio.volume - 0.1);
                updateVolume(Math.round(newVol * 10) / 10);
            }
            break;
            
        case 'KeyM':
            toggleMute();
            break;

        case 'Escape':
            const dlModal = document.getElementById('dl-modal');
            if (dlModal && !dlModal.classList.contains('hidden')) {
                closeDownload();
            } else if (!el.fullPlayer.classList.contains('minimized')) {
                closeFullPlayer();
            } else if (el.queuePanel.classList.contains('show')) {
                toggleQueue(); 
            }
            break;
    }
});