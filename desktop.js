function updateClock() {
    document.getElementById("clock").textContent = new Date().toLocaleTimeString();
}
setInterval(updateClock, 1000);
updateClock();

document.getElementById("volume-control").addEventListener("input", function () {
    document.querySelectorAll("audio, video").forEach(el => el.volume = this.value / 100);
});

const sPages = ['s-p1', 's-p2', 's-p3', 's-p4', 's-p5', 's-p6', 's-p7'];
function sNav(id) {
    sPages.forEach(p => {
        const el = document.getElementById(p);
        if (el) el.classList.toggle('hidden', p !== id);
    });
}

function changeWallpaper(el) {
    const url = el.dataset.url;
    document.body.style.backgroundImage = `url(${url})`;
    document.querySelectorAll('.thumb').forEach(t => t.classList.remove('active'));
    el.classList.add('active');
    localStorage.setItem('savedBg', url);
}

const savedBg = localStorage.getItem('savedBg');
if (savedBg) {
    document.body.style.backgroundImage = `url(${savedBg})`;
    const activeThumb = document.querySelector(`[data-url="${savedBg}"]`);
    if (activeThumb) activeThumb.classList.add('active');
}

let zTop = 500;
function bringToFront(win) { win.style.zIndex = ++zTop; }

function makeDraggable(win) {
    const handle = win.querySelector('.window-titlebar');
    let active = false, ox, oy, startL, startB;

    handle.addEventListener('mousedown', e => {
        if (win.classList.contains('maximized')) return;

        if (!win.dataset.positioned) {
            const r = win.getBoundingClientRect();
            win.style.left = r.left + 'px';
            win.style.bottom = (window.innerHeight - r.bottom) + 'px';
            win.style.transform = 'none';
            win.dataset.positioned = '1';
        }
        active = true;
        ox = e.clientX; oy = e.clientY;
        startL = parseInt(win.style.left);
        startB = parseInt(win.style.bottom);
        win.classList.add('dragging');
        e.preventDefault();
    });

    document.addEventListener('mousemove', e => {
        if (!active) return;
        win.style.left = startL + (e.clientX - ox) + 'px';
        win.style.bottom = startB - (e.clientY - oy) + 'px';
    });

    document.addEventListener('mouseup', () => {
        if (active) { active = false; win.classList.remove('dragging'); }
    });

    win.addEventListener('mousedown', () => bringToFront(win));
}

function setupWindow(winId, btnId) {
    const win = document.getElementById(winId);
    const btn = document.getElementById(btnId);
    if(!win || !btn) return;

    btn.addEventListener('click', () => {
        const open = win.classList.contains('open');
        const minimized = win.classList.contains('minimized');
        if (!open || minimized) {
            win.classList.add('open');
            win.classList.remove('minimized');
            bringToFront(win);
            
            
            if (winId === 'cameraWindow') startCamera();
            if (winId === 'galleryWindow') loadGallery();
        } else {
            win.classList.remove('open', 'maximized', 'minimized');
            if (winId === 'cameraWindow') stopCamera();
        }
    });

    win.querySelector('.win-close').addEventListener('click', e => {
        e.stopPropagation();
        win.classList.remove('open', 'maximized', 'minimized');
        if (winId === 'cameraWindow') stopCamera();
    });

    win.querySelector('.win-min').addEventListener('click', e => {
        e.stopPropagation();
        win.classList.add('minimized');
        if (winId === 'cameraWindow') stopCamera();
    });

    win.querySelector('.win-max').addEventListener('click', e => {
        e.stopPropagation();
        win.classList.remove('minimized');
        win.classList.toggle('maximized');
    });

    makeDraggable(win);
}

setupWindow('settingsWindow', 'settingsIcon');
setupWindow('appDrawerWindow', 'appDrawerIcon');
setupWindow('browserWindow', 'browserBtn');
setupWindow('cameraWindow', 'cameraBtn');
setupWindow('galleryWindow', 'galleryBtn');

document.getElementById('quickThumbBtn').addEventListener('click', () => {
    const galWin = document.getElementById('galleryWindow');
    galWin.classList.add('open');
    galWin.classList.remove('minimized');
    bringToFront(galWin);
    loadGallery();
});

const urlBar = document.getElementById('urlBar');
const goBtn = document.getElementById('goBtn');
const frame = document.getElementById('browserFrame');

function navigate() {
    let url = urlBar.value.trim();
    if (!url) return;
    if (!/^https?:\/\//i.test(url)) {
        url = 'https://www.google.com/search?igu=1&q=' + encodeURIComponent(url);
    }
    try { frame.src = url; } catch (_) {}
}
goBtn.addEventListener('click', navigate);
urlBar.addEventListener('keydown', e => { if (e.key === 'Enter') navigate(); });

const video = document.getElementById('videoFeed');
const canvas = document.getElementById('photoCanvas');
const shutterBtn = document.getElementById('shutterBtn');
const shutterInner = document.getElementById('shutterInner');
const galleryGrid = document.getElementById('galleryGrid');
const clearBtn = document.getElementById('clearBtn');
const quickPreview = document.getElementById('quickPreview');
const previewFallback = document.getElementById('previewFallback');
const recIndicator = document.getElementById('recIndicator');
const recTimer = document.getElementById('recTimer');

let stream = null;
let mediaRecorder = null;
let recordedChunks = [];
let currentMode = 'photo';
let isRecording = false;
let timerInterval = null;

async function startCamera() {
    if (stream) return;
    try {
        stream = await navigator.mediaDevices.getUserMedia({ 
            video: { width: { ideal: 1280 }, height: { ideal: 720 } }, 
            audio: true 
        });
        video.srcObject = stream;
        updateQuickPreview();
    } catch (err) {
        console.error("Camera access denied or missing.", err);
    }
}

function stopCamera() {
    if (isRecording) stopVideoRecording();
    if (stream) {
        stream.getTracks().forEach(track => track.stop());
        video.srcObject = null;
        stream = null;
    }
}

function setMode(mode) {
    if (isRecording) return;
    currentMode = mode;
    const btnPhoto = document.getElementById('modePhoto');
    const btnVideo = document.getElementById('modeVideo');

    if (mode === 'photo') {
        btnPhoto.className = "text-white border-b-2 border-white pb-0.5 transition-all";
        btnVideo.className = "text-zinc-400 hover:text-zinc-200 pb-0.5 transition-all";
        shutterInner.className = "absolute inset-1 rounded-full border-2 border-black/80 bg-white transition-all";
    } else {
        btnVideo.className = "text-white border-b-2 border-white pb-0.5 transition-all";
        btnPhoto.className = "text-zinc-400 hover:text-zinc-200 pb-0.5 transition-all";
        shutterInner.className = "absolute inset-1 rounded-full border-2 border-black/80 bg-rose-600 transition-all";
    }
}

shutterBtn.addEventListener('click', () => {
    if (!stream) return;
    if (currentMode === 'photo') {
        takeSnapshot();
    } else {
        if (!isRecording) startVideoRecording();
        else stopVideoRecording();
    }
});

function takeSnapshot() {
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
    saveToStorage({ type: 'photo', data: dataUrl });

    video.classList.add('opacity-30');
    setTimeout(() => video.classList.remove('opacity-30'), 100);
}

function startVideoRecording() {
    isRecording = true;
    recordedChunks = [];
    shutterInner.classList.add('scale-75', 'rounded-md');
    recIndicator.classList.remove('hidden');

    mediaRecorder = new MediaRecorder(stream, { mimeType: 'video/webm;codecs=vp8' });
    mediaRecorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) recordedChunks.push(e.data);
    };

    mediaRecorder.onstop = () => {
        const blob = new Blob(recordedChunks, { type: 'video/webm' });
        const reader = new FileReader();
        reader.readAsDataURL(blob);
        reader.onloadend = () => {
            saveToStorage({ type: 'video', data: reader.result });
        };
    };

    mediaRecorder.start();
    startTimer();
}

function stopVideoRecording() {
    if (!isRecording) return;
    isRecording = false;
    shutterInner.classList.remove('scale-75', 'rounded-md');
    recIndicator.classList.add('hidden');
    mediaRecorder.stop();
    stopTimer();
}

function startTimer() {
    let seconds = 0;
    recTimer.textContent = "00:00";
    timerInterval = setInterval(() => {
        seconds++;
        let mins = Math.floor(seconds / 60).toString().padStart(2, '0');
        let secs = (seconds % 60).toString().padStart(2, '0');
        recTimer.textContent = `${mins}:${secs}`;
    }, 1000);
}

function stopTimer() { clearInterval(timerInterval); }

function saveToStorage(mediaObj) {
    let mediaItems = JSON.parse(localStorage.getItem('os_media')) || [];
    mediaItems.unshift(mediaObj);
    try {
        localStorage.setItem('os_media', JSON.stringify(mediaItems));
    } catch (e) {
        alert("Storage is full, bro! Purge some old assets from your gallery.");
    }
    updateQuickPreview();
    loadGallery();
}

function updateQuickPreview() {
    let mediaItems = JSON.parse(localStorage.getItem('os_media')) || [];
    if (mediaItems.length > 0) {
        const lastItem = mediaItems[0];
        if (lastItem.type === 'photo') {
            quickPreview.src = lastItem.data;
            quickPreview.classList.remove('hidden');
            previewFallback.classList.add('hidden');
        } else {
            quickPreview.classList.add('hidden');
            previewFallback.textContent = "📹";
            previewFallback.classList.remove('hidden');
        }
    } else {
        quickPreview.classList.add('hidden');
        previewFallback.textContent = "🖼️";
        previewFallback.classList.remove('hidden');
    }
}

function loadGallery() {
    galleryGrid.innerHTML = '';
    let mediaItems = JSON.parse(localStorage.getItem('os_media')) || [];

    if (mediaItems.length === 0) {
        galleryGrid.innerHTML = `
            <div class="col-span-3 flex flex-col items-center justify-center p-12 text-zinc-500 border border-dashed border-white/10 rounded-xl mt-4">
                <p class="text-xs uppercase tracking-wider">Gallery Is Empty</p>
            </div>`;
        return;
    }

    mediaItems.forEach((item, index) => {
        const card = document.createElement('div');
        card.className = "group relative aspect-video bg-zinc-950 rounded-xl overflow-hidden border border-white/5 shadow-md cursor-pointer hover:border-white/20 transition-all";
        
        if (item.type === 'photo') {
            card.innerHTML = `
                <img src="${item.data}" onclick="openLightbox('photo', '${item.data}')" class="w-full h-full object-cover group-hover:scale-102 transition-transform" />
                <span class="absolute bottom-2 left-2 bg-black/60 text-white text-[9px] px-1.5 py-0.5 rounded tracking-wider pointer-events-none">IMG</span>
            `;
        } else {
            card.innerHTML = `
                <div onclick="openLightbox('video', '${item.data}')" class="w-full h-full relative flex items-center justify-center bg-zinc-900">
                    <video src="${item.data}" class="w-full h-full object-cover opacity-80 pointer-events-none"></video>
                    <div class="absolute inset-0 flex items-center justify-center text-2xl group-hover:scale-110 transition-transform">▶️</div>
                </div>
                <span class="absolute bottom-2 left-2 bg-rose-600 text-white text-[9px] px-1.5 py-0.5 rounded tracking-wider pointer-events-none">MOV</span>
            `;
        }

        const actions = document.createElement('div');
        actions.className = "absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity z-10";
        actions.innerHTML = `
            <button onclick="event.stopPropagation(); deleteMedia(${index})" class="bg-black/70 hover:bg-rose-600 border border-white/10 text-white text-xs w-6 h-6 rounded-md flex items-center justify-center transition-colors">✕</button>
        `;
        card.appendChild(actions);
        galleryGrid.appendChild(card);
    });
}

function openLightbox(type, src) {
    const lightbox = document.getElementById('mediaLightbox');
    const lImg = document.getElementById('lightboxImg');
    const lVid = document.getElementById('lightboxVideo');

    lImg.classList.add('hidden');
    lVid.classList.add('hidden');
    lVid.src = "";

    if (type === 'photo') {
        lImg.src = src;
        lImg.classList.remove('hidden');
    } else {
        lVid.src = src;
        lVid.classList.remove('hidden');
    }

    lightbox.classList.remove('opacity-0', 'pointer-events-none');
}

function closeLightbox() {
    const lightbox = document.getElementById('mediaLightbox');
    document.getElementById('lightboxVideo').pause();
    lightbox.classList.add('opacity-0', 'pointer-events-none');
}

function deleteMedia(index) {
    let mediaItems = JSON.parse(localStorage.getItem('os_media')) || [];
    mediaItems.splice(index, 1);
    localStorage.setItem('os_media', JSON.stringify(mediaItems));
    loadGallery();
    updateQuickPreview();
}

clearBtn.addEventListener('click', () => {
    if (confirm("Wipe all locally captured media from the OS grid?")) {
        localStorage.removeItem('os_media');
        loadGallery();
        updateQuickPreview();
    }
});

updateQuickPreview();
