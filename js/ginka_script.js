// ======================================================
// GINKA Style Script v10.1 - Final Complete Version
// ======================================================

console.log("[GINKA] Script v10.1 loaded. Starting to wait for APlayer...");

let aplayerCheckRetries = 0;
const aplayerCheckMaxRetries = 50; // Wait for 5 seconds max

const aplayerCheckInterval = setInterval(() => {
    aplayerCheckRetries++;
    
    if (typeof APlayer !== 'undefined') {
        clearInterval(aplayerCheckInterval);
        console.log(`[GINKA] APlayer is available after ${aplayerCheckRetries * 100}ms! Initializing modules...`);
        runGinkaModules();
    } else {
        console.log("[GINKA] Waiting for APlayer library to be defined...");
        if (aplayerCheckRetries >= aplayerCheckMaxRetries) {
            clearInterval(aplayerCheckInterval);
            console.error("[GINKA] FATAL: APlayer library not found after 5 seconds. Aborting.");
        }
    }
}, 100);

function runGinkaModules() {
    executeOnce('ginka-player', () => {
        const playerUI = document.createElement('div');
        playerUI.id = 'ginka-music-player';
        playerUI.classList.add('expanded');
        playerUI.innerHTML = `
            <div class="ginka-player-body">
              <div class="ginka-player-info">
                  <img class="ginka-player-cover" src="">
                  <div class="ginka-player-meta">
                      <div class="title">Loading...</div>
                      <div class="artist">Ginka</div>
                  </div>
              </div>
              <div class="ginka-player-controls">
                  <button id="ginka-prev-btn" title="上一首"><i class="fas fa-step-backward"></i></button>
                  <button id="ginka-toggle-btn" title="播放/暂停"><i class="fas fa-play"></i></button>
                  <button id="ginka-next-btn" title="下一首"><i class="fas fa-step-forward"></i></button>
              </div>
            </div>
            <button id="ginka-minimize-btn" title="最小化">
              <i class="fas fa-compress-alt"></i>
            </button>
        `;
        document.body.appendChild(playerUI);

        const aplayerInstance = new APlayer({
            container: document.createElement('div'),
            audio: [
                { name: '梦浮桥', artist: 'GINKA', url: 'https://music.163.com/song/media/outer/url?id=2120740212.mp3', cover: 'https://p2.music.126.net/L-l_i5lO-0U2_2UuE-2U2A==/109951169228809861.jpg' },
                { name: '夏天的风', artist: '温岚', url: 'https://music.163.com/song/media/outer/url?id=28812555.mp3', cover: 'https://p2.music.126.net/Y_x-sYc9-g-Uv_d_y-eY-w==/109951163412709669.jpg' }
            ],
            loop: 'all', order: 'random', preload: 'auto', volume: 0.7,
        });

        const toggleBtnIcon = document.querySelector('#ginka-toggle-btn i');
        const minimizeBtn = document.getElementById('ginka-minimize-btn');

        document.getElementById('ginka-toggle-btn').onclick = () => aplayerInstance.toggle();
        document.getElementById('ginka-next-btn').onclick = () => aplayerInstance.skipForward();
        document.getElementById('ginka-prev-btn').onclick = () => aplayerInstance.skipBack();
        
        minimizeBtn.onclick = () => {
            playerUI.classList.toggle('minimized');
            const isMinimized = playerUI.classList.contains('minimized');
            minimizeBtn.querySelector('i').className = isMinimized ? 'fas fa-expand-alt' : 'fas fa-compress-alt';
            minimizeBtn.title = isMinimized ? '展开' : '最小化';
        };

        const updateUI = () => {
            if (!aplayerInstance.list.audios[aplayerInstance.list.index]) return;
            const song = aplayerInstance.list.audios[aplayerInstance.list.index];
            playerUI.querySelector('.ginka-player-cover').src = song.cover;
            playerUI.querySelector('.title').textContent = song.name;
            playerUI.querySelector('.artist').textContent = song.artist;
            toggleBtnIcon.className = aplayerInstance.audio.paused ? 'fas fa-play' : 'fas fa-pause';
        };

        aplayerInstance.on('play', updateUI);
        aplayerInstance.on('pause', updateUI);
        aplayerInstance.on('listswitch', updateUI);
        aplayerInstance.on('loadstart', updateUI);
        
        makeDraggable(playerUI);
        console.log("[GINKA] Module [Draggable Player] initialized successfully.");
    });
    
    executeOnce('ginka-actions', () => {
        if (document.documentElement.classList.contains('post-page')) {
            let retries = 0;
            const maxRetries = 15;
            const interval = setInterval(() => {
                const article = document.getElementById("post-content");
                if (article) {
                    clearInterval(interval);
                    if (!article.querySelector(".article-actions")) {
                        const actionsDiv = document.createElement("div");
                        actionsDiv.className = "article-actions";
                        actionsDiv.innerHTML = '<button class="ginka-btn like-btn">👍 点赞支持</button><button class="ginka-btn dislike-btn">💕 喜欢就好</button>';
                        actionsDiv.querySelector('.like-btn').addEventListener('click', () => alert("感谢点赞！💕"));
                        actionsDiv.querySelector('.dislike-btn').addEventListener('click', () => alert("不允许点踩哦～😊"));
                        article.appendChild(actionsDiv);
                        console.log("[GINKA] Module [Article Actions] initialized.");
                    }
                } else {
                    retries++;
                    if (retries >= maxRetries) {
                        clearInterval(interval);
                        console.error("[GINKA] Could not find post content area for actions.");
                    }
                }
            }, 200);
        }
    });
}

const initRegistry = new Set();
function executeOnce(id, func) {
    if (!initRegistry.has(id)) {
        initRegistry.add(id);
        try { func(); } catch (e) { console.error(`[GINKA] Error initializing module [${id}]:`, e); }
    }
}

function makeDraggable(element) {
    let pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;
    element.onmousedown = dragMouseDown;
    function dragMouseDown(e) {
        e = e || window.event;
        if (e.target.tagName === 'BUTTON' || e.target.parentElement.tagName === 'BUTTON') return;
        e.preventDefault();
        pos3 = e.clientX; pos4 = e.clientY;
        document.onmouseup = closeDragElement; document.onmousemove = elementDrag;
    }
    function elementDrag(e) {
        e = e || window.event; e.preventDefault();
        pos1 = pos3 - e.clientX; pos2 = pos4 - e.clientY;
        pos3 = e.clientX; pos4 = e.clientY;
        element.style.top = (element.offsetTop - pos2) + "px";
        element.style.left = (element.offsetLeft - pos1) + "px";
    }
    function closeDragElement() { document.onmouseup = null; document.onmousemove = null; }
}