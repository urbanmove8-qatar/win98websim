    // --- LocalStorage File System ---
    const FileSystem = {
    init() {
        if (!localStorage.getItem('win98_files')) {
            localStorage.setItem('win98_files', JSON.stringify({
                'credits.txt': {
                    content: `# Projekt neve: Windows 98 Web Szimulátor
# Leírás: Egy böngészőalapú emulációs környezet, amely a Windows 98 operációs rendszer felhasználói felületét és alapvető alkalmazásait utánozza.
# Fő funkciók: Asztal, Start menü, Jegyzettömb, Paint, Internet Explorer, Windows Media Player, stb.
# Fejlesztők: NagyLevediScratch10 és csapata
# Verzió: Windows 98 Web Szimulátor v0.9 Béta
# Dátum: 2025. November. 26.

---
## FŐ CSAPAT / VEZETŐ KÖZREMŰKÖDŐK
---
Fejlesztő- NagyLevediScratch10 @NagyLevediScratch10
    * Elsődleges felelősség/Fő hozzájárulás.
    * Másodlagos felelősség.
    * Projektmenedzsment és koordináció..
---
## TOVÁBBI KÖZREMŰKÖDŐK
---
https://win98icons.alexmeub.com - Windows 98 ikonok gyűjteménye.
https://iframe.chat - Chattable iframe használata az MSN Messenger alkalmazásban.
https://101soundboard.com - Hangok forrása.
https://pixabay.com - Ingyenes egér kattintás hangja.
https://rw-deisgner.com - Saját egérmutató készítése.
https://98.js.org - 3D Pinball és Aknakereső játékok forrása.
Mat Brennan (loadx) - Nyílt forrású Wolfenstein 3D HTML5 port. Link: https://github.com/loadx/html5-wolfenstein3D

---
## KÜLÖN KÖSZÖNET
---
Köszönetünket fejezzük ki mindazoknak, akik visszajelzést adtak, hibákat jelentettek és támogatták a fejlesztési folyamatot.

* A Béta Tesztelő közösségnek a szigorú tesztelésért.
* az Urbanmove 8 a fejlesztési idő szponzorálásáért.`,
                    readOnly: true,
                    type: 'text'
                },
                'badday.mp4': {
                    content: 'https://files.catbox.moe/2rhof5.mp4',
                    readOnly: false,
                    type: 'media'
                },
                // localStorage.clear();
            }));
        }
        if (!localStorage.getItem('win98_recycle_bin')) {
            localStorage.setItem('win98_recycle_bin', JSON.stringify([]));
        }
    },
    save(filename, content, type = 'text') {
        const files = JSON.parse(localStorage.getItem('win98_files'));
        files[filename] = { content, readOnly: false, type };
        localStorage.setItem('win98_files', JSON.stringify(files));
    },
    load(filename) {
        const files = JSON.parse(localStorage.getItem('win98_files'));
        return files[filename] || null;
    },
    delete(filename) {
        const files = JSON.parse(localStorage.getItem('win98_files'));
        const file = files[filename];
        if (file) {
            const recycleBin = JSON.parse(localStorage.getItem('win98_recycle_bin'));
            recycleBin.push({ filename, ...file, deletedAt: new Date().toISOString() });
            localStorage.setItem('win98_recycle_bin', JSON.stringify(recycleBin));
            delete files[filename];
            localStorage.setItem('win98_files', JSON.stringify(files));
            return true;
        }
        return false;
    },
    list() {
        return JSON.parse(localStorage.getItem('win98_files'));
    },
    getRecycleBin() {
        return JSON.parse(localStorage.getItem('win98_recycle_bin'));
    },
    restore(index) {
        const recycleBin = JSON.parse(localStorage.getItem('win98_recycle_bin'));
        const file = recycleBin[index];
        if (file) {
            const files = JSON.parse(localStorage.getItem('win98_files'));
            const { filename, deletedAt, ...fileData } = file;
            files[filename] = fileData;
            localStorage.setItem('win98_files', JSON.stringify(files));
            recycleBin.splice(index, 1);
            localStorage.setItem('win98_recycle_bin', JSON.stringify(recycleBin));
            return true;
        }
        return false;
    },
    emptyRecycleBin() {
        const recycleBin = JSON.parse(localStorage.getItem('win98_recycle_bin'));
        // Keep read-only files in recycle bin, only delete non-readonly files
        const protectedFiles = recycleBin.filter(file => file.readOnly);
        localStorage.setItem('win98_recycle_bin', JSON.stringify(protectedFiles));
        return recycleBin.length - protectedFiles.length; // Return count of deleted files
    }
}; // <--- This closing brace was missing!

    // Initialize file system
    FileSystem.init();

    let windows = [];
    let zIndexCounter = 200;
    let windowCounter = 0;
    let activeWindow = null;
    let dragInfo = null;
    let iconDragInfo = null;
    let selectedIcon = null;
    
    // Global monitor for window count - triggers BSoD at 100+ programs
    let bsodCheckInterval = setInterval(() => {
        const processCount = windows.length;
        if (processCount > 100 && !window.bsodTriggering) {
            window.bsodTriggering = true;
            clearInterval(bsodCheckInterval);
            playSound('error');
            showMessageBox({
                title: 'Kritikus rendszerhiba',
                message: `Túl sok program fut! (${processCount} program)\n\nA rendszer instabillá vált és összeomlott.`,
                icon: 'error',
                buttons: [{
                    text: 'OK',
                    callback: () => {
                        setTimeout(() => triggerBSOD(), 1000);
                    }
                }]
            });
        }
    }, 1000); // Check every second

    // --- Context Menu ---
    function showContextMenu(x, y, items, target) {
        const menu = document.getElementById('context-menu');
        menu.innerHTML = items.map(item => {
            if (item === 'separator') {
                return '<div class="context-menu-separator"></div>';
            }
            return `<div class="context-menu-item" data-action="${item.action}">${item.label}</div>`;
        }).join('');
        
        menu.style.left = x + 'px';
        menu.style.top = y + 'px';
        menu.style.display = 'block';
        
        menu.querySelectorAll('.context-menu-item').forEach(item => {
            item.onclick = () => {
                const action = item.dataset.action;
                if (typeof window[action] === 'function') {
                    window[action](target);
                } else {
                    eval(action);
                }
                hideContextMenu();
            };
        });
    }

    function hideContextMenu() {
        document.getElementById('context-menu').style.display = 'none';
    }

    document.addEventListener('click', hideContextMenu);
    document.addEventListener('contextmenu', (e) => {
        e.preventDefault();
    });

    // --- Special URL Mappings ---
    // Whitelisted external sources for the Internet Explorer iframe
    const WHITELIST_PREFIX = "https://urbanmove8.neocities.org/retro1998/";
    const localPageMap = {
        "local://overview.html": { title: "local://overview.html", externalSrc: WHITELIST_PREFIX },
        "httpub://apple.com": { title: "Apple - Think different", externalSrc: WHITELIST_PREFIX + "apple" },
        "httpub://microsoft.com": { title: "Microsoft - Hová akarsz ma eljutni?", externalSrc: WHITELIST_PREFIX + "microsoft" },
        "httpub://coolmathgames.com": { title: "CoolMath Games - Where Logic & Thinking Meets Fun & Games", externalSrc: WHITELIST_PREFIX + "cmg" },
        "httpub://bme.hu": { title: "Budapesti Műszaki Egyetem - WWW FŐoldal", externalSrc: WHITELIST_PREFIX + "bme" },
        "httpub://aol.com": { title: "AOL.COM - Your Internet Starting Point", externalSrc: WHITELIST_PREFIX + "aol" },
        "httpub://kekhegyvaros.hu": { title: "KÉKHEGY.HU - Kékhegy Város Hivatalos Honlapja", externalSrc: WHITELIST_PREFIX + "kekhegy" },
        "httpub://hampsterdance.com": { title: "Hamp Dance - Geocities", externalSrc: WHITELIST_PREFIX + "hampsterdance" },
        "httpub://youareanidiot.org": { title: "You are an idiot! Ha-Ha-Ha-Ha-Ha-Ha-Ha! Ha-Ha-Ha-Ha-Ha-Ha-Ha!", externalSrc: "special://youareanidiot", isSpecial: true }
    };

    // --- Sound Helper ---
    function playSound(id) {
        const audio = document.getElementById(`audio-${id}`);
        if (audio) {
            audio.currentTime = 0;
            audio.play().catch(e => console.error("Audio playback failed:", e));
        }
    }

    // --- Time Update ---
    function updateTime() {
        const now = new Date();
        const timeString = now.toLocaleTimeString('hu-HU', { hour: '2-digit', minute: '2-digit', hour12: false }); // 24H format (hh:mm)
        document.getElementById('taskbar-time').textContent = timeString;
    }
    setInterval(updateTime, 1000);
    updateTime();

    // --- Start Menu ---
    const startButton = document.getElementById('start-button');
    const startMenu = document.getElementById('start-menu');

    function toggleStartMenu(event) {
        startMenu.style.display = startMenu.style.display === 'flex' ? 'none' : 'flex';
        if (startMenu.style.display === 'flex') {
            playSound('click');
        }
        event.stopPropagation();
    }

    function hideStartMenu() {
        startMenu.style.display = 'none';
    }

    startButton.addEventListener('click', toggleStartMenu);
    document.addEventListener('click', (e) => {
        if (startMenu.style.display === 'flex' && !startMenu.contains(e.target) && e.target !== startButton) {
            hideStartMenu();
        }
    });

    // --- Window Management ---

    function focusWindow(windowElement) {
        if (activeWindow) {
            activeWindow.classList.remove('active');
        }
        windowElement.style.zIndex = ++zIndexCounter;
        windowElement.classList.add('active');
        activeWindow = windowElement;

        // Update taskbar button appearance
        const taskbarBtn = document.getElementById(`taskbtn-${windowElement.id}`);
        if(taskbarBtn) {
             taskbarBtn.style.fontWeight = 'bold';
        }

        // Restore minimize state if clicking on a minimized window
        if (windowElement.classList.contains('minimized')) {
            restoreWindow(windowElement);
        }
    }

    function createWindow({ title, icon, width, height, content, id = `window-${windowCounter++}` }) {
        playSound('open');
        const windowElement = document.createElement('div');
        windowElement.className = 'window';
        windowElement.id = id;
        windowElement.style.width = `${width}px`;
        windowElement.style.height = `${height}px`;
        const offset = (windows.length % 10) * 20;
        
        // Center the window initially with an offset
        const centerX = (window.innerWidth / 2) - (width / 2) + offset;
        const centerY = (window.innerHeight / 2) - (height / 2) + offset;
        
        windowElement.style.left = `${Math.max(20, centerX)}px`;
        windowElement.style.top = `${Math.max(20, centerY)}px`;

        windowElement.innerHTML = `
            <div class="titlebar">
                <img src="${icon}" class="titlebar-icon" alt="Ikon">
                <span class="titlebar-text">${title}</span>
                <div class="titlebar-buttons">
                    <button class="btn minimize-btn" data-window-id="${id}">_</button>
                    <button class="btn maximize-btn" data-window-id="${id}">&#9633;</button>
                    <button class="btn close-btn" data-window-id="${id}">X</button>
                </div>
            </div>
            <div class="window-content">${content}</div>
        `;

        document.getElementById('desktop').appendChild(windowElement);
        windows.push(windowElement);
        focusWindow(windowElement);

        // Taskbar button
        const taskbarWindows = document.getElementById('taskbar-windows');
        const taskbarBtn = document.createElement('button');
        taskbarBtn.className = 'btn taskbar-window-btn';
        taskbarBtn.id = `taskbtn-${id}`;
        taskbarBtn.textContent = title;
        taskbarBtn.onclick = () => {
            if (windowElement.classList.contains('minimized')) {
                restoreWindow(windowElement);
            }
            focusWindow(windowElement);
            playSound('click');
        };
        taskbarWindows.appendChild(taskbarBtn);

        // Event Listeners for window controls
        windowElement.querySelector('.titlebar').addEventListener('mousedown', startDrag);
        windowElement.querySelector('.minimize-btn').addEventListener('click', () => minimizeWindow(windowElement));
        windowElement.querySelector('.maximize-btn').addEventListener('click', () => maximizeWindow(windowElement));
        windowElement.querySelector('.close-btn').addEventListener('click', () => closeWindow(windowElement));
        windowElement.addEventListener('mousedown', () => focusWindow(windowElement));
        
        return windowElement;
    }

    function closeWindow(windowElement) {
        // Check if this is Internet Explorer with youareanidiot loaded
        const iframe = windowElement.querySelector('#browser-iframe');
        const isIE = windowElement.querySelector('.titlebar-text')?.textContent.includes('Internet Explorer') || 
                     windowElement.querySelector('.titlebar-text')?.textContent.includes('You are an idiot');
        
        if (isIE && iframe && window.youAreAnIdiotActive) {
            // Trigger the popup attack!
            startYouAreAnIdiotPopups();
            window.youAreAnIdiotActive = false;
        }
        
        playSound('close');
        windows = windows.filter(w => w !== windowElement);
        windowElement.remove();
        const taskbarBtn = document.getElementById(`taskbtn-${windowElement.id}`);
        if (taskbarBtn) taskbarBtn.remove();
        if (activeWindow === windowElement) {
            activeWindow = null;
            if (windows.length > 0) {
                // Focus the next highest Z-index window
                const highestZ = windows.reduce((prev, current) => 
                    (parseInt(prev.style.zIndex) > parseInt(current.style.zIndex)) ? prev : current
                , windows[0]);
                focusWindow(highestZ);
            }
        }
    }

    function minimizeWindow(windowElement) {
        windowElement.classList.add('minimized');
        windowElement.style.display = 'none';
        
        const taskbarBtn = document.getElementById(`taskbtn-${windowElement.id}`);
        if(taskbarBtn) {
             taskbarBtn.style.fontWeight = 'normal';
        }

        if (activeWindow === windowElement) {
            activeWindow = null;
            if (windows.length > 0) {
                // Focus the next highest Z-index window that isn't minimized
                const visibleWindows = windows.filter(w => !w.classList.contains('minimized'));
                if (visibleWindows.length > 0) {
                    const highestZ = visibleWindows.reduce((prev, current) => 
                        (parseInt(prev.style.zIndex) > parseInt(current.style.zIndex)) ? prev : current
                    , visibleWindows[0]);
                    focusWindow(highestZ);
                }
            }
        }
        playSound('click');
    }

    function restoreWindow(windowElement) {
        windowElement.classList.remove('minimized');
        windowElement.style.display = 'flex';
        focusWindow(windowElement);
        playSound('click');
    }

    // --- Maximize Fix ---
    function maximizeWindow(windowElement) {
        const isMaximized = windowElement.classList.toggle('maximized');
        const taskbarHeight = 28;
        const maximizeButton = windowElement.querySelector('.maximize-btn');

        if (isMaximized) {
            // Save original dimensions
            windowElement.dataset.originalX = windowElement.style.left;
            windowElement.dataset.originalY = windowElement.style.top;
            windowElement.dataset.originalWidth = windowElement.style.width;
            windowElement.dataset.originalHeight = windowElement.style.height;

            // Apply maximized state
            windowElement.style.left = '0px';
            windowElement.style.top = '0px';
            windowElement.style.width = '100%';
            // CORRECTED: Use innerHeight of the viewport minus the taskbar height
            windowElement.style.height = `${window.innerHeight - taskbarHeight}px`; 
            
            windowElement.style.border = 'none';
            windowElement.style.boxShadow = 'none';
            windowElement.style.transition = 'none'; 
            windowElement.style.resize = 'none';
            maximizeButton.innerHTML = '&#9744;'; // Restore icon
        } else {
            // Restore original dimensions
            windowElement.style.left = windowElement.dataset.originalX;
            windowElement.style.top = windowElement.dataset.originalY;
            windowElement.style.width = windowElement.dataset.originalWidth;
            windowElement.style.height = windowElement.dataset.originalHeight;
            
            // Restore visual styles and functionality
            windowElement.style.border = ''; // Reapply default border (via CSS class)
            windowElement.style.boxShadow = '2px 2px 0 0 black';
            windowElement.style.resize = 'both';
            maximizeButton.innerHTML = '&#9633;'; // Maximize icon
        }
        playSound('click');
        dragInfo = null; // Reset drag
    }
    // --- End Maximize Fix ---


    // --- Drag Functionality (Window) ---
    function startDrag(e) {
        // Prevent dragging if clicking on buttons or inputs
        if (e.target.tagName === 'BUTTON' || e.target.tagName === 'INPUT' || e.target.tagName === 'IFRAME') return;

        const titlebar = e.currentTarget;
        const windowElement = titlebar.parentElement;

        if (windowElement.classList.contains('maximized')) return;

        focusWindow(windowElement);

        dragInfo = {
            element: windowElement,
            offsetX: e.clientX - windowElement.offsetLeft,
            offsetY: e.clientY - windowElement.offsetTop
        };
        titlebar.style.cursor = 'default';
    }

    function doDrag(e) {
        if (dragInfo) {
            let newX = e.clientX - dragInfo.offsetX;
            let newY = e.clientY - dragInfo.offsetY;

            // Simple boundary checking
            newX = Math.max(0, newX);
            newY = Math.max(0, newY);
            newY = Math.min(newY, window.innerHeight - 28 - 20); // 28px taskbar + 20px padding from bottom

            dragInfo.element.style.left = `${newX}px`;
            dragInfo.element.style.top = `${newY}px`;
        } else if (iconDragInfo) {
            // Icon dragging logic with GRID SNAPPING (Windows 98 style - like screenshot)
            const gridSize = 75; // Icons snap to 75px grid
            let newX = e.clientX - iconDragInfo.offsetX;
            let newY = e.clientY - iconDragInfo.offsetY;

            // Keep within bounds first
            newX = Math.max(10, newX);
            newY = Math.max(10, newY);
            newX = Math.min(newX, window.innerWidth - 80);
            newY = Math.min(newY, window.innerHeight - 100);

            // Snap to grid
            newX = Math.round(newX / gridSize) * gridSize + 10;
            newY = Math.round(newY / gridSize) * gridSize + 10;

            iconDragInfo.element.style.left = `${newX}px`;
            iconDragInfo.element.style.top = `${newY}px`;
        }
    }

    function stopDrag(e) {
        if (dragInfo) {
            dragInfo.element.querySelector('.titlebar').style.cursor = 'default;';
            dragInfo = null;
        }
        if (iconDragInfo) {
            iconDragInfo = null;
        }
    }

    document.addEventListener('mousemove', doDrag);
    document.addEventListener('mouseup', stopDrag);

    // --- Message Box ---

    function showMessageBox(titleOrObj, message, buttons) {
        // Support both old format: showMessageBox(title, message, buttons)
        // and new format: showMessageBox({ title, message, icon, buttons, callback })
        let title, icon, callback;
        
        if (typeof titleOrObj === 'object' && titleOrObj.title) {
            // New format: object with properties
            title = titleOrObj.title;
            message = titleOrObj.message;
            icon = titleOrObj.icon;
            buttons = titleOrObj.buttons;
            callback = titleOrObj.callback;
        } else {
            // Old format: separate parameters
            title = titleOrObj;
            icon = 'info';
        }
        
        const existingBox = document.querySelector('.message-box');
        if (existingBox) existingBox.remove();

        const box = document.createElement('div');
        box.className = 'window message-box';

        let iconSrc;
        switch(icon) {
            case 'info': iconSrc = 'https://win98icons.alexmeub.com/icons/png/msg_information-0.png'; break;
            case 'warning': iconSrc = 'https://win98icons.alexmeub.com/icons/png/msg_warning-0.png'; break;
            case 'error': iconSrc = 'https://win98icons.alexmeub.com/icons/png/msg_error-0.png'; break;
            default: iconSrc = 'https://win98icons.alexmeub.com/icons/png/msg_information-0.png';
        }

        box.innerHTML = `
            <div class="titlebar">
                <img src="${iconSrc}" class="titlebar-icon" alt="Ikon">
                <span class="titlebar-text">${title || 'Üzenet'}</span>
                <div class="titlebar-buttons">
                    <button class="btn close-btn">X</button>
                </div>
            </div>
            <div class="window-content">
                <img src="${iconSrc}" class="message-icon" alt="Üzenet Ikon">
                <p class="message-text">${message || ''}</p>
            </div>
            <div class="message-buttons">
                <!-- Buttons will be injected here -->
            </div>
        `;

        const closeHandler = () => {
            box.remove();
            playSound('close');
        };

        // Attach close event to titlebar X
        box.querySelector('.close-btn').addEventListener('click', closeHandler);

        // Inject buttons
        const buttonContainer = box.querySelector('.message-buttons');
        (buttons || ['OK']).forEach(btnText => {
            const btn = document.createElement('button');
            btn.className = 'btn';
            
            // Support both string buttons and object buttons with callbacks
            if (typeof btnText === 'object' && btnText.text) {
                btn.textContent = btnText.text;
                btn.addEventListener('click', () => {
                    playSound('click');
                    closeHandler();
                    if (btnText.callback) btnText.callback();
                });
            } else {
                btn.textContent = btnText;
                btn.addEventListener('click', () => {
                    playSound('click');
                    closeHandler();
                    if (callback) callback(btnText);
                });
            }
            buttonContainer.appendChild(btn);
        });

        document.getElementById('desktop').appendChild(box);
        focusWindow(box);
        playSound('open');
    }

    // --- File Dialog Helper ---
    function showFileDialog(title, fileList, callback) {
        const listHTML = fileList.map(file => 
            `<div class="file-item" style="padding: 4px 8px; cursor: url("https://files.catbox.moe/2tpljw.cur"), default; color: black;" onclick="this.parentElement.querySelectorAll('.file-item').forEach(f => f.style.backgroundColor='white'); this.style.backgroundColor='#000080'; this.style.color='white'; this.dataset.selected='true';" data-filename="${file}">${file}</div>`
        ).join('');

        const content = `
            <div style="display: flex; flex-direction: column; height: 100%; color: black;">
                <div style="padding: 8px; color: black;">Válasszon egy fájlt:</div>
                <div style="flex-grow: 1; border: 2px inset #808080; background-color: white; overflow-y: auto; margin: 0 8px;">
                    ${listHTML}
                </div>
                <div style="padding: 8px; display: flex; gap: 8px; justify-content: flex-end;">
                    <button class="btn" id="file-dialog-ok">OK</button>
                    <button class="btn" id="file-dialog-cancel">Mégse</button>
                </div>
            </div>
        `;

        const dialog = createWindow({
            title: title,
            icon: "https://win98icons.alexmeub.com/icons/png/directory_open-4.png",
            width: 350,
            height: 300,
            content: content
        });

        setTimeout(() => {
            dialog.querySelector('#file-dialog-ok').addEventListener('click', () => {
                const selected = dialog.querySelector('.file-item[data-selected="true"]');
                if (selected) {
                    callback(selected.dataset.filename);
                }
                closeWindow(dialog);
                playSound('click');
            });

            dialog.querySelector('#file-dialog-cancel').addEventListener('click', () => {
                closeWindow(dialog);
                playSound('click');
            });
        }, 100);
    }

    // --- Input Dialog Helper ---
    function showInputDialog(title, message, defaultValue, callback) {
        const content = `
            <div style="display: flex; flex-direction: column; height: 100%; padding: 15px; color: black;">
                <div style="margin-bottom: 10px; color: black;">${message}</div>
                <input type="text" id="input-dialog-field" value="${defaultValue}" style="width: 100%; padding: 4px; margin-bottom: 15px; font-family: 'Fixedsys 62', monospace; border: 2px inset #808080;" />
                <div style="display: flex; gap: 8px; justify-content: flex-end;">
                    <button class="btn" id="input-dialog-ok">OK</button>
                    <button class="btn" id="input-dialog-cancel">Mégse</button>
                </div>
            </div>
        `;

        const dialog = createWindow({
            title: title,
            icon: "https://win98icons.alexmeub.com/icons/png/msg_question-0.png",
            width: 350,
            height: 180,
            content: content
        });

        setTimeout(() => {
            const inputField = dialog.querySelector('#input-dialog-field');
            inputField.focus();
            inputField.select();

            const okHandler = () => {
                callback(inputField.value);
                closeWindow(dialog);
                playSound('click');
            };

            dialog.querySelector('#input-dialog-ok').addEventListener('click', okHandler);
            inputField.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') okHandler();
            });

            dialog.querySelector('#input-dialog-cancel').addEventListener('click', () => {
                closeWindow(dialog);
                playSound('click');
            });
        }, 100);
    }

    // --- Core Applications ---

    function openNotepad() {
    // --- State Management ---
    const notepadState = {
        title: "Névtelen - Jegyzettömb",
        fontSize: '12px',
        fontFamily: 'Arial, sans-serif',
        filename: null
    };

    // --- HTML Structure for Notepad Content ---
    const content = `
        <div class="notepad-container" style="display: flex; flex-direction: column; height: 100%;">
            <div class="menu-bar" style="background-color: #ECE9D8; border-bottom: 1px solid #AAA; padding: 0 2px;">
                <ul style="list-style: none; padding: 0; margin: 0; display: flex; color: #000;">
                    <li class="menu-item" tabindex="0" data-menu="file" style="position: relative; padding: 1px 4px; cursor: url('https://files.catbox.moe/2tpljw.cur'), default; color: #000;">
                        Fájl
                        <ul class="dropdown" style="position: absolute; top: 100%; left: 0; background-color: #FFF; border: 1px solid #808080; list-style: none; padding: 2px 0; margin: 0; min-width: 150px; z-index: 10; display: none; color: #000;">
                            <li class="menu-option" data-action="new" style="padding: 2px 18px 2px 24px;">Új</li>
                            <li class="menu-option" data-action="open" style="padding: 2px 18px 2px 24px;">Megnyitás...</li>
                            <li class="menu-option" data-action="save" style="padding: 2px 18px 2px 24px;">Mentés...</li>
                            <li style="border-top: 1px solid #C0C0C0; margin: 2px 0;"></li>
                            <li class="menu-option" data-action="delete" style="padding: 2px 18px 2px 24px;">Törlés</li>
                            <li style="border-top: 1px solid #C0C0C0; margin: 2px 0;"></li>
                            <li class="menu-option" data-action="exit" style="padding: 2px 18px 2px 24px;">Kilépés</li>
                        </ul>
                    </li>
                    <li class="menu-item" tabindex="0" data-menu="format" style="position: relative; padding: 1px 4px; cursor: url('https://files.catbox.moe/2tpljw.cur'), default; color: #000;">
                        Formátum
                        <ul class="dropdown" style="position: absolute; top: 100%; left: 0; background-color: #FFF; border: 1px solid #808080; list-style: none; padding: 2px 0; margin: 0; min-width: 150px; z-index: 10; display: none; color: #000;">
                            <li class="menu-option" data-action="font-increase" style="padding: 2px 18px 2px 24px;">Nagyobb betűméret</li>
                            <li class="menu-option" data-action="font-decrease" style="padding: 2px 18px 2px 24px;">Kisebb betűméret</li>
                            <li class="menu-option" data-action="font-reset" style="padding: 2px 18px 2px 24px;">Alapértelmezett betűméret</li>
                        </ul>
                    </li>
                </ul>
            </div>
            
            <textarea id="notepad-textarea" style="flex-grow: 1; resize: none; outline: none; box-sizing: border-box; border: none; padding: 5px; font-size: ${notepadState.fontSize}; font-family: ${notepadState.fontFamily}; color: #000;"></textarea>
        </div>
    `;

    // --- Create the Window ---
    const windowElement = createWindow({
        title: notepadState.title,
        icon: "https://win98icons.alexmeub.com/icons/png/notepad-1.png",
        width: 400,
        height: 300,
        content: content
    });

    // --- Menu Functionality (Executed AFTER the window is created) ---
    setTimeout(() => {
        const container = windowElement; 
        const textarea = container.querySelector('#notepad-textarea');
        const menuItems = container.querySelectorAll('.menu-item');
        const menuOptions = container.querySelectorAll('.menu-option');

        // --- 1. Dropdown Toggle Logic (Omitted for brevity, same as before) ---
        menuItems.forEach(item => {
            const dropdown = item.querySelector('.dropdown');
            // ... (Toggle and focusout logic)
        });

        document.addEventListener('click', (e) => {
            if (!container.contains(e.target) || !e.target.closest('.menu-item')) {
                container.querySelectorAll('.dropdown').forEach(d => d.style.display = 'none');
            }
        });

        // --- 2. Menu Action Logic (Updated to use showMessageBox) ---
        menuOptions.forEach(option => {
            option.addEventListener('click', (e) => {
                const action = option.getAttribute('data-action');
                let currentSize = parseInt(notepadState.fontSize.replace('px', ''));

                switch (action) {
                    case 'new':
                        textarea.value = '';
                        notepadState.filename = null;
                        const titlebarNew = container.querySelector('.titlebar-text');
                        titlebarNew.textContent = 'Névtelen - Jegyzettömb';
                        playSound('ding');
                        break;
                        
                    case 'open':
                        const files = FileSystem.list();
                        const fileNames = Object.keys(files).filter(name => files[name].type === 'text');
                        if (fileNames.length === 0) {
                            showMessageBox({
                                title: 'Megnyitás',
                                message: 'Nincsenek elérhető szöveges fájlok.',
                                icon: 'info',
                                buttons: ['OK']
                            });
                        } else {
                            showFileDialog('Fájl megnyitása', fileNames, (fileName) => {
                                if (fileName && files[fileName]) {
                                    const file = FileSystem.load(fileName);
                                    textarea.value = file.content;
                                    notepadState.filename = fileName;
                                    const titlebarOpen = container.querySelector('.titlebar-text');
                                    titlebarOpen.textContent = fileName + ' - Jegyzettömb';
                                    playSound('open');
                                }
                            });
                        }
                        break;
                        
                    case 'save':
                        let filename = notepadState.filename;
                        if (!filename) {
                            showInputDialog('Fájl mentése másként', 'Adja meg a fájl nevét:', 'document.txt', (newFilename) => {
                                if (newFilename) {
                                    FileSystem.save(newFilename, textarea.value, 'text');
                                    notepadState.filename = newFilename;
                                    const titlebarSave = container.querySelector('.titlebar-text');
                                    titlebarSave.textContent = newFilename + ' - Jegyzettömb';
                                    showMessageBox({
                                        title: 'Mentés',
                                        message: 'A fájl sikeresen mentve: ' + newFilename,
                                        icon: 'info',
                                        buttons: ['OK']
                                    });
                                    playSound('ding');
                                }
                            });
                        } else {
                            FileSystem.save(filename, textarea.value, 'text');
                            const titlebarSave = container.querySelector('.titlebar-text');
                            titlebarSave.textContent = filename + ' - Jegyzettömb';
                            showMessageBox({
                                title: 'Mentés',
                                message: 'A fájl sikeresen mentve: ' + filename,
                                icon: 'info',
                                buttons: ['OK']
                            });
                            playSound('ding');
                        }
                        break;
                        
                    case 'delete':
                        if (notepadState.filename) {
                            showMessageBox({
                                title: 'Törlés megerősítése',
                                message: 'Biztosan törölni szeretné a fájlt: ' + notepadState.filename + '?',
                                icon: 'warning',
                                buttons: ['Igen', 'Nem'],
                                callback: (response) => {
                                    if (response === 'Igen') {
                                        if (FileSystem.delete(notepadState.filename)) {
                                            showMessageBox({
                                                title: 'Törlés',
                                                message: 'A fájl a Lomtárba került.',
                                                icon: 'info',
                                                buttons: ['OK']
                                            });
                                            textarea.value = '';
                                            notepadState.filename = null;
                                            const titlebarDel = container.querySelector('.titlebar-text');
                                            titlebarDel.textContent = 'Névtelen - Jegyzettömb';
                                            playSound('close');
                                        } else {
                                            showMessageBox({
                                                title: 'Hiba',
                                                message: 'A fájl törlése sikertelen.',
                                                icon: 'error',
                                                buttons: ['OK']
                                            });
                                        }
                                    }
                                }
                            });
                        } else {
                            showMessageBox({
                                title: 'Törlés',
                                message: 'Nincs megnyitott fájl a törléshez.',
                                icon: 'warning',
                                buttons: ['OK']
                            });
                        }
                        break;
                        
                    case 'exit':
                        closeWindow(container);
                        break;
                        
                    case 'font-increase':
                        notepadState.fontSize = (currentSize + 2) + 'px';
                        textarea.style.fontSize = notepadState.fontSize;
                        break;
                    case 'font-decrease':
                        if (currentSize > 6) {
                            notepadState.fontSize = (currentSize - 2) + 'px';
                            textarea.style.fontSize = notepadState.fontSize;
                        }
                        break;
                    case 'font-reset':
                        notepadState.fontSize = '12px';
                        textarea.style.fontSize = notepadState.fontSize;
                        break;
                }
                
                // Close menu after action
                e.target.closest('.dropdown').style.display = 'none';
                e.stopPropagation();
            });
        });
        
        // --- 1. Dropdown Toggle Logic (Complete implementation here for completeness) ---
        menuItems.forEach(item => {
            const dropdown = item.querySelector('.dropdown');
            item.addEventListener('click', (e) => {
                container.querySelectorAll('.dropdown').forEach(d => {
                    if (d !== dropdown) d.style.display = 'none';
                });
                dropdown.style.display = dropdown.style.display === 'none' ? 'block' : 'none';
                e.stopPropagation();
            });
            item.addEventListener('focusout', () => {
                setTimeout(() => {
                    if (!item.contains(document.activeElement)) {
                        dropdown.style.display = 'none';
                    }
                }, 100);
            });
        });

    }, 0);
}

    // --- Credits File ---
    function openCredits() {
        const file = FileSystem.load('credits.txt');
        if (!file) {
            showMessageBox({
                title: 'Hiba',
                message: 'A credits.txt fájl nem található!',
                icon: 'error',
                buttons: ['OK']
            });
            return;
        }
        
        const notepadState = {
            title: "credits.txt - Jegyzettömb",
            fontSize: '12px',
            fontFamily: 'Arial, sans-serif',
            filename: 'credits.txt'
        };

        const content = `
            <div class="notepad-container" style="display: flex; flex-direction: column; height: 100%;">
                <div class="menu-bar" style="background-color: #ECE9D8; border-bottom: 1px solid #AAA; padding: 0 2px;">
                    <ul style="list-style: none; padding: 0; margin: 0; display: flex; color: #000;">
                        <li class="menu-item" tabindex="0" data-menu="file" style="position: relative; padding: 1px 4px; cursor: url('https://files.catbox.moe/2tpljw.cur'), default; color: #000;">
                            Fájl
                            <ul class="dropdown" style="position: absolute; top: 100%; left: 0; background-color: #FFF; border: 1px solid #808080; list-style: none; padding: 2px 0; margin: 0; min-width: 150px; z-index: 10; display: none; color: #000;">
                                <li class="menu-option" data-action="exit" style="padding: 2px 18px 2px 24px;">Kilépés</li>
                            </ul>
                        </li>
                        <li class="menu-item" tabindex="0" data-menu="format" style="position: relative; padding: 1px 4px; cursor: url('https://files.catbox.moe/2tpljw.cur'), default; color: #000;">
                            Formátum
                            <ul class="dropdown" style="position: absolute; top: 100%; left: 0; background-color: #FFF; border: 1px solid #808080; list-style: none; padding: 2px 0; margin: 0; min-width: 150px; z-index: 10; display: none; color: #000;">
                                <li class="menu-option" data-action="font-increase" style="padding: 2px 18px 2px 24px;">Nagyobb betűméret</li>
                                <li class="menu-option" data-action="font-decrease" style="padding: 2px 18px 2px 24px;">Kisebb betűméret</li>
                                <li class="menu-option" data-action="font-reset" style="padding: 2px 18px 2px 24px;">Alapértelmezett betűméret</li>
                            </ul>
                        </li>
                    </ul>
                </div>
                
                <textarea id="notepad-textarea" readonly style="flex-grow: 1; resize: none; outline: none; box-sizing: border-box; border: none; padding: 5px; font-size: ${notepadState.fontSize}; font-family: ${notepadState.fontFamily}; color: #000; background-color: #FFF;">${file.content}</textarea>
            </div>
        `;

        const windowElement = createWindow({
            title: notepadState.title,
            icon: "https://win98icons.alexmeub.com/icons/png/notepad-1.png",
            width: 500,
            height: 400,
            content: content
        });

        setTimeout(() => {
            const container = windowElement;
            const textarea = container.querySelector('#notepad-textarea');
            const menuItems = container.querySelectorAll('.menu-item');
            const menuOptions = container.querySelectorAll('.menu-option');

            menuItems.forEach(item => {
                const dropdown = item.querySelector('.dropdown');
                item.addEventListener('click', (e) => {
                    container.querySelectorAll('.dropdown').forEach(d => {
                        if (d !== dropdown) d.style.display = 'none';
                    });
                    dropdown.style.display = dropdown.style.display === 'none' ? 'block' : 'none';
                    e.stopPropagation();
                });
            });

            document.addEventListener('click', (e) => {
                if (!container.contains(e.target) || !e.target.closest('.menu-item')) {
                    container.querySelectorAll('.dropdown').forEach(d => d.style.display = 'none');
                }
            });

            menuOptions.forEach(option => {
                option.addEventListener('click', (e) => {
                    const action = option.getAttribute('data-action');
                    let currentSize = parseInt(notepadState.fontSize.replace('px', ''));

                    switch (action) {
                        case 'exit':
                            closeWindow(container);
                            break;
                        case 'font-increase':
                            notepadState.fontSize = (currentSize + 2) + 'px';
                            textarea.style.fontSize = notepadState.fontSize;
                            break;
                        case 'font-decrease':
                            if (currentSize > 6) {
                                notepadState.fontSize = (currentSize - 2) + 'px';
                                textarea.style.fontSize = notepadState.fontSize;
                            }
                            break;
                        case 'font-reset':
                            notepadState.fontSize = '12px';
                            textarea.style.fontSize = notepadState.fontSize;
                            break;
                    }

                    e.target.closest('.dropdown').style.display = 'none';
                    e.stopPropagation();
                });
            });
        }, 0);
    }

    // --- Recycle Bin ---
    function openRecycleBin() {
        const recycleBin = FileSystem.getRecycleBin();
        
        let fileListHTML = '';
        if (recycleBin.length === 0) {
            fileListHTML = '<p style="text-align: center; color: #808080; margin-top: 50px;">A Lomtár üres.</p>';
        } else {
            fileListHTML = '<div style="padding: 10px;"><table style="width: 100%; border-collapse: collapse; color: black;">';
            fileListHTML += '<tr style="background-color: #000080; color: white;"><th style="padding: 4px; text-align: left;">Fájlnév</th><th style="padding: 4px; text-align: left;">Törlés dátuma</th><th style="padding: 4px;">Művelet</th></tr>';
            recycleBin.forEach((file, index) => {
                const date = new Date(file.deletedAt).toLocaleString('hu-HU');
                fileListHTML += `<tr style="border-bottom: 1px solid #C0C0C0;">
                    <td style="padding: 4px;">${file.filename}</td>
                    <td style="padding: 4px;">${date}</td>
                    <td style="padding: 4px; text-align: center;">
                        <button class="btn" onclick="restoreFile(${index}); playSound('ding');">Visszaállítás</button>
                    </td>
                </tr>`;
            });
            fileListHTML += '</table></div>';
        }
        
        const content = `
            <div style="display: flex; flex-direction: column; height: 100%;">
                <div style="padding: 8px; background-color: #ECE9D8; border-bottom: 2px solid #808080;">
                    <button class="btn" onclick="emptyRecycleBin(); playSound('ding');" style="margin-right: 4px;">Lomtár ürítése</button>
                    <button class="btn" onclick="closeWindow(document.getElementById('window-recyclebin')); playSound('click');">Bezárás</button>
                </div>
                <div style="flex-grow: 1; overflow: auto; background-color: white;">
                    ${fileListHTML}
                </div>
            </div>
        `;
        
        createWindow({
            title: "Lomtár",
            icon: "https://win98icons.alexmeub.com/icons/png/recycle_bin_empty-0.png",
            width: 500,
            height: 400,
            content: content,
            id: 'window-recyclebin'
        });
    }

    function restoreFile(index) {
        if (FileSystem.restore(index)) {
            showMessageBox({
                title: 'Visszaállítás',
                message: 'A fájl sikeresen visszaállítva!',
                icon: 'info',
                buttons: ['OK']
            });
            // Refresh recycle bin window
            closeWindow(document.getElementById('window-recyclebin'));
            setTimeout(() => openRecycleBin(), 100);
        }
    }

    function emptyRecycleBin() {
        const recycleBin = FileSystem.getRecycleBin();
        if (recycleBin.length === 0) {
            showMessageBox({
                title: 'Lomtár',
                message: 'A Lomtár már üres!',
                icon: 'info',
                buttons: ['OK']
            });
        } else {
            const protectedCount = recycleBin.filter(f => f.readOnly).length;
            let message = `Biztosan törölni szeretné a Lomtár tartalmát (${recycleBin.length} elem)?`;
            if (protectedCount > 0) {
                message += `\
\
Megjegyzés: ${protectedCount} védett fájl a Lomtárban marad.`;
            }
            showMessageBox({
                title: 'Lomtár ürítése',
                message: message,
                icon: 'warning',
                buttons: ['Igen', 'Nem'],
                callback: (result) => {
                    if (result === 'Igen') {
                        const deletedCount = FileSystem.emptyRecycleBin();
                        showMessageBox({
                            title: 'Lomtár',
                            message: deletedCount + ' elem véglegesen törölve!',
                            icon: 'info',
                            buttons: ['OK']
                        });
                        closeWindow(document.getElementById('window-recyclebin'));
                        setTimeout(() => openRecycleBin(), 100);
                        playSound('ding');
                    }
                }
            });
        }
    }



    function openMinesweeper() {
    playSound('click');
    const winId = 'minesweeper-' + Date.now();
    
    const minesweeperContent = `
        <div id="minesweeper-${winId}" style="width: 100%; height: 100%; display: flex; flex-direction: column; background: #c0c0c0; font-family: 'MS Sans Serif', sans-serif;">
            <div style="background: #c0c0c0; border-bottom: 1px solid #808080; padding: 2px; position: relative;">
                <span id="menu-game-${winId}" onclick="toggleMinesweeperMenu('${winId}', 'game')" style="font-size: 11px; padding: 4px; cursor: pointer; user-select: none;">Játék</span>
                <span id="menu-help-${winId}" onclick="toggleMinesweeperMenu('${winId}', 'help')" style="font-size: 11px; padding: 4px; margin-left: 10px; cursor: pointer; user-select: none;">Súgó</span>
                
                <div id="dropdown-game-${winId}" style="display: none; position: absolute; top: 22px; left: 2px; background: #c0c0c0; border: 2px outset #fff; min-width: 180px; z-index: 1000; box-shadow: 2px 2px 5px rgba(0,0,0,0.3);">
                    <div onclick="minesweeperNewGame('${winId}')" style="padding: 4px 20px; cursor: pointer; font-size: 11px;" onmouseover="this.style.background='#000080'; this.style.color='#fff'" onmouseout="this.style.background=''; this.style.color=''">Új játék</div>
                    <div style="border-top: 1px solid #808080; margin: 2px 0;"></div>
                    <div onclick="minesweeperSetDifficulty('${winId}', 'beginner')" style="padding: 4px 20px; cursor: pointer; font-size: 11px;" onmouseover="this.style.background='#000080'; this.style.color='#fff'" onmouseout="this.style.background=''; this.style.color=''">Kezdő (9x9)</div>
                    <div onclick="minesweeperSetDifficulty('${winId}', 'intermediate')" style="padding: 4px 20px; cursor: pointer; font-size: 11px;" onmouseover="this.style.background='#000080'; this.style.color='#fff'" onmouseout="this.style.background=''; this.style.color=''">Haladó (16x16)</div>
                    <div onclick="minesweeperSetDifficulty('${winId}', 'expert')" style="padding: 4px 20px; cursor: pointer; font-size: 11px;" onmouseover="this.style.background='#000080'; this.style.color='#fff'" onmouseout="this.style.background=''; this.style.color=''">Szakértő (30x16)</div>
                    <div onclick="minesweeperSetCustomDifficulty('${winId}')" style="padding: 4px 20px; cursor: pointer; font-size: 11px;" onmouseover="this.style.background='#000080'; this.style.color='#fff'" onmouseout="this.style.background=''; this.style.color=''">Egyéni...</div>
                    <div style="border-top: 1px solid #808080; margin: 2px 0;"></div>
                    <div onclick="minesweeperToggleSound('${winId}')" style="padding: 4px 20px; cursor: pointer; font-size: 11px; display: flex; align-items: center;" onmouseover="this.style.background='#000080'; this.style.color='#fff'" onmouseout="this.style.background=''; this.style.color=''">
                        <span id="sound-check-${winId}">✓</span>&nbsp;&nbsp;Hangok
                    </div>
                    <div onclick="minesweeperToggleTroll('${winId}')" style="padding: 4px 20px; cursor: pointer; font-size: 11px; display: flex; align-items: center;" onmouseover="this.style.background='#000080'; this.style.color='#fff'" onmouseout="this.style.background=''; this.style.color=''">
                        <span id="troll-check-${winId}">&nbsp;</span>&nbsp;&nbsp;🎭 Troll Mód
                    </div>
                </div>
                
                <div id="dropdown-help-${winId}" style="display: none; position: absolute; top: 22px; left: 60px; background: #c0c0c0; border: 2px outset #fff; min-width: 150px; z-index: 1000; box-shadow: 2px 2px 5px rgba(0,0,0,0.3);">
                    <div onclick="showMinesweeperHelp('${winId}')" style="padding: 4px 20px; cursor: pointer; font-size: 11px;" onmouseover="this.style.background='#000080'; this.style.color='#fff'" onmouseout="this.style.background=''; this.style.color=''">Súgó témakörök</div>
                    <div style="border-top: 1px solid #808080; margin: 2px 0;"></div>
                    <div onclick="showMinesweeperAbout('${winId}')" style="padding: 4px 20px; cursor: pointer; font-size: 11px;" onmouseover="this.style.background='#000080'; this.style.color='#fff'" onmouseout="this.style.background=''; this.style.color=''">Névjegy</div>
                </div>
            </div>
            <div style="padding: 8px; background: #c0c0c0;">
                <div style="border: 3px inset #808080; padding: 4px; display: inline-flex; align-items: center; gap: 15px; background: #c0c0c0;">
                    <div id="mine-counter-${winId}" style="background: #000; color: #f00; font-family: 'Courier New', monospace; font-size: 20px; font-weight: bold; padding: 2px 4px; min-width: 40px; text-align: right;">010</div>
                    <button id="smiley-${winId}" onclick="minesweeperReset('${winId}')" style="font-size: 24px; width: 36px; height: 36px; padding: 0; border: 2px outset #fff; background: #c0c0c0; cursor: pointer;">🙂</button>
                    <div id="timer-${winId}" style="background: #000; color: #f00; font-family: 'Courier New', monospace; font-size: 20px; font-weight: bold; padding: 2px 4px; min-width: 40px; text-align: right;">000</div>
                </div>
            </div>
            <div style="padding: 0 8px 8px 8px;">
                <div id="board-${winId}" style="border: 3px inset #808080; display: inline-block; background: #c0c0c0;"></div>
            </div>
        </div>
    `;

    const win = createWindow({
        id: winId,
        title: 'Aknakereső',
        icon: 'https://98.js.org/images/icons/minesweeper-32x32.png',
        width: 240,
        height: 350,
        content: minesweeperContent
    });
    
    setTimeout(() => {
        initMinesweeper(winId);
        
        // Close menus when clicking outside
        document.addEventListener('click', (e) => {
            const gameMenu = document.getElementById(`dropdown-game-${winId}`);
            const helpMenu = document.getElementById(`dropdown-help-${winId}`);
            const gameBtn = document.getElementById(`menu-game-${winId}`);
            const helpBtn = document.getElementById(`menu-help-${winId}`);
            
            if (gameMenu && !gameMenu.contains(e.target) && e.target !== gameBtn) {
                gameMenu.style.display = 'none';
            }
            if (helpMenu && !helpMenu.contains(e.target) && e.target !== helpBtn) {
                helpMenu.style.display = 'none';
            }
        });
    }, 100);
}

const minesweeperGames = {};

function initMinesweeper(winId, difficulty = 'beginner') {
    const difficulties = {
        beginner: { rows: 9, cols: 9, mines: 10, width: 240, height: 350 },
        intermediate: { rows: 16, cols: 16, mines: 40, width: 380, height: 510 },
        expert: { rows: 16, cols: 30, mines: 99, width: 660, height: 510 }
    };
    
    const config = difficulties[difficulty];
    
    const game = {
        rows: config.rows,
        cols: config.cols,
        mines: config.mines,
        difficulty: difficulty,
        board: [],
        revealed: [],
        flagged: [],
        gameOver: false,
        won: false,
        timer: 0,
        timerInterval: null,
        firstClick: true,
        soundEnabled: true,
        trollMode: false,
        tickSound: new Audio('#'),
        victorySound: new Audio('#'),
        gameoverSound: new Audio('#')
    };
    
    game.tickSound.loop = true;
    minesweeperGames[winId] = game;
    
    createBoard(winId);
    renderBoard(winId);
}

function createBoard(winId) {
    const game = minesweeperGames[winId];
    if (!game) return;
    
    game.board = [];
    game.revealed = [];
    game.flagged = [];
    game.gameOver = false;
    game.won = false;
    game.timer = 0;
    game.firstClick = true;
    
    if (game.timerInterval) {
        clearInterval(game.timerInterval);
        game.timerInterval = null;
    }
    game.tickSound.pause();
    game.tickSound.currentTime = 0;
    
    for (let i = 0; i < game.rows; i++) {
        game.board[i] = [];
        game.revealed[i] = [];
        game.flagged[i] = [];
        for (let j = 0; j < game.cols; j++) {
            game.board[i][j] = 0;
            game.revealed[i][j] = false;
            game.flagged[i][j] = false;
        }
    }
}

function placeMines(winId, excludeRow, excludeCol) {
    const game = minesweeperGames[winId];
    if (!game) return;
    
    let placed = 0;
    while (placed < game.mines) {
        const row = Math.floor(Math.random() * game.rows);
        const col = Math.floor(Math.random() * game.cols);
        
        if (row === excludeRow && col === excludeCol) continue;
        if (game.board[row][col] === -1) continue;
        
        game.board[row][col] = -1;
        placed++;
        
        for (let i = -1; i <= 1; i++) {
            for (let j = -1; j <= 1; j++) {
                const newRow = row + i;
                const newCol = col + j;
                if (newRow >= 0 && newRow < game.rows && newCol >= 0 && newCol < game.cols && game.board[newRow][newCol] !== -1) {
                    game.board[newRow][newCol]++;
                }
            }
        }
    }
}

function renderBoard(winId) {
    const game = minesweeperGames[winId];
    const boardEl = document.getElementById(`board-${winId}`);
    if (!game || !boardEl) return;
    
    let html = '<div style="display: grid; grid-template-columns: repeat(' + game.cols + ', 20px); gap: 0;">';
    
    for (let i = 0; i < game.rows; i++) {
        for (let j = 0; j < game.cols; j++) {
            const revealed = game.revealed[i][j];
            const flagged = game.flagged[i][j];
            
            let content = '';
            let style = 'width: 20px; height: 20px; border: 2px outset #fff; background: #c0c0c0; display: flex; align-items: center; justify-content: center; cursor: pointer; font-size: 12px; font-weight: bold; user-select: none;';
            
            if (revealed) {
                style = 'width: 20px; height: 20px; border: 1px solid #808080; background: #bdbdbd; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: bold; user-select: none;';
                if (game.board[i][j] === -1) {
                    content = game.trollMode ? '🎉' : '💣';
                } else if (game.board[i][j] > 0) {
                    const colors = ['', '#0000ff', '#008000', '#ff0000', '#000080', '#800000', '#008080', '#000', '#808080'];
                    content = `<span style="color: ${colors[game.board[i][j]]}">${game.board[i][j]}</span>`;
                }
            } else if (flagged) {
                content = '🚩';
            }
            
            html += `<div style="${style}" onclick="minesweeperClick('${winId}', ${i}, ${j})" oncontextmenu="minesweeperRightClick('${winId}', ${i}, ${j}); return false;">${content}</div>`;
        }
    }
    
    html += '</div>';
    boardEl.innerHTML = html;
    
    updateMineCounter(winId);
    updateTimer(winId);
}

function minesweeperClick(winId, row, col) {
    const game = minesweeperGames[winId];
    if (!game || game.gameOver || game.won || game.revealed[row][col] || game.flagged[row][col]) return;
    
    if (game.firstClick) {
        placeMines(winId, row, col);
        game.firstClick = false;
        startTimer(winId);
    }
    
    revealCell(winId, row, col);
    
    if (game.board[row][col] === -1) {
        gameOver(winId, false);
    } else {
        checkWin(winId);
    }
    
    renderBoard(winId);
}

function minesweeperRightClick(winId, row, col) {
    const game = minesweeperGames[winId];
    if (!game || game.gameOver || game.won || game.revealed[row][col]) return;
    
    game.flagged[row][col] = !game.flagged[row][col];
    renderBoard(winId);
}

function revealCell(winId, row, col) {
    const game = minesweeperGames[winId];
    if (!game || row < 0 || row >= game.rows || col < 0 || col >= game.cols) return;
    if (game.revealed[row][col] || game.flagged[row][col]) return;
    
    game.revealed[row][col] = true;
    
    if (game.board[row][col] === 0) {
        for (let i = -1; i <= 1; i++) {
            for (let j = -1; j <= 1; j++) {
                revealCell(winId, row + i, col + j);
            }
        }
    }
}

function startTimer(winId) {
    const game = minesweeperGames[winId];
    if (!game || game.timerInterval) return;
    
    if (game.soundEnabled) {
        game.tickSound.play().catch(() => {});
    }
    
    game.timerInterval = setInterval(() => {
        game.timer++;
        if (game.timer > 999) game.timer = 999;
        updateTimer(winId);
    }, 1000);
}

function updateTimer(winId) {
    const game = minesweeperGames[winId];
    const timerEl = document.getElementById(`timer-${winId}`);
    if (timerEl && game) {
        timerEl.textContent = String(game.timer).padStart(3, '0');
    }
}

function updateMineCounter(winId) {
    const game = minesweeperGames[winId];
    const counterEl = document.getElementById(`mine-counter-${winId}`);
    if (!counterEl || !game) return;
    
    let flagCount = 0;
    for (let i = 0; i < game.rows; i++) {
        for (let j = 0; j < game.cols; j++) {
            if (game.flagged[i][j]) flagCount++;
        }
    }
    
    const remaining = game.mines - flagCount;
    counterEl.textContent = String(Math.max(0, remaining)).padStart(3, '0');
}

function checkWin(winId) {
    const game = minesweeperGames[winId];
    if (!game) return;
    
    let revealedCount = 0;
    for (let i = 0; i < game.rows; i++) {
        for (let j = 0; j < game.cols; j++) {
            if (game.revealed[i][j]) revealedCount++;
        }
    }
    
    if (revealedCount === game.rows * game.cols - game.mines) {
        gameOver(winId, true);
    }
}

function gameOver(winId, won) {
    const game = minesweeperGames[winId];
    if (!game) return;
    
    game.gameOver = true;
    game.won = won;
    
    if (game.timerInterval) {
        clearInterval(game.timerInterval);
        game.timerInterval = null;
    }
    
    game.tickSound.pause();
    
    if (game.soundEnabled) {
        if (won) {
            game.victorySound.play().catch(() => {});
        } else {
            game.gameoverSound.play().catch(() => {});
        }
    }
    
    for (let i = 0; i < game.rows; i++) {
        for (let j = 0; j < game.cols; j++) {
            if (game.board[i][j] === -1) {
                game.revealed[i][j] = true;
            }
        }
    }
    
    const smileyEl = document.getElementById(`smiley-${winId}`);
    if (smileyEl) {
        smileyEl.textContent = won ? '😎' : '😵';
    }
    
    renderBoard(winId);
    
    setTimeout(() => {
        if (won) {
            showMessageBox('Győzelem!', `Gratulálunk! Megnyerted a játékot ${game.timer} másodperc alatt!`, ['OK']);
        }
    }, 500);
}

function minesweeperReset(winId) {
    const game = minesweeperGames[winId];
    if (!game) return;
    
    playSound('click');
    createBoard(winId);
    renderBoard(winId);
    
    const smileyEl = document.getElementById(`smiley-${winId}`);
    if (smileyEl) {
        smileyEl.textContent = '🙂';
    }
}

function toggleMinesweeperMenu(winId, menuType) {
    const gameMenu = document.getElementById(`dropdown-game-${winId}`);
    const helpMenu = document.getElementById(`dropdown-help-${winId}`);
    
    if (menuType === 'game') {
        if (gameMenu) {
            gameMenu.style.display = gameMenu.style.display === 'none' ? 'block' : 'none';
        }
        if (helpMenu) helpMenu.style.display = 'none';
    } else if (menuType === 'help') {
        if (helpMenu) {
            helpMenu.style.display = helpMenu.style.display === 'none' ? 'block' : 'none';
        }
        if (gameMenu) gameMenu.style.display = 'none';
    }
    
    playSound('click');
}

function minesweeperNewGame(winId) {
    toggleMinesweeperMenu(winId, 'game');
    minesweeperReset(winId);
}

function minesweeperSetDifficulty(winId, difficulty) {
    const game = minesweeperGames[winId];
    if (!game) return;
    
    toggleMinesweeperMenu(winId, 'game');
    
    const difficulties = {
        beginner: { rows: 9, cols: 9, mines: 10, width: 240, height: 350 },
        intermediate: { rows: 16, cols: 16, mines: 40, width: 380, height: 510 },
        expert: { rows: 16, cols: 30, mines: 99, width: 660, height: 510 }
    };
    
    const config = difficulties[difficulty];
    
    // Update game settings
    game.rows = config.rows;
    game.cols = config.cols;
    game.mines = config.mines;
    game.difficulty = difficulty;
    
    // Resize window
    const winElement = document.getElementById(winId);
    if (winElement) {
        winElement.style.width = config.width + 'px';
        winElement.style.height = config.height + 'px';
    }
    
    // Reset game with new settings
    createBoard(winId);
    renderBoard(winId);
    
    const smileyEl = document.getElementById(`smiley-${winId}`);
    if (smileyEl) {
        smileyEl.textContent = '🙂';
    }
}

function minesweeperSetCustomDifficulty(winId) {
    const game = minesweeperGames[winId];
    if (!game) return;
    
    toggleMinesweeperMenu(winId, 'game');
    
    showInputDialog('Egyéni nehézség - Magasság', 'Adja meg a sorok számát (9-24):', '16', (rows) => {
        const rowCount = parseInt(rows);
        if (isNaN(rowCount) || rowCount < 9 || rowCount > 24) {
            showMessageBox('Hiba', 'Érvénytelen érték! A sorok száma 9 és 24 között kell legyen.', ['OK']);
            return;
        }
        
        showInputDialog('Egyéni nehézség - Szélesség', 'Adja meg az oszlopok számát (9-30):', '16', (cols) => {
            const colCount = parseInt(cols);
            if (isNaN(colCount) || colCount < 9 || colCount > 30) {
                showMessageBox('Hiba', 'Érvénytelen érték! Az oszlopok száma 9 és 30 között kell legyen.', ['OK']);
                return;
            }
            
            const maxMines = Math.floor(rowCount * colCount * 0.8);
            showInputDialog('Egyéni nehézség - Aknák', `Adja meg az aknák számát (10-${maxMines}):`, '40', (mines) => {
                const mineCount = parseInt(mines);
                if (isNaN(mineCount) || mineCount < 10 || mineCount > maxMines) {
                    showMessageBox('Hiba', `Érvénytelen érték! Az aknák száma 10 és ${maxMines} között kell legyen.`, ['OK']);
                    return;
                }
                
                // Calculate window size based on board size
                const cellSize = 20;
                const width = Math.max(240, colCount * cellSize + 40);
                const height = rowCount * cellSize + 200;
                
                // Update game settings
                game.rows = rowCount;
                game.cols = colCount;
                game.mines = mineCount;
                game.difficulty = 'custom';
                
                // Resize window
                const winElement = document.getElementById(winId);
                if (winElement) {
                    winElement.style.width = width + 'px';
                    winElement.style.height = height + 'px';
                }
                
                // Reset game with new settings
                createBoard(winId);
                renderBoard(winId);
                
                const smileyEl = document.getElementById(`smiley-${winId}`);
                if (smileyEl) {
                    smileyEl.textContent = '🙂';
                }
            });
        });
    });
}

function minesweeperToggleSound(winId) {
    const game = minesweeperGames[winId];
    if (!game) return;
    
    game.soundEnabled = !game.soundEnabled;
    
    const checkEl = document.getElementById(`sound-check-${winId}`);
    if (checkEl) {
        checkEl.textContent = game.soundEnabled ? '✓' : ' ';
    }
    
    if (!game.soundEnabled) {
        game.tickSound.pause();
    } else if (!game.firstClick && !game.gameOver && !game.won) {
        game.tickSound.play().catch(() => {});
    }
    
    playSound('click');
}

function minesweeperToggleTroll(winId) {
    const game = minesweeperGames[winId];
    if (!game) return;
    
    game.trollMode = !game.trollMode;
    
    const checkEl = document.getElementById(`troll-check-${winId}`);
    if (checkEl) {
        checkEl.textContent = game.trollMode ? '✓' : ' ';
    }
    
    if (game.trollMode) {
        showMessageBox('Troll Mód', '🎉 TROLL MÓD AKTIVÁLVA! 🎉\n\nA bombák most partik! 🎊', ['OK']);
    }
    
    renderBoard(winId);
}

function showMinesweeperHelp(winId) {
    toggleMinesweeperMenu(winId, 'help');
    showMessageBox('Aknakereső Súgó', 'Cél: Találd meg az összes aknát anélkül, hogy felfedeznéd őket!\n\n• Bal klikk: Mező felfedése\n• Jobb klikk: Zászló elhelyezése\n• A számok mutatják a környező aknák számát\n\nNehézségi szintek:\n• Kezdő: 9x9 tábla, 10 akna\n• Haladó: 16x16 tábla, 40 akna\n• Szakértő: 30x16 tábla, 99 akna', ['OK']);
}

function showMinesweeperAbout(winId) {
    toggleMinesweeperMenu(winId, 'help');
    showMessageBox('Névjegy', 'Windows 98 Aknakereső\nVerzió: 1.0\n\nEredeti készítő: Curt Johnson\n1998\n\n© Microsoft Corporation', ['OK']);
}
    
    /**
 * Segédfüggvény a sorozonosítók frissítéséhez a VBScript beviteli mező alapján.
 */
function updateLineNumbers(textarea) {
    const code = textarea.value;
    // A lines meg kell egyezzen a textarea valós sorainak számával.
    const lines = code.split('\n').length;
    
    // Generálja a számokat: 1
    const lineNumbersText = Array.from({ length: lines }, (_, i) => i + 1).join('\n');
    
    const lineNumbersElement = document.getElementById('line-numbers');
    if (lineNumbersElement) {
        lineNumbersElement.value = lineNumbersText;
        // Scroll szinkronizálása
        lineNumbersElement.scrollTop = textarea.scrollTop;
    }
}

/**
 * Szinkronizálja a kód beviteli mező és a sorozonosítók mező görgetését.
 */
function syncScroll(textarea) {
    const lineNumbersElement = document.getElementById('line-numbers');
    if (lineNumbersElement) {
        lineNumbersElement.scrollTop = textarea.scrollTop;
    }
}

/**
 * Segédfüggvény a sorozonosítók frissítéséhez a VBScript beviteli mező alapján.
 */
function updateLineNumbers(textarea) {
    const code = textarea.value;
    // A lines meg kell egyezzen a textarea valós sorainak számával.
    const lines = code.split('\n').length;
    
    // Generálja a számokat: 1
    const lineNumbersText = Array.from({ length: lines }, (_, i) => i + 1).join('\n');
    
    const lineNumbersElement = document.getElementById('line-numbers');
    if (lineNumbersElement) {
        lineNumbersElement.value = lineNumbersText;
        // Scroll szinkronizálása
        lineNumbersElement.scrollTop = textarea.scrollTop;
    }
}

/**
 * Szinkronizálja a kód beviteli mező és a sorozonosítók mező görgetését.
 */
function syncScroll(textarea) {
    const lineNumbersElement = document.getElementById('line-numbers');
    if (lineNumbersElement) {
        lineNumbersElement.scrollTop = textarea.scrollTop;
    }
}

/**
 * Alapvető VBScript (VBJScript) fordító JavaScriptre.
 * Csak nagyon egyszerű eseteket kezel (MsgBox, Dim, If/End If, &)
 * A teljes VBScript funkcionalitás lefordítása sokkal komplexebb.
 */
function convertVBScriptToJS(vbscriptCode) {
    let jsCode = vbscriptCode;

    // 1. Általános VBScript jellegzetességek eltávolítása/átalakítása (nem esetérzékeny)
    // VBScript kommentek (') átalakítása JS kommentekké (//) - Ezt érdemes előre tenni, hogy a ' karakterek ne zavarják a többi regexet.
    jsCode = jsCode.replace(/^\s*'([^\n]*)/gm, '// $1'); // Sor eleji kommentek
    jsCode = jsCode.replace(/\s+'([^\n]*)/g, ' // $1'); // Sor közbeni kommentek

    // Típusdeklarációk, mint pl. 'Dim', átalakítása JS változó deklarációra.
    // JAVÍTÁS: Pontosvessző hozzáadása a sor végén, hogy biztosítsuk a JS kijelentés lezárását.
    jsCode = jsCode.replace(/Dim\s+(\w+)\s*$/gim, 'let $1;');
    jsCode = jsCode.replace(/Dim\s+/gi, 'let '); // Bár az előző regex kezeli a legtöbbet, ez segít az inkonzisztenciánál

    // String összefűzés VBScriptben (&) cseréje JS-ben (+)
    jsCode = jsCode.replace(/\s+&\s+/g, ' + ');

    // Sub/End Sub és Function/End Function átalakítása JS függvényekre
    jsCode = jsCode.replace(/Sub\s+(\w+)\s*\(([^)]*)\)\s*/gi, 'function $1 ($2) {\n');
    jsCode = jsCode.replace(/Function\s+(\w+)\s*\(([^)]*)\)\s*/gi, 'function $1 ($2) {\n');
    // Új sor hozzáadása a lezáráshoz a szintaktikai hibák elkerülése végett
    jsCode = jsCode.replace(/End\s+(Sub|Function)\s*/gi, '}\n'); 

    // Egysoros If/Then átalakítása (javított összehasonlítással)
    jsCode = jsCode.replace(/If\s+(.*)\s+Then\s+([^\n]*)/gi, (match, condition, statement) => {
        let safeCondition = condition.replace(/ = /g, ' === ');
        // Biztosítja, hogy az egysoros kijelentés le legyen zárva
        return `if (${safeCondition}) { ${statement.trim()}; }`; 
    });
    
    // Többsoros If átalakítása (javított összehasonlítással)
    jsCode = jsCode.replace(/If\s+(.*)\s+Then\s*/gi, (match, condition) => {
        let safeCondition = condition.replace(/ = /g, ' === ');
        return `if (${safeCondition}) {\n`;
    });
    jsCode = jsCode.replace(/ElseIf\s+(.*)\s+Then\s*/gi, (match, condition) => {
        let safeCondition = condition.replace(/ = /g, ' === ');
        return `} else if (${safeCondition}) {\n`;
    });
    jsCode = jsCode.replace(/Else\s*/gi, '} else {\n');
    // Új sor hozzáadása a lezáráshoz a szintaktikai hibák elkerülése végett
    jsCode = jsCode.replace(/End\s+If\s*/gi, '}\n'); 

    // MsgBox átalakítása showMessageBox-ra
    jsCode = jsCode.replace(/MsgBox\s+([^\n,]+)(?:,\s*\d+)?(?:,\s*("[^"]*"))?/gi, (match, message, title) => {
        const titleStr = title ? `title: ${title.trim()}, ` : 'title: "VBScript Üzenet", ';
        // JAVÍTÁS: A VBScript string literáloknak dupla idézőjelben kell lenniük. 
        // Eltávolítottuk az aposztrófok konvertálását, ami hibákat okozott változónevek esetén.
        const cleanMessage = message.trim(); 
        // Pontosvessző és új sor hozzáadása a megbízható futtatáshoz
        return `showMessageBox({ ${titleStr} message: ${cleanMessage}, icon: 'info', buttons: ['OK'] });
`;
    });
    
    // Call eltávolítása és () hozzáadása a függvényhíváshoz
    jsCode = jsCode.replace(/Call\s+(\w+)\s*(\([^]*\))?/gi, (match, funcName, args) => {
        // Pontosvessző és új sor hozzáadása a megbízható futtatáshoz
        return `${funcName}${args || '()'} ;
`; 
    });

    // 'And', 'Or' cseréje '&&', '||' -ra (operátor kontextusban)
    jsCode = jsCode.replace(/\s+And\s+/gi, ' && ');
    jsCode = jsCode.replace(/\s+Or\s+/gi, ' || ');
    
    
    // VÉGSŐ JAVÍTÁS: Erős (agresszív) pontosvessző beillesztés
    // Biztosítja, hogy az egyszerű értékadásos sorok is le legyenek zárva.
    // Ezt a műveletet a végén végezzük el, hogy ne zavarja a regexeket.
    const lines = jsCode.split('\n');
    jsCode = lines.map(line => {
        const trimmed = line.trim();
        
        // Csak a nem üres sorokat nézzük, amelyek nem kezdődnek/végződnek blokk- vagy kommentjelzővel, 
        // és nem tartalmaznak már pontosvesszőt.
        if (
            trimmed.length > 0 && 
            !trimmed.startsWith('//') && 
            !trimmed.startsWith('/*') && 
            !trimmed.endsWith(';') && 
            !trimmed.endsWith('{') && 
            !trimmed.endsWith('}') &&
            // Megpróbáljuk elkapni az értékadásokat vagy függvényhívásokat (MsgBox/Call már le van zárva, de az értékadás nem)
            !trimmed.toLowerCase().startsWith('function') &&
            !trimmed.toLowerCase().startsWith('if') &&
            !trimmed.toLowerCase().startsWith('else')
        ) {
            // Hozzáadunk egy pontosvesszőt, majd a sortörést.
            return line + ';'; 
        }
        
        return line;
    }).join('\n');


    // Előkészített kimeneti fejléc
    const difference = `// Eredeti VBScript kód:
/*
${vbscriptCode}
*/

// ----------------------------------------
// Fordított (VBJScript) JavaScript kód:
// ----------------------------------------

`
    
    return difference + jsCode.trim();
}

/**
 * Kezeli a "Mentés" gomb eseményét (szimulált).
 */

function saveFile() {
    playSound('ding');
     showMessageBox({
        title: 'Mentés',
        message: 'A fájl mentése szimulálva. A kód nem került mentésre a lemezre.',
        icon: 'info',
        buttons: ['OK']
    });
}

/**
 * Kezeli az "Új" gomb eseményét.
 * Kitörli a szerkesztő és a kimenet tartalmát.
 */
function newFile() {
    const container = document.getElementById('vbjs-container');
    if (container) {
        const input = container.querySelector('#vbscript-input');
        // Visszaállítja a beviteli mező stílusát
        input.style.backgroundColor = 'white'; 
        input.value = '';
        container.querySelector('#js-output').value = '';
        updateLineNumbers(input); // Sorozonosítók frissítése
        playSound('ding');
        showMessageBox({
            title: 'Új fájl',
            message: 'A szerkesztő tartalma törölve lett. Kérem, írja be az új kódot.',
            icon: 'info',
            buttons: ['OK']
        });
    }
}

/**
 * Kezeli a "Segítség" gomb eseményét.
 */
function showHelp() {
    playSound('ding');
     showMessageBox({
        title: 'VBJScript Segítség',
        message: 'Ez a VBJScript IDE egy szimulátor, amely a VBScript szintaxist JavaScript-re fordítja, majd futtatja a böngészőben. Csak az alapvető VBScript parancsok támogatottak (pl. MsgBox, Dim, Sub/End Sub, If/End If, Call, &).',
        icon: 'info',
        buttons: ['OK']
    });
}

/**
 * Kiemeli a megadott VBScript sort a beviteli mezőben.
 * Megjegyzés: Ez egy <textarea> korlátozott kiemelési képessége, 
 * csak a sortöréseket használjuk a piros háttér jelzésére.
 */
function highlightErrorLine(inputElement) {
    if (!inputElement) return;
    // Ideiglenesen beállítjuk a piros háttérszínt, jelezve a hibát.
    inputElement.style.backgroundColor = '#FFDDDD'; 
}


/**
 * Lefordítja és futtatja a VBScript kódot JavaScriptként.
 */
function runVBJScript(vbscriptCode) {
    const container = document.getElementById('vbjs-container');
    const outputElement = container.querySelector('#js-output');
    const inputElement = container.querySelector('#vbscript-input');

    // Alapértelmezett háttér beállítása
    inputElement.style.backgroundColor = 'white';
    outputElement.style.backgroundColor = '#F0F0F0';
    
    // 1. Üres kód ellenőrzése
    if (!vbscriptCode.trim()) {
        playSound('error');
        showMessageBox({
            title: 'VBJScript Fordítási Hiba',
            message: 'A VBScript kód mező üres. Kérem, írjon be kódot a futtatáshoz.',
            icon: 'error',
            buttons: ['OK']
        });
        return;
    }
    
    // 2. Konverzió VBScript-ből JavaScriptre
    let convertedJSCode;

    try {
        convertedJSCode = convertVBScriptToJS(vbscriptCode);
        outputElement.value = convertedJSCode;
        
    } catch (e) {
        playSound('error');
        showMessageBox({
            title: 'VBJScript Fordítási Hiba',
            message: `Hiba történt a kód fordítása közben:

${e.message}`,
            icon: 'error',
            buttons: ['OK']
        });
        outputElement.value = `// Hiba a fordítás közben:
${e.stack}`;
        outputElement.style.backgroundColor = '#FFCCCC'; // Piros háttér hibánál
        return;
    }

    // 3. Futtatás a böngészőben (JavaScriptként)
    try {
        // A fordított JavaScript kód futtatása
        eval(convertedJSCode); 
        
    } catch (e) {
        // Futtatási hiba esetén megpróbáljuk kitalálni a hibás VBScript sort.
        let errorMessage = `A fordított JavaScript kódban futási hiba lépett fel:

${e.message}`;
        // A hiba sorozonosítója az eval() környezetből
        let lineNumberMatch = e.stack ? e.stack.match(/at eval \(<anonymous>:(\d+):\d+\)/) : null;
        
        if (lineNumberMatch && inputElement) {
            // A fejléc 8 sort tartalmaz (megfelelő számítás: 9. sor = 1. VBScript sor)
            const jsHeaderLines = 8; 
            const jsLine = parseInt(lineNumberMatch[1], 10);
            const vbscriptLine = Math.max(1, jsLine - jsHeaderLines); 

            errorMessage += `

BECSÜLT SZINTAKTIKAI HIBAHELY: ${vbscriptLine}. sor.`;
            
            // Hibás sor kiemelésének szimulálása
            highlightErrorLine(inputElement); 
        } else {
            errorMessage += 'A hiba pontos VBScript sorozonosítóját nem lehet meghatározni.';
        }

        playSound('error');
        showMessageBox({
            title: 'VBJScript (JS) Futtatási Hiba',
            message: errorMessage,
            icon: 'error',
            buttons: ['OK']
        });
        console.error("Futtatási hiba a VBJScriptben:", e);
    }
}


/**
 * Megnyitja a VBJScript Kód Szerkesztő/Futtató ablakot.
 */
function openVBJScriptRunner() {
    const defaultVBScript = 
`' VBJScript (Virtual Basic JavaScript) Teszt Kód

Dim nev
nev = "VBJScript Felhasználó"

Sub Udvözlő()
    If nev = "VBJScript Felhasználó" Then
        MsgBox "Üdvözlöm Önt, " & nev & "!", 0, "Sikeres Konverzió"
    Else
        MsgBox "Nem sikerült a név azonosítása.", 16, "Hiba"
    End If
End Sub

Call Udvözlő`;
    
    // Eltávolítottam a beágyazott <script> blokkot, és a div onload eseményére hagyatkozunk.
    const content = `
        <div id="vbjs-container" style="color: black; display: flex; flex-direction: column; height: 100%; font-family: Tahoma, sans-serif; font-size: 13px;" onload="updateLineNumbers(document.querySelector('#vbscript-input'))">
            
            <!-- ESZKÖZSÁV (TOOLBAR) -->
            <div style="display: flex; gap: 4px; padding: 4px; border-bottom: 2px solid #C0C0C0; background-color: #ECE9D8; align-items: center; user-select: none;">
                <button class="btn toolbar-btn" onclick="newFile()" title="Új fájl létrehozása">
                    📄 Új
                </button>
                <button class="btn toolbar-btn" onclick="saveFile()" title="A jelenlegi kód mentése">
                    💾 Mentés
                </button>
                <div style="border-left: 1px solid #808080; height: 24px; margin: 0 4px;"></div>
                <button class="btn btn-run" onclick="runVBJScript(document.querySelector('#vbjs-container #vbscript-input').value)" title="Fordítás és futtatás">
                    ▶️ Futtatás
                </button>
                <div style="border-left: 1px solid #808080; height: 24px; margin: 0 4px;"></div>
                <button class="btn toolbar-btn" onclick="showHelp()" title="Segítség kérése">
                    ❓ Segítség
                </button>
            </div>
            <!-- ESZKÖZSÁV VÉGE -->

            <p style="font-size: 14px; margin: 8px 0; font-weight: bold; border-bottom: 1px solid #C0C0C0; padding-bottom: 4px;">📜 VBJScript (Virtual Basic JavaScript) Szerkesztő</p>
            
            <p style="font-size: 12px; margin-bottom: 6px; color: #800000; font-weight: bold;">⚠️ Figyelem: Ez egy szimulátor! Csak az alapvető VBScript parancsok támogatottak.</p>
            
            <label for="vbscript-input" style="font-size: 12px; margin-top: 4px; font-weight: bold;">▶️ VBScript Kód (Bevitel) (Sorozonosítóval):</label>
            
            <!-- Kód szerkesztő sorozonosítóval -->
            <div id="code-editor-wrapper" style="display: flex; height: 40%; min-height: 100px; margin-bottom: 8px; border: 1px solid #808080; flex-grow: 1;">
                <textarea id="line-numbers" style="width: 30px; padding: 4px; font-family: 'Courier New', monospace; font-size: 13px; background-color: #ECE9D8; border: none; resize: none; overflow: hidden; color: #808080; text-align: right; user-select: none; flex-shrink: 0;" readonly>1</textarea>
                <textarea 
                    id="vbscript-input" 
                    oninput="updateLineNumbers(this)" 
                    onscroll="syncScroll(this)" 
                    style="width: calc(100% - 30px); padding: 4px; font-family: 'Courier New', monospace; font-size: 13px; background-color: white; border: none; resize: none; outline: none; box-sizing: border-box; flex-grow: 1;" 
                    placeholder="Írja be a VBScript kódját...">${defaultVBScript}</textarea>
            </div>
            <!-- Kód szerkesztő vége -->
            
            <p style="font-size: 10px; margin-top: -8px; margin-bottom: 12px; color: #005500;">
                Megjegyzés: A beviteli mező nem támogatja a teljeskörű szintaxis kiemelést. Hiba esetén a háttérszín pirosra vált.
            </p>
            
            <button class="btn btn-primary" style="margin-bottom: 12px; font-weight: bold;" onclick="runVBJScript(document.querySelector('#vbjs-container #vbscript-input').value)">
                ⚙️ VBScript Fordítás és Futtatás
            </button>
            
            <label for="js-output" style="font-size: 12px; margin-top: 4px; font-weight: bold;">➡️ Fordított JavaScript Kód (Kimenet):</label>
            <textarea id="js-output" style="width: 100%; height: 40%; min-height: 100px; resize: vertical; outline: none; box-sizing: border-box; flex-grow: 1; font-family: 'Courier New', monospace; font-size: 13px; background-color: #F0F0F0; border: 1px solid #808080;" readonly placeholder="A fordított JavaScript kód itt jelenik meg..."></textarea>
            
            <p style="font-size: 10px; margin-top: 6px; color: #666; text-align: right; border-top: 1px solid #C0C0C0; padding-top: 4px;">VBJScript Szimulátor a VBScript örökségének tiszteletére.</p>
        </div>
    `;
    
    createWindow({
        title: "VBJScript IDE v1.0",
        icon: "https://win98icons.alexmeub.com/icons/png/shell_app_open-2.png",
        width: 650,
        height: 550,
        content: content
    });
}


    // --- Internet Explorer (Browser) Application ---

    /**
     * Maps special URLs and validates against the whitelist.
     * Shows an error message if validation fails.
     * @param {string} inputUrl - The URL entered by the user.
     * @param {HTMLElement} windowElement - The browser window element to update the title.
     * @returns {{url: string, title: string}|null} The validated/mapped URL and title to load, or null if access denied.
     */
    function mapAndValidateUrl(inputUrl, windowElement) {
        const normalizedUrl = inputUrl.toLowerCase().trim();
        const defaultTitle = "Internet Explorer 4.0";
        const urlInput = windowElement.querySelector('#browser-url-input');

        // 1. Check Special URL mapping (localPageMap)
        const mapEntry = localPageMap[normalizedUrl];
        if (mapEntry) {
            // Update window title and taskbar button
            windowElement.querySelector('.titlebar-text').textContent = mapEntry.title;
            const taskbarBtn = document.getElementById(`taskbtn-${windowElement.id}`);
            if(taskbarBtn) taskbarBtn.textContent = mapEntry.title;
            return { url: mapEntry.externalSrc, title: mapEntry.title };
        }

        // 2. Strict Whitelist validation for direct URLs
        if (normalizedUrl.startsWith(WHITELIST_PREFIX)) {
            // Reset to default title for general whitelisted browsing
            windowElement.querySelector('.titlebar-text').textContent = defaultTitle;
            const taskbarBtn = document.getElementById(`taskbtn-${windowElement.id}`);
            if(taskbarBtn) taskbarBtn.textContent = defaultTitle;
            return { url: normalizedUrl, title: defaultTitle };
        }

        // 3. Deny access
        windowElement.querySelector('.titlebar-text').textContent = defaultTitle; 
        const taskbarBtn = document.getElementById(`taskbtn-${windowElement.id}`);
        if(taskbarBtn) taskbarBtn.textContent = defaultTitle;
        playSound('error');
        showMessageBox({
            title: "Biztonsági Figyelmeztetés",
            message: `A hozzáférés megtagadva! A kért URL nem szerepel a belső hálózati térképen, és nem kezdődik a jogosult előtaggal: "${WHITELIST_PREFIX}".`,
            icon: 'error',
            buttons: ['OK']
        });
        
        // Restore input value to the one that failed, or clear it
        urlInput.value = normalizedUrl;
        return null;
    }

    /**
     * Opens the Internet Explorer browser window.
     */
    function openBrowser() {
        dialUpConnection(() => {
        const initialUrl = "local://overview.html";
        const defaultTitle = "Internet Explorer 4.0";
        let browserWindow = null; 

        const browserContent = `
            <div style="display: flex; flex-direction: column; height: 100%;">
                <!-- Eszköztár -->
                <div class="browser-toolbar">
                    <button class="btn" id="browser-back-btn" title="Vissza">← Vissza</button>
                    <button class="btn" id="browser-forward-btn" title="Előre">Előre →</button>
                    <button class="btn" id="browser-home-btn" title="Kezdőlap">Kezdőlap</button>
                    
                    <div style="width: 8px;"></div> <!-- Separator -->

                    <div style="flex-grow: 1; display: flex; align-items: center; gap: 4px;">
                        <span style="font-size: 12px; color: black;">Cím:</span>
                        <div class="browser-input-bar" style="flex-grow: 1;">
                            <img src="https://win98icons.alexmeub.com/icons/png/html2-2.png" style="width:16px; height:16px; margin-right: 4px;" alt="URL Ikon">
                            <input type="text" id="browser-url-input" value="${initialUrl}" style="flex-grow: 1;">
                        </div>
                    </div>
                    <button class="btn" id="browser-go-btn">Indítás</button>
                </div>
                <!-- Iframe Container -->
                <div style="flex-grow: 1; background-color: white; overflow: hidden; padding: 0; margin: 0;">
                    <iframe id="browser-iframe" src="" style="width: 100%; height: 100%; border: none;"></iframe>
                </div>
            </div>
        `;

        browserWindow = createWindow({
            title: defaultTitle,
            icon: "https://win98icons.alexmeub.com/icons/png/msie1-0.png",
            width: 800,
            height: 600,
            content: browserContent
        });


        const iframe = browserWindow.querySelector('#browser-iframe');
        const urlInput = browserWindow.querySelector('#browser-url-input');
        const goBtn = browserWindow.querySelector('#browser-go-btn');
        const backBtn = browserWindow.querySelector('#browser-back-btn');
        const forwardBtn = browserWindow.querySelector('#browser-forward-btn');
        const homeBtn = browserWindow.querySelector('#browser-home-btn');

        // Function to handle loading the URL after validation
        function loadUrl(url) {
            const result = mapAndValidateUrl(url, browserWindow);
            if (result) {
                // Update the input field with the user's input, even if it was mapped
                urlInput.value = url;
                
                // Special handling for youareanidiot
                if (result.url === "special://youareanidiot") {
                    loadYouAreAnIdiot(iframe, browserWindow);
                } else {
                    iframe.src = result.url;
                }
            }
        }

        // Event listeners for Go button and Enter key
        goBtn.addEventListener('click', () => {
            playSound('click');
            loadUrl(urlInput.value);
        });

        urlInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                playSound('click');
                loadUrl(urlInput.value);
            }
        });
        
        homeBtn.addEventListener('click', () => {
             playSound('click');
             loadUrl(initialUrl);
        });

        // History controls (These rely on the iframe's internal history, which is unreliable across origins)
        backBtn.addEventListener('click', () => {
            playSound('click');
            try {
                iframe.contentWindow.history.back();
            } catch (e) {
                playSound('ding');
                showMessageBox({
                    title: "Navigációs Hiba", 
                    message: "Visszalépés nem lehetséges a böngésző biztonsági korlátozásai miatt. (Különböző webhelyek.)", 
                    icon: 'warning', 
                    buttons: ['OK']
                });
            }
        });
        
        forwardBtn.addEventListener('click', () => {
            playSound('click');
            try {
                iframe.contentWindow.history.forward();
            } catch (e) {
                playSound('ding');
                showMessageBox({
                    title: "Navigációs Hiba", 
                    message: "Előrelépés nem lehetséges a böngésző biztonsági korlátozásai miatt. (Különböző webhelyek.)", 
                    icon: 'warning', 
                    buttons: ['OK']
                });
            }
        });

        // Initial load upon opening
        loadUrl(initialUrl);
    },
    
    function openMyComputer() {
    const defaultTitle = "Sajátgép"; // Hungarian for My Computer
    const initialUrl = "https://urbanmove8.neocities.org/retro1998/mycomputer"; // Placeholder for the content
    let fileExplorerWindow = null;

    // --- Content Structure: Toolbar, Status Bar, and Content Frame ---
    const fileExplorerContent = `
        <div style="display: flex; flex-direction: column; height: 100%;">
            <div class="browser-toolbar" style="padding: 4px; display: flex; align-items: center; border-bottom: 1px solid gray;">
                <button class="btn" title="Vissza (Back)">
                    <img src="https://win98icons.alexmeub.com/icons/png/back_3-1.png" style="width:16px; height:16px;" alt="Vissza">
                </button>
                <button class="btn" title="Előre (Forward)">
                    <img src="https://win98icons.alexmeub.com/icons/png/forward_3-1.png" style="width:16px; height:16px;" alt="Előre">
                </button>
                <button class="btn" title="Fel (Up One Level)">
                    <img src="https://win98icons.alexmeub.com/icons/png/up_3-1.png" style="width:16px; height:16px;" alt="Fel">
                </button>
                <div style="width: 8px;"></div> <div style="flex-grow: 1; display: flex; align-items: center; gap: 4px;">
                    <span style="font-size: 12px; color: black; white-space: nowrap;">Cím:</span>
                    <div class="browser-input-bar" style="flex-grow: 1; display: flex; align-items: center; padding: 2px;">
                        <img src="https://win98icons.alexmeub.com/icons/png/my_computer-0.png" style="width:16px; height:16px; margin-right: 4px;" alt="My Computer Icon">
                        <span id="file-explorer-address" style="flex-grow: 1; font-size: 12px; padding: 1px 0;">${defaultTitle}</span>
                    </div>
                </div>
            </div>

            <div style="flex-grow: 1; background-color: white; overflow: hidden; padding: 0; margin: 0; border: 1px solid black; border-width: 0 0 1px 0;">
                <iframe id="file-explorer-iframe" src="${initialUrl}" style="width: 100%; height: 100%; border: none;"></iframe>
            </div>

            <div style="height: 18px; border-top: 1px solid #DFDFDF; display: flex; align-items: center; padding: 0 4px; font-size: 11px; background-color: #ECE9D8;">
                <span id="file-explorer-status">5 objektum</span>
            </div>
        </div>
    `;

    // --- Create the Window ---
    fileExplorerWindow = createWindow({
        title: defaultTitle,
        icon: "https://win98icons.alexmeub.com/icons/png/my_computer-0.png",
        width: 640,
        height: 480,
        content: fileExplorerContent
    });

    // --- Basic Interaction (Simplified) ---
    // The iframe and other elements are present but the navigation logic is removed/simplified.
    const iframe = fileExplorerWindow.querySelector('#file-explorer-iframe');
    const statusSpan = fileExplorerWindow.querySelector('#file-explorer-status');

    // This part would normally contain logic to handle folder navigation,
    // update the iframe source, the address bar, and the status bar.
    // Since this is a static example, we just ensure the initial content loads.

    // Example of a function that would load content (if you had a full system)
    function loadContent(url, title, status) {
        iframe.src = url;
        fileExplorerWindow.setWindowTitle(title); // Assuming createWindow provides this helper
        statusSpan.textContent = status;
    }

    // Initial load: We already set the src in the HTML, but this is for completeness.
    // Note: The specific `createWindow` and `mapAndValidateUrl` functions from your original code are required
    // for this code to run in a real environment (like a Windows 98 simulator).
    
    playSound('open');
        });
    }

function openWindowsExplorer() {
    // The initialUrl is set to the external page as requested.
    const defaultTitle = "C:\\ (Windows Explorer)";
    const initialUrl = "https://urbanmove8.neocities.org/retro1998/mycomputer";
    let windowsExplorerWindow = null;

    // --- Content Structure: Toolbar, Two Panes, and Status Bar ---
    const explorerContent = `
        <div style="display: flex; flex-direction: column; height: 100%;">
            <!-- Eszköztár (Toolbar) -->
            <div class="browser-toolbar" style="padding: 4px; display: flex; align-items: center; border-bottom: 1px solid gray;">
                <!-- Standard Explorer Icons (Back, Forward, Up, View, etc.) -->
                <button class="btn" title="Vissza (Back)">
                    <img src="https://win98icons.alexmeub.com/icons/png/back_3-1.png" style="width:16px; height:16px;" alt="Vissza">
                </button>
                <button class="btn" title="Előre (Forward)">
                    <img src="https://win98icons.alexmeub.com/icons/png/forward_3-1.png" style="width:16px; height:16px;" alt="Előre">
                </button>
                <button class="btn" title="Fel (Up One Level)">
                    <img src="https://win98icons.alexmeub.com/icons/png/up_3-1.png" style="width:16px; height:16px;" alt="Fel">
                </button>
                <div style="width: 8px;"></div> <!-- Separator -->
                
                <!-- Cím (Address Bar) -->
                <div style="flex-grow: 1; display: flex; align-items: center; gap: 4px;">
                    <span style="font-size: 12px; color: black; white-space: nowrap;">Cím:</span>
                    <div class="browser-input-bar" style="flex-grow: 1; display: flex; align-items: center; padding: 2px;">
                        <img src="https://win98icons.alexmeub.com/icons/png/drive_cd-0.png" style="width:16px; height:16px; margin-right: 4px;" alt="Drive Icon">
                        <!-- Path displayed here, updated when navigating -->
                        <span id="explorer-address" style="flex-grow: 1; font-size: 12px; padding: 1px 0;">C:\</span>
                    </div>
                </div>
            </div>

            <!-- Main Content Area: Two Panes -->
            <div style="flex-grow: 1; display: flex; overflow: hidden;">
                
                <!-- Left Pane: Tree View (Directory Structure) -->
                <div style="width: 30%; min-width: 150px; border-right: 1px solid gray; background-color: white; overflow-y: auto;">
                    <ul style="list-style: none; padding: 4px; margin: 0; font-size: 12px; color: black;">
                        <!-- Placeholder for the actual Tree View -->
                        <li>
                            <img src="https://win98icons.alexmeub.com/icons/png/my_computer-0.png" style="width:16px; height:16px; vertical-align: middle;">
                            <strong>Sajátgép</strong>
                            <ul>
                                <li>
                                    <img src="https://win98icons.alexmeub.com/icons/png/drive_cd-0.png" style="width:16px; height:16px; vertical-align: middle;">
                                    Helyi lemez (C:)
                                    <ul>
                                        <li>
                                            <img src="https://win98icons.alexmeub.com/icons/png/directory_open_cool-4.png" style="width:16px; height:16px; vertical-align: middle;">
                                            Windows
                                        </li>
                                        <li>
                                            <img src="https://win98icons.alexmeub.com/icons/png/directory_open_cool-4.png" style="width:16px; height:16px; vertical-align: middle;">
                                            Program Files
                                        </li>
                                    </ul>
                                </li>
                            </ul>
                        </li>
                    </ul>
                </div>
                
                <!-- Right Pane: List View (Folder Contents) -->
                <div style="flex-grow: 1; background-color: white; overflow: hidden; padding: 0; margin: 0;">
                    <!-- The iframe now loads the external URL provided by the user -->
                    <iframe id="explorer-iframe" src="${initialUrl}" style="width: 100%; height: 100%; border: none;"></iframe>
                </div>
            </div>

            <!-- Állapotsor (Status Bar) -->
            <div style="height: 18px; border-top: 1px solid #DFDFDF; display: flex; align-items: center; padding: 0 4px; font-size: 11px; background-color: white;">
                <span id="explorer-status" style="color: black;">5 objektum (és 3 rejtett)</span>
            </div>
        </div>
    `;

    // --- Create the Window ---
    windowsExplorerWindow = createWindow({
        title: defaultTitle,
        icon: "https://win98icons.alexmeub.com/icons/png/directory_open_cool-4.png", // Directory/Folder icon
        width: 700,
        height: 500,
        content: explorerContent
    });

    // --- Interaction (Placeholder) ---
    // In a real implementation, clicks on the left pane (tree view) would update the iframe src.
    const iframe = windowsExplorerWindow.querySelector('#explorer-iframe');
    
    // Note: The specific `createWindow` and related helper functions must be defined elsewhere in your environment.
}

    // --- Imaging for Windows ---
    function openImagingForWindows() {
        playSound('click');
        
        const content = `
            <div style="display: flex; flex-direction: column; height: 100%; background-color: #C0C0C0; font-family: Arial, sans-serif;">
                <!-- Menu Bar -->
                <div style="background-color: #ECE9D8; border-bottom: 1px solid #808080; padding: 2px 4px; font-size: 11px; display: flex; gap: 8px;">
                    <span class="imaging-menu-item" style="padding: 2px 6px; cursor: pointer;" onmouseover="this.style.backgroundColor='#000080'; this.style.color='white';" onmouseout="this.style.backgroundColor='transparent'; this.style.color='black';" onclick="event.stopPropagation(); document.getElementById('imaging-file-dropdown').style.display='block';">File</span>
                    <span class="imaging-menu-item" style="padding: 2px 6px; cursor: pointer;" onmouseover="this.style.backgroundColor='#000080'; this.style.color='white';" onmouseout="this.style.backgroundColor='transparent'; this.style.color='black';" onclick="event.stopPropagation(); document.getElementById('imaging-edit-dropdown').style.display='block';">Edit</span>
                    <span class="imaging-menu-item" style="padding: 2px 6px; cursor: pointer;" onmouseover="this.style.backgroundColor='#000080'; this.style.color='white';" onmouseout="this.style.backgroundColor='transparent'; this.style.color='black';">View</span>
                    <span class="imaging-menu-item" style="padding: 2px 6px; cursor: pointer;" onmouseover="this.style.backgroundColor='#000080'; this.style.color='white';" onmouseout="this.style.backgroundColor='transparent'; this.style.color='black';">Image</span>
                    <span class="imaging-menu-item" style="padding: 2px 6px; cursor: pointer;" onmouseover="this.style.backgroundColor='#000080'; this.style.color='white';" onmouseout="this.style.backgroundColor='transparent'; this.style.color='black';">Help</span>
                    
                    <!-- File Dropdown -->
                    <div id="imaging-file-dropdown" style="display: none; position: absolute; top: 24px; left: 4px; background: #C0C0C0; border: 2px outset #FFF; min-width: 180px; z-index: 1000; box-shadow: 2px 2px 2px rgba(0,0,0,0.5);">
                        <div class="imaging-dropdown-item" style="padding: 4px 20px; cursor: pointer; font-size: 11px;" onmouseover="this.style.backgroundColor='#000080'; this.style.color='white';" onmouseout="this.style.backgroundColor='transparent'; this.style.color='black';" onclick="imagingNewImage()">New Image...</div>
                        <div class="imaging-dropdown-item" style="padding: 4px 20px; cursor: pointer; font-size: 11px;" onmouseover="this.style.backgroundColor='#000080'; this.style.color='white';" onmouseout="this.style.backgroundColor='transparent'; this.style.color='black';" onclick="imagingOpenFile()">Open from URL...</div>
                        <div style="border-top: 1px solid #808080; margin: 2px 0;"></div>
                        <div class="imaging-dropdown-item" style="padding: 4px 20px; cursor: pointer; font-size: 11px;" onmouseover="this.style.backgroundColor='#000080'; this.style.color='white';" onmouseout="this.style.backgroundColor='transparent'; this.style.color='black';" onclick="imagingSaveToLocalStorage()">💾 Save to Browser</div>
                        <div class="imaging-dropdown-item" style="padding: 4px 20px; cursor: pointer; font-size: 11px;" onmouseover="this.style.backgroundColor='#000080'; this.style.color='white';" onmouseout="this.style.backgroundColor='transparent'; this.style.color='black';" onclick="imagingLoadFromLocalStorage()">📂 Load from Browser</div>
                        <div style="border-top: 1px solid #808080; margin: 2px 0;"></div>
                        <div class="imaging-dropdown-item" style="padding: 4px 20px; cursor: pointer; font-size: 11px;" onmouseover="this.style.backgroundColor='#000080'; this.style.color='white';" onmouseout="this.style.backgroundColor='transparent'; this.style.color='black';" onclick="imagingSaveFile()">💾 Download to Computer</div>
                    </div>
                    
                    <!-- Edit Dropdown -->
                    <div id="imaging-edit-dropdown" style="display: none; position: absolute; top: 24px; left: 45px; background: #C0C0C0; border: 2px outset #FFF; min-width: 150px; z-index: 1000; box-shadow: 2px 2px 2px rgba(0,0,0,0.5);">
                        <div class="imaging-dropdown-item" style="padding: 4px 20px; cursor: pointer; font-size: 11px;" onmouseover="this.style.backgroundColor='#000080'; this.style.color='white';" onmouseout="this.style.backgroundColor='transparent'; this.style.color='black';" onclick="imagingUndo()">Undo   Ctrl+Z</div>
                        <div class="imaging-dropdown-item" style="padding: 4px 20px; cursor: pointer; font-size: 11px;" onmouseover="this.style.backgroundColor='#000080'; this.style.color='white';" onmouseout="this.style.backgroundColor='transparent'; this.style.color='black';" onclick="imagingRedo()">Redo   Ctrl+Y</div>
                        <div style="border-top: 1px solid #808080; margin: 2px 0;"></div>
                        <div class="imaging-dropdown-item" style="padding: 4px 20px; cursor: pointer; font-size: 11px;" onmouseover="this.style.backgroundColor='#000080'; this.style.color='white';" onmouseout="this.style.backgroundColor='transparent'; this.style.color='black';" onclick="imagingClear()">Clear Canvas</div>
                        <div style="border-top: 1px solid #808080; margin: 2px 0;"></div>
                        <div class="imaging-dropdown-item" style="padding: 4px 20px; cursor: pointer; font-size: 11px;" onmouseover="this.style.backgroundColor='#000080'; this.style.color='white';" onmouseout="this.style.backgroundColor='transparent'; this.style.color='black';" onclick="imagingRotate()">Rotate 90°</div>
                        <div class="imaging-dropdown-item" style="padding: 4px 20px; cursor: pointer; font-size: 11px;" onmouseover="this.style.backgroundColor='#000080'; this.style.color='white';" onmouseout="this.style.backgroundColor='transparent'; this.style.color='black';" onclick="imagingFlipH()">Flip Horizontal</div>
                        <div class="imaging-dropdown-item" style="padding: 4px 20px; cursor: pointer; font-size: 11px;" onmouseover="this.style.backgroundColor='#000080'; this.style.color='white';" onmouseout="this.style.backgroundColor='transparent'; this.style.color='black';" onclick="imagingFlipV()">Flip Vertical</div>
                    </div>
                </div>
                
                <!-- Toolbar -->
                <div style="background-color: #ECE9D8; border-bottom: 2px solid #808080; padding: 4px; display: flex; gap: 2px; align-items: center;">
                    <button class="btn" style="padding: 3px 8px; font-size: 11px;" onclick="imagingOpenFile()" title="Open Image">📂 Open</button>
                    <button class="btn" style="padding: 3px 8px; font-size: 11px;" onclick="imagingSaveToLocalStorage()" title="Save to Browser">💾 Save Local</button>
                    <button class="btn" style="padding: 3px 8px; font-size: 11px;" onclick="imagingSaveFile()" title="Download to Computer">💾 Download</button>
                    <div style="width: 1px; height: 20px; background: #808080; margin: 0 4px;"></div>
                    <button class="btn" style="padding: 3px 8px; font-size: 11px;" onclick="imagingUndo()" title="Undo">↶ Undo</button>
                    <button class="btn" style="padding: 3px 8px; font-size: 11px;" onclick="imagingRedo()" title="Redo">↷ Redo</button>
                    <div style="width: 1px; height: 20px; background: #808080; margin: 0 4px;"></div>
                    <button class="btn" style="padding: 3px 8px; font-size: 11px;" onclick="imagingZoomIn()" title="Zoom In">🔍+ Zoom In</button>
                    <button class="btn" style="padding: 3px 8px; font-size: 11px;" onclick="imagingZoomOut()" title="Zoom Out">🔍- Zoom Out</button>
                    <button class="btn" style="padding: 3px 8px; font-size: 11px;" onclick="imagingResetZoom()" title="Reset Zoom">100%</button>
                    <div style="width: 1px; height: 20px; background: #808080; margin: 0 4px;"></div>
                    <button class="btn" style="padding: 3px 8px; font-size: 11px;" onclick="imagingRotate()" title="Rotate 90°">🔄</button>
                    <button class="btn" style="padding: 3px 8px; font-size: 11px;" onclick="imagingFlipH()" title="Flip Horizontal">⇄</button>
                    <button class="btn" style="padding: 3px 8px; font-size: 11px;" onclick="imagingFlipV()" title="Flip Vertical">⇅</button>
                </div>
                
                <!-- Main Content Area -->
                <div style="display: flex; flex-grow: 1; overflow: hidden;">
                    <!-- Left Sidebar - Scratch-style Tools -->
                    <div style="width: 80px; background-color: #D4D0C8; border-right: 2px solid #808080; padding: 6px; display: flex; flex-direction: column; gap: 6px; overflow-y: auto;">
                        <div style="font-size: 11px; font-weight: bold; margin-bottom: 4px; color: #000080;">Tools</div>
                        
                        <button class="btn imaging-tool" data-tool="select" style="width: 68px; height: 60px; padding: 4px; display: flex; flex-direction: column; align-items: center; justify-content: center; font-size: 9px;" title="Select">
                            <div style="font-size: 24px;">▭</div>
                            <div>Select</div>
                        </button>
                        
                        <button class="btn imaging-tool" data-tool="brush" style="width: 68px; height: 60px; padding: 4px; display: flex; flex-direction: column; align-items: center; justify-content: center; font-size: 9px;" title="Brush">
                            <div style="font-size: 24px;">🖌️</div>
                            <div>Brush</div>
                        </button>
                        
                        <button class="btn imaging-tool" data-tool="eraser" style="width: 68px; height: 60px; padding: 4px; display: flex; flex-direction: column; align-items: center; justify-content: center; font-size: 9px;" title="Eraser">
                            <div style="font-size: 24px;">🧹</div>
                            <div>Eraser</div>
                        </button>
                        
                        <button class="btn imaging-tool" data-tool="fill" style="width: 68px; height: 60px; padding: 4px; display: flex; flex-direction: column; align-items: center; justify-content: center; font-size: 9px;" title="Fill">
                            <div style="font-size: 24px;">🪣</div>
                            <div>Fill</div>
                        </button>
                        
                        <button class="btn imaging-tool" data-tool="text" style="width: 68px; height: 60px; padding: 4px; display: flex; flex-direction: column; align-items: center; justify-content: center; font-size: 9px;" title="Text">
                            <div style="font-size: 24px;">A</div>
                            <div>Text</div>
                        </button>
                        
                        <button class="btn imaging-tool" data-tool="line" style="width: 68px; height: 60px; padding: 4px; display: flex; flex-direction: column; align-items: center; justify-content: center; font-size: 9px;" title="Line">
                            <div style="font-size: 24px;">╱</div>
                            <div>Line</div>
                        </button>
                        
                        <button class="btn imaging-tool" data-tool="rectangle" style="width: 68px; height: 60px; padding: 4px; display: flex; flex-direction: column; align-items: center; justify-content: center; font-size: 9px;" title="Rectangle">
                            <div style="font-size: 24px;">▭</div>
                            <div>Rectangle</div>
                        </button>
                        
                        <button class="btn imaging-tool" data-tool="circle" style="width: 68px; height: 60px; padding: 4px; display: flex; flex-direction: column; align-items: center; justify-content: center; font-size: 9px;" title="Circle">
                            <div style="font-size: 24px;">⭕</div>
                            <div>Circle</div>
                        </button>
                        
                        <div style="border-top: 1px solid #808080; margin: 4px 0;"></div>
                        
                        <!-- Brush Size Slider -->
                        <div style="font-size: 10px; margin-top: 4px;">Brush Size:</div>
                        <input type="range" id="imaging-brush-size" min="1" max="50" value="5" style="width: 60px;">
                        <div id="imaging-brush-display" style="font-size: 10px; text-align: center;">5px</div>
                        
                        <!-- Color Picker -->
                        <div style="font-size: 10px; margin-top: 8px;">Color:</div>
                        <input type="color" id="imaging-color-picker" value="#000000" style="width: 60px; height: 30px; border: 2px inset #808080;">
                    </div>
                    
                    <!-- Canvas Area -->
                    <div style="flex-grow: 1; background-color: #808080; position: relative; overflow: auto; display: flex; align-items: center; justify-content: center;">
                        <div id="imaging-canvas-wrapper" style="background: white; box-shadow: 2px 2px 4px rgba(0,0,0,0.3); transform-origin: center; transition: transform 0.2s;">
                            <canvas id="imaging-canvas" width="640" height="480" style="display: block; cursor: crosshair; background: white; image-rendering: pixelated;"></canvas>
                        </div>
                    </div>
                    
                    <!-- Right Sidebar - Image Info -->
                    <div style="width: 180px; background-color: #D4D0C8; border-left: 2px solid #808080; padding: 8px; font-size: 11px; overflow-y: auto;">
                        <div style="font-weight: bold; margin-bottom: 8px; color: #000080;">Image Info</div>
                        <div style="background: white; border: 2px inset #808080; padding: 6px; margin-bottom: 8px;">
                            <div><strong>Size:</strong> <span id="imaging-size-info">640 x 480</span></div>
                            <div><strong>Format:</strong> <span id="imaging-format-info">PNG</span></div>
                            <div><strong>Tool:</strong> <span id="imaging-current-tool">Select</span></div>
                            <div><strong>Zoom:</strong> <span id="imaging-zoom-info">100%</span></div>
                        </div>
                        
                        <div style="font-weight: bold; margin: 12px 0 6px 0; color: #000080;">Supported Formats</div>
                        <div style="background: white; border: 2px inset #808080; padding: 6px; font-size: 10px;">
                            • PNG (.png)<br>
                            • JPEG (.jpg)<br>
                            • GIF (.gif)<br>
                            • BMP (.bmp)<br>
                            • WebP (.webp)<br>
                            • SVG (.svg)
                        </div>
                        
                        <div style="margin-top: 16px;">
                            <button class="btn" style="width: 100%; padding: 6px; margin-bottom: 4px;" onclick="imagingLoadSample()">📷 Load Sample</button>
                            <button class="btn" style="width: 100%; padding: 6px; margin-bottom: 4px;" onclick="imagingLoadFromLocalStorage()">📂 Load Saved</button>
                            <button class="btn" style="width: 100%; padding: 6px; margin-bottom: 4px;" onclick="imagingListSaved()">📋 Show Saved</button>
                            <button class="btn" style="width: 100%; padding: 6px;" onclick="imagingEasterEgg()">🎨 About</button>
                        </div>
                    </div>
                </div>
                
                <!-- Status Bar -->
                <div style="background-color: #C0C0C0; border-top: 2px solid white; padding: 2px 6px; font-size: 11px; display: flex; justify-content: space-between;">
                    <span id="imaging-status">Ready - Imaging for Windows</span>
                    <span id="imaging-cursor-pos">X: 0, Y: 0</span>
                </div>
            </div>
        `;
        
        const win = createWindow({
            title: 'Imaging for Windows',
            icon: 'https://win98icons.alexmeub.com/icons/png/kodak_imaging-0.png',
            width: 900,
            height: 650,
            content: content
        });
        
        // Initialize Imaging after window creation
        setTimeout(() => {
            initImaging();
        }, 100);
    }
    
    // Imaging for Windows - Core Functions
    const imagingState = {
        canvas: null,
        ctx: null,
        currentTool: 'select',
        isDrawing: false,
        lastX: 0,
        lastY: 0,
        brushSize: 5,
        currentColor: '#000000',
        undoStack: [],
        redoStack: [],
        currentImage: null,
        startX: 0,
        startY: 0,
        zoomLevel: 1.0,
        easterEggCounter: 0
    };
    
    function initImaging() {
        imagingState.canvas = document.getElementById('imaging-canvas');
        imagingState.ctx = imagingState.canvas.getContext('2d');
        
        if (!imagingState.canvas || !imagingState.ctx) return;
        
        // Close dropdowns when clicking anywhere
        document.addEventListener('click', () => {
            const fileDropdown = document.getElementById('imaging-file-dropdown');
            const editDropdown = document.getElementById('imaging-edit-dropdown');
            if (fileDropdown) fileDropdown.style.display = 'none';
            if (editDropdown) editDropdown.style.display = 'none';
        });
        
        // Tool selection
        document.querySelectorAll('.imaging-tool').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('.imaging-tool').forEach(b => b.style.border = '2px outset #FFF');
                btn.style.border = '2px inset #808080';
                imagingState.currentTool = btn.dataset.tool;
                document.getElementById('imaging-current-tool').textContent = btn.dataset.tool.charAt(0).toUpperCase() + btn.dataset.tool.slice(1);
                document.getElementById('imaging-status').textContent = `Tool: ${imagingState.currentTool}`;
            });
        });
        
        // Brush size slider
        const brushSlider = document.getElementById('imaging-brush-size');
        const brushDisplay = document.getElementById('imaging-brush-display');
        if (brushSlider && brushDisplay) {
            brushSlider.addEventListener('input', (e) => {
                imagingState.brushSize = parseInt(e.target.value);
                brushDisplay.textContent = imagingState.brushSize + 'px';
            });
        }
        
        // Color picker
        const colorPicker = document.getElementById('imaging-color-picker');
        if (colorPicker) {
            colorPicker.addEventListener('input', (e) => {
                imagingState.currentColor = e.target.value;
            });
        }
        
        // Mouse events
        imagingState.canvas.addEventListener('mousedown', imagingMouseDown);
        imagingState.canvas.addEventListener('mousemove', imagingMouseMove);
        imagingState.canvas.addEventListener('mouseup', imagingMouseUp);
        imagingState.canvas.addEventListener('mouseleave', imagingMouseUp);
        
        // Track cursor position
        imagingState.canvas.addEventListener('mousemove', (e) => {
            const rect = imagingState.canvas.getBoundingClientRect();
            const x = Math.floor(e.clientX - rect.left);
            const y = Math.floor(e.clientY - rect.top);
            document.getElementById('imaging-cursor-pos').textContent = `X: ${x}, Y: ${y}`;
        });
        
        // Initialize with white background
        imagingState.ctx.fillStyle = 'white';
        imagingState.ctx.fillRect(0, 0, imagingState.canvas.width, imagingState.canvas.height);
        imagingSaveState();
    }
    
    function imagingMouseDown(e) {
        const rect = imagingState.canvas.getBoundingClientRect();
        imagingState.lastX = e.clientX - rect.left;
        imagingState.lastY = e.clientY - rect.top;
        imagingState.startX = imagingState.lastX;
        imagingState.startY = imagingState.lastY;
        imagingState.isDrawing = true;
        
        if (imagingState.currentTool === 'fill') {
            imagingFloodFill(Math.floor(imagingState.lastX), Math.floor(imagingState.lastY));
            imagingSaveState();
        } else if (imagingState.currentTool === 'text') {
            imagingAddText(imagingState.lastX, imagingState.lastY);
        }
    }
    
    function imagingMouseMove(e) {
        if (!imagingState.isDrawing) return;
        
        const rect = imagingState.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        const ctx = imagingState.ctx;
        ctx.strokeStyle = imagingState.currentColor;
        ctx.fillStyle = imagingState.currentColor;
        ctx.lineWidth = imagingState.brushSize;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        
        switch (imagingState.currentTool) {
            case 'brush':
                ctx.beginPath();
                ctx.moveTo(imagingState.lastX, imagingState.lastY);
                ctx.lineTo(x, y);
                ctx.stroke();
                imagingState.lastX = x;
                imagingState.lastY = y;
                break;
                
            case 'eraser':
                ctx.clearRect(x - imagingState.brushSize / 2, y - imagingState.brushSize / 2, imagingState.brushSize, imagingState.brushSize);
                break;
        }
    }
    
    function imagingMouseUp(e) {
        if (!imagingState.isDrawing) return;
        
        const rect = imagingState.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        const ctx = imagingState.ctx;
        ctx.strokeStyle = imagingState.currentColor;
        ctx.fillStyle = imagingState.currentColor;
        ctx.lineWidth = imagingState.brushSize;
        
        switch (imagingState.currentTool) {
            case 'line':
                ctx.beginPath();
                ctx.moveTo(imagingState.startX, imagingState.startY);
                ctx.lineTo(x, y);
                ctx.stroke();
                imagingSaveState();
                break;
                
            case 'rectangle':
                const width = x - imagingState.startX;
                const height = y - imagingState.startY;
                ctx.strokeRect(imagingState.startX, imagingState.startY, width, height);
                imagingSaveState();
                break;
                
            case 'circle':
                const radius = Math.sqrt(Math.pow(x - imagingState.startX, 2) + Math.pow(y - imagingState.startY, 2));
                ctx.beginPath();
                ctx.arc(imagingState.startX, imagingState.startY, radius, 0, Math.PI * 2);
                ctx.stroke();
                imagingSaveState();
                break;
                
            case 'brush':
            case 'eraser':
                imagingSaveState();
                break;
        }
        
        imagingState.isDrawing = false;
    }
    
    function imagingSaveState() {
        if (!imagingState.canvas) return;
        imagingState.undoStack.push(imagingState.canvas.toDataURL());
        if (imagingState.undoStack.length > 20) imagingState.undoStack.shift();
        imagingState.redoStack = []; // Clear redo stack on new action
    }
    
    function imagingUndo() {
        if (imagingState.undoStack.length > 1) {
            const currentState = imagingState.undoStack.pop();
            imagingState.redoStack.push(currentState);
            const img = new Image();
            img.onload = () => {
                imagingState.ctx.clearRect(0, 0, imagingState.canvas.width, imagingState.canvas.height);
                imagingState.ctx.drawImage(img, 0, 0);
            };
            img.src = imagingState.undoStack[imagingState.undoStack.length - 1];
            document.getElementById('imaging-status').textContent = `Undo successful (${imagingState.undoStack.length} states)`;
        } else {
            document.getElementById('imaging-status').textContent = 'Nothing to undo';
        }
    }
    
    function imagingClear() {
        if (!imagingState.ctx) return;
        imagingState.ctx.fillStyle = 'white';
        imagingState.ctx.fillRect(0, 0, imagingState.canvas.width, imagingState.canvas.height);
        imagingSaveState();
        document.getElementById('imaging-status').textContent = 'Canvas cleared';
    }
    
    function imagingRotate() {
        if (!imagingState.canvas || !imagingState.ctx) return;
        
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = imagingState.canvas.height;
        tempCanvas.height = imagingState.canvas.width;
        const tempCtx = tempCanvas.getContext('2d');
        
        tempCtx.translate(tempCanvas.width / 2, tempCanvas.height / 2);
        tempCtx.rotate(Math.PI / 2);
        tempCtx.drawImage(imagingState.canvas, -imagingState.canvas.width / 2, -imagingState.canvas.height / 2);
        
        imagingState.canvas.width = tempCanvas.width;
        imagingState.canvas.height = tempCanvas.height;
        imagingState.ctx.drawImage(tempCanvas, 0, 0);
        
        document.getElementById('imaging-size-info').textContent = `${imagingState.canvas.width} x ${imagingState.canvas.height}`;
        imagingSaveState();
        document.getElementById('imaging-status').textContent = 'Rotated 90° clockwise';
    }
    
    function imagingFlipH() {
        if (!imagingState.canvas || !imagingState.ctx) return;
        
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = imagingState.canvas.width;
        tempCanvas.height = imagingState.canvas.height;
        const tempCtx = tempCanvas.getContext('2d');
        
        tempCtx.scale(-1, 1);
        tempCtx.drawImage(imagingState.canvas, -imagingState.canvas.width, 0);
        
        imagingState.ctx.clearRect(0, 0, imagingState.canvas.width, imagingState.canvas.height);
        imagingState.ctx.drawImage(tempCanvas, 0, 0);
        imagingSaveState();
        document.getElementById('imaging-status').textContent = 'Flipped horizontally';
    }
    
    function imagingFlipV() {
        if (!imagingState.canvas || !imagingState.ctx) return;
        
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = imagingState.canvas.width;
        tempCanvas.height = imagingState.canvas.height;
        const tempCtx = tempCanvas.getContext('2d');
        
        tempCtx.scale(1, -1);
        tempCtx.drawImage(imagingState.canvas, 0, -imagingState.canvas.height);
        
        imagingState.ctx.clearRect(0, 0, imagingState.canvas.width, imagingState.canvas.height);
        imagingState.ctx.drawImage(tempCanvas, 0, 0);
        imagingSaveState();
        document.getElementById('imaging-status').textContent = 'Flipped vertically';
    }
    
    function imagingFloodFill(x, y) {
        if (!imagingState.ctx) return;
        
        const imageData = imagingState.ctx.getImageData(0, 0, imagingState.canvas.width, imagingState.canvas.height);
        const targetColor = getPixelColor(imageData, x, y);
        const fillColor = hexToRgb(imagingState.currentColor);
        
        if (colorsMatch(targetColor, fillColor)) return;
        
        const pixelsToCheck = [{x, y}];
        const checkedPixels = new Set();
        
        while (pixelsToCheck.length > 0) {
            const {x: px, y: py} = pixelsToCheck.pop();
            const key = `${px},${py}`;
            
            if (checkedPixels.has(key)) continue;
            if (px < 0 || px >= imagingState.canvas.width || py < 0 || py >= imagingState.canvas.height) continue;
            
            const currentColor = getPixelColor(imageData, px, py);
            if (!colorsMatch(currentColor, targetColor)) continue;
            
            setPixelColor(imageData, px, py, fillColor);
            checkedPixels.add(key);
            
            pixelsToCheck.push({x: px + 1, y: py});
            pixelsToCheck.push({x: px - 1, y: py});
            pixelsToCheck.push({x: px, y: py + 1});
            pixelsToCheck.push({x: px, y: py - 1});
        }
        
        imagingState.ctx.putImageData(imageData, 0, 0);
        document.getElementById('imaging-status').textContent = 'Fill applied';
    }
    
    function imagingAddText(x, y) {
        showInputDialog('Add Text', 'Enter text to add:', '', (text) => {
            if (text && imagingState.ctx) {
                imagingState.ctx.font = `${imagingState.brushSize * 4}px Arial`;
                imagingState.ctx.fillStyle = imagingState.currentColor;
                imagingState.ctx.fillText(text, x, y);
                imagingSaveState();
                document.getElementById('imaging-status').textContent = 'Text added';
            }
        });
    }
    
    function imagingOpenFile() {
        showInputDialog('Open Image', 'Enter image URL:', '', (url) => {
            if (url) {
                const img = new Image();
                img.crossOrigin = 'anonymous';
                img.onload = () => {
                    imagingState.canvas.width = img.width;
                    imagingState.canvas.height = img.height;
                    imagingState.ctx.drawImage(img, 0, 0);
                    document.getElementById('imaging-size-info').textContent = `${img.width} x ${img.height}`;
                    imagingSaveState();
                    document.getElementById('imaging-status').textContent = `Loaded: ${url.substring(0, 40)}...`;
                };
                img.onerror = () => {
                    showMessageBox('Error', 'Failed to load image. Please check the URL and CORS policy.', ['OK']);
                };
                img.src = url;
            }
        });
    }
    
    function imagingRedo() {
        if (imagingState.redoStack.length > 0) {
            const redoState = imagingState.redoStack.pop();
            imagingState.undoStack.push(redoState);
            const img = new Image();
            img.onload = () => {
                imagingState.ctx.clearRect(0, 0, imagingState.canvas.width, imagingState.canvas.height);
                imagingState.ctx.drawImage(img, 0, 0);
            };
            img.src = redoState;
            document.getElementById('imaging-status').textContent = `Redo successful (${imagingState.redoStack.length} available)`;
        } else {
            document.getElementById('imaging-status').textContent = 'Nothing to redo';
        }
    }
    
    function imagingZoomIn() {
        if (imagingState.zoomLevel < 4.0) {
            imagingState.zoomLevel += 0.25;
            imagingUpdateZoom();
        }
    }
    
    function imagingZoomOut() {
        if (imagingState.zoomLevel > 0.25) {
            imagingState.zoomLevel -= 0.25;
            imagingUpdateZoom();
        }
    }
    
    function imagingResetZoom() {
        imagingState.zoomLevel = 1.0;
        imagingUpdateZoom();
    }
    
    function imagingUpdateZoom() {
        const wrapper = document.getElementById('imaging-canvas-wrapper');
        if (wrapper) {
            wrapper.style.transform = `scale(${imagingState.zoomLevel})`;
            document.getElementById('imaging-zoom-info').textContent = Math.round(imagingState.zoomLevel * 100) + '%';
            document.getElementById('imaging-status').textContent = `Zoom: ${Math.round(imagingState.zoomLevel * 100)}%`;
        }
    }
    
    function imagingSaveToLocalStorage() {
        if (!imagingState.canvas) return;
        
        showInputDialog('Save Image', 'Enter a name for this image:', 'my_image', (name) => {
            if (name) {
                const dataURL = imagingState.canvas.toDataURL('image/png');
                const savedImages = JSON.parse(localStorage.getItem('imaging_saved_images') || '{}');
                savedImages[name] = {
                    data: dataURL,
                    date: new Date().toLocaleString(),
                    width: imagingState.canvas.width,
                    height: imagingState.canvas.height
                };
                localStorage.setItem('imaging_saved_images', JSON.stringify(savedImages));
                document.getElementById('imaging-status').textContent = `Saved as "${name}" to browser storage`;
                showMessageBox('Saved', `Image "${name}" saved to browser storage!\n\nSize: ${imagingState.canvas.width}x${imagingState.canvas.height}\nDate: ${savedImages[name].date}`, ['OK']);
            }
        });
    }
    
    function imagingLoadFromLocalStorage() {
        const savedImages = JSON.parse(localStorage.getItem('imaging_saved_images') || '{}');
        const imageNames = Object.keys(savedImages);
        
        if (imageNames.length === 0) {
            showMessageBox('No Saved Images', 'You have no saved images in browser storage.', ['OK']);
            return;
        }
        
        showInputDialog('Load Image', `Available images:\n${imageNames.join('\n')}\n\nEnter image name to load:`, imageNames[0], (name) => {
            if (name && savedImages[name]) {
                const img = new Image();
                img.onload = () => {
                    imagingState.canvas.width = img.width;
                    imagingState.canvas.height = img.height;
                    imagingState.ctx.drawImage(img, 0, 0);
                    document.getElementById('imaging-size-info').textContent = `${img.width} x ${img.height}`;
                    imagingSaveState();
                    document.getElementById('imaging-status').textContent = `Loaded "${name}" from storage`;
                };
                img.src = savedImages[name].data;
            } else {
                showMessageBox('Error', `Image "${name}" not found in storage.`, ['OK']);
            }
        });
    }
    
    function imagingListSaved() {
        const savedImages = JSON.parse(localStorage.getItem('imaging_saved_images') || '{}');
        const imageNames = Object.keys(savedImages);
        
        if (imageNames.length === 0) {
            showMessageBox('Saved Images', 'You have no saved images in browser storage.', ['OK']);
            return;
        }
        
        let list = 'Saved Images in Browser Storage:\n\n';
        imageNames.forEach(name => {
            const img = savedImages[name];
            list += `📷 ${name}\n   Size: ${img.width}x${img.height}\n   Date: ${img.date}\n\n`;
        });
        
        showMessageBox('Saved Images', list, ['OK']);
    }
    
    function imagingSaveFile() {
        if (!imagingState.canvas) return;
        const dataURL = imagingState.canvas.toDataURL('image/png');
        const link = document.createElement('a');
        link.download = 'imaging_export_' + Date.now() + '.png';
        link.href = dataURL;
        link.click();
        document.getElementById('imaging-status').textContent = 'Image downloaded to computer';
        showMessageBox('Download Complete', `Image saved to your Downloads folder as:\nimaging_export_${Date.now()}.png`, ['OK']);
    }
    
    function imagingEasterEgg() {
        imagingState.easterEggCounter++;
        
        if (imagingState.easterEggCounter >= 5) {
            imagingState.easterEggCounter = 0;
            
            // Draw a special pattern
            if (imagingState.ctx) {
                const colors = ['#FF0000', '#00FF00', '#0000FF', '#FFFF00', '#FF00FF', '#00FFFF'];
                for (let i = 0; i < 50; i++) {
                    const x = Math.random() * imagingState.canvas.width;
                    const y = Math.random() * imagingState.canvas.height;
                    const radius = Math.random() * 30 + 10;
                    imagingState.ctx.beginPath();
                    imagingState.ctx.arc(x, y, radius, 0, Math.PI * 2);
                    imagingState.ctx.fillStyle = colors[Math.floor(Math.random() * colors.length)];
                    imagingState.ctx.fill();
                }
                imagingSaveState();
                playSound('ding');
                showMessageBox('🎨 Easter Egg!', 'You found the Imaging for Windows easter egg!\n\nRandom colorful circles have been added to your canvas!\n\n🌈 Created by: Kodak Imaging Team\n📅 Windows 98 Era: 1998', ['Awesome!']);
            }
        } else {
            showMessageBox('About Imaging for Windows', `Imaging for Windows\nVersion 2.0\n\n© 1998 Eastman Kodak Company\n\nA professional image viewing and editing application for Windows 98.\n\nSupports: PNG, JPEG, GIF, BMP, WebP, SVG\n\nClick About ${5 - imagingState.easterEggCounter} more times for a surprise! 🎨`, ['OK']);
        }
    }
    
    function imagingNewImage() {
        showInputDialog('New Image', 'Enter dimensions (e.g., 800x600):', '640x480', (dimensions) => {
            if (dimensions) {
                const parts = dimensions.split('x');
                if (parts.length === 2) {
                    const width = parseInt(parts[0]);
                    const height = parseInt(parts[1]);
                    if (width > 0 && height > 0 && width <= 2000 && height <= 2000) {
                        imagingState.canvas.width = width;
                        imagingState.canvas.height = height;
                        imagingState.ctx.fillStyle = 'white';
                        imagingState.ctx.fillRect(0, 0, width, height);
                        document.getElementById('imaging-size-info').textContent = `${width} x ${height}`;
                        imagingSaveState();
                        document.getElementById('imaging-status').textContent = `New canvas: ${width}x${height}`;
                    } else {
                        showMessageBox('Error', 'Invalid dimensions. Use format: WIDTHxHEIGHT (max 2000x2000)', ['OK']);
                    }
                }
            }
        });
    }
    
    function imagingLoadSample() {
        const sampleUrl = 'https://win98icons.alexmeub.com/icons/png/windows-0.png';
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
            imagingState.ctx.drawImage(img, 50, 50);
            imagingSaveState();
            document.getElementById('imaging-status').textContent = 'Sample image loaded';
        };
        img.src = sampleUrl;
    }
    
    function hexToRgb(hex) {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16),
            a: 255
        } : {r: 0, g: 0, b: 0, a: 255};
    }
    
    function getPixelColor(imageData, x, y) {
        const index = (Math.floor(y) * imageData.width + Math.floor(x)) * 4;
        return {
            r: imageData.data[index],
            g: imageData.data[index + 1],
            b: imageData.data[index + 2],
            a: imageData.data[index + 3]
        };
    }
    
    function setPixelColor(imageData, x, y, color) {
        const index = (Math.floor(y) * imageData.width + Math.floor(x)) * 4;
        imageData.data[index] = color.r;
        imageData.data[index + 1] = color.g;
        imageData.data[index + 2] = color.b;
        imageData.data[index + 3] = color.a;
    }
    
    function colorsMatch(c1, c2) {
        return c1.r === c2.r && c1.g === c2.g && c1.b === c2.b && c1.a === c2.a;
    }

    // --- Windows Media Player ---
    function openWindowsMediaPlayer() {
        const content = `
            <div style="display: flex; flex-direction: column; height: 100%; background-color: #C0C0C0; font-family: 'Fixedsys 62', monospace;">
                <!-- Menu Bar -->
                <div style="background-color: #ECE9D8; border-bottom: 1px solid #808080; padding: 2px 4px; font-size: 11px; display: flex; gap: 8px;">
                    <span class="wmp-file-menu" style="padding: 2px 6px; cursor: url("https://files.catbox.moe/2tpljw.cur"), default;" onmouseover="this.style.backgroundColor='#000080'; this.style.color='white';" onmouseout="this.style.backgroundColor='transparent'; this.style.color='black';">File</span>
                    <span style="padding: 2px 6px;">View</span>
                    <span style="padding: 2px 6px;">Play</span>
                    <span style="padding: 2px 6px;">Favorites</span>
                    <span style="padding: 2px 6px;">Go</span>
                    <span style="padding: 2px 6px;">Help</span>
                </div>
                
                <!-- Toolbar -->
                <div style="background-color: #ECE9D8; border-bottom: 1px solid #808080; padding: 4px; display: flex; gap: 2px; align-items: center;">
                    <button class="btn wmp-open-btn" title="Megnyitás" style="width: 24px; height: 22px; padding: 0; font-size: 12px;">📁</button>
                    <div style="width: 1px; height: 18px; background-color: #808080; margin: 0 2px;"></div>
                    <img src="https://win98icons.alexmeub.com/icons/png/cd_audio_cd_a-5.png" style="width: 16px; height: 16px; margin: 0 2px;" title="Radio">
                    <img src="https://win98icons.alexmeub.com/icons/png/media_player-0.png" style="width: 16px; height: 16px; margin: 0 2px;" title="Music">
                    <img src="https://win98icons.alexmeub.com/icons/png/directory_open_file_mydocs-4.png" style="width: 16px; height: 16px; margin: 0 2px;" title="Media Guide">
                </div>
                
                <!-- Main Display Area with Windows Media Logo -->
                <div style="flex-grow: 1; display: flex; align-items: center; justify-content: center; background-color: #000; position: relative; min-height: 200px;" id="wmp-display">
                    <div id="wmp-logo" style="text-align: center;">
                        <div style="display: inline-block; position: relative;">
                            <!-- Windows Logo Rectangles -->
                            <div style="position: relative; width: 120px; height: 120px; margin: 0 auto 10px;">
                                <div style="position: absolute; left: 10px; top: 10px; width: 40px; height: 40px; background-color: #FF4500; border: 3px solid #000;"></div>
                                <div style="position: absolute; right: 10px; top: 10px; width: 40px; height: 40px; background-color: #FFD700; border: 3px solid #000;"></div>
                                <div style="position: absolute; left: 10px; bottom: 10px; width: 40px; height: 40px; background-color: #00BFFF; border: 3px solid #000;"></div>
                                <div style="position: absolute; right: 10px; bottom: 10px; width: 40px; height: 40px; background-color: #32CD32; border: 3px solid #000;"></div>
                            </div>
                            <div style="color: white; font-size: 24px; font-weight: bold; font-family: Arial, sans-serif; text-shadow: 2px 2px 4px rgba(0,0,0,0.8);">
                                Windows<br>Media™
                            </div>
                        </div>
                    </div>
                    <video id="wmp-video" style="display: none; max-width: 100%; max-height: 100%; object-fit: contain;"></video>
                    <audio id="wmp-audio" style="display: none;"></audio>
                </div>
                
                <!-- Seek Bar -->
                <div style="background-color: #C0C0C0; padding: 8px 4px 4px 4px;">
                    <div style="display: flex; align-items: center; gap: 4px; margin-bottom: 4px;">
                        <span id="wmp-current-time" style="font-size: 10px; color: #000; min-width: 35px;">00:00</span>
                        <input type="range" id="wmp-seek-bar" min="0" max="100" value="0" style="flex-grow: 1; height: 18px;">
                        <span id="wmp-duration" style="font-size: 10px; color: #000; min-width: 35px;">00:00</span>
                    </div>
                </div>
                
                <!-- Control Panel -->
                <div style="background-color: #C0C0C0; border-top: 2px solid white; padding: 8px; display: flex; justify-content: center; align-items: center; gap: 4px;">
                    <button class="btn wmp-play-btn" title="Lejátszás" style="width: 32px; height: 28px; font-size: 16px; padding: 0;">▶</button>
                    <button class="btn wmp-pause-btn" title="Szünet" style="width: 32px; height: 28px; font-size: 16px; padding: 0;">⏸</button>
                    <button class="btn wmp-stop-btn" title="Leállítás" style="width: 32px; height: 28px; font-size: 16px; padding: 0;">⏹</button>
                    <div style="width: 8px;"></div>
                    <button class="btn wmp-prev-btn" title="Előző" style="width: 32px; height: 28px; font-size: 16px; padding: 0;">⏮</button>
                    <button class="btn wmp-next-btn" title="Következő" style="width: 32px; height: 28px; font-size: 16px; padding: 0;">⏭</button>
                    <div style="width: 8px;"></div>
                    <button class="btn wmp-eject-btn" title="Kiadás" style="width: 32px; height: 28px; font-size: 14px; padding: 0;">⏏</button>
                    <div style="flex-grow: 1;"></div>
                    <span style="font-size: 10px; margin-right: 4px;">🔊</span>
                    <input type="range" id="wmp-volume" min="0" max="100" value="70" style="width: 80px; height: 18px;">
                </div>
                
                <!-- Status Bar -->
                <div style="background-color: #ECE9D8; border-top: 1px solid #808080; padding: 2px 4px; font-size: 10px; display: flex; justify-content: space-between;">
                    <div id="wmp-status-info" style="color: #000;">
                        <span id="wmp-show-label">Show:</span>
                        <span id="wmp-clip-label">Clip:</span>
                        <span id="wmp-author-label">Author:</span>
                        <span id="wmp-copyright-label">Copyright:</span>
                    </div>
                </div>
            </div>
        `;
        const wmpWindow = createWindow({
            title: "Windows Media Player",
            icon: "https://win98icons.alexmeub.com/icons/png/media_player-0.png",
            width: 320,
            height: 420,
            content: content
        });

        setTimeout(() => {
            const videoElement = wmpWindow.querySelector('#wmp-video');
            const audioElement = wmpWindow.querySelector('#wmp-audio');
            const logo = wmpWindow.querySelector('#wmp-logo');
            const openBtn = wmpWindow.querySelector('.wmp-open-btn');
            const playBtn = wmpWindow.querySelector('.wmp-play-btn');
            const pauseBtn = wmpWindow.querySelector('.wmp-pause-btn');
            const stopBtn = wmpWindow.querySelector('.wmp-stop-btn');
            const prevBtn = wmpWindow.querySelector('.wmp-prev-btn');
            const nextBtn = wmpWindow.querySelector('.wmp-next-btn');
            const ejectBtn = wmpWindow.querySelector('.wmp-eject-btn');
            const seekBar = wmpWindow.querySelector('#wmp-seek-bar');
            const volumeSlider = wmpWindow.querySelector('#wmp-volume');
            const currentTimeSpan = wmpWindow.querySelector('#wmp-current-time');
            const durationSpan = wmpWindow.querySelector('#wmp-duration');
            const fileMenu = wmpWindow.querySelector('.wmp-file-menu');
            
            let currentMedia = null;
            let isSeeking = false;

            // File menu - Open URL option
            fileMenu.addEventListener('click', () => {
                playSound('click');
                showInputDialog('URL megnyitása', 'Adja meg a média fájl URL-jét:', 'https://files.catbox.moe/2rhof5.mp4', (url) => {
                    if (url) {
                        const isVideo = url.includes('video') || url.includes('.mp4') || url.includes('.webm') || url.includes('.avi');
                        FileSystem.save(`media_${Date.now()}.${isVideo ? 'mp4' : 'mp3'}`, url, 'media');
                        
                        logo.style.display = 'none';
                        
                        if (isVideo) {
                            audioElement.style.display = 'none';
                            videoElement.style.display = 'block';
                            videoElement.src = url;
                            videoElement.style.filter = 'contrast(0.9) saturate(0.8) blur(0.5px)';
                            currentMedia = videoElement;
                        } else {
                            videoElement.style.display = 'none';
                            audioElement.style.display = 'none';
                            audioElement.src = url;
                            currentMedia = audioElement;
                        }
                        
                        currentMedia.volume = volumeSlider.value / 100;
                        playSound('open');
                        currentMedia.play();
                    }
                });
            });

            function formatTime(seconds) {
                const mins = Math.floor(seconds / 60);
                const secs = Math.floor(seconds % 60);
                return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
            }

            function updateTimeDisplay() {
                if (currentMedia && !isNaN(currentMedia.duration)) {
                    currentTimeSpan.textContent = formatTime(currentMedia.currentTime);
                    durationSpan.textContent = formatTime(currentMedia.duration);
                    if (!isSeeking) {
                        seekBar.value = (currentMedia.currentTime / currentMedia.duration) * 100 || 0;
                    }
                }
            }

            openBtn.addEventListener('click', () => {
                playSound('click');
                const files = FileSystem.list();
                const mediaFiles = Object.keys(files).filter(f => files[f].type === 'media');
                
                if (mediaFiles.length > 0) {
                    showFileDialog('Média fájl megnyitása', mediaFiles, (filename) => {
                        if (filename && files[filename]) {
                            const file = files[filename];
                            logo.style.display = 'none';
                            
                            const isVideo = file.content.includes('video') || filename.includes('.mp4') || filename.includes('.webm') || filename.includes('.avi');
                            
                            if (isVideo) {
                                audioElement.style.display = 'none';
                                videoElement.style.display = 'block';
                                videoElement.src = file.content;
                                videoElement.style.filter = 'contrast(0.9) saturate(0.8) blur(0.5px)';
                                currentMedia = videoElement;
                            } else {
                                videoElement.style.display = 'none';
                                audioElement.style.display = 'none';
                                audioElement.src = file.content;
                                currentMedia = audioElement;
                            }
                            
                            currentMedia.volume = volumeSlider.value / 100;
                            playSound('open');
                            currentMedia.play();
                        }
                    });
                } else {
                    showInputDialog('URL megadása', 'Adja meg a média fájl URL-jét (video/audio):', 'https://files.catbox.moe/2rhof5.mp4', (url) => {
                        if (url) {
                            const isVideo = url.includes('video') || url.includes('.mp4') || url.includes('.webm') || url.includes('.avi');
                            FileSystem.save(`media_${Date.now()}.${isVideo ? 'mp4' : 'mp3'}`, url, 'media');
                            
                            logo.style.display = 'none';
                            
                            if (isVideo) {
                                audioElement.style.display = 'none';
                                videoElement.style.display = 'block';
                                videoElement.src = url;
                                videoElement.style.filter = 'contrast(0.9) saturate(0.8) blur(0.5px)';
                                currentMedia = videoElement;
                            } else {
                                videoElement.style.display = 'none';
                                audioElement.style.display = 'none';
                                audioElement.src = url;
                                currentMedia = audioElement;
                            }
                            
                            currentMedia.volume = volumeSlider.value / 100;
                            playSound('open');
                            currentMedia.play();
                        }
                    });
                }
            });

            playBtn.addEventListener('click', () => {
                if (currentMedia) {
                    currentMedia.play();
                    playSound('click');
                }
            });

            pauseBtn.addEventListener('click', () => {
                if (currentMedia) {
                    currentMedia.pause();
                    playSound('click');
                }
            });

            stopBtn.addEventListener('click', () => {
                if (currentMedia) {
                    currentMedia.pause();
                    currentMedia.currentTime = 0;
                    playSound('click');
                }
            });

            prevBtn.addEventListener('click', () => {
                if (currentMedia) {
                    currentMedia.currentTime = Math.max(0, currentMedia.currentTime - 10);
                    playSound('click');
                }
            });

            nextBtn.addEventListener('click', () => {
                if (currentMedia) {
                    currentMedia.currentTime = Math.min(currentMedia.duration, currentMedia.currentTime + 10);
                    playSound('click');
                }
            });

            ejectBtn.addEventListener('click', () => {
                if (currentMedia) {
                    currentMedia.pause();
                    currentMedia.currentTime = 0;
                    currentMedia.src = '';
                    videoElement.style.display = 'none';
                    audioElement.style.display = 'none';
                    logo.style.display = 'block';
                    currentMedia = null;
                    seekBar.value = 0;
                    currentTimeSpan.textContent = '00:00';
                    durationSpan.textContent = '00:00';
                    playSound('click');
                }
            });

            seekBar.addEventListener('mousedown', () => {
                isSeeking = true;
            });

            seekBar.addEventListener('mouseup', () => {
                isSeeking = false;
                if (currentMedia && !isNaN(currentMedia.duration)) {
                    currentMedia.currentTime = (seekBar.value / 100) * currentMedia.duration;
                }
            });

            seekBar.addEventListener('input', () => {
                if (currentMedia && !isNaN(currentMedia.duration)) {
                    currentTimeSpan.textContent = formatTime((seekBar.value / 100) * currentMedia.duration);
                }
            });

            volumeSlider.addEventListener('input', () => {
                if (currentMedia) {
                    currentMedia.volume = volumeSlider.value / 100;
                }
            });

            if (videoElement) {
                videoElement.addEventListener('timeupdate', updateTimeDisplay);
                videoElement.addEventListener('loadedmetadata', updateTimeDisplay);
            }
            
            if (audioElement) {
                audioElement.addEventListener('timeupdate', updateTimeDisplay);
                audioElement.addEventListener('loadedmetadata', updateTimeDisplay);
            }
        }, 100);
    }

    // --- Microsoft Paint ---
    function openPaint() {
        const content = `
            <div style="display: flex; flex-direction: column; height: 100%; background-color: #C0C0C0;">
                <div style="padding: 4px; background-color: #ECE9D8; border-bottom: 1px solid #808080;">
                    <div style="display: flex; gap: 4px; margin-bottom: 4px;">
                        <button class="btn paint-new-btn" title="Új">Új</button>
                        <button class="btn paint-open-btn" title="Megnyitás">Megnyitás</button>
                        <button class="btn paint-save-btn" title="Mentés">Mentés</button>
                    </div>
                </div>
                <div style="display: flex; flex-grow: 1; overflow: hidden;">
                    <div style="width: 60px; background-color: #C0C0C0; border-right: 2px solid #808080; padding: 4px; display: flex; flex-direction: column; gap: 4px;">
                        <button class="btn paint-tool" data-tool="pencil" style="width: 50px; height: 50px; font-weight: bold;" title="Ceruza">✏️</button>
                        <button class="btn paint-tool" data-tool="brush" style="width: 50px; height: 50px;" title="Ecset">🖌️</button>
                        <button class="btn paint-tool" data-tool="spray" style="width: 50px; height: 50px;" title="Spray">💨</button>
                        <button class="btn paint-tool" data-tool="eraser" style="width: 50px; height: 50px;" title="Radír">⬜</button>
                        <button class="btn paint-tool" data-tool="line" style="width: 50px; height: 50px;" title="Vonal">📏</button>
                        <button class="btn paint-tool" data-tool="rectangle" style="width: 50px; height: 50px;" title="Négyzet">▭</button>
                        <button class="btn paint-tool" data-tool="circle" style="width: 50px; height: 50px;" title="Kör">⭕</button>
                        <button class="btn paint-tool" data-tool="fill" style="width: 50px; height: 50px;" title="Töltés">🪣</button>
                    </div>
                    <div style="flex-grow: 1; background-color: white; position: relative; overflow: auto;">
                        <canvas id="paint-canvas" width="800" height="600" style="cursor: crosshair; display: block; background-color: white;"></canvas>
                    </div>
                </div>
                <div style="padding: 4px; background-color: #C0C0C0; border-top: 2px solid white; display: flex; gap: 8px; align-items: center;">
                    <div style="color: black; font-size: 12px;">Színek:</div>
                    <div class="paint-color" data-color="#000000" style="width: 24px; height: 24px; background-color: black; border: 3px solid #000080;"></div>
                    <div class="paint-color" data-color="#FFFFFF" style="width: 24px; height: 24px; background-color: white; border: 2px solid black;"></div>
                    <div class="paint-color" data-color="#FF0000" style="width: 24px; height: 24px; background-color: red; border: 2px solid white;"></div>
                    <div class="paint-color" data-color="#00FF00" style="width: 24px; height: 24px; background-color: lime; border: 2px solid white;"></div>
                    <div class="paint-color" data-color="#0000FF" style="width: 24px; height: 24px; background-color: blue; border: 2px solid white;"></div>
                    <div class="paint-color" data-color="#FFFF00" style="width: 24px; height: 24px; background-color: yellow; border: 2px solid white;"></div>
                    <div class="paint-color" data-color="#FF00FF" style="width: 24px; height: 24px; background-color: magenta; border: 2px solid white;"></div>
                    <div class="paint-color" data-color="#00FFFF" style="width: 24px; height: 24px; background-color: cyan; border: 2px solid white;"></div>
                    <div class="paint-color" data-color="#800080" style="width: 24px; height: 24px; background-color: purple; border: 2px solid white;"></div>
                    <div class="paint-color" data-color="#FFA500" style="width: 24px; height: 24px; background-color: orange; border: 2px solid white;"></div>
                </div>
            </div>
        `;
        const paintWindow = createWindow({
            title: "névtelen - Paint",
            icon: "https://win98icons.alexmeub.com/icons/png/paint_old-0.png",
            width: 700,
            height: 500,
            content: content
        });

        // Full Paint functionality
        setTimeout(() => {
            const canvas = paintWindow.querySelector('#paint-canvas');
            if (!canvas) return;
            
            const ctx = canvas.getContext('2d');
            let isDrawing = false;
            let currentTool = 'pencil';
            let currentColor = '#000000';
            let lineWidth = 2;
            let startX = 0;
            let startY = 0;
            let snapshot = null;

            // Tool selection
            const toolButtons = paintWindow.querySelectorAll('.paint-tool');
            toolButtons.forEach(btn => {
                btn.addEventListener('click', () => {
                    toolButtons.forEach(b => b.style.fontWeight = 'normal');
                    btn.style.fontWeight = 'bold';
                    currentTool = btn.dataset.tool;
                    playSound('click');
                    
                    // Update cursor
                    if (currentTool === 'eraser') {
                        canvas.style.cursor = 'not-allowed';
                    } else if (currentTool === 'fill') {
                        canvas.style.cursor = 'pointer';
                    } else {
                        canvas.style.cursor = 'crosshair';
                    }
                });
            });

            // Color selection
            const colorButtons = paintWindow.querySelectorAll('.paint-color');
            colorButtons.forEach(btn => {
                btn.addEventListener('click', () => {
                    colorButtons.forEach(b => b.style.border = '2px solid white');
                    btn.style.border = '3px solid #000080';
                    currentColor = btn.dataset.color;
                    playSound('click');
                });
            });

            // New button
            const newBtn = paintWindow.querySelector('.paint-new-btn');
            if (newBtn) {
                newBtn.addEventListener('click', () => {
                    ctx.fillStyle = 'white';
                    ctx.fillRect(0, 0, canvas.width, canvas.height);
                    playSound('click');
                });
            }

            // Save button
            const saveBtn = paintWindow.querySelector('.paint-save-btn');
            if (saveBtn) {
                saveBtn.addEventListener('click', () => {
                    showInputDialog('Kép mentése', 'Adja meg a kép nevét:', 'rajz.png', (filename) => {
                        if (filename) {
                            const imageData = canvas.toDataURL('image/png');
                            FileSystem.save(filename, imageData, 'image');
                            playSound('ding');
                            showMessageBox({
                                title: 'Mentés',
                                message: `A kép (${filename}) sikeresen mentve!`,
                                icon: 'info',
                                buttons: ['OK']
                            });
                        }
                    });
                });
            }

            // Open button
            const openBtn = paintWindow.querySelector('.paint-open-btn');
            if (openBtn) {
                openBtn.addEventListener('click', () => {
                    const files = FileSystem.list();
                    const imageFiles = Object.keys(files).filter(f => files[f].type === 'image');
                    if (imageFiles.length > 0) {
                        showFileDialog('Kép megnyitása', imageFiles, (filename) => {
                            if (filename && files[filename]) {
                                const img = new Image();
                                img.onload = () => {
                                    ctx.fillStyle = 'white';
                                    ctx.fillRect(0, 0, canvas.width, canvas.height);
                                    ctx.drawImage(img, 0, 0);
                                    playSound('open');
                                };
                                img.src = files[filename].content;
                            }
                        });
                    } else {
                        showMessageBox({title: 'Nincs kép', message: 'Nincsenek mentett képek.', icon: 'info', buttons: ['OK']});
                    }
                });
            }

            // Drawing functions
            function getMousePos(e) {
                const rect = canvas.getBoundingClientRect();
                return {
                    x: e.clientX - rect.left,
                    y: e.clientY - rect.top
                };
            }

            function drawLine(x1, y1, x2, y2) {
                ctx.beginPath();
                ctx.moveTo(x1, y1);
                ctx.lineTo(x2, y2);
                ctx.strokeStyle = currentColor;
                ctx.lineWidth = lineWidth;
                ctx.lineCap = 'round';
                ctx.stroke();
            }

            function drawCircle(x, y, radius) {
                ctx.beginPath();
                ctx.arc(x, y, radius, 0, Math.PI * 2);
                ctx.strokeStyle = currentColor;
                ctx.lineWidth = lineWidth;
                ctx.stroke();
            }

            function drawRectangle(x1, y1, x2, y2) {
                ctx.beginPath();
                ctx.rect(x1, y1, x2 - x1, y2 - y1);
                ctx.strokeStyle = currentColor;
                ctx.lineWidth = lineWidth;
                ctx.stroke();
            }

            function floodFill(x, y, fillColor) {
                const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                const targetColor = getPixelColor(imageData, x, y);
                const fillColorRgb = hexToRgb(fillColor);
                
                if (colorsMatch(targetColor, fillColorRgb)) return;
                
                const pixelsToCheck = [{x, y}];
                const checkedPixels = new Set();
                
                while (pixelsToCheck.length > 0) {
                    const {x: px, y: py} = pixelsToCheck.pop();
                    const key = `${px},${py}`;
                    
                    if (checkedPixels.has(key)) continue;
                    if (px < 0 || px >= canvas.width || py < 0 || py >= canvas.height) continue;
                    
                    const currentColor = getPixelColor(imageData, px, py);
                    if (!colorsMatch(currentColor, targetColor)) continue;
                    
                    setPixelColor(imageData, px, py, fillColorRgb);
                    checkedPixels.add(key);
                    
                    pixelsToCheck.push({x: px + 1, y: py});
                    pixelsToCheck.push({x: px - 1, y: py});
                    pixelsToCheck.push({x: px, y: py + 1});
                    pixelsToCheck.push({x: px, y: py - 1});
                }
                
                ctx.putImageData(imageData, 0, 0);
            }

            function getPixelColor(imageData, x, y) {
                const index = (Math.floor(y) * imageData.width + Math.floor(x)) * 4;
                return {
                    r: imageData.data[index],
                    g: imageData.data[index + 1],
                    b: imageData.data[index + 2],
                    a: imageData.data[index + 3]
                };
            }

            function setPixelColor(imageData, x, y, color) {
                const index = (Math.floor(y) * imageData.width + Math.floor(x)) * 4;
                imageData.data[index] = color.r;
                imageData.data[index + 1] = color.g;
                imageData.data[index + 2] = color.b;
                imageData.data[index + 3] = 255;
            }

            function hexToRgb(hex) {
                const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
                return result ? {
                    r: parseInt(result[1], 16),
                    g: parseInt(result[2], 16),
                    b: parseInt(result[3], 16)
                } : {r: 0, g: 0, b: 0};
            }

            function colorsMatch(a, b) {
                return a.r === b.r && a.g === b.g && a.b === b.b;
            }

            // Mouse events
            canvas.addEventListener('mousedown', (e) => {
                isDrawing = true;
                const pos = getMousePos(e);
                startX = pos.x;
                startY = pos.y;
                
                if (currentTool === 'fill') {
                    floodFill(Math.floor(pos.x), Math.floor(pos.y), currentColor);
                    isDrawing = false;
                    return;
                }
                
                snapshot = ctx.getImageData(0, 0, canvas.width, canvas.height);
                
                if (currentTool === 'pencil' || currentTool === 'brush' || currentTool === 'eraser') {
                    ctx.beginPath();
                    ctx.moveTo(pos.x, pos.y);
                }
            });

            canvas.addEventListener('mousemove', (e) => {
                if (!isDrawing) return;
                const pos = getMousePos(e);
                
                if (currentTool === 'pencil') {
                    drawLine(startX, startY, pos.x, pos.y);
                    startX = pos.x;
                    startY = pos.y;
                } else if (currentTool === 'brush') {
                    ctx.lineWidth = 8;
                    drawLine(startX, startY, pos.x, pos.y);
                    ctx.lineWidth = lineWidth;
                    startX = pos.x;
                    startY = pos.y;
                } else if (currentTool === 'spray') {
                    for (let i = 0; i < 20; i++) {
                        const offsetX = (Math.random() - 0.5) * 20;
                        const offsetY = (Math.random() - 0.5) * 20;
                        ctx.fillStyle = currentColor;
                        ctx.fillRect(pos.x + offsetX, pos.y + offsetY, 1, 1);
                    }
                } else if (currentTool === 'eraser') {
                    ctx.fillStyle = 'white';
                    ctx.fillRect(pos.x - 5, pos.y - 5, 10, 10);
                } else if (currentTool === 'line' || currentTool === 'rectangle' || currentTool === 'circle') {
                    ctx.putImageData(snapshot, 0, 0);
                    
                    if (currentTool === 'line') {
                        drawLine(startX, startY, pos.x, pos.y);
                    } else if (currentTool === 'rectangle') {
                        drawRectangle(startX, startY, pos.x, pos.y);
                    } else if (currentTool === 'circle') {
                        const radius = Math.sqrt(Math.pow(pos.x - startX, 2) + Math.pow(pos.y - startY, 2));
                        drawCircle(startX, startY, radius);
                    }
                }
            });

            canvas.addEventListener('mouseup', () => {
                isDrawing = false;
            });

            canvas.addEventListener('mouseleave', () => {
                isDrawing = false;
            });

            // Initialize white canvas
            ctx.fillStyle = 'white';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
        }, 100);
    }

    // --- MSN Messenger ---
    function openMSNMessenger() {
        dialUpConnection(() => {
            const users = [
                { name: 'Kovács Anna', status: 'online', avatar: '👩', statusMsg: 'Just chillin\' 😎', gender: 'female' },
                { name: 'Nagy Péter', status: 'away', avatar: '👨', statusMsg: 'BRB', gender: 'male' },
                { name: 'Szabó Eszter', status: 'online', avatar: '👧', statusMsg: 'Listening to Backstreet Boys 🎵', gender: 'female' },
                { name: 'Tóth János', status: 'busy', avatar: '🧑', statusMsg: 'Do not disturb!', gender: 'male' },
                { name: 'Kiss Márta', status: 'offline', avatar: '👩‍🦰', statusMsg: 'Offline', gender: 'female' },
                { name: 'Molnár Gábor', status: 'online', avatar: '👨‍💼', statusMsg: 'Working from home', gender: 'male' },
                { name: 'Varga Kata', status: 'away', avatar: '👩‍🎓', statusMsg: 'At school', gender: 'female' },
                { name: 'Horváth Zsolt', status: 'online', avatar: '👦', statusMsg: 'Playing CS 1.6 🎮', gender: 'male' },
                { name: 'Farkas Laura', status: 'online', avatar: '👱‍♀️', statusMsg: 'Downloading mp3s 🎶', gender: 'female' },
                { name: 'Balogh Máté', status: 'busy', avatar: '🧔', statusMsg: 'Coding... do not disturb 💻', gender: 'male' },
                { name: 'Papp Réka', status: 'online', avatar: '👩‍💻', statusMsg: 'LOL 😂', gender: 'female' },
                { name: 'Simon Dávid', status: 'away', avatar: '🧑‍🦱', statusMsg: 'Eating pizza 🍕', gender: 'male' },
                { name: 'Lakatos Nóra', status: 'online', avatar: '👩‍🦳', statusMsg: 'Watching TV 📺', gender: 'female' },
                { name: 'Fekete Tamás', status: 'offline', avatar: '🧑‍🦲', statusMsg: 'Gone fishing 🎣', gender: 'male' },
                { name: 'Németh Ági', status: 'online', avatar: '👸', statusMsg: 'Shopping online 🛍️', gender: 'female' },
                { name: 'Király Zoltán', status: 'busy', avatar: '🤴', statusMsg: 'In a meeting 📞', gender: 'male' },
                { name: 'Takács Petra', status: 'online', avatar: '🧑‍🎤', statusMsg: 'Listening to Linkin Park 🎸', gender: 'female' },
                { name: 'Rácz Gergő', status: 'away', avatar: '🧑‍🚀', statusMsg: 'AFK - bathroom break 🚽', gender: 'male' }
            ];
            
            // Store users globally for access in chat
            window.msnUsers = users;
            
            const content = `
                <div style="display: flex; flex-direction: column; height: 100%; background-color: #FFF; font-family: Arial, sans-serif;">
                    <!-- Top Banner Ad -->
                    <div style="width: 100%; height: 40px; overflow: hidden; border-bottom: 1px solid #C0C0C0; display: flex; align-items: center; justify-content: center; background: #fff;">
                        <iframe width="100%" height="40" style="border:none; display: block;" scrolling="no" src="https://urbanmove8.neocities.org/adloop" name="msnbannerlink"></iframe>
                    </div>
                    
                    <!-- Toolbar -->
                    <div style="padding: 4px 8px; background: #F0F0F0; border-bottom: 1px solid #CCC; display: flex; gap: 10px; font-size: 11px;">
                        <button class="btn" style="padding: 3px 10px;" onclick="showMessageBox('Állapot', 'Válassz állapotot:\\n\\n🟢 Elérhető\\n🟡 Nincs a gépnél\\n🔴 Ne zavarjanak\\n⚫ Offline', ['OK'])">📊 Állapot</button>
                        <button class="btn" style="padding: 3px 10px;" onclick="showMessageBox('Profil', 'Profilod szerkesztése MSN Messenger-ben!\\n\\nEmail: felhasznalo@hotmail.com\\nNév: Felhasználó\\nÁllapotüzenet: Online', ['OK'])">👤 Profil</button>
                        <button class="btn" style="padding: 3px 10px;" onclick="showMessageBox('Beállítások', 'MSN Messenger beállítások:\\n\\n✓ Hangértesítések\\n✓ Automatikus bejelentkezés\\n✓ Emlékezz rám\\n☐ Távol automatikusan', ['OK'])">⚙️ Beállítások</button>
                    </div>
                    
                    <!-- User Header -->
                    <div style="padding: 10px; background: linear-gradient(to bottom, #E8F4FF 0%, #D0E8FF 100%); border-bottom: 1px solid #CCC;">
                        <div style="display: flex; align-items: center; gap: 10px;">
                            <div style="font-size: 32px;">😊</div>
                            <div>
                                <div style="font-weight: bold; font-size: 14px; color: #000;">felhasznalo@hotmail.com</div>
                                <div style="font-size: 11px; color: #666;">Online</div>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Contact List -->
                    <div id="msn-contact-list" style="flex-grow: 1; overflow-y: auto; background-color: white;">
                        <div style="background: #C0C0C0; padding: 5px 10px; font-size: 11px; font-weight: bold; border-bottom: 1px solid #808080;">📋 Kapcsolatok (${users.filter(u => u.status === 'online').length} online)</div>
                        ${users.map(user => {
                            const statusColors = {
                                online: '#00AA00',
                                away: '#FFAA00',
                                busy: '#FF0000',
                                offline: '#808080'
                            };
                            const statusIcons = {
                                online: '🟢',
                                away: '🟡',
                                busy: '🔴',
                                offline: '⚫'
                            };
                            return `
                                <div class="msn-contact" data-name="${user.name}" style="padding: 8px 10px; border-bottom: 1px solid #F0F0F0; display: flex; align-items: center; gap: 10px; cursor: pointer; background: white;" 
                                     onmouseover="this.style.backgroundColor='#E8F4FF';" 
                                     onmouseout="this.style.backgroundColor='white';" 
                                     onclick="openMSNChat('${user.name}', '${user.avatar}', '${user.status}', '${user.gender}');">
                                    <div style="font-size: 24px;">${user.avatar}</div>
                                    <div style="flex-grow: 1;">
                                        <div style="font-size: 12px; font-weight: bold; color: #000;">${user.name}</div>
                                        <div style="font-size: 10px; color: #666;">${statusIcons[user.status]} ${user.statusMsg}</div>
                                    </div>
                                    <div style="width: 10px; height: 10px; border-radius: 50%; background: ${statusColors[user.status]};"></div>
                                </div>
                            `;
                        }).join('')}
                    </div>
                    
                    <!-- Status Bar -->
                    <div style="padding: 5px 10px; background: #F0F0F0; border-top: 1px solid #CCC; font-size: 10px; color: #666; display: flex; justify-content: space-between;">
                        <span>📶 Kapcsolódva</span>
                        <span>MSN Messenger 4.7</span>
                    </div>
                </div>
            `;
            
            createWindow({
                title: "MSN Messenger",
                icon: "https://files.catbox.moe/bnnmoz.webp",
                width: 350,
                height: 600,
                content: content
            });
            playSound('open');
        });
    }
    
    // Open chat window with MSN contact
    function openMSNChat(contactName, avatar, status, gender) {
        if (status === 'offline') {
            playSound('error');
            showMessageBox({
                title: 'MSN Messenger',
                message: contactName + ' jelenleg offline. Nem tudsz neki üzenetet küldeni.',
                icon: 'warning',
                buttons: ['OK']
            });
            return;
        }
        
        playMSNNotificationSound();
        
        const chatContent = `
            <div style="display: flex; flex-direction: column; height: 100%; font-family: Arial, sans-serif;">
                <!-- Chat Header -->
                <div style="background: linear-gradient(to bottom, #0066CC 0%, #0044AA 100%); color: white; padding: 8px 12px; display: flex; align-items: center; gap: 10px;">
                    <div style="font-size: 24px;">${avatar}</div>
                    <div>
                        <div style="font-weight: bold; font-size: 13px;">${contactName}</div>
                        <div style="font-size: 10px; opacity: 0.9;">Beszélgetés folyamatban...</div>
                    </div>
                </div>
                
                <!-- Chat Messages -->
                <div id="msn-chat-messages" style="flex-grow: 1; overflow-y: auto; padding: 10px; background: white; color: #000;">
                    <div style="font-size: 11px; color: #666; text-align: center; margin: 10px 0;">--- Beszélgetés kezdete ${new Date().toLocaleTimeString('hu-HU')} ---</div>
                    <div style="margin: 5px 0;">
                        <span style="font-weight: bold; color: #FF0066;">${contactName}:</span>
                        <span style="font-size: 12px;"> Szia! 👋</span>
                    </div>
                </div>
                
                <!-- Chat Input -->
                <div style="border-top: 1px solid #CCC; padding: 8px; background: #F8F8F8;">
                    <div style="display: flex; gap: 5px; margin-bottom: 5px;">
                        <button class="btn" style="font-size: 10px; padding: 2px 6px;" title="Emotikon">😊</button>
                        <button class="btn" style="font-size: 10px; padding: 2px 6px;" title="Betűtípus">🅰️</button>
                        <button class="btn" style="font-size: 10px; padding: 2px 6px;" title="Színek">🎨</button>
                    </div>
                    <textarea id="msn-chat-input" placeholder="Írj egy üzenetet..." style="width: 100%; height: 50px; padding: 5px; font-family: Arial; font-size: 12px; border: 1px solid #CCC; resize: none; color: #000;"></textarea>
                    <div style="display: flex; justify-content: flex-end; gap: 5px; margin-top: 5px;">
                        <button class="btn" id="msn-send-btn" style="padding: 4px 20px; background: #0066CC; color: white; font-weight: bold;">Küldés</button>
                    </div>
                </div>
            </div>
        `;
        
        const chatWindow = createWindow({
            title: 'Beszélgetés - ' + contactName,
            icon: 'https://files.catbox.moe/bnnmoz.webp',
            width: 400,
            height: 450,
            content: chatContent
        });
        
        setTimeout(() => {
            const chatMessages = chatWindow.querySelector('#msn-chat-messages');
            const chatInput = chatWindow.querySelector('#msn-chat-input');
            const sendBtn = chatWindow.querySelector('#msn-send-btn');
            
            // Gender-specific responses
            const femaleResponses = [
    'OMG tényleg?? 😱💕',
    'Ez annyira cuki! 🥰',
    'Imádom! 💖✨',
    'Aww, de édes! 😍',
    'LOL haha 😂💗',
    'Tök jó, köszi! 💕',
    'Ja, én is így gondolom! 😊',
    'Várj, anyám beszél hozzám, BRB 👋',
    'Ez annyira szép! ✨💅',
    'Hú, láttam a profilképedet, szuper! 📸',
    'Shopping tomorrow? 🛍️',
    'Nézted a Gossip Girl-t? 📺',
    'Puszi! 😘',
    'Oké, holnap írok! 💌',
    'Gyere már chat-elni gyakrabban! 💬',
    'Ez a ruha annyira szép volt! 👗',
    'Hú de jó, gratulálok! 🎉💖',
    'Nem bírom, annyira vicces 🤣',
    'Ja persze, egyértelműen! ✨',
    'Hallottad az új Britney számot? 🎵',
    'Csináljunk fotót holnap! 📷',
    'Nézd meg a MySpace-em! 💻',
    'BRB, hajat szárítok 💇‍♀️',
    'Smink tutorialt nézek 💄',
    'Anya hív vacsorázni, ttyl! 🍽️',
    'Imádom ezt a dalt! 🎶💕',
    'Menjünk moziba hétvégén? 🎬',
    'Küldj képet! 📸✨',
    'Ez a legjobb nap volt! 🌟',
    'Tök kedves vagy! 💖',
    'Nem hiszem el ezt! 😮💕',
    'Szerintem is! 👏',
    'Az olyan aranyos! 🥺💗',
    'Találkozunk holnap? 😊💬',
    'Tanulnod kell? 📚',
    'Ez fantasztikus! 🌈✨',
    'Köszi a tippet! 💡💕',
];

            const maleResponses = [
    'Zsír! 🤙',
    'Jössz CS-ezni? 🎮',
    'Epic win bro! 😎',
    'LOL 😂',
    'WTF 😳',
    'Játszol Warcraft-ot? ⚔️',
    'Hallottad az új Eminem számot? 🎵',
    'Király vagy! 👑',
    'BRB, kajálok 🍔',
    'Ez beteg! 🔥',
    'Oké, csekkoljuk! 👍',
    'Headshot! 🎯',
    'Letöltöttem az új GTA-t 🚗',
    'Gyere LAN party-ra! 💻',
    'Van torrent linked? 📁',
    'Brutál! 💪',
    'Nézted a meccset? ⚽',
    'Meló után foci? ⚽',
    'Az új Xbox játék király 🎮',
    'Aha, oké 👌',
    'Kösz bro! 🤜🤛',
    'Azt hittem offline vagy',
    'g2g, cya! ✌️',
    'ROFL 🤣',
    'Haha igen 😄',
    'Hallottad? 🎧',
    'Megnézted a videót? 📹',
    'Ez marha jó! 🐄',
    'Tényleg? 🤔',
    'Nem semmi! 😮',
    'Oké deal 🤝',
    'Brb 5 perc ⏰',
    'Hívlak Skype-on! 📞',
    'Játék után beszélünk 🎮',
    'Küldj IP-t! 🌐',
    'Olyan éhes vagyok mint a farkas! 🐺',
    'Az durva! 💥',
    'Ez komoly? 😲',
    'Az király! 🤘',
    'Várj, jövök! 🚀'
];

            const responses = gender === 'female' ? femaleResponses : maleResponses;
            
            const sendMessage = () => {
                const message = chatInput.value.trim();
                if (!message) return;
                
                // Add user message
                const userMsg = document.createElement('div');
                userMsg.style.margin = '5px 0';
                userMsg.innerHTML = `<span style="font-weight: bold; color: #0066CC;">Te:</span> <span style="font-size: 12px;">${message}</span>`;
                chatMessages.appendChild(userMsg);
                chatInput.value = '';
                chatMessages.scrollTop = chatMessages.scrollHeight;
                playSound('ding');
                
                // Simulate response after delay
                setTimeout(() => {
                    const response = responses[Math.floor(Math.random() * responses.length)];
                    const contactMsg = document.createElement('div');
                    contactMsg.style.margin = '5px 0';
                    contactMsg.innerHTML = `<span style="font-weight: bold; color: #FF0066;">${contactName}:</span> <span style="font-size: 12px;">${response}</span>`;
                    chatMessages.appendChild(contactMsg);
                    chatMessages.scrollTop = chatMessages.scrollHeight;
                    playMSNNotificationSound();
                }, 1500 + Math.random() * 2000);
            };
            
            if (sendBtn) {
                sendBtn.addEventListener('click', sendMessage);
            }
            
            if (chatInput) {
                chatInput.addEventListener('keypress', (e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        sendMessage();
                    }
                });
                chatInput.focus();
            }
        }, 100);
    }

    // --- Microsoft Plus! ---
    function openMicrosoftPlus() {
        const themes = [
            { name: 'Alapértelmezett Windows 98', bg: '#008080', type: 'color', desc: 'Klasszikus tél kekék asztal' },
            { name: 'A vihar Frissítés (The 60\'s USA)', bg: 'https://static.wikitide.net/windowswallpaperwiki/2/26/The_60%27s_USA_wallpaper.jpg', type: 'image', desc: 'Retró amerikai stílus' },
            { name: 'Mystery', bg: 'https://static.wikitide.net/windowswallpaperwiki/1/10/Mystery_wallpaper.jpg', type: 'image', desc: 'Lila miszterikus téma' },
            { name: 'Inside Your Computer', bg: 'https://static.wikitide.net/windowswallpaperwiki/3/30/Inside_your_Computer_wallpaper.jpg', type: 'image', desc: 'Technológiai áramköri téma' },
            { name: 'Nature', bg: 'https://static.wikitide.net/windowswallpaperwiki/5/51/Nature_wallpaper.jpg', type: 'image', desc: 'Zöld természet téma' },
            { name: 'Science', bg: 'https://static.wikitide.net/windowswallpaperwiki/5/50/Science_wallpaper.jpg', type: 'image', desc: 'Kék tudomány téma' },
            { name: 'Travel', bg: 'https://static.wikitide.net/windowswallpaperwiki/0/0d/Travel_wallpaper.jpg', type: 'image', desc: 'Utazás téma' },
            { name: 'More Windows', bg: 'https://static.wikitide.net/windowswallpaperwiki/6/6b/More_Windows_wallpaper_%28Windows_98%29.jpg', type: 'image', desc: 'Klasszikus Windows logó' }
        ];
        
        let themesHTML = themes.map((theme, i) => {
            const previewStyle = theme.type === 'image' 
                ? `background: url('${theme.bg}') center/cover;` 
                : `background: ${theme.bg};`;
            
            const applyTheme = theme.type === 'image'
                ? `document.body.style.backgroundImage='url(\\'${theme.bg}\\')'; document.body.style.backgroundSize='cover'; document.body.style.backgroundPosition='center'; document.body.style.backgroundRepeat='no-repeat';`
                : `document.body.style.backgroundImage='none'; document.body.style.backgroundColor='${theme.bg}';`;
            
            return `
                <div style="padding: 8px; border-bottom: 1px solid #ccc; display: flex; align-items: center;" 
                     onmouseover="this.style.backgroundColor='#d0d0d0'" 
                     onmouseout="this.style.backgroundColor='white'"
                     onclick="${applyTheme} playSound('ding'); showMessageBox({title:'Téma aktiválva', message:'${theme.name} téma alkalmazás sikeres!', icon:'info', buttons:['OK']});">
                    <div style="width: 40px; height: 30px; ${previewStyle} border: 2px solid #808080; margin-right: 10px;"></div>
                    <div>
                        <div style="font-weight: bold;">${theme.name}</div>
                        <div style="font-size: 11px; color: #666;">${theme.desc}</div>
                    </div>
                </div>
            `;
        }).join('');
        
        const content = `
            <div style="display: flex; flex-direction: column; height: 100%; color: black;">
                <div style="padding: 10px; background-color: #ECE9D8; border-bottom: 2px solid #808080;">
                    <h3 style="margin: 0; color: #000080;">🎨 Microsoft Plus! Asztali Témák</h3>
                </div>
                <div style="flex-grow: 1; overflow-y: auto; background-color: white;">
                    ${themesHTML}
                </div>
                <div style="padding: 10px; background-color: #ECE9D8; border-top: 2px solid #808080; text-align: center;">
                    <button class="btn" onclick="openVirtualDriveManager(); playSound('click');" style="padding: 4px 20px; margin-right: 10px;">💿 Virtuális meghajtó</button>
                    <button class="btn" onclick="playSound('click'); closeWindow(document.querySelector('.window.active'));" style="padding: 4px 20px;">Bezárás</button>
                </div>
            </div>
        `;
        createWindow({
            title: "Microsoft Plus! for Windows 98",
            icon: "https://win98icons.alexmeub.com/icons/png/themes-0.png",
            width: 450,
            height: 450,
            content: content
        });
    }
    
    // --- Microsoft Bob ---
    function openMicrosoftBob() {
        const bobContent = `
            <div style="width: 100%; height: 100%; display: flex; flex-direction: column; background: linear-gradient(to bottom, #87CEEB 0%, #FFE4B5 100%); position: relative; overflow: hidden;">
                <!-- Bob's Living Room Background -->
                <div style="position: absolute; bottom: 0; width: 100%; height: 70%; background: linear-gradient(to bottom, transparent 0%, #8B4513 60%, #654321 100%);"></div>
                
                <!-- Floor -->
                <div style="position: absolute; bottom: 0; width: 100%; height: 30%; background: linear-gradient(to top, #CD853F 0%, #DEB887 100%); border-top: 3px solid #8B4513;"></div>
                
                <!-- Wall Decorations -->
                <div style="position: absolute; top: 10%; left: 10%; width: 80px; height: 60px; background: linear-gradient(145deg, #FFD700 0%, #FFA500 100%); border: 3px solid #8B4513; border-radius: 5px;"></div>
                
                <!-- Bob Character (Smiley Face) -->
                <div style="position: absolute; bottom: 35%; left: 15%; display: flex; flex-direction: column; align-items: center; cursor: pointer;" onclick="bobSpeak(&quot;Hello! I'm Bob, your friendly assistant! Click around to explore.&quot;);">
                    <div style="width: 80px; height: 80px; background: radial-gradient(circle, #FFD700 0%, #FFA500 100%); border-radius: 50%; border: 3px solid #FF8C00; position: relative; box-shadow: 3px 3px 10px rgba(0,0,0,0.3);">
                        <!-- Eyes -->
                        <div style="position: absolute; top: 25px; left: 20px; width: 12px; height: 12px; background: black; border-radius: 50%;"></div>
                        <div style="position: absolute; top: 25px; right: 20px; width: 12px; height: 12px; background: black; border-radius: 50%;"></div>
                        <!-- Smile -->
                        <div style="position: absolute; bottom: 20px; left: 50%; transform: translateX(-50%); width: 40px; height: 20px; border-bottom: 3px solid black; border-radius: 0 0 20px 20px;"></div>
                    </div>
                    <div style="margin-top: 5px; background: white; padding: 5px 10px; border: 2px solid black; border-radius: 5px; font-family: 'Comic Sans MS', cursive; font-size: 12px; white-space: nowrap; box-shadow: 2px 2px 5px rgba(0,0,0,0.3);">
                        Bob
                    </div>
                </div>
                
                <!-- Interactive Objects in Room -->
                <!-- Clock -->
                <div style="position: absolute; top: 15%; right: 15%; width: 60px; height: 60px; background: radial-gradient(circle, #F5F5DC 0%, #D2B48C 100%); border-radius: 50%; border: 4px solid #8B4513; cursor: pointer; display: flex; align-items: center; justify-content: center; box-shadow: 3px 3px 10px rgba(0,0,0,0.3);" onclick="bobSpeak(&quot;It's time to have fun with Windows 98!&quot;);">
                    <div style="font-family: 'Fixedsys 62', monospace; font-size: 10px; font-weight: bold;">12:00</div>
                </div>                
                <!-- Door -->
                <div style="position: absolute; bottom: 30%; right: 20%; width: 70px; height: 120px; background: linear-gradient(to right, #8B4513 0%, #A0522D 50%, #8B4513 100%); border: 3px solid #654321; border-radius: 5px 5px 0 0; cursor: pointer; box-shadow: 3px 3px 10px rgba(0,0,0,0.3);" onclick="bobSpeak(&quot;Where would you like to go today?&quot;);">
                    <!-- Door Knob -->
                    <div style="position: absolute; right: 10px; top: 50%; width: 8px; height: 8px; background: gold; border-radius: 50%; border: 1px solid #B8860B;"></div>
                </div>
                
                <!-- Desk with Computer Icon -->
                <div style="position: absolute; bottom: 30%; left: 50%; transform: translateX(-50%); width: 120px; height: 80px; background: linear-gradient(to bottom, #8B4513 0%, #654321 100%); border: 3px solid #5C4033; border-radius: 5px; cursor: pointer; box-shadow: 3px 3px 10px rgba(0,0,0,0.3);" onclick="bobSpeak(&quot;This is your computer! Let me help you use it.&quot;);">
                    <!-- Computer Monitor -->
                    <div style="position: absolute; top: -40px; left: 50%; transform: translateX(-50%); width: 50px; height: 45px; background: linear-gradient(145deg, #C0C0C0 0%, #808080 100%); border: 2px solid #505050; border-radius: 3px;">
                        <div style="width: 42px; height: 32px; background: #000080; margin: 4px; border: 1px solid #000;"></div>
                    </div>
                </div>
                
                <!-- Window with view -->
                <div style="position: absolute; top: 20%; left: 40%; width: 100px; height: 80px; background: linear-gradient(135deg, #87CEEB 0%, #E0F6FF 50%, #87CEEB 100%); border: 4px solid #8B4513; cursor: pointer; box-shadow: inset 2px 2px 5px rgba(0,0,0,0.2), 3px 3px 10px rgba(0,0,0,0.3);" onclick="bobSpeak(&quot;What a beautiful day outside!&quot;);">
                    <!-- Window Panes -->
                    <div style=\"position: absolute; top: 50%; left: 0; width: 100%; height: 2px; background: #8B4513;\"></div>
                    <div style=\"position: absolute; left: 50%; top: 0; width: 2px; height: 100%; background: #8B4513;\"></div>
                </div>
                
                <!-- Speech Bubble -->
                <div id=\"bob-speech\" style=\"position: absolute; bottom: 60%; left: 15%; background: white; padding: 15px; border: 3px solid black; border-radius: 15px; max-width: 250px; font-family: 'Comic Sans MS', cursive; font-size: 13px; display: none; box-shadow: 3px 3px 10px rgba(0,0,0,0.3); z-index: 100;\">
                    <div id=\"bob-speech-text\">Hi! I'm Bob! Click on things to explore!</div>
                    <div style=\"position: absolute; bottom: -15px; left: 30px; width: 0; height: 0; border-left: 15px solid transparent; border-right: 15px solid transparent; border-top: 15px solid black;\"></div>
                    <div style=\"position: absolute; bottom: -12px; left: 32px; width: 0; height: 0; border-left: 13px solid transparent; border-right: 13px solid transparent; border-top: 13px solid white;\"></div>
                </div>
                
                <!-- Bottom Menu Bar -->
                <div style=\"position: absolute; bottom: 0; width: 100%; background: linear-gradient(to bottom, #C0C0C0 0%, #808080 100%); border-top: 2px solid white; padding: 8px; display: flex; gap: 10px; z-index: 50;\">
                    <button class=\"btn\" onclick=\"bobSpeak('Let me show you around! Click on objects in the room to learn more.');\" style=\"font-family: 'Comic Sans MS', cursive; font-size: 11px;\">Help</button>
                    <button class=\"btn\" onclick=\"openNotepad(); closeWindow(this.closest('.window'));\" style=\"font-family: 'Comic Sans MS', cursive; font-size: 11px;\">Notepad</button>
                    <button class=\"btn\" onclick=\"openBrowser(); closeWindow(this.closest('.window'));\" style=\"font-family: 'Comic Sans MS', cursive; font-size: 11px;\">Internet</button>
                    <button class=\"btn\" onclick=\"bobSpeak('Thanks for visiting! See you later!'); setTimeout(() => closeWindow(this.closest('.window')), 2000);\" style=\"font-family: 'Comic Sans MS', cursive; font-size: 11px;\">Exit</button>
                </div>
            </div>
        `;
        
        const bobWindow = createWindow({
            title: "Microsoft Bob",
            icon: "https://win98icons.alexmeub.com/icons/png/bob-0.png",
            width: 800,
            height: 600,
            content: bobContent
        });
        playSound('open');
        
        // Make Bob fullscreen
        setTimeout(() => maximizeWindow(bobWindow), 100);
        
        // Show initial greeting
        setTimeout(() => {
            const speechBubble = bobWindow.querySelector('#bob-speech');
            const speechText = bobWindow.querySelector('#bob-speech-text');
            if (speechBubble && speechText) {
                speechText.textContent = "Hi! I'm Bob! Click on things to explore!";
                speechBubble.style.display = 'block';
                setTimeout(() => { speechBubble.style.display = 'none'; }, 3000);
            }
        }, 500);
    }
    
    // Bob speak function for Microsoft Bob
    function bobSpeak(message) {
        const bobWindow = document.querySelector('.window.active');
        if (!bobWindow) return;
        
        const speechBubble = bobWindow.querySelector('#bob-speech');
        const speechText = bobWindow.querySelector('#bob-speech-text');
        
        if (speechBubble && speechText) {
            speechText.textContent = message;
            speechBubble.style.display = 'block';
            playSound('ding');
            
            // Hide after 4 seconds
            setTimeout(() => {
                speechBubble.style.display = 'none';
            }, 4000);
        }
    }
    
    // Dial-up connection feature with real sounds
    let isConnectedToInternet = false;
    let dialUpInProgress = false;
    let dialUpAudio = null;
    
    function playDialUpSound(onSuccess, onFailure) {
        // Easter Egg: 10% chance of playing glitchy dial-up sound
        const useGlitchySound = Math.random() < 0.1;
        
        if (useGlitchySound) {
            dialUpAudio = new Audio('PLACEHOLDER_GLITCHY_DIALUP_SOUND_URL');
            dialUpAudio.volume = 0.8;
            
            // Show easter egg notification
            setTimeout(() => {
                const eggNotif = document.createElement('div');
                eggNotif.style.cssText = 'position: fixed; top: 50px; right: 20px; background: #FFD700; color: #000; padding: 15px; border: 3px solid #FF0000; z-index: 10000; font-family: Arial; font-weight: bold; box-shadow: 4px 4px 8px rgba(0,0,0,0.5);';
                eggNotif.innerHTML = '🎉 EASTER EGG!<br>Glitchy Dial-Up Sound!';
                document.body.appendChild(eggNotif);
                setTimeout(() => eggNotif.remove(), 4000);
            }, 2000);
        } else {
            dialUpAudio = new Audio('https://upload.wikimedia.org/wikipedia/commons/3/33/Dial_up_modem_noises.ogg');
            dialUpAudio.volume = 0.7;
        }
        
        dialUpAudio.addEventListener('ended', () => {
            // Connection succeeded after sound finishes (~32 seconds)
            onSuccess();
        });
        
        dialUpAudio.addEventListener('error', () => {
            // If audio fails to load, still proceed
            onSuccess();
        });
        
        dialUpAudio.play().catch(e => {
            console.log('Dial-up audio play failed:', e);
            onSuccess();
        });
    }
    
    function playDialUpFailureSound() {
        const failureAudio = new Audio('https://files.catbox.moe/1uyyg5.mp3');
        failureAudio.volume = 0.8;
        failureAudio.play().catch(e => console.log('Failure audio play failed:', e));
    }
    
    function playMSNNotificationSound() {
        const notifAudio = new Audio('https://www.myinstants.com/media/sounds/msn-sound_1.mp3');
        notifAudio.volume = 0.6;
        notifAudio.play().catch(e => console.log('MSN notification play failed:', e));
    }
    
    async function dialUpConnection(callback) {
        if (isConnectedToInternet) {
            callback();
            return;
        }
        
        if (dialUpInProgress) {
            showMessageBox({
                title: 'Kapcsolódás folyamatban',
                message: 'Már kapcsolódás van folyamatban. Kérlek, várj...',
                icon: 'warning',
                buttons: ['OK']
            });
            return;
        }
        
        dialUpInProgress = true;
        
        const dialupContent = `
            <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; background: linear-gradient(to bottom, #000080 0%, #0000CD 100%); color: white; font-family: 'Fixedsys 62', monospace; padding: 20px;">
                <div style="text-align: center; margin-bottom: 20px;">
                    <img src="https://win98icons.alexmeub.com/icons/png/conn_dialup.png" style="width: 48px; height: 48px;" />
                </div>
                <h2 style="margin: 10px 0; font-size: 18px;">📞 Kapcsolódás az internethez...</h2>
                <div style="background: white; color: black; padding: 15px; margin: 20px 0; border: 2px solid #808080; width: 80%; max-width: 400px;">
                    <div id="dialup-status" style="font-size: 12px; margin-bottom: 10px;">Modem inicializálása...</div>
                    <div style="background: #C0C0C0; height: 20px; border: 2px inset #808080; position: relative; overflow: hidden;">
                        <div id="dialup-progress" style="background: #000080; height: 100%; width: 0%; transition: width 0.5s;"></div>
                    </div>
                    <div id="dialup-percent" style="font-size: 11px; margin-top: 5px; text-align: center;">0%</div>
                </div>
                <div style="font-size: 11px; color: #FFD700; margin-top: 10px;">⚠️ Ne vedd fel a telefont a kapcsolat során!</div>
            </div>
        `;
        
        const dialupWindow = createWindow({
            title: 'Telefonos hálózat - Kapcsolódás',
            icon: 'https://win98icons.alexmeub.com/icons/png/conn_dialup.png',
            width: 450,
            height: 300,
            content: dialupContent
        });
        
        const statusEl = dialupWindow.querySelector('#dialup-status');
        const progressEl = dialupWindow.querySelector('#dialup-progress');
        const percentEl = dialupWindow.querySelector('#dialup-percent');
        
        const steps = [
            { text: 'Modem inicializálása...', duration: 2000, progress: 5 },
            { text: 'Tárcsázás: 06-1-555-1234...', duration: 3000, progress: 15 },
            { text: 'Kézfogás (handshake)...', duration: 8000, progress: 35 },
            { text: 'Protokoll egyeztetés...', duration: 6000, progress: 55 },
            { text: 'Felhasználó hitelesítése...', duration: 5000, progress: 70 },
            { text: 'IP cím kérése...', duration: 4000, progress: 85 },
            { text: 'Kapcsolat létrehozva!', duration: 4000, progress: 100 }
        ];
        
        // Random chance of connection failure (10%)
        const connectionFails = Math.random() < 0.1;
        
        // Start playing dial-up sound
        playDialUpSound(() => {
            // Sound finished, connection established
            if (!connectionFails) {
                // Continue with success flow
            }
        }, () => {
            // Sound failed to play
        });
        
        let currentStep = 0;
        
        const processStep = () => {
            // Check for connection failure at step 3 (during handshake)
            if (connectionFails && currentStep === 3) {
                if (dialUpAudio) {
                    dialUpAudio.pause();
                    dialUpAudio.currentTime = 0;
                }
                playDialUpFailureSound();
                statusEl.textContent = '❌ Kapcsolat megszakadt!';
                progressEl.style.backgroundColor = '#FF0000';
                
                dialUpInProgress = false;
                
                setTimeout(() => {
                    closeWindow(dialupWindow);
                    playSound('error');
                    showMessageBox({
                        title: 'Kapcsolódási hiba',
                        message: 'A kapcsolat nem jött létre!\n\nLehetséges okok:\n- Foglalt vonal\n- Rossz jelszó\n- Szerver nem elérhető\n\nPróbáld újra később.',
                        icon: 'error',
                        buttons: ['OK']
                    });
                }, 2000);
                return;
            }
            
            if (currentStep >= steps.length) {
                if (dialUpAudio) {
                    dialUpAudio.pause();
                    dialUpAudio.currentTime = 0;
                }
                isConnectedToInternet = true;
                dialUpInProgress = false;
                
                setTimeout(() => {
                    closeWindow(dialupWindow);
                    playSound('ding');
                    showMessageBox({
                        title: 'Kapcsolat létrejött',
                        message: 'Sikeres kapcsolódás az internethez!\n\nSebesség: 56k\nIP cím: 192.168.1.42\nDNS: 8.8.8.8',
                        icon: 'info',
                        buttons: ['OK'],
                        callback: () => {
                            callback();
                        }
                    });
                }, 500);
                return;
            }
            
            const step = steps[currentStep];
            statusEl.textContent = step.text;
            progressEl.style.width = step.progress + '%';
            percentEl.textContent = step.progress + '%';
            
            currentStep++;
            setTimeout(processStep, step.duration);
        };
        
        processStep();
    }
    
    // --- Virtual CD/DVD Drive Manager ---
    function openVirtualDriveManager() {
        const content = `
            <div style="display: flex; flex-direction: column; height: 100%; color: black;">
                <div style="padding: 10px; background-color: #ECE9D8; border-bottom: 2px solid #808080;">
                    <h3 style="margin: 0; color: #000080;">💿 Virtuális CD/DVD Meghajtó Kezelő</h3>
                </div>
                <div style="flex-grow: 1; padding: 15px; overflow-y: auto; background-color: white;">
                    <div style="margin-bottom: 20px;">
                        <h4 style="color: #000080; margin: 0 0 10px 0;">Virtuális meghajtók:</h4>
                        <div style="border: 2px inset #808080; padding: 10px; background-color: #fff;">
                            <div style="padding: 8px; border-bottom: 1px solid #ccc; display: flex; align-items: center;">
                                <img src="https://win98icons.alexmeub.com/icons/png/cd_audio_cd_a-5.png" style="width: 24px; height: 24px; margin-right: 10px;">
                                <div>
                                    <div style="font-weight: bold;">D: (Virtuális CD-ROM)</div>
                                    <div style="font-size: 11px; color: #666;">Nincs lemez</div>
                                </div>
                            </div>
                            <div style="padding: 8px; display: flex; align-items: center;">
                                <img src="https://win98icons.alexmeub.com/icons/png/cd_audio_cd_a-5.png" style="width: 24px; height: 24px; margin-right: 10px;">
                                <div>
                                    <div style="font-weight: bold;">E: (Virtuális DVD-ROM)</div>
                                    <div style="font-size: 11px; color: #666;">Nincs lemez</div>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div>
                        <h4 style="color: #000080; margin: 0 0 10px 0;">Lemez csatlakoztatása:</h4>
                        <div style="border: 2px inset #808080; padding: 10px; background-color: #fff;">
                            <select id="drive-select" style="width: 100%; margin-bottom: 10px; padding: 4px;">
                                <option value="D:">D: (Virtuális CD-ROM)</option>
                                <option value="E:">E: (Virtuális DVD-ROM)</option>
                            </select>
                            <input type="text" id="iso-path" placeholder="ISO fájl elérési útja..." style="width: 100%; margin-bottom: 10px; padding: 4px; font-family: 'Fixedsys 62', monospace;" />
                            <button class="btn" onclick="mountVirtualDrive()" style="width: 100%; padding: 6px;">Csatlakoztatás</button>
                        </div>
                    </div>
                    <div style="margin-top: 15px; padding: 10px; background-color: #ffffcc; border: 1px solid #808080;">
                        <strong>⚠️ Megjegyzés:</strong> Ez egy szimuláció. Valódi ISO fájlok nem töltődnek be, csak a funkció bemutatása céljából.
                    </div>
                </div>
                <div style="padding: 10px; background-color: #ECE9D8; border-top: 2px solid #808080; text-align: center;">
                    <button class="btn" onclick="playSound('click'); closeWindow(document.querySelector('.window.active'));" style="padding: 4px 20px;">Bezárás</button>
                </div>
            </div>
        `;
        createWindow({
            title: "Virtuális meghajtó kezelő",
            icon: "https://win98icons.alexmeub.com/icons/png/cd_audio_cd_a-5.png",
            width: 500,
            height: 500,
            content: content
        });
    }
    
    function mountVirtualDrive() {
        const drive = document.getElementById('drive-select').value;
        const path = document.getElementById('iso-path').value;
        
        if (!path) {
            showMessageBox({
                title: 'Hiba',
                message: 'Kérlek adj meg egy ISO fájl elérési utat!',
                icon: 'error',
                buttons: ['OK']
            });
            return;
        }
        
        playSound('ding');
        showMessageBox({
            title: 'Sikeres csatlakoztatás',
            message: `A virtuális lemez sikeresen csatlakoztatva a ${drive} meghajtóra!

Fájl: ${path}`,
            icon: 'info',
            buttons: ['OK']
        });
        
        document.getElementById('iso-path').value = '';
    }
    
    // --- Enhanced Properties Dialog ---
    function showPropertiesDialog(title, type, extraInfo = {}) {
        let message = '';
        
        // Format like real Windows 98 Properties dialog
        if (type === 'Rendszerfájl' || type === 'Alkalmazás') {
            message += `${title}

`;
            message += `Típus: ${type}
`;
            if (extraInfo.location) {
                message += `Hely: ${extraInfo.location}
`;
            }
            if (extraInfo.size) {
                message += `Méret: ${extraInfo.size}
`;
            }
            message += `
Létrehozva: 2025. november 26.
`;
            message += `Módosítva: 2025. november 26.
`;
            if (extraInfo.attributes) {
                message += `
Attribútumok: ${extraInfo.attributes}`;
            }
        } else {
            // Generic properties
            message += `Név: ${title}
`;
            message += `Típus: ${type}
`;
            if (extraInfo.description) {
                message += `Leírás: ${extraInfo.description}`;
            }
        }
        
        showMessageBox({
            title: 'Tulajdonságok',
            message: message,
            icon: 'info',
            buttons: ['OK']
        });
    }

    // --- Calculator ---
    function openCalculator() {
        const calcState = {
            display: '0',
            previousValue: null,
            operation: null,
            shouldResetDisplay: false,
            memory: 0
        };
        
        const calculatorContent = `
            <div style="width: 100%; height: 100%; display: flex; flex-direction: column; background: #C0C0C0; padding: 3px;">
                <!-- Memory Display -->
                <div style="background: #E0E0E0; border: 1px solid #808080; padding: 3px 5px; margin-bottom: 3px; text-align: left; font-family: Arial, sans-serif; font-size: 11px; height: 18px;" id="calc-memory"></div>
                
                <!-- Display -->
                <div style="background: white; border: 2px inset #808080; padding: 8px 10px; margin-bottom: 5px; text-align: right; font-family: Arial, sans-serif; font-size: 24px; font-weight: bold; height: 40px; line-height: 40px; color: #000;" id="calc-display">0</div>
                
                <!-- Memory & Special Functions -->
                <div style="display: grid; grid-template-columns: repeat(5, 1fr); gap: 2px; margin-bottom: 3px;">
                    <button class="btn" onclick="calcMemory('MC')" style="height: 28px; font-size: 10px;">MC</button>
                    <button class="btn" onclick="calcMemory('MR')" style="height: 28px; font-size: 10px;">MR</button>
                    <button class="btn" onclick="calcMemory('MS')" style="height: 28px; font-size: 10px;">MS</button>
                    <button class="btn" onclick="calcMemory('M+')" style="height: 28px; font-size: 10px;">M+</button>
                    <button class="btn" onclick="calcMemory('M-')" style="height: 28px; font-size: 10px;">M-</button>
                </div>
                
                <!-- Calculator Buttons -->
                <div style="display: grid; grid-template-columns: repeat(5, 1fr); gap: 3px;">
                    <button class="btn" onclick="calcClear()" style="height: 35px; font-size: 12px;">C</button>
                    <button class="btn" onclick="calcClearEntry()" style="height: 35px; font-size: 12px;">CE</button>
                    <button class="btn" onclick="calcBackspace()" style="height: 35px; font-size: 12px;">←</button>
                    <button class="btn" onclick="calcOperation('/')" style="height: 35px; font-size: 14px;">/</button>
                    <button class="btn" onclick="calcFunction('sqrt')" style="height: 35px; font-size: 12px;">√</button>
                    
                    <button class="btn" onclick="calcInput('7')" style="height: 35px; font-size: 14px;">7</button>
                    <button class="btn" onclick="calcInput('8')" style="height: 35px; font-size: 14px;">8</button>
                    <button class="btn" onclick="calcInput('9')" style="height: 35px; font-size: 14px;">9</button>
                    <button class="btn" onclick="calcOperation('*')" style="height: 35px; font-size: 14px;">*</button>
                    <button class="btn" onclick="calcFunction('percent')" style="height: 35px; font-size: 14px;">%</button>
                    
                    <button class="btn" onclick="calcInput('4')" style="height: 35px; font-size: 14px;">4</button>
                    <button class="btn" onclick="calcInput('5')" style="height: 35px; font-size: 14px;">5</button>
                    <button class="btn" onclick="calcInput('6')" style="height: 35px; font-size: 14px;">6</button>
                    <button class="btn" onclick="calcOperation('-')" style="height: 35px; font-size: 14px;">-</button>
                    <button class="btn" onclick="calcFunction('reciprocal')" style="height: 35px; font-size: 12px;">1/x</button>
                    
                    <button class="btn" onclick="calcInput('1')" style="height: 35px; font-size: 14px;">1</button>
                    <button class="btn" onclick="calcInput('2')" style="height: 35px; font-size: 14px;">2</button>
                    <button class="btn" onclick="calcInput('3')" style="height: 35px; font-size: 14px;">3</button>
                    <button class="btn" onclick="calcOperation('+')" style="height: 35px; font-size: 14px;">+</button>
                    <button class="btn" onclick="calcFunction('square')" style="height: 35px; font-size: 12px;">x²</button>
                    
                    <button class="btn" onclick="calcToggleSign()" style="height: 35px; font-size: 12px;">+/-</button>
                    <button class="btn" onclick="calcInput('0')" style="height: 35px; font-size: 14px;">0</button>
                    <button class="btn" onclick="calcInput('.')" style="height: 35px; font-size: 14px;">.</button>
                    <button class="btn" onclick="calcEquals()" style="height: 35px; font-size: 14px; grid-column: span 2;">=</button>
                </div>
            </div>
        `;
        
        const calcWindow = createWindow({
            title: "Számológép",
            icon: "https://win98icons.alexmeub.com/icons/png/calculator-0.png",
            width: 310,
            height: 400,
            content: calculatorContent
        });
        
        playSound('open');
        
        window.calcState = calcState;
        window.calcWindow = calcWindow;
    }
    
    function calcInput(value) {
        const display = window.calcWindow.querySelector('#calc-display');
        if (window.calcState.shouldResetDisplay) {
            window.calcState.display = value;
            window.calcState.shouldResetDisplay = false;
        } else {
            if (window.calcState.display === '0' && value !== '.') {
                window.calcState.display = value;
            } else {
                window.calcState.display += value;
            }
        }
        display.textContent = window.calcState.display;
    }
    
    function calcOperation(op) {
        if (window.calcState.operation && !window.calcState.shouldResetDisplay) {
            calcEquals();
        }
        window.calcState.previousValue = parseFloat(window.calcState.display);
        window.calcState.operation = op;
        window.calcState.shouldResetDisplay = true;
    }
    
    function calcEquals() {
        if (!window.calcState.operation || window.calcState.previousValue === null) return;
        
        const current = parseFloat(window.calcState.display);
        let result;
        
        // Check for division by zero
        if (window.calcState.operation === '/' && current === 0) {
            playSound('error');
            showMessageBox({
                title: 'Számológép',
                message: 'Nullával nem lehet osztani.',
                icon: 'error',
                buttons: ['OK']
            });
            calcClear();
            return;
        }
        
        switch (window.calcState.operation) {
            case '+': result = window.calcState.previousValue + current; break;
            case '-': result = window.calcState.previousValue - current; break;
            case '*': result = window.calcState.previousValue * current; break;
            case '/': result = window.calcState.previousValue / current; break;
        }
        
        const display = window.calcWindow.querySelector('#calc-display');
        window.calcState.display = result.toString();
        display.textContent = window.calcState.display;
        window.calcState.operation = null;
        window.calcState.previousValue = null;
        window.calcState.shouldResetDisplay = true;
    }
    
    function calcClear() {
        window.calcState.display = '0';
        window.calcState.previousValue = null;
        window.calcState.operation = null;
        window.calcState.shouldResetDisplay = false;
        const display = window.calcWindow.querySelector('#calc-display');
        display.textContent = '0';
    }
    
    function calcBackspace() {
        if (window.calcState.display.length > 1) {
            window.calcState.display = window.calcState.display.slice(0, -1);
        } else {
            window.calcState.display = '0';
        }
        const display = window.calcWindow.querySelector('#calc-display');
        display.textContent = window.calcState.display;
    }
    
    function calcClearEntry() {
        window.calcState.display = '0';
        const display = window.calcWindow.querySelector('#calc-display');
        display.textContent = '0';
    }
    
    function calcMemory(action) {
        const current = parseFloat(window.calcState.display);
        const memDisplay = window.calcWindow.querySelector('#calc-memory');
        
        switch(action) {
            case 'MC':
                window.calcState.memory = 0;
                memDisplay.textContent = '';
                break;
            case 'MR':
                window.calcState.display = window.calcState.memory.toString();
                window.calcWindow.querySelector('#calc-display').textContent = window.calcState.display;
                break;
            case 'MS':
                window.calcState.memory = current;
                memDisplay.textContent = 'M';
                break;
            case 'M+':
                window.calcState.memory += current;
                memDisplay.textContent = 'M';
                break;
            case 'M-':
                window.calcState.memory -= current;
                memDisplay.textContent = 'M';
                break;
        }
    }
    
    function calcFunction(func) {
        const current = parseFloat(window.calcState.display);
        let result;
        
        // Check for division by zero in reciprocal
        if (func === 'reciprocal' && current === 0) {
            playSound('error');
            showMessageBox({
                title: 'Számológép',
                message: 'Nullával nem lehet osztani.',
                icon: 'error',
                buttons: ['OK']
            });
            calcClear();
            return;
        }
        
        switch(func) {
            case 'sqrt':
                result = Math.sqrt(current);
                break;
            case 'square':
                result = current * current;
                break;
            case 'reciprocal':
                result = 1 / current;
                break;
            case 'percent':
                if (window.calcState.previousValue !== null && window.calcState.operation) {
                    result = (window.calcState.previousValue * current) / 100;
                } else {
                    result = current / 100;
                }
                break;
        }
        
        const display = window.calcWindow.querySelector('#calc-display');
        window.calcState.display = result.toString();
        display.textContent = window.calcState.display;
        window.calcState.shouldResetDisplay = true;
    }
    
    function calcToggleSign() {
        const current = parseFloat(window.calcState.display);
        window.calcState.display = (-current).toString();
        const display = window.calcWindow.querySelector('#calc-display');
        display.textContent = window.calcState.display;
    }
    
    // --- ActiveX Control Panel ---
    function openActiveX() {
        const activeXContent = `
            <div style="width: 100%; height: 100%; background: white; padding: 15px; overflow-y: auto; font-family: Arial, sans-serif;">
                <h2 style="margin: 0 0 5px 0; font-size: 16px; color: #000080;">ActiveX Vezérlők</h2>
                <p style="font-size: 12px; margin-bottom: 20px; color: #333;">Telepített ActiveX komponensek kezelése és konfigurálása.</p>
                
                <div style="border: 2px groove #C0C0C0; padding: 12px; margin-bottom: 12px; background: #F9F9F9;">
                    <div style="display: flex; align-items: center; margin-bottom: 8px;">
                        <span style="font-size: 24px; margin-right: 10px;">📦</span>
                        <div>
                            <div style="font-weight: bold; font-size: 13px; color: #000;">Shockwave Flash Object</div>
                            <div style="font-size: 11px; color: #666; margin-top: 2px;">Verzió: 6.0.79.0</div>
                        </div>
                    </div>
                    <div style="font-size: 11px; color: #555; margin: 5px 0; font-family: 'Courier New', monospace; background: #F0F0F0; padding: 4px; border: 1px solid #DDD;">
                        CLSID: {D27CDB6E-AE6D-11cf-96B8-444553540000}
                    </div>
                    <div style="font-size: 12px; margin: 8px 0;">
                        <strong>Állapot:</strong> <span style="color: green; font-weight: bold;">✓ Telepítve és engedélyezve</span>
                    </div>
                    <div style="display: flex; gap: 5px; margin-top: 8px;">
                        <button class="btn" style="font-size: 11px; padding: 4px 10px;" onclick="activexShowProps('flash')">Tulajdonsagok</button>
                        <button class="btn" style="font-size: 11px; padding: 4px 10px;" onclick="activexDisable('flash')">Letiltas</button>
                    </div>
                </div>
                
                <div style="border: 2px groove #C0C0C0; padding: 12px; margin-bottom: 12px; background: #F9F9F9;">
                    <div style="display: flex; align-items: center; margin-bottom: 8px;">
                        <span style="font-size: 24px; margin-right: 10px;">📦</span>
                        <div>
                            <div style="font-weight: bold; font-size: 13px; color: #000;">Windows Media Player</div>
                            <div style="font-size: 11px; color: #666; margin-top: 2px;">Verzio: 7.1.0.3055</div>
                        </div>
                    </div>
                    <div style="font-size: 11px; color: #555; margin: 5px 0; font-family: 'Courier New', monospace; background: #F0F0F0; padding: 4px; border: 1px solid #DDD;">
                        CLSID: {6BF52A52-394A-11d3-B153-00C04F79FAA6}
                    </div>
                    <div style="font-size: 12px; margin: 8px 0;">
                        <strong>Allapot:</strong> <span style="color: green; font-weight: bold;">✓ Telepitve es engedelyezve</span>
                    </div>
                    <div style="display: flex; gap: 5px; margin-top: 8px;">
                        <button class="btn" style="font-size: 11px; padding: 4px 10px;" onclick="activexShowProps('wmp')">Tulajdonsagok</button>
                        <button class="btn" style="font-size: 11px; padding: 4px 10px;" onclick="activexDisable('wmp')">Letiltas</button>
                    </div>
                </div>
                
                <div style="border: 2px groove #C0C0C0; padding: 12px; margin-bottom: 12px; background: #F9F9F9;">
                    <div style="display: flex; align-items: center; margin-bottom: 8px;">
                        <span style="font-size: 24px; margin-right: 10px;">📦</span>
                        <div>
                            <div style="font-weight: bold; font-size: 13px; color: #000;">Microsoft XML Parser (MSXML)</div>
                            <div style="font-size: 11px; color: #666; margin-top: 2px;">Verzio: 3.0.0.0</div>
                        </div>
                    </div>
                    <div style="font-size: 11px; color: #555; margin: 5px 0; font-family: 'Courier New', monospace; background: #F0F0F0; padding: 4px; border: 1px solid #DDD;">
                        CLSID: {88D969C0-F192-11D4-A65F-0040963251E5}
                    </div>
                    <div style="font-size: 12px; margin: 8px 0;">
                        <strong>Allapot:</strong> <span style="color: green; font-weight: bold;">✓ Telepitve es engedelyezve</span>
                    </div>
                    <div style="display: flex; gap: 5px; margin-top: 8px;">
                        <button class="btn" style="font-size: 11px; padding: 4px 10px;" onclick="activexShowProps('msxml')">Tulajdonsagok</button>
                        <button class="btn" style="font-size: 11px; padding: 4px 10px;" onclick="activexDisable('msxml')">Letiltas</button>
                    </div>
                </div>
                
                <div style="border-top: 2px solid #C0C0C0; margin-top: 20px; padding-top: 15px;">
                    <div style="display: flex; gap: 8px; flex-wrap: wrap;">
                        <button class="btn" onclick="activexSecurity()">🔒 Biztonsagi beallitasok</button>
                        <button class="btn" onclick="activexUpdate()">🔄 Frissitesek keresese</button>
                        <button class="btn" onclick="activexListAll()">📋 Osszes vezerlok</button>
                    </div>
                </div>
            </div>
        `;
        
        createWindow({
            title: "ActiveX Vezerlok",
            icon: "https://win98icons.alexmeub.com/icons/png/windows-0.png",
            width: 520,
            height: 500,
            content: activeXContent
        });
        
        playSound('open');
    }
    
    function activexShowProps(type) {
        const messages = {
            flash: 'Nev: Shockwave Flash Object\nVerzio: 6.0.79.0\nGyarto: Macromedia Inc.\nFajl: flash.ocx\nMeret: 892 KB\n\nBiztonsagi zona: Internet\nEngedelyezve minden webhelyen.',
            wmp: 'Nev: Windows Media Player\nVerzio: 7.1.0.3055\nGyarto: Microsoft Corporation\nFajl: wmp.ocx\nMeret: 1.2 MB\n\nMultimedias lejatszas weboldalakban.',
            msxml: 'Nev: Microsoft XML Parser\nVerzio: 3.0.0.0\nGyarto: Microsoft Corporation\nFajl: msxml3.dll\nMeret: 1.1 MB\n\nXML dokumentumok feldolgozasa.'
        };
        showMessageBox({title: 'ActiveX Tulajdonsagok', message: messages[type], icon: 'info', buttons: ['OK']});
    }
    
    function activexDisable(type) {
        const names = {flash: 'Flash Player', wmp: 'Windows Media Player', msxml: 'XML Parser'};
        showMessageBox({title: 'ActiveX', message: names[type] + ' sikeresen letiltva.\n(Szimulalt muvelet)', icon: 'info', buttons: ['OK']});
    }
    
    function activexSecurity() {
        showMessageBox({title: 'Biztonsagi beallitasok', message: 'ActiveX biztonsagi szintek:\n\nMagas - Minden ActiveX letiltva\nKozepes - Kerdes ActiveX futtatas elott\nAlacsony - Minden ActiveX engedelyezve\n\nJelenlegi: Kozepes', icon: 'info', buttons: ['OK']});
    }
    
    function activexUpdate() {
        showMessageBox({title: 'Frissitesek', message: 'Windows Update kereses...\n\nNincs elerheto ActiveX frissites.\n\nUtolso ellenorzes: 2025.12.08', icon: 'info', buttons: ['OK']});
    }
    
    function activexListAll() {
        showMessageBox({title: 'Osszes vezerlok', message: 'Telepitett ActiveX vezerlok: 3\n\n- Shockwave Flash Object\n- Windows Media Player\n- Microsoft XML Parser\n\nOsszes meret: 3.1 MB', icon: 'info', buttons: ['OK']});
    }
    
    // --- Macromedia Flash Player ---
    function openFlashPlayer() {
        const flashContent = `
            <div style="width: 100%; height: 100%; display: flex; flex-direction: column; background: #E0E0E0;">
                <!-- Menu Bar -->
                <div style="background: #C0C0C0; border-bottom: 1px solid #808080; padding: 3px 5px; font-family: 'Fixedsys 62', monospace; font-size: 11px;">
                    <span style="padding: 3px 8px; cursor: pointer;" onclick="flashPlayerMenu('file')">File</span>
                    <span style="padding: 3px 8px; cursor: pointer;" onclick="flashPlayerMenu('view')">View</span>
                    <span style="padding: 3px 8px; cursor: pointer;" onclick="flashPlayerMenu('control')">Control</span>
                    <span style="padding: 3px 8px; cursor: pointer;" onclick="flashPlayerMenu('help')">Help</span>
                </div>
                
                <!-- Toolbar -->
                <div style="background: #E0E0E0; border-bottom: 1px solid #808080; padding: 5px; display: flex; gap: 5px; align-items: center;">
                    <button class="btn" onclick="browseFlashFiles()" title="Open SWA File" style="padding: 4px 12px; font-size: 11px;">📂 Open</button>
                    <button class="btn" onclick="loadFlashDemo()" title="Load Demo" style="padding: 4px 12px; font-size: 11px;">🎬 Demo</button>
                    <button class="btn" onclick="flashPlayerInfo()" title="File Info" style="padding: 4px 12px; font-size: 11px;">ℹ️ Info</button>
                    <div style="width: 1px; height: 20px; background: #808080; margin: 0 3px;"></div>
                    <button class="btn" onclick="flashControl('play')" style="padding: 4px 12px; font-size: 11px;">▶ Play</button>
                    <button class="btn" onclick="flashControl('stop')" style="padding: 4px 12px; font-size: 11px;">⏹ Stop</button>
                </div>
                
                <!-- Stage Area -->
                <div id="flash-stage" style="flex: 1; background: white; margin: 5px; border: 2px inset #808080; display: flex; align-items: center; justify-content: center; position: relative; overflow: hidden;">
                    <div style="text-align: center; font-family: Arial, sans-serif; color: #999;">
                        <div style="font-size: 64px; margin-bottom: 10px;">🎬</div>
                        <div style="font-size: 18px; font-weight: bold; margin-bottom: 10px;">Macromedia Flash Player 6</div>
                        <div style="font-size: 13px; color: #666; margin-bottom: 20px;">No content loaded</div>
                        <div style="display: flex; gap: 10px; justify-content: center;">
                            <button class="btn" onclick="loadFlashDemo()" style="padding: 8px 16px;">🎬 Load Demo</button>
                            <button class="btn" onclick="browseFlashFiles()" style="padding: 8px 16px;">📂 Browse Files</button>
                        </div>
                    </div>
                </div>
                
                <!-- Status Bar -->
                <div style="background: #C0C0C0; border-top: 1px solid white; padding: 5px 8px; display: flex; justify-content: space-between; align-items: center; font-family: 'Fixedsys 62', monospace; font-size: 11px;">
                    <div id="flash-status">Ready</div>
                    <div id="flash-file-info"></div>
                </div>
                
                <!-- Control Bar -->
                <div style="background: #C0C0C0; border-top: 1px solid #808080; padding: 8px; display: flex; gap: 5px; align-items: center;">
                    <button class="btn" onclick="flashControl('rewind')" style="width: 32px; height: 28px;">⏮</button>
                    <button class="btn" id="flash-play-btn" onclick="flashControl('play')" style="width: 32px; height: 28px;">▶</button>
                    <button class="btn" onclick="flashControl('pause')" style="width: 32px; height: 28px;">⏸</button> 
                    <button class="btn" onclick="flashControl('stop')" style="width: 32px; height: 28px;">⏹</button>
                    <button class="btn" onclick="flashControl('forward')" style="width: 32px; height: 28px;">⏭</button>
                    <div style="flex: 1; margin: 0 10px;">
                        <div style="background: white; border: 1px inset #808080; height: 22px; position: relative; cursor: pointer;" onclick="flashSeek(event)">
                            <div id="flash-progress" style="background: linear-gradient(to bottom, #0066CC 0%, #0044AA 100%); height: 100%; width: 0%; transition: width 0.1s;"></div>
                        </div>
                    </div>
                    <div style="font-family: 'Fixedsys 62', monospace; font-size: 11px; min-width: 60px; text-align: right;" id="flash-time">0:00 / 0:00</div>
                    <button class="btn" onclick="flashToggleLoop()" style="width: 32px; height: 28px;" title="Loop">🔁</button>
                </div>
            </div>
        `;
        
        window.flashPlayerWindow = createWindow({
            title: "Macromedia Flash Player 6",
            icon: "https://static.wikia.nocookie.net/logopedia/images/6/6b/Fl-player6.png/revision/latest?cb=20190707095933",
            width: 600,
            height: 500,
            content: flashContent
        });
        
        playSound('open');
        window.flashPlayerState = { playing: false, time: 0, duration: 0, loop: false };
    }
    
    function loadFlashDemo() {
        if (!window.flashPlayerWindow) return;
        
        const stage = window.flashPlayerWindow.querySelector('#flash-stage');
        const status = window.flashPlayerWindow.querySelector('#flash-status');
        const fileInfo = window.flashPlayerWindow.querySelector('#flash-file-info');
        
        stage.innerHTML = `
            <div style="width: 100%; height: 100%; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); display: flex; align-items: center; justify-content: center; position: relative; overflow: hidden;">
                <div id="flash-animation" style="text-align: center; color: white; font-family: Arial, sans-serif;">
                    <h1 style="font-size: 48px; margin: 0; animation: flashBounce 1s infinite; text-shadow: 3px 3px 6px rgba(0,0,0,0.5);">⚡ Flash Demo ⚡</h1>
                    <p style="font-size: 22px; margin: 15px 0; text-shadow: 2px 2px 4px rgba(0,0,0,0.5);">Macromedia Flash MX 2004</p>
                    <div style="margin-top: 30px; display: flex; justify-content: center; gap: 15px;">
                        <div class="flash-circle" style="width: 60px; height: 60px; background: #ff6b6b; border-radius: 50%; display: inline-block; animation: flashPulse 1.5s infinite; box-shadow: 0 0 20px rgba(255,107,107,0.8);"></div>
                        <div class="flash-circle" style="width: 60px; height: 60px; background: #4ecdc4; border-radius: 50%; display: inline-block; animation: flashPulse 1.5s infinite 0.3s; box-shadow: 0 0 20px rgba(78,205,196,0.8);"></div>
                        <div class="flash-circle" style="width: 60px; height: 60px; background: #ffe66d; border-radius: 50%; display: inline-block; animation: flashPulse 1.5s infinite 0.6s; box-shadow: 0 0 20px rgba(255,230,109,0.8);"></div>
                    </div>
                    <div style="margin-top: 30px; font-size: 16px; opacity: 0.9;">
                        <p>🎮 Interactive Demo Animation</p>
                        <p style="font-size: 12px; margin-top: 10px;">© 1998-2004 Macromedia, Inc.</p>
                    </div>
                </div>
                <style>
                    @keyframes flashBounce {
                        0%, 100% { transform: translateY(0) scale(1); }
                        50% { transform: translateY(-15px) scale(1.05); }
                    }
                    @keyframes flashPulse {
                        0%, 100% { transform: scale(1); opacity: 1; }
                        50% { transform: scale(1.4); opacity: 0.6; }
                    }
                </style>
            </div>
        `;
        
        status.textContent = 'Playing: demo.swa';
        fileInfo.textContent = 'FPS: 12 | 550x400';
        
        // Simulate playback
        window.flashPlayerState = { playing: true, time: 0, duration: 15, loop: false, currentFile: 'demo.swa' };
        startFlashPlayback();
    }
    
    function browseFlashFiles() {
        const flashFiles = JSON.parse(localStorage.getItem('flash_files') || '{}');
        const fileNames = Object.keys(flashFiles);
        
        if (fileNames.length === 0) {
            showMessageBox({
                title: 'No SWA Files',
                message: 'No saved Flash animations found.\n\nCreate animations in Flash Editor and save them as .swa files.',
                icon: 'info',
                buttons: ['OK']
            });
            return;
        }
        
        let fileListHTML = '<div style="font-family: Arial, sans-serif; font-size: 14px; font-weight: bold; margin-bottom: 10px; padding: 8px; background: #E0E0E0; border: 1px solid #808080;">📂 Select a file to play:</div><div style="max-height: 300px; overflow-y: auto; margin: 10px 0; border: 2px inset #808080; background: white;">';
        
        fileNames.forEach(name => {
            const file = flashFiles[name];
            const date = new Date(file.created).toLocaleDateString();
            const time = new Date(file.created).toLocaleTimeString();
            fileListHTML += `<div style="padding: 12px; border-bottom: 1px solid #D0D0D0; cursor: pointer; font-family: Arial, sans-serif;" onmouseover="this.style.background='#E0E8FF'" onmouseout="this.style.background='white'" onclick="loadFlashFile('${name}'); closeWindow(this.closest('.window'));"><div style="font-size: 14px; font-weight: bold; color: #000080; margin-bottom: 4px;">🎬 ${name}</div><div style="font-size: 12px; color: #333; line-height: 1.4;">📅 Created: ${date} ${time}<br>🎞️ Frames: ${file.frames} | ⚡ FPS: ${file.fps || 12}<br>📐 Size: ${file.width}x${file.height}</div></div>`;
        });
        
        fileListHTML += '</div><div style="font-family: Arial, sans-serif; font-size: 11px; color: #666; padding: 8px; background: #F0F0F0; border-top: 1px solid #808080;">💡 Click a file to load it in Flash Player</div>';
        
        const fileWindow = createWindow({
            title: 'Browse Flash Files',
            icon: 'https://static.wikia.nocookie.net/logopedia/images/6/6b/Fl-player6.png/revision/latest?cb=20190707095933',
            width: 400,
            height: 350,
            content: fileListHTML
        });
    }
    
    function loadFlashFile(filename) {
        const flashFiles = JSON.parse(localStorage.getItem('flash_files') || '{}');
        const file = flashFiles[filename];
        
        if (!file || !window.flashPlayerWindow) return;
        
        const stage = window.flashPlayerWindow.querySelector('#flash-stage');
        const status = window.flashPlayerWindow.querySelector('#flash-status');
        const fileInfo = window.flashPlayerWindow.querySelector('#flash-file-info');
        
        stage.innerHTML = `<img src="${file.canvasData}" style="max-width: 100%; max-height: 100%; object-fit: contain;" />`;
        
        status.textContent = `Playing: ${filename}`;
        fileInfo.textContent = `FPS: ${file.fps} | ${file.width}x${file.height}`;
        
        window.flashPlayerState = { playing: true, time: 0, duration: file.frames / file.fps, loop: false, currentFile: filename };
        startFlashPlayback();
        
        playSound('open');
    }
    
    function flashPlayerMenu(menu) {
        const messages = {
            file: 'Open SWA File...\nClose\nExit Flash Player',
            view: 'Zoom In / Out\nFullscreen Mode\nShow Controls',
            control: 'Play / Pause\nStop\nRewind\nLoop',
            help: 'Macromedia Flash Player 6\nVersion 6.0.79.0\n\n© 1998-2004 Macromedia, Inc.\nAll rights reserved.'
        };
        showMessageBox({title: menu.charAt(0).toUpperCase() + menu.slice(1), message: messages[menu], icon: 'info', buttons: ['OK']});
    }
    
    function flashPlayerInfo() {
        if (!window.flashPlayerState.currentFile) {
            showMessageBox({title: 'File Info', message: 'No file loaded.', icon: 'info', buttons: ['OK']});
            return;
        }
        
        showMessageBox({
            title: 'Flash File Information',
            message: `File: ${window.flashPlayerState.currentFile}\nDuration: ${window.flashPlayerState.duration}s\nStatus: ${window.flashPlayerState.playing ? 'Playing' : 'Stopped'}\nLoop: ${window.flashPlayerState.loop ? 'ON' : 'OFF'}`,
            icon: 'info',
            buttons: ['OK']
        });
    }
    
    function flashSeek(event) {
        if (!window.flashPlayerState || window.flashPlayerState.duration === 0) return;
        
        const rect = event.currentTarget.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const percent = x / rect.width;
        window.flashPlayerState.time = percent * window.flashPlayerState.duration;
        updateFlashProgress();
    }
    
    function flashToggleLoop() {
        if (!window.flashPlayerState) return;
        window.flashPlayerState.loop = !window.flashPlayerState.loop;
        playSound('click');
        showMessageBox({title: 'Loop', message: `Loop mode: ${window.flashPlayerState.loop ? 'ON' : 'OFF'}`, icon: 'info', buttons: ['OK']});
    }
    
    function flashControl(action) {
        if (!window.flashPlayerState) return;
        
        const playBtn = window.flashPlayerWindow?.querySelector('#flash-play-btn');
        
        switch(action) {
            case 'play':
                window.flashPlayerState.playing = true;
                if (playBtn) playBtn.innerHTML = '⏸';
                startFlashPlayback();
                break;
            case 'pause':
                window.flashPlayerState.playing = false;
                if (playBtn) playBtn.innerHTML = '▶';
                break;
            case 'stop':
                window.flashPlayerState.playing = false;
                window.flashPlayerState.time = 0;
                if (playBtn) playBtn.innerHTML = '▶';
                updateFlashProgress();
                break;
            case 'rewind':
                window.flashPlayerState.time = Math.max(0, window.flashPlayerState.time - 2);
                updateFlashProgress();
                break;
            case 'forward':
                window.flashPlayerState.time = Math.min(window.flashPlayerState.duration, window.flashPlayerState.time + 2);
                updateFlashProgress();
                break;
        }
    }
    
    function startFlashPlayback() {
        if (!window.flashPlayerState || !window.flashPlayerState.playing) return;
        
        const interval = setInterval(() => {
            if (!window.flashPlayerState.playing) {
                clearInterval(interval);
                return;
            }
            
            if (window.flashPlayerState.time >= window.flashPlayerState.duration) {
                if (window.flashPlayerState.loop) {
                    window.flashPlayerState.time = 0;
                } else {
                    clearInterval(interval);
                    window.flashPlayerState.playing = false;
                    const playBtn = window.flashPlayerWindow?.querySelector('#flash-play-btn');
                    if (playBtn) playBtn.innerHTML = '▶';
                }
            } else {
                window.flashPlayerState.time += 0.1;
            }
            
            updateFlashProgress();
        }, 100);
    }
    
    function updateFlashProgress() {
        if (!window.flashPlayerWindow) return;
        const progress = window.flashPlayerWindow.querySelector('#flash-progress');
        const timeDisplay = window.flashPlayerWindow.querySelector('#flash-time');
        const percentage = (window.flashPlayerState.time / window.flashPlayerState.duration) * 100;
        progress.style.width = percentage + '%';
        
        const formatTime = (seconds) => {
            const mins = Math.floor(seconds / 60);
            const secs = Math.floor(seconds % 60);
            return `${mins}:${secs.toString().padStart(2, '0')}`;
        };
        
        timeDisplay.textContent = `${formatTime(window.flashPlayerState.time)} / ${formatTime(window.flashPlayerState.duration)}`;
    }
    
    // --- Flash Editor ---
    function openFlashEditor() {
        const flashEditorContent = `
            <div style="width: 100%; height: 100%; display: flex; flex-direction: column; background: #D4D0C8;">
                <!-- Menu Bar -->
                <div style="background: #C0C0C0; border-bottom: 1px solid #808080; padding: 3px 5px; font-family: 'Fixedsys 62', monospace; font-size: 11px;">
                    <span style="padding: 3px 8px; cursor: pointer;" onclick="flashEditorMenu('file')">File</span>
                    <span style="padding: 3px 8px; cursor: pointer;" onclick="flashEditorMenu('edit')">Edit</span>
                    <span style="padding: 3px 8px; cursor: pointer;" onclick="flashEditorMenu('insert')">Insert</span>
                    <span style="padding: 3px 8px; cursor: pointer;" onclick="flashEditorMenu('modify')">Modify</span>
                    <span style="padding: 3px 8px; cursor: pointer;" onclick="flashEditorMenu('control')">Control</span>
                    <span style="padding: 3px 8px; cursor: pointer;" onclick="flashEditorMenu('window')">Window</span>
                </div>
                
                <!-- Toolbar -->
                <div style="background: #E0E0E0; border-bottom: 1px solid #808080; padding: 5px; display: flex; gap: 3px;">
                    <button class="btn" onclick="flashEditorTool('select')" title="Selection Tool" style="width: 32px; height: 32px; font-size: 18px;">↖</button>
                    <button class="btn" onclick="flashEditorTool('line')" title="Line Tool" style="width: 32px; height: 32px; font-size: 18px;">📏</button>
                    <button class="btn" onclick="flashEditorTool('pencil')" title="Pencil" style="width: 32px; height: 32px; font-size: 18px;">✏️</button>
                    <button class="btn" onclick="flashEditorTool('brush')" title="Brush" style="width: 32px; height: 32px; font-size: 18px;">🖌️</button>
                    <button class="btn" onclick="flashEditorTool('rectangle')" title="Rectangle" style="width: 32px; height: 32px; font-size: 18px;">▭</button>
                    <button class="btn" onclick="flashEditorTool('oval')" title="Oval" style="width: 32px; height: 32px; font-size: 18px;">⭕</button>
                    <button class="btn" onclick="flashEditorTool('text')" title="Text" style="width: 32px; height: 32px; font-size: 18px;">A</button>
                    <div style="width: 1px; height: 32px; background: #808080; margin: 0 3px;"></div>
                    <button class="btn" onclick="flashEditorAction('undo')" title="Undo" style="width: 32px; height: 32px;">↶</button>
                    <button class="btn" onclick="flashEditorAction('redo')" title="Redo" style="width: 32px; height: 32px;">↷</button>
                </div>
                
                <!-- Main Work Area -->
                <div style="flex: 1; display: flex;">
                    <!-- Tools Panel -->
                    <div style="width: 60px; background: #F0F0F0; border-right: 1px solid #808080; padding: 5px;">
                        <div style="font-family: 'Fixedsys 62', monospace; font-size: 9px; margin-bottom: 5px; font-weight: bold;">TOOLS</div>
                        <div style="width: 30px; height: 30px; background: black; border: 2px inset #808080; margin-bottom: 3px; cursor: pointer;" onclick="flashEditorColor('stroke', this)" title="Stroke Color"></div>
                        <div style="width: 30px; height: 30px; background: white; border: 2px inset #808080; cursor: pointer;" onclick="flashEditorColor('fill', this)" title="Fill Color"></div>
                    </div>
                    
                    <!-- Canvas Area -->
                    <div style="flex: 1; display: flex; flex-direction: column;">
                        <!-- Stage -->
                        <div style="flex: 1; background: #C0C0C0; padding: 20px; overflow: auto; position: relative;">
                            <canvas id="flash-editor-canvas" width="550" height="400" style="background: white; border: 1px solid #808080; cursor: crosshair; display: block;"></canvas>
                        </div>
                        
                        <!-- Timeline -->
                        <div style="height: 100px; background: #E8E8E8; border-top: 1px solid #808080;">
                            <div style="background: #D0D0D0; padding: 3px 5px; border-bottom: 1px solid #808080; font-family: 'Fixedsys 62', monospace; font-size: 10px; display: flex; align-items: center; gap: 5px;">
                                <span style="font-weight: bold;">Timeline</span>
                                <button class="btn" onclick="flashTimelineAction('addFrame')" style="font-size: 9px; padding: 2px 5px;">+ Frame</button>
                                <button class="btn" onclick="flashTimelineAction('addLayer')" style="font-size: 9px; padding: 2px 5px;">+ Layer</button>
                                <button class="btn" onclick="flashTimelineAction('play')" style="font-size: 9px; padding: 2px 5px;">▶ Play</button>
                            </div>
                            <div style="padding: 5px; overflow-x: auto;">
                                <div style="display: flex; align-items: center; margin-bottom: 3px;">
                                    <div style="width: 80px; font-family: 'Fixedsys 62', monospace; font-size: 10px; padding: 3px;">Layer 1</div>
                                    <div style="display: flex; gap: 2px;">
                                        <div style="width: 50px; height: 20px; border: 1px solid #808080; background: white; cursor: pointer;" onclick="flashSelectFrame(1, 1)"></div>
                                        <div style="width: 50px; height: 20px; border: 1px solid #808080; background: #F0F0F0; cursor: pointer;" onclick="flashSelectFrame(1, 2)"></div>
                                        <div style="width: 50px; height: 20px; border: 1px solid #808080; background: #F0F0F0; cursor: pointer;" onclick="flashSelectFrame(1, 3)"></div>
                                        <div style="width: 50px; height: 20px; border: 1px solid #808080; background: #F0F0F0; cursor: pointer;" onclick="flashSelectFrame(1, 4)"></div>
                                        <div style="width: 50px; height: 20px; border: 1px solid #808080; background: #F0F0F0; cursor: pointer;" onclick="flashSelectFrame(1, 5)"></div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Properties Panel -->
                    <div style="width: 220px; background: #F0F0F0; border-left: 1px solid #808080; padding: 8px; overflow-y: auto;">
                        <div style="font-family: Arial, sans-serif; font-size: 11px; font-weight: bold; margin-bottom: 8px; border-bottom: 1px solid #808080; padding-bottom: 3px; color: #000080;">PROPERTIES</div>
                        
                        <!-- Quick Help -->
                        <div style="background: #FFFFCC; border: 1px solid #DDD; padding: 8px; margin-bottom: 10px; font-size: 10px; font-family: Arial, sans-serif;">
                            <div style="font-weight: bold; margin-bottom: 4px;">💡 Quick Guide:</div>
                            <div style="line-height: 1.4;">
                            1. Select a tool from toolbar<br>
                            2. Draw on white canvas<br>
                            3. Click colors to change<br>
                            4. Use File > Publish to save as .SWA
                            </div>
                        </div>
                        
                        <div style="margin-bottom: 10px;">
                            <div style="font-family: Arial, sans-serif; font-size: 10px; margin-bottom: 3px; font-weight: bold;">FPS:</div>
                            <input type="number" value="12" min="1" max="60" style="width: 100%; padding: 3px; font-family: Arial, sans-serif; font-size: 11px;" onchange="flashUpdateProperty('fps', this.value)">
                        </div>
                        
                        <div style="margin-bottom: 10px;">
                            <div style="font-family: Arial, sans-serif; font-size: 10px; margin-bottom: 3px; font-weight: bold;">Stage Size:</div>
                            <input type="text" value="550 x 400" style="width: 100%; padding: 3px; font-family: Arial, sans-serif; font-size: 11px;" readonly>
                        </div>
                        
                        <div style="margin-bottom: 10px;">
                            <div style="font-family: Arial, sans-serif; font-size: 10px; margin-bottom: 3px; font-weight: bold;">Background:</div>
                            <input type="color" value="#FFFFFF" style="width: 100%; height: 30px;" onchange="flashUpdateProperty('bgColor', this.value)">
                        </div>
                        
                        <button class="btn" onclick="flashPublish()" style="width: 100%; margin-top: 10px; font-weight: bold; background: #0066CC; color: white;">💾 Publish SWA</button>
                        <button class="btn" onclick="flashTest()" style="width: 100%; margin-top: 5px;">▶ Test Movie</button>
                        <button class="btn" onclick="flashClear()" style="width: 100%; margin-top: 5px; background: #CC0000; color: white;">🗑️ Clear Canvas</button>
                    </div>
                </div>
            </div>
        `;
        
        window.flashEditorWindow = createWindow({
            title: "Macromedia Flash MX 2004",
            icon: "https://static.wikia.nocookie.net/logopedia/images/6/6b/Fl-player6.png/revision/latest?cb=20190707095933",
            width: 900,
            height: 650,
            content: flashEditorContent
        });
        
        playSound('open');
        
        // Initialize canvas
        setTimeout(() => {
            const canvas = window.flashEditorWindow.querySelector('#flash-editor-canvas');
            if (canvas) {
                window.flashEditorCanvas = canvas;
                window.flashEditorCtx = canvas.getContext('2d');
                window.flashEditorState = {
                    tool: 'select',
                    drawing: false,
                    strokeColor: '#000000',
                    fillColor: '#FFFFFF',
                    startX: 0,
                    startY: 0,
                    totalFrames: 1,
                    currentFrame: 1,
                    fps: 12,
                    frames: [canvas.toDataURL()] // Store frame data
                };
                
                canvas.addEventListener('mousedown', flashCanvasMouseDown);
                canvas.addEventListener('mousemove', flashCanvasMouseMove);
                canvas.addEventListener('mouseup', flashCanvasMouseUp);
            }
        }, 100);
    }
    
    function flashEditorMenu(menu) {
        const messages = {
            file: 'New, Open, Save, Export...',
            edit: 'Undo, Redo, Cut, Copy, Paste...',
            insert: 'New Symbol, Keyframe, Layer...',
            modify: 'Transform, Arrange, Shape...',
            control: 'Play, Test Movie, Enable Simple Buttons...',
            window: 'Library, Properties, Timeline...'
        };
        showMessageBox({title: menu.charAt(0).toUpperCase() + menu.slice(1), message: messages[menu], icon: 'info', buttons: ['OK']});
    }
    
    function flashEditorTool(tool) {
        window.flashEditorState.tool = tool;
        playSound('click');
        // Tool selected silently - no popup needed
    }
    
    function flashEditorAction(action) {
        playSound('click');
        showMessageBox({title: action.charAt(0).toUpperCase() + action.slice(1), message: action.charAt(0).toUpperCase() + action.slice(1) + ' action performed.', icon: 'info', buttons: ['OK']});
    }
    
    function flashEditorColor(type, element) {
        const currentColor = type === 'stroke' ? window.flashEditorState.strokeColor : window.flashEditorState.fillColor;
        
        // Windows 98 standard color palette
        const basicColors = [
            '#000000', '#FFFFFF', '#808080', '#C0C0C0', '#FF0000', '#800000', '#FFFF00', '#808000',
            '#00FF00', '#008000', '#00FFFF', '#008080', '#0000FF', '#000080', '#FF00FF', '#800080',
            '#C00000', '#FF6A00', '#FFFF00', '#92D050', '#00B050', '#00B0F0', '#0070C0', '#7030A0'
        ];
        
        let colorHTML = `
            <div style="font-family: Arial, sans-serif; padding: 10px;">
                <div style="font-size: 12px; font-weight: bold; margin-bottom: 8px; color: #000;">${type === 'stroke' ? 'Stroke Color' : 'Fill Color'}</div>
                <div style="margin-bottom: 12px;">
                    <div style="font-size: 11px; margin-bottom: 6px; color: #000;">Basic colors:</div>
                    <div style="display: grid; grid-template-columns: repeat(8, 28px); gap: 4px; margin-bottom: 12px;">`;
        
        basicColors.forEach(color => {
            const selected = color.toLowerCase() === currentColor.toLowerCase() ? 'border: 3px solid #000080;' : '';
            colorHTML += `<div style="width: 28px; height: 28px; background: ${color}; border: 2px outset #C0C0C0; cursor: pointer; ${selected}" onclick="selectFlashColor('${color}', '${type}'); closeWindow(this.closest('.window'));"></div>`;
        });
        
        colorHTML += `</div></div>
                <div style="margin-top: 12px; padding-top: 12px; border-top: 1px solid #808080;">
                    <div style="font-size: 11px; margin-bottom: 6px; color: #000;">Custom color (HTML5):</div>
                    <input type="color" value="${currentColor}" onchange="selectFlashColor(this.value, '${type}'); closeWindow(this.closest('.window'));" style="width: 100%; height: 32px; cursor: pointer;">
                </div>
            </div>
        `;
        
        const colorWindow = createWindow({
            title: 'Color',
            icon: 'https://win98icons.alexmeub.com/icons/png/paint_old-0.png',
            width: 300,
            height: 280,
            content: colorHTML
        });
    }
    
    function selectFlashColor(color, type) {
        if (type === 'stroke') {
            window.flashEditorState.strokeColor = color;
            // Update stroke color display
            const strokeEl = document.querySelector('[title="Stroke Color"]');
            if (strokeEl) strokeEl.style.background = color;
        } else {
            window.flashEditorState.fillColor = color;
            // Update fill color display
            const fillEl = document.querySelector('[title="Fill Color"]');
            if (fillEl) fillEl.style.background = color;
        }
        playSound('click');
    }
    
    function flashTimelineAction(action) {
        playSound('click');
        if (action === 'addFrame') {
            // Save current canvas state
            window.flashEditorState.frames.push(window.flashEditorCanvas.toDataURL());
            window.flashEditorState.totalFrames++;
            window.flashEditorState.currentFrame = window.flashEditorState.totalFrames;
            showMessageBox({title: 'Timeline', message: `Frame ${window.flashEditorState.totalFrames} added!\nTotal frames: ${window.flashEditorState.totalFrames}`, icon: 'info', buttons: ['OK']});
        } else if (action === 'addLayer') {
            showMessageBox({title: 'Timeline', message: 'New layer created!', icon: 'info', buttons: ['OK']});
        } else if (action === 'play') {
            showMessageBox({title: 'Timeline', message: `Playing ${window.flashEditorState.totalFrames} frame(s) at ${window.flashEditorState.fps} FPS...`, icon: 'info', buttons: ['OK']});
        }
    }
    
    function flashSelectFrame(layer, frame) {
        playSound('click');
    }
    
    function flashUpdateProperty(prop, value) {
        playSound('click');
        if (prop === 'bgColor') {
            window.flashEditorCanvas.style.background = value;
        } else if (prop === 'fps') {
            window.flashEditorState.fps = parseInt(value) || 12;
        }
    }
    
    function flashPublish() {
        showInputDialog(
            'Publish SWA File',
            'Enter filename for your animation:',
            'my_animation',
            (filename) => {
                if (!filename) return;
                
                const swaName = filename.endsWith('.swa') ? filename : filename + '.swa';
                
                // Get canvas data
                const canvasData = window.flashEditorCanvas.toDataURL();
                
                // Get actual frame count from timeline or use 1
                const frameCount = window.flashEditorState.totalFrames || 1;
                
                // Create .swa file object
                const swaFile = {
                    name: swaName,
                    created: new Date().toISOString(),
                    fps: window.flashEditorState.fps || 12,
                    width: 550,
                    height: 400,
                    frames: frameCount,
                    canvasData: canvasData,
                    type: 'swa'
                };
                
                // Save to localStorage
                const flashFiles = JSON.parse(localStorage.getItem('flash_files') || '{}');
                flashFiles[swaName] = swaFile;
                localStorage.setItem('flash_files', JSON.stringify(flashFiles));
                
                playSound('ding');
                showMessageBox({
                    title: 'Publish Complete',
                    message: `SWA file saved successfully!\n\nFile: ${swaName}\nSize: ${(canvasData.length / 1024).toFixed(1)} KB\nFrames: ${frameCount}\nFPS: ${window.flashEditorState.fps || 12}\n\nSaved to Local Storage.`,
                    icon: 'info',
                    buttons: ['OK']
                });
            }
        );
    }
    
    function flashTest() {
        playSound('open');
        openFlashPlayer();
        setTimeout(() => loadFlashDemo(), 500);
    }
    
    function flashClear() {
        if (window.flashEditorCanvas && window.flashEditorCtx) {
            window.flashEditorCtx.clearRect(0, 0, 550, 400);
            playSound('click');
        }
    }
    
    function flashCanvasMouseDown(e) {
        const rect = window.flashEditorCanvas.getBoundingClientRect();
        window.flashEditorState.drawing = true;
        window.flashEditorState.startX = e.clientX - rect.left;
        window.flashEditorState.startY = e.clientY - rect.top;
    }
    
    function flashCanvasMouseMove(e) {
        if (!window.flashEditorState.drawing) return;
        
        const rect = window.flashEditorCanvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const ctx = window.flashEditorCtx;
        
        if (window.flashEditorState.tool === 'pencil' || window.flashEditorState.tool === 'brush') {
            ctx.strokeStyle = window.flashEditorState.strokeColor;
            ctx.lineWidth = window.flashEditorState.tool === 'brush' ? 5 : 2;
            ctx.lineCap = 'round';
            ctx.beginPath();
            ctx.moveTo(window.flashEditorState.startX, window.flashEditorState.startY);
            ctx.lineTo(x, y);
            ctx.stroke();
            window.flashEditorState.startX = x;
            window.flashEditorState.startY = y;
        }
    }
    
    function flashCanvasMouseUp(e) {
        if (!window.flashEditorState.drawing) return;
        
        const rect = window.flashEditorCanvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const ctx = window.flashEditorCtx;
        
        if (window.flashEditorState.tool === 'line') {
            ctx.strokeStyle = window.flashEditorState.strokeColor;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(window.flashEditorState.startX, window.flashEditorState.startY);
            ctx.lineTo(x, y);
            ctx.stroke();
        } else if (window.flashEditorState.tool === 'rectangle') {
            ctx.strokeStyle = window.flashEditorState.strokeColor;
            ctx.fillStyle = window.flashEditorState.fillColor;
            ctx.lineWidth = 2;
            const width = x - window.flashEditorState.startX;
            const height = y - window.flashEditorState.startY;
            ctx.fillRect(window.flashEditorState.startX, window.flashEditorState.startY, width, height);
            ctx.strokeRect(window.flashEditorState.startX, window.flashEditorState.startY, width, height);
        } else if (window.flashEditorState.tool === 'oval') {
            ctx.strokeStyle = window.flashEditorState.strokeColor;
            ctx.fillStyle = window.flashEditorState.fillColor;
            ctx.lineWidth = 2;
            const radiusX = Math.abs(x - window.flashEditorState.startX) / 2;
            const radiusY = Math.abs(y - window.flashEditorState.startY) / 2;
            const centerX = window.flashEditorState.startX + (x - window.flashEditorState.startX) / 2;
            const centerY = window.flashEditorState.startY + (y - window.flashEditorState.startY) / 2;
            ctx.beginPath();
            ctx.ellipse(centerX, centerY, radiusX, radiusY, 0, 0, 2 * Math.PI);
            ctx.fill();
            ctx.stroke();
        } else if (window.flashEditorState.tool === 'text') {
            const x = window.flashEditorState.startX;
            const y = window.flashEditorState.startY;
            showInputDialog('Text Tool', 'Enter text:', '', (text) => {
                if (text) {
                    ctx.fillStyle = window.flashEditorState.strokeColor;
                    ctx.font = '16px Arial';
                    ctx.fillText(text, x, y);
                }
            });
        }
        
        window.flashEditorState.drawing = false;
    }
    
    // --- Blue Screen of Death (BSoD) ---
    function triggerBSOD() {
        playSound('error');
        
        // Close all windows first (like real BSoD)
        const allWindows = document.querySelectorAll('.window');
        allWindows.forEach(win => {
            if (win && win.parentNode) {
                win.parentNode.removeChild(win);
            }
        });
        
        // Clear windows array
        windows.length = 0;
        
        // Clear taskbar
        const taskbarWindows = document.getElementById('taskbar-windows');
        if (taskbarWindows) {
            taskbarWindows.innerHTML = '';
        }
        
        const bsod = document.getElementById('bsod');
        const cursor = document.getElementById('bsod-cursor');
        bsod.style.display = 'flex';
        cursor.style.visibility = 'visible';
        
        // Reset BSoD on any key press
        document.addEventListener('keydown', function resetBSOD(e) {
            bsod.style.display = 'none';
            document.removeEventListener('keydown', resetBSOD);
            playSound('open');
        });
    }

    function openPinball() {
    const defaultTitle = "3D Pinball for Windows - Space Cadet";
    let pinballWindow = null;

    // Windows 98 style splash screen with authentic pinball logo
    const pinballContent = `
        <div id="pinball-container" style="width: 100%; height: 100%; display: flex; flex-direction: column; position: relative;">
            <!-- Splash Screen -->
            <div id="pinball-splash" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; background: linear-gradient(to bottom, #000080 0%, #000000 100%); display: flex; flex-direction: column; align-items: center; justify-content: center; z-index: 1000;">
                <div style="text-align: center;">
                    <img src="https://98.js.org/images/icons/pinball-32x32.png" alt="Pinball" style="width: 64px; height: 64px; margin-bottom: 20px;">
                    <div style="color: white; font-family: 'Fixedsys 62', 'Courier New', monospace; font-size: 24px; font-weight: bold; margin-bottom: 10px;">3D Pinball for Windows</div>
                    <div style="color: #c0c0c0; font-family: 'Fixedsys 62', 'Courier New', monospace; font-size: 14px; margin-bottom: 30px;">Space Cadet</div>
                    <div style="color: #ffffff; font-family: 'Fixedsys 62', 'Courier New', monospace; font-size: 12px; margin-bottom: 10px;">Loading...</div>
                    <div style="width: 200px; height: 20px; background: #c0c0c0; border: 2px inset #808080; overflow: hidden;">
                        <div id="pinball-progress" style="width: 0%; height: 100%; background: linear-gradient(to right, #000080, #0000ff); transition: width 0.3s;"></div>
                    </div>
                </div>
            </div>
            <!-- Game Content -->
            <div style="flex-grow: 1; background-color: black; overflow: hidden; padding: 0; margin: 0;">
                <iframe id="pinball-iframe" 
                        style="width: 100%; height: 100%; border: none;"
                        sandbox="allow-scripts allow-same-origin allow-forms"></iframe>
            </div>
        </div>
    `;

    // Window dimensions appropriate for the Pinball game
    pinballWindow = createWindow({
        title: defaultTitle,
        icon: "https://98.js.org/images/icons/pinball-32x32.png",
        width: 624,
        height: 485,
        content: pinballContent
    });

    // Animated splash screen with progress bar
    setTimeout(() => {
        const splash = pinballWindow.querySelector('#pinball-splash');
        const progress = pinballWindow.querySelector('#pinball-progress');
        const iframe = pinballWindow.querySelector('#pinball-iframe');
        
        let loadProgress = 0;
        const progressInterval = setInterval(() => {
            loadProgress += Math.random() * 30;
            if (loadProgress >= 100) {
                loadProgress = 100;
                clearInterval(progressInterval);
                
                // Hide splash after loading complete
                setTimeout(() => {
                    if (splash) splash.style.display = 'none';
                    // Load the game after splash
                    if (iframe) {
                        iframe.src = "https://98.js.org/programs/pinball/space-cadet.html";
                    }
                }, 500);
            }
            if (progress) progress.style.width = loadProgress + '%';
        }, 200);
    }, 100);
}

function openWolf3D() {
    const defaultTitle = "Wolfenstein 3D - 1992 Id Software";
    let pinballWindow = null;

    // Content wrapper to ensure the iframe takes up all available space.
    // FIX: Added allow="fullscreen" to the iframe to grant permission for fullscreen mode,
    // which resolves the 'Disallowed by permissions policy' error when the Pinball game
    // attempts to enter fullscreen.
    const pinballContent = `
        <div style="width: 100%; height: 100%; display: flex; flex-direction: column;">
            <div style="flex-grow: 1; background-color: white; overflow: hidden; padding: 0; margin: 0;">
                <iframe src="https://loadx.github.io/html5-wolfenstein3D/" 
                        style="width: 100%; height: 100%; border: none;"
                        allow="fullscreen"></iframe>
            </div>
        </div>
    `;

    // Window dimensions appropriate for the Pinball game.
    pinballWindow = createWindow({
        title: defaultTitle,
        icon: "https://github.com/loadx/html5-wolfenstein3D/blob/master/favicon.png?raw=true",
        width: 800,
        height: 600,
        content: pinballContent
    });
}

    // --- 1998 Harmless Malware Simulations ---
    
    // Happy99 (Ska) Worm - Shows fireworks animation and sends emails
    function triggerHappy99() {
        const content = `
            <div style="display: flex; flex-direction: column; height: 100%; background-color: #000; overflow: hidden; position: relative;">
                <div style="position: absolute; top: 10px; left: 10px; right: 10px; background-color: rgba(0,0,0,0.8); color: #00FF00; padding: 10px; font-family: 'Courier New', monospace; font-size: 11px; z-index: 10; max-height: 150px; overflow-y: auto;" id="happy99-log">
                    <div style="color: #FFD700; font-weight: bold;">🎆 Happy99.exe - Ska Worm 🎆</div>
                    <div>Inicializálás...</div>
                </div>
                <canvas id="fireworks-canvas" style="width: 100%; height: 100%; display: block;"></canvas>
            </div>
        `;
        const happy99Window = createWindow({
            title: "Happy New Year 1999 !!",
            icon: "https://win98icons.alexmeub.com/icons/png/windows-0.png",
            width: 500,
            height: 400,
            content: content
        });
        playSound('ding');
        
        setTimeout(() => {
            const canvas = happy99Window.querySelector('#fireworks-canvas');
            const log = happy99Window.querySelector('#happy99-log');
            if (!canvas) return;
            
            // Fireworks animation
            canvas.width = canvas.offsetWidth;
            canvas.height = canvas.offsetHeight;
            const ctx = canvas.getContext('2d');
            
            const particles = [];
            const colors = ['#FF0000', '#FF4500', '#FFD700', '#00FF00', '#00BFFF', '#FF00FF', '#FFFFFF', '#FFA500'];
            
            class Particle {
                constructor(x, y, color) {
                    this.x = x;
                    this.y = y;
                    this.color = color;
                    this.radius = Math.random() * 2 + 1;
                    this.velocityX = (Math.random() - 0.5) * 6;
                    this.velocityY = (Math.random() - 0.5) * 6;
                    this.life = 100;
                    this.decay = Math.random() * 2 + 1;
                }
                
                update() {
                    this.x += this.velocityX;
                    this.y += this.velocityY;
                    this.velocityY += 0.1; // gravity
                    this.life -= this.decay;
                }
                
                draw() {
                    ctx.save();
                    ctx.globalAlpha = this.life / 100;
                    ctx.fillStyle = this.color;
                    ctx.beginPath();
                    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.restore();
                }
            }
            
            function createFirework() {
                const x = Math.random() * canvas.width;
                const y = Math.random() * (canvas.height * 0.6) + canvas.height * 0.2;
                const color = colors[Math.floor(Math.random() * colors.length)];
                const particleCount = Math.random() * 30 + 50;
                
                for (let i = 0; i < particleCount; i++) {
                    particles.push(new Particle(x, y, color));
                }
            }
            
            function animate() {
                ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
                ctx.fillRect(0, 0, canvas.width, canvas.height);
                
                // Update and draw particles
                for (let i = particles.length - 1; i >= 0; i--) {
                    particles[i].update();
                    particles[i].draw();
                    
                    if (particles[i].life <= 0) {
                        particles.splice(i, 1);
                    }
                }
                
                // Randomly create new fireworks
                if (Math.random() < 0.05) {
                    createFirework();
                }
                
                requestAnimationFrame(animate);
            }
            
            // Start with initial fireworks
            for (let i = 0; i < 3; i++) {
                setTimeout(() => createFirework(), i * 300);
            }
            
            animate();
            
            // Malware actions log
            const actions = [
                { text: 'Wsock32.dll módosítása...', delay: 1000 },
                { text: 'SKA.EXE másolása Windows könyvtárba...', delay: 1500 },
                { text: 'Registry kulcs hozzáadása: HKEY_LOCAL_MACHINE\\...', delay: 2000 },
                { text: '', delay: 2200 },
                { text: 'MAPI kapcsolat létrehozása...', delay: 2500 },
                { text: 'Outlook címjegyzék olvasása...', delay: 3000 },
                { text: 'Megtalálva: 12 címzett', delay: 3500 },
                { text: '', delay: 3700 },
                { text: 'Emailek küldése Happy99.exe csatolmánnyal:', delay: 4000, color: '#FFD700' },
                { text: '  → friend@example.com - Elküldve', delay: 4300 },
                { text: '  → colleague@work.com - Elküldve', delay: 4600 },
                { text: '  → family@home.com - Elküldve', delay: 4900 },
                { text: '', delay: 5200 },
                { text: '✓ Telepítés befejezve!', delay: 5500, color: '#00FF00' },
                { text: 'Worm aktív és törzsképes memóriában.', delay: 5800 }
            ];
            
            actions.forEach(action => {
                setTimeout(() => {
                    if (log) {
                        const line = document.createElement('div');
                        line.style.color = action.color || '#00FF00';
                        line.style.marginBottom = '2px';
                        line.textContent = action.text;
                        log.appendChild(line);
                        log.scrollTop = log.scrollHeight;
                        if (action.text && !action.text.startsWith(' ')) playSound('click');
                    }
                }, action.delay);
            });
            
            // Serious effect: Change desktop background after infection
            setTimeout(() => {
                document.body.style.backgroundImage = 'none';
                document.body.style.backgroundColor = '#000000';
                playSound('error');
                showMessageBox({
                    title: 'Happy99 Worm',
                    message: 'A rendszer megváltoztatta az asztali hátteret! A Happy99 worm települt és aktív. (Frissítsd az oldalt a visszaállításhoz)',
                    icon: 'warning',
                    buttons: ['OK']
                });
            }, 6500);
        }, 100);
    }
    
    // Melissa Worm - Simulated email spam behavior
    function triggerMelissa() {
        playSound('error');
        
        // Show the infected document opening
        const content = `
            <div style="display: flex; flex-direction: column; height: 100%; background-color: white; font-family: 'Times New Roman', serif; padding: 20px;">
                <div style="background-color: #C0C0C0; padding: 4px 8px; margin-bottom: 10px; border: 2px solid #808080;">
                    <strong>Important Message For You.doc - Microsoft Word</strong>
                </div>
                <div style="padding: 20px; background-color: white; border: 2px inset #808080; flex-grow: 1; overflow-y: auto;">
                    <p style="color: #000; font-size: 14px;">Here is that document you asked for...don't show anyone else ;-)</p>
                    <br>
                    <p style="color: #666; font-size: 12px; font-style: italic;">Twenty-two points, plus triple-word-score, plus fifty points for using all my letters. Game's over. I'm outta here.</p>
                </div>
            </div>
        `;
        
        const melissaWindow = createWindow({
            title: 'Important Message For You.doc - Microsoft Word',
            icon: 'https://files.catbox.moe/zadrz1.png',
            width: 500,
            height: 300,
            content: content
        });
        
        // Simulate macro execution after 1 second
        setTimeout(() => {
            showMessageBox({
                title: 'Microsoft Word',
                message: 'Ez a dokumentum makrókat tartalmaz. Makró végrehajtása...',
                icon: 'warning',
                buttons: ['Engedélyezés', 'Letiltás'],
                callback: (btn) => {
                    if (btn === 'Engedélyezés') {
                        // Simulate sending emails
                        let emailCount = 0;
                        const sendInterval = setInterval(() => {
                            emailCount++;
                            playSound('ding');
                            
                            if (emailCount >= 5) {
                                clearInterval(sendInterval);
                                showMessageBox({
                                    title: 'Microsoft Outlook',
                                    message: `${emailCount} üzenet elküldve a címjegyzékből!

Twenty-two points, plus triple-word-score, plus fifty points for using all my letters. Game's over. I'm outta here.`,
                                    icon: 'info',
                                    buttons: ['OK'],
                                    callback: () => {
                                        // Serious effect: Slow down system and show random errors
                                        playSound('error');
                                        
                                        // Create random error windows
                                        let errorCount = 0;
                                        const errorInterval = setInterval(() => {
                                            errorCount++;
                                            const errors = [
                                                'Nincs elég memória a művelet végrehajtásához.',
                                                'A KERNEL32.DLL fájl nem található.',
                                                'Általános védelmi hiba a(z) 0028:C001E36 címen.',
                                                'Ez a program illegális műveletet hajtott végre.',
                                                'A Windows nem tud csatlakozni a hálózathoz.'
                                            ];
                                            showMessageBox({
                                                title: 'Rendszerhiba',
                                                message: errors[Math.floor(Math.random() * errors.length)],
                                                icon: 'error',
                                                buttons: ['OK']
                                            });
                                            
                                            if (errorCount >= 3) {
                                                clearInterval(errorInterval);
                                            }
                                        }, 2000);
                                    }
                                });
                            }
                        }, 500);
                    }
                }
            });
        }, 1000);
    }
    
    // ILOVEYOU - Love letter themed
    function triggerILoveYou() {
        const content = `
            <div style="display: flex; flex-direction: column; height: 100%; background: linear-gradient(135deg, #FF69B4, #FFB6C1); font-family: 'Comic Sans MS', cursive;">
                <div style="padding: 10px; background-color: rgba(0,0,0,0.8); color: white; font-family: 'Courier New', monospace; font-size: 11px; flex-grow: 1; overflow-y: auto;" id="iloveyou-log">
                    <div style="color: #FF69B4; font-weight: bold; margin-bottom: 10px;">💕 I LOVE YOU - VBScript Worm 💕</div>
                    <div style="color: #FFB6C1; margin-bottom: 5px;">kindly check the attached LOVELETTER coming from me.</div>
                    <div style="color: #00FF00; margin-top: 10px;">Szkript végrehajtása...</div>
                </div>
                <div style="text-align: center; padding: 10px; background-color: rgba(255,255,255,0.9); border-top: 2px solid #FF69B4;">
                    <p style="font-size: 12px; margin: 5px 0; color: #8B0000;">⚠️ Ez csak egy szimuláció - nem történik valós károsítás!</p>
                </div>
            </div>
        `;
        const iloveWindow = createWindow({
            title: "LOVE-LETTER-FOR-YOU.TXT.vbs - Windows Script Host",
            icon: "https://upload.wikimedia.org/wikipedia/en/0/0a/Windows_Script_Host_Icon.png",
            width: 500,
            height: 350,
            content: content
        });
        playSound('open');
        
        // Simulate file operations
        setTimeout(() => {
            const log = iloveWindow.querySelector('#iloveyou-log');
            const actions = [
                { text: 'Címjegyzék beolvasása...', delay: 500 },
                { text: '25 címzett találva', delay: 800 },
                { text: 'Levelek küldése...', delay: 1000 },
                { text: '→ friend1@example.com - Elküldve ✓', delay: 1200 },
                { text: '→ colleague@work.com - Elküldve ✓', delay: 1400 },
                { text: '→ family@home.com - Elküldve ✓', delay: 1600 },
                { text: '', delay: 1800 },
                { text: 'Fájlok keresése...', delay: 2000 },
                { text: 'Megtalálva: document.txt', delay: 2200 },
                { text: 'Megtalálva: photo.jpg', delay: 2400 },
                { text: 'Megtalálva: music.mp3', delay: 2600 },
                { text: '', delay: 2800 },
                { text: '💕 Szkript végrehajtva sikeresen! 💕', delay: 3000, color: '#FF1493' },
                { text: 'Összes művelet befejezve.', delay: 3200 }
            ];
            
            actions.forEach(action => {
                setTimeout(() => {
                    if (log) {
                        const line = document.createElement('div');
                        line.style.color = action.color || '#00FF00';
                        line.style.marginBottom = '3px';
                        line.textContent = action.text;
                        log.appendChild(line);
                        log.scrollTop = log.scrollHeight;
                        if (action.text) playSound('click');
                    }
                }, action.delay);
            });
            
            // Serious effect: Create fake "file overwrite" notifications
            setTimeout(() => {
                playSound('error');
                const files = ['My Documents\\document.txt', 'My Pictures\\photo.jpg', 'My Music\\song.mp3'];
                let fileIndex = 0;
                const fileInterval = setInterval(() => {
                    if (fileIndex < files.length) {
                        showMessageBox({
                            title: 'ILOVEYOU Worm',
                            message: `Fájl felülírva:
${files[fileIndex]}

→ ${files[fileIndex]}.vbs

⚠️ (Szimuláció - nincs valós fájlvesztés)`,
                            icon: 'warning',
                            buttons: ['OK']
                        });
                        fileIndex++;
                    } else {
                        clearInterval(fileInterval);
                    }
                }, 1500);
            }, 3500);
        }, 500);
    }
    
    // Anna Kournikova Worm - Celebrity themed
    function triggerAnnaKournikova() {
        playSound('error');
        
        // First show the "image" being opened
        showMessageBox({
            title: 'Windows Képnézegető',
            message: 'Kép betöltése... AnnaKournikova.jpg',
            icon: 'info',
            buttons: ['OK'],
            callback: () => {
                // Then show it's actually a VBS script
                const content = `
                    <div style="display: flex; flex-direction: column; height: 100%; background-color: #FFE4E1;">
                        <div style="background-color: #FF69B4; color: white; padding: 8px; font-weight: bold; text-align: center;">
                            ⚠️ VBScript futtatása ⚠️
                        </div>
                        <div style="flex-grow: 1; padding: 20px; display: flex; flex-direction: column; justify-content: center; align-items: center;">
                            <img src="https://win98icons.alexmeub.com/icons/png/camera_2-0.png" style="width: 64px; height: 64px; margin-bottom: 20px;">
                            <h2 style="color: #8B0000; font-family: Arial, sans-serif; margin: 10px 0;">AnnaKournikova.jpg.vbs</h2>
                            <p style="color: #333; margin: 10px 0; font-size: 14px;">Here is the file with Anna Kournikova!</p>
                            <div id="anna-status" style="margin-top: 20px; padding: 10px; background-color: white; border: 2px solid #FF69B4; width: 80%; font-family: 'Courier New', monospace; font-size: 11px; min-height: 100px; overflow-y: auto;">
                                <div style="color: #FF1493; font-weight: bold;">Szkript inicializálása...</div>
                            </div>
                            <p style="color: #666; font-size: 11px; margin-top: 20px;">⚠️ Szimuláció - eredeti 2001-es féreg (Jan de Wit által készítve)</p>
                        </div>
                    </div>
                `;
                const annaWindow = createWindow({
                    title: "AnnaKournikova.jpg.vbs - Windows Script Host",
                    icon: "https://upload.wikimedia.org/wikipedia/en/0/0a/Windows_Script_Host_Icon.png",
                    width: 450,
                    height: 400,
                    content: content
                });
                
                // Simulate worm actions
                setTimeout(() => {
                    const status = annaWindow.querySelector('#anna-status');
                    const messages = [
                        { text: 'Outlook kapcsolat létrehozása...', delay: 500 },
                        { text: 'Címjegyzék olvasása...', delay: 1000 },
                        { text: 'Címzettek: 15 fő', delay: 1500 },
                        { text: '', delay: 1700 },
                        { text: 'Email küldése:', delay: 2000, color: '#FF1493' },
                        { text: '  → sport.fan@example.com', delay: 2200 },
                        { text: '  → tennis.lover@example.com', delay: 2400 },
                        { text: '  → friend@example.com', delay: 2600 },
                        { text: '', delay: 2800 },
                        { text: '✓ Művelet befejezve!', delay: 3000, color: '#008000' },
                        { text: 'Szkript leállítva.', delay: 3200 }
                    ];
                    
                    messages.forEach(msg => {
                        setTimeout(() => {
                            if (status) {
                                const line = document.createElement('div');
                                line.style.color = msg.color || '#000';
                                line.style.marginBottom = '2px';
                                line.textContent = msg.text;
                                status.appendChild(line);
                                status.scrollTop = status.scrollHeight;
                                if (msg.text && !msg.text.startsWith(' ')) playSound('click');
                            }
                        }, msg.delay);
                    });
                }, 300);
            }
        });
    }
    
    // CIH / Chernobyl Virus - Most destructive virus of 1998
    function triggerCIH() {
        playSound('error');
        const content = `
            <div style="display: flex; flex-direction: column; height: 100%; background-color: #000000; color: #FF0000; font-family: 'Courier New', monospace;">
                <div style="padding: 10px; border-bottom: 2px solid #FF0000;">
                    <div style="font-size: 16px; font-weight: bold; color: #FFFF00; text-align: center;">☢️ CIH / CHERNOBYL VIRUS ☢️</div>
                    <div style="font-size: 10px; color: #FF6666; text-align: center; margin-top: 4px;">Aktiválás dátuma: 1998. április 26. (Csernobil katasztrófa évfordulója)</div>
                </div>
                <div id="cih-log" style="flex-grow: 1; overflow-y: auto; padding: 10px; font-size: 11px;"></div>
                <div style="padding: 10px; border-top: 2px solid #FF0000; font-size: 10px; text-align: center; color: #666;">
                    ⚠️ Szimuláció - Chen Ing-hau által készítve 1998-ban
                </div>
            </div>
        `;
        const cihWindow = createWindow({
            title: 'CIH.EXE - Critical System Alert',
            icon: 'https://win98icons.alexmeub.com/icons/png/windows-0.png',
            width: 500,
            height: 350,
            content: content
        });
        
        setTimeout(() => {
            const log = cihWindow.querySelector('#cih-log');
            const actions = [
                { text: 'CIH v1.4 TTIT észlelve...', delay: 500, color: '#FF0000' },
                { text: 'Payload aktiválása...', delay: 1000, color: '#FF0000' },
                { text: '', delay: 1200 },
                { text: 'FIGYELEM: DESTRUKTÍV MŰVELETEK!', delay: 1500, color: '#FFFF00' },
                { text: '', delay: 1700 },
                { text: '[1] FLASH BIOS felülírása...', delay: 2000 },
                { text: '    Flash ROM cím: FFFFh:0000h', delay: 2300 },
                { text: '    Állapot: SZIMULÁCIÓ - NEM valódi', delay: 2600, color: '#00FF00' },
                { text: '', delay: 2800 },
                { text: '[2] Merevlemez MBR törlése...', delay: 3000 },
                { text: '    Szektor 0, fej 0, cilinder 0', delay: 3300 },
                { text: '    Állapot: SZIMULÁCIÓ - NEM valódi', delay: 3600, color: '#00FF00' },
                { text: '', delay: 3800 },
                { text: '[3] FAT táblák felülírása...', delay: 4000 },
                { text: '    C:\\ FAT16 fájlrendszer', delay: 4300 },
                { text: '    Állapot: SZIMULÁCIÓ - NEM valódi', delay: 4600, color: '#00FF00' },
                { text: '', delay: 4800 },
                { text: '☠️ Payload végrehajtva! ☠️', delay: 5000, color: '#FF0000' },
                { text: '', delay: 5200 },
                { text: 'Eredeti hatás: Az érintett gépek nem bootoltak újra.', delay: 5500, color: '#FF6666' },
                { text: 'Kár: 60 millió számítógép fertőzött világszerte!', delay: 5800, color: '#FF6666' }
            ];
            
            actions.forEach(action => {
                setTimeout(() => {
                    if (log) {
                        const line = document.createElement('div');
                        line.style.color = action.color || '#00FF00';
                        line.style.marginBottom = '3px';
                        line.textContent = action.text;
                        log.appendChild(line);
                        log.scrollTop = log.scrollHeight;
                        if (action.text) playSound('click');
                    }
                }, action.delay);
            });
            
            // Serious effect: Flash screen red and show critical warning
            setTimeout(() => {
                let flashCount = 0;
                const flashInterval = setInterval(() => {
                    document.body.style.backgroundColor = flashCount % 2 === 0 ? '#FF0000' : '#008080';
                    flashCount++;
                    if (flashCount >= 6) {
                        clearInterval(flashInterval);
                        document.body.style.backgroundColor = '#008080';
                        playSound('error');
                        showMessageBox({
                            title: 'CIH Virus - Kritikus Hiba',
                            message: 'A CIH vírus megpróbálta felülírni a BIOS-t! ⚠️ RENDSZER SEMMISÜLT ⚠️ (Szimuláció - a rendszer valójában biztonságos)',
                            icon: 'error',
                            buttons: ['OK']
                        });
                    }
                }, 300);
            }, 6000);
        }, 300);
    }
    
    // Pikachu Virus - Cute but annoying
    function triggerPikachu() {
        const content = `
            <div style="display: flex; flex-direction: column; height: 100%; background: linear-gradient(135deg, #FFEB3B, #FFC107); justify-content: center; align-items: center; font-family: 'Comic Sans MS', cursive;">
                <div style="text-align: center; background-color: rgba(255,255,255,0.9); padding: 30px; border-radius: 15px; box-shadow: 0 4px 12px rgba(0,0,0,0.3);">
                    <div style="font-size: 64px; margin-bottom: 10px;">⚡🐭⚡</div>
                    <h1 style="color: #FF0000; font-size: 32px; margin: 10px 0; text-shadow: 2px 2px #FFEB3B;">Pikachu Virus!</h1>
                    <p style="color: #000; font-size: 18px; margin: 15px 0;">Pika Pika! 👋</p>
                    <p style="color: #666; font-size: 14px; margin: 10px 0;">Ez a vírus törli az elérési utat és fájlokat...</p>
                    <div id="pikachu-status" style="margin-top: 20px; padding: 15px; background-color: #FFF; border: 2px solid #FFC107; font-family: 'Courier New', monospace; font-size: 11px; text-align: left; max-height: 150px; overflow-y: auto;"></div>
                    <p style="color: #999; font-size: 10px; margin-top: 15px;">⚠️ Szimuláció - 2000-es évek elején terjedt</p>
                </div>
            </div>
        `;
        const pikachuWindow = createWindow({
            title: 'Pikachu.exe',
            icon: 'https://win98icons.alexmeub.com/icons/png/windows-0.png',
            width: 450,
            height: 450,
            content: content
        });
        playSound('ding');
        
        setTimeout(() => {
            const status = pikachuWindow.querySelector('#pikachu-status');
            const actions = [
                { text: 'Pikachu.exe futtatása...', delay: 500 },
                { text: 'Registry kulcsok módosítása...', delay: 1000 },
                { text: '', delay: 1200 },
                { text: 'Fájlok törlése:', delay: 1500, color: '#FF0000' },
                { text: '  - C:\\Windows\\System32\\*.dll', delay: 1800 },
                { text: '  - C:\\Program Files\\*.*', delay: 2100 },
                { text: '  - C:\\My Documents\\*.*', delay: 2400 },
                { text: '', delay: 2600 },
                { text: '⚡ Pika Pika! ⚡', delay: 2800, color: '#FFEB3B' },
                { text: '✓ Művelet befejezve!', delay: 3000, color: '#4CAF50' },
                { text: '', delay: 3200 },
                { text: '(Szimuláció - nincs valós törlés)', delay: 3400, color: '#666' }
            ];
            
            actions.forEach(action => {
                setTimeout(() => {
                    if (status) {
                        const line = document.createElement('div');
                        line.style.color = action.color || '#000';
                        line.style.marginBottom = '2px';
                        line.textContent = action.text;
                        status.appendChild(line);
                        status.scrollTop = status.scrollHeight;
                        if (action.text && !action.text.startsWith(' ')) playSound('click');
                    }
                }, action.delay);
            });
            
            // Serious effect: Create multiple annoying popups
            setTimeout(() => {
                let popupCount = 0;
                const popupInterval = setInterval(() => {
                    playSound('ding');
                    showMessageBox({
                        title: 'Pikachu says...',
                        message: `Pika Pika! ⚡🐭⚡

(Popup ${popupCount + 1}/5)`,
                        icon: 'info',
                        buttons: ['OK']
                    });
                    popupCount++;
                    if (popupCount >= 5) {
                        clearInterval(popupInterval);
                    }
                }, 1000);
            }, 3700);
        }, 300);
    }
    
    // Code Red Worm - IIS Server exploit (2001)
    function triggerCodeRed() {
        const content = `
            <div style="display: flex; flex-direction: column; height: 100%; background-color: #000; color: #FF0000; font-family: 'Courier New', monospace;">
                <div style="padding: 10px; background-color: #8B0000; color: white; font-weight: bold; text-align: center;">
                    CODE RED WORM - IIS EXPLOIT
                </div>
                <div id="codered-log" style="flex-grow: 1; overflow-y: auto; padding: 15px; font-size: 11px;"></div>
                <div style="padding: 8px; background-color: #1a1a1a; font-size: 10px; text-align: center; color: #888;">
                    Eredeti cél: Microsoft IIS szerver - 2001. július 13.
                </div>
            </div>
        `;
        const codeRedWindow = createWindow({
            title: 'CodeRed.exe - Network Worm',
            icon: 'https://win98icons.alexmeub.com/icons/png/conn_cloud.png',
            width: 550,
            height: 400,
            content: content
        });
        playSound('error');
        
        setTimeout(() => {
            const log = codeRedWindow.querySelector('#codered-log');
            const actions = [
                { text: '>>> CODE RED WORM ACTIVATED <<<', delay: 300, color: '#FF0000' },
                { text: '', delay: 500 },
                { text: '[PHASE 1] Scanning for IIS Servers...', delay: 800, color: '#00FF00' },
                { text: 'IP Range: 192.168.1.1 - 192.168.1.255', delay: 1100 },
                { text: 'Port: 80 (HTTP)', delay: 1400 },
                { text: 'Vulnerability: MS01-033 Buffer Overflow', delay: 1700 },
                { text: '', delay: 1900 },
                { text: 'Found targets:', delay: 2100, color: '#FFFF00' },
                { text: '  → 192.168.1.10 - IIS 5.0 [VULNERABLE]', delay: 2400 },
                { text: '  → 192.168.1.25 - IIS 5.0 [VULNERABLE]', delay: 2700 },
                { text: '  → 192.168.1.50 - IIS 4.0 [VULNERABLE]', delay: 3000 },
                { text: '', delay: 3200 },
                { text: '[PHASE 2] Exploiting servers...', delay: 3500, color: '#00FF00' },
                { text: 'Sending malicious HTTP request:', delay: 3800 },
                { text: 'GET /default.ida?NNNNNNNNN...', delay: 4100, color: '#FF6666' },
                { text: '', delay: 4300 },
                { text: '[PHASE 3] Defacing websites...', delay: 4600, color: '#00FF00' },
                { text: 'Injecting: "Hacked By Chinese!"', delay: 4900, color: '#FF0000' },
                { text: '✓ index.html modified', delay: 5200 },
                { text: '', delay: 5400 },
                { text: '[PHASE 4] Propagating...', delay: 5700, color: '#00FF00' },
                { text: 'Generating 100 random IP addresses...', delay: 6000 },
                { text: 'Spawning 100 scanning threads...', delay: 6300 },
                { text: '', delay: 6500 },
                { text: '✓ CODE RED WORM ACTIVE!', delay: 6800, color: '#FF0000' },
                { text: 'Memory resident - Will scan forever...', delay: 7100 },
                { text: '', delay: 7300 },
                { text: 'Stat: 359,000 servers fertőzött 14 óra alatt!', delay: 7600, color: '#FFFF00' }
            ];
            
            actions.forEach(action => {
                setTimeout(() => {
                    if (log) {
                        const line = document.createElement('div');
                        line.style.color = action.color || '#00FF00';
                        line.style.marginBottom = '3px';
                        line.textContent = action.text;
                        log.appendChild(line);
                        log.scrollTop = log.scrollHeight;
                        if (action.text) playSound('click');
                    }
                }, action.delay);
            });
            
            // Serious effect: Show network scanning effect
            setTimeout(() => {
                playSound('error');
                showMessageBox({
                    title: 'Network Activity Detected',
                    message: 'A Code Red féreg aktív hálózati szkennelre indul! Hálózati forgalom: 100% CPU használat Küldött csomagok: 10,000+ ⚠️ Szimuláció - nincs valós hálózati tevékenység',
                    icon: 'warning',
                    buttons: ['OK']
                });
            }, 8000);
        }, 300);
    }
    
    // Back Orifice - Remote Administration Tool (1998)
    function triggerBackOrifice() {
        const content = `
            <div style="display: flex; flex-direction: column; height: 100%; background: linear-gradient(180deg, #1a1a1a, #000); color: #00FF00; font-family: 'Courier New', monospace;">
                <div style="padding: 10px; background-color: #000; border-bottom: 2px solid #00FF00;">
                    <div style="font-size: 16px; font-weight: bold; color: #00FF00; text-align: center;">💀 BACK ORIFICE 2000 💀</div>
                    <div style="font-size: 10px; color: #00DD00; text-align: center; margin-top: 4px;">Remote Administration Tool - Cult of the Dead Cow (cDc)</div>
                </div>
                <div id="bo-log" style="flex-grow: 1; overflow-y: auto; padding: 15px; font-size: 11px;"></div>
                <div style="padding: 8px; background-color: #000; border-top: 2px solid #00FF00; font-size: 10px; text-align: center; color: #00DD00;">
                    Released: DefCon 6 - 1998 | Port: 31337
                </div>
            </div>
        `;
        const boWindow = createWindow({
            title: 'BO2K.EXE - Back Orifice Server',
            icon: 'https://win98icons.alexmeub.com/icons/png/windows-0.png',
            width: 520,
            height: 380,
            content: content
        });
        playSound('error');
        
        setTimeout(() => {
            const log = boWindow.querySelector('#bo-log');
            const actions = [
                { text: '>>> BACK ORIFICE 2000 INITIALIZING <<<', delay: 300, color: '#00FF00' },
                { text: '', delay: 500 },
                { text: '[SYSTEM] Loading encryption module...', delay: 800 },
                { text: '[SYSTEM] Encryption: DES enabled', delay: 1100 },
                { text: '', delay: 1300 },
                { text: '[NETWORK] Opening backdoor on port 31337...', delay: 1600, color: '#FFFF00' },
                { text: '[NETWORK] Socket bound successfully', delay: 1900 },
                { text: '[NETWORK] Listening for connections...', delay: 2200 },
                { text: '', delay: 2400 },
                { text: '[STEALTH] Hiding from task list...', delay: 2700 },
                { text: '[STEALTH] Process name changed to: EXPLORER.EXE', delay: 3000 },
                { text: '[STEALTH] Registry keys modified', delay: 3300 },
                { text: '', delay: 3500 },
                { text: '[PLUGINS] Loading available plugins:', delay: 3800, color: '#00FFFF' },
                { text: '  ✓ File Manager', delay: 4100 },
                { text: '  ✓ Registry Editor', delay: 4400 },
                { text: '  ✓ Process Control', delay: 4700 },
                { text: '  ✓ Keylogger', delay: 5000 },
                { text: '  ✓ Screen Capture', delay: 5300 },
                { text: '  ✓ Audio Capture', delay: 5600 },
                { text: '', delay: 5800 },
                { text: '🔓 BACKDOOR ACTIVE - Waiting for remote commands...', delay: 6100, color: '#00FF00' },
                { text: '', delay: 6300 },
                { text: '(Szimuláció - nincs valós backdoor)', delay: 6600, color: '#666' }
            ];
            
            actions.forEach(action => {
                setTimeout(() => {
                    if (log) {
                        const line = document.createElement('div');
                        line.style.color = action.color || '#00FF00';
                        line.style.marginBottom = '3px';
                        line.textContent = action.text;
                        log.appendChild(line);
                        log.scrollTop = log.scrollHeight;
                        if (action.text) playSound('click');
                    }
                }, action.delay);
            });
            
            // Serious effect: Show fake remote connection attempt
            setTimeout(() => {
                playSound('ding');
                showMessageBox({
                    title: 'Back Orifice - Remote Connection',
                    message: 'Új kapcsolat érzékelve! Távoli IP: 192.168.1.100 Port: 31337 ⚠️ Szimuláció - nincs valós kapcsolat',
                    icon: 'info',
                    buttons: ['OK']
                });
            }, 7000);
        }, 300);
    }
    
    // NetBus - Remote Administration Trojan (1998)
    function triggerNetBus() {
        const content = `
            <div style="display: flex; flex-direction: column; height: 100%; background-color: #000080; color: #FFFFFF; font-family: Arial, sans-serif;">
                <div style="padding: 10px; background-color: #000050; border-bottom: 2px solid #0000FF;">
                    <div style="font-size: 18px; font-weight: bold; text-align: center;">🚌 NetBus Pro 2.0 🚌</div>
                    <div style="font-size: 10px; text-align: center; margin-top: 4px; color: #CCCCFF;">Remote Administration Tool</div>
                </div>
                <div id="netbus-log" style="flex-grow: 1; overflow-y: auto; padding: 15px; font-size: 11px; background-color: #000040;"></div>
                <div style="padding: 8px; background-color: #000050; border-top: 2px solid #0000FF; font-size: 10px; text-align: center;">
                    Default Port: 12345 | Version: 2.0 Pro
                </div>
            </div>
        `;
        const netbusWindow = createWindow({
            title: 'NetBus.exe - Server Active',
            icon: 'https://win98icons.alexmeub.com/icons/png/conn_cloud.png',
            width: 480,
            height: 360,
            content: content
        });
        playSound('ding');
        
        setTimeout(() => {
            const log = netbusWindow.querySelector('#netbus-log');
            const actions = [
                { text: 'NetBus Pro 2.0 - Server módban indul', delay: 400, color: '#FFFF00' },
                { text: '', delay: 600 },
                { text: '→ Port megnyitása: 12345', delay: 900 },
                { text: '→ Jelszó védelem: NINCS', delay: 1200, color: '#FF6666' },
                { text: '', delay: 1400 },
                { text: 'Szolgáltatások betöltése:', delay: 1700, color: '#00FFFF' },
                { text: '  [OK] Távoli fájlkezelés', delay: 2000 },
                { text: '  [OK] Képernyőfotó', delay: 2300 },
                { text: '  [OK] Egér/Billentyűzet vezérlés', delay: 2600 },
                { text: '  [OK] CD-ROM nyitás/zárás', delay: 2900 },
                { text: '  [OK] Üzenetküldés', delay: 3200 },
                { text: '  [OK] Hanglejátszás', delay: 3500 },
                { text: '  [OK] Program indítás', delay: 3800 },
                { text: '', delay: 4000 },
                { text: '✓ NetBus szerver aktív!', delay: 4300, color: '#00FF00' },
                { text: 'Várakozás kliens kapcsolatra...', delay: 4600 },
                { text: '', delay: 4800 },
                { text: 'Tipp: A NetBus Pro teljesen láthatatlan!', delay: 5100, color: '#FFFF00' },
                { text: '', delay: 5300 },
                { text: '(Ez csak szimuláció)', delay: 5600, color: '#888' }
            ];
            
            actions.forEach(action => {
                setTimeout(() => {
                    if (log) {
                        const line = document.createElement('div');
                        line.style.color = action.color || '#FFFFFF';
                        line.style.marginBottom = '3px';
                        line.textContent = action.text;
                        log.appendChild(line);
                        log.scrollTop = log.scrollHeight;
                        if (action.text && !action.text.startsWith(' ')) playSound('click');
                    }
                }, action.delay);
            });
            
            // Serious effect: Open CD-ROM tray simulation
            setTimeout(() => {
                playSound('error');
                showMessageBox({
                    title: 'NetBus - CD-ROM vezérlés',
                    message: 'A CD-ROM tálca megnyílt! (Távoli vezérlés szimuláció) ⚠️ Valódi NetBus esetén ez tényleg megtörténne!',
                    icon: 'warning',
                    buttons: ['OK']
                });
            }, 6000);
        }, 300);
    }
    
    // ExploreZip - Email Worm (1999)
    function triggerExploreZip() {
        const content = `
            <div style="display: flex; flex-direction: column; height: 100%; background-color: #FFFAF0; color: #000; font-family: Arial, sans-serif;">
                <div style="padding: 10px; background-color: #FFA500; border-bottom: 2px solid #FF8C00;">
                    <div style="font-size: 16px; font-weight: bold; text-align: center; color: #FFF;">📦 EXPLORE.ZIP 📦</div>
                    <div style="font-size: 10px; text-align: center; margin-top: 4px; color: #FFE4B5;">Email Worm - Destruktív fájltörlő</div>
                </div>
                <div id="explorezip-log" style="flex-grow: 1; overflow-y: auto; padding: 15px; font-size: 11px; background-color: #FFF;"></div>
                <div style="padding: 8px; background-color: #FFA500; border-top: 2px solid #FF8C00; font-size: 10px; text-align: center; color: #FFF;">
                    1999 | Outlook/Exchange ferőtző | Fájlkiterjesztések: DOC, XLS, PPT
                </div>
            </div>
        `;
        const ezWindow = createWindow({
            title: 'zipped_files.exe',
            icon: 'https://win98icons.alexmeub.com/icons/png/directory_closed-0.png',
            width: 500,
            height: 380,
            content: content
        });
        playSound('ding');
        
        setTimeout(() => {
            const log = ezWindow.querySelector('#explorezip-log');
            const actions = [
                { text: 'ExploreZip inicializálás...', delay: 400, color: '#FF8C00' },
                { text: '', delay: 600 },
                { text: '[1] Microsoft Outlook elérése...', delay: 900, color: '#0066CC' },
                { text: '    ✓ MAPI kapcsolat létrehozva', delay: 1200 },
                { text: '    ✓ Címjegyzék beolvasása', delay: 1500 },
                { text: '    Talált címek: 48', delay: 1800 },
                { text: '', delay: 2000 },
                { text: '[2] Email küldés minden címre...', delay: 2300, color: '#0066CC' },
                { text: '    Tárgy: "Nézd meg ezt!"', delay: 2600 },
                { text: '    Melléklet: zipped_files.exe', delay: 2900 },
                { text: '    Küldés folyamatban... 10/48', delay: 3200 },
                { text: '', delay: 3400 },
                { text: '[3] Fájlkeresés a háttértárban...', delay: 3700, color: '#FF0000' },
                { text: '    Keresett típusok: *.DOC, *.XLS, *.PPT', delay: 4000 },
                { text: '', delay: 4200 },
                { text: '    Talált fájlok:', delay: 4500, color: '#FF6666' },
                { text: '      C:\\My Documents\\jelentés.doc', delay: 4800 },
                { text: '      C:\\My Documents\\költségvetés.xls', delay: 5100 },
                { text: '      C:\\My Documents\\bemutató.ppt', delay: 5400 },
                { text: '', delay: 5600 },
                { text: '⚠️ FIGYELEM: Fájlok felülírása 0 byte-ra!', delay: 5900, color: '#FF0000' },
                { text: '', delay: 6100 },
                { text: '(Szimuláció - fájlok biztonságban)', delay: 6400, color: '#666' }
            ];
            
            actions.forEach(action => {
                setTimeout(() => {
                    if (log) {
                        const line = document.createElement('div');
                        line.style.color = action.color || '#000';
                        line.style.marginBottom = '3px';
                        line.textContent = action.text;
                        log.appendChild(line);
                        log.scrollTop = log.scrollHeight;
                        if (action.text && !action.text.startsWith(' ')) playSound('click');
                    }
                }, action.delay);
            });
            
            // Serious effect: Show fake file destruction warnings
            setTimeout(() => {
                playSound('error');
                let fileNum = 0;
                const files = ['jelentés.doc', 'költségvetés.xls', 'bemutató.ppt'];
                const fileInterval = setInterval(() => {
                    showMessageBox({
                        title: 'ExploreZip - Fájl megsemmisítve',
                        message: `A következő fájl felülírva 0 byte-tal: C:\\My Documents\\${files[fileNum]} ⚠️ Szimuláció - fájl biztonságban`,
                        icon: 'warning',
                        buttons: ['OK']
                    });
                    fileNum++;
                    if (fileNum >= 3) clearInterval(fileInterval);
                }, 800);
            }, 7000);
        }, 300);
    }
    
    // Triplicate - Email Worm (2000)
    function triggerTriplicate() {
        const content = `
            <div style="display: flex; flex-direction: column; height: 100%; background: linear-gradient(135deg, #8B008B, #4B0082); color: #FFF; font-family: 'Courier New', monospace;">
                <div style="padding: 10px; border-bottom: 2px solid #FF00FF;">
                    <div style="font-size: 16px; font-weight: bold; text-align: center; color: #FF00FF;">⚡ TRIPLICATE WORM ⚡</div>
                    <div style="font-size: 10px; text-align: center; margin-top: 4px; color: #DDA0DD;">Email Propagation Engine - 2000</div>
                </div>
                <div id="triplicate-log" style="flex-grow: 1; overflow-y: auto; padding: 15px; font-size: 11px;"></div>
                <div style="padding: 8px; border-top: 2px solid #FF00FF; font-size: 10px; text-align: center; color: #DDA0DD;">
                    Method: HTML Email | Outlook Express vulnerable
                </div>
            </div>
        `;
        const triplicateWindow = createWindow({
            title: 'Triplicate.vbs',
            icon: 'https://upload.wikimedia.org/wikipedia/en/0/0a/Windows_Script_Host_Icon.png',
            width: 480,
            height: 350,
            content: content
        });
        playSound('ding');
        
        setTimeout(() => {
            const log = triplicateWindow.querySelector('#triplicate-log');
            const actions = [
                { text: '=== TRIPLICATE WORM AKTIVÁLVA ===', delay: 400, color: '#FF00FF' },
                { text: '', delay: 600 },
                { text: 'VBScript motor inicializálás...', delay: 900 },
                { text: '✓ Windows Scripting Host OK', delay: 1200 },
                { text: '', delay: 1400 },
                { text: 'Outlook címjegyzék lekérdezés...', delay: 1700, color: '#00FFFF' },
                { text: 'Címek száma: 32', delay: 2000 },
                { text: '', delay: 2200 },
                { text: 'Email sablon létrehozása:', delay: 2500, color: '#FFFF00' },
                { text: '  Tárgy: "Fun stuff!"', delay: 2800 },
                { text: '  Formátum: HTML', delay: 3100 },
                { text: '  Tartalom: Beágyazott script', delay: 3400 },
                { text: '', delay: 3600 },
                { text: 'Email küldés minden címre...', delay: 3900, color: '#00FF00' },
                { text: '  → user1@company.com', delay: 4200 },
                { text: '  → user2@company.com', delay: 4500 },
                { text: '  → user3@company.com', delay: 4800 },
                { text: '  ... (29 további cím)', delay: 5100 },
                { text: '', delay: 5300 },
                { text: '✓ Propagáció sikeres!', delay: 5600, color: '#00FF00' },
                { text: 'Triplicate továbbterjedt.', delay: 5900 },
                { text: '', delay: 6100 },
                { text: '(Szimuláció - nincs valós email)', delay: 6400, color: '#888' }
            ];
            
            actions.forEach(action => {
                setTimeout(() => {
                    if (log) {
                        const line = document.createElement('div');
                        line.style.color = action.color || '#FFFFFF';
                        line.style.marginBottom = '3px';
                        line.textContent = action.text;
                        log.appendChild(line);
                        log.scrollTop = log.scrollHeight;
                        if (action.text && !action.text.startsWith(' ')) playSound('click');
                    }
                }, action.delay);
            });
            
            // Serious effect: Show propagation success
            setTimeout(() => {
                playSound('ding');
                showMessageBox({
                    title: 'Triplicate - Propagáció',
                    message: 'A Triplicate féreg 32 emailt küldött ki! Minden címzett megkapja a fertőzött HTML emailt. ⚠️ Szimuláció - nincs valós terjedés',
                    icon: 'info',
                    buttons: ['OK']
                });
            }, 6800);
        }, 300);
    }
    
    // CTX - Stealth Virus (1999)
    function triggerCTX() {
        const content = `
            <div style="display: flex; flex-direction: column; height: 100%; background: linear-gradient(180deg, #2F4F4F, #000); color: #32CD32; font-family: 'Courier New', monospace;">
                <div style="padding: 10px; background-color: #000; border-bottom: 2px solid #32CD32;">
                    <div style="font-size: 16px; font-weight: bold; color: #32CD32; text-align: center;">🦠 CTX VIRUS 🦠</div>
                    <div style="font-size: 10px; color: #90EE90; text-align: center; margin-top: 4px;">Stealth Polymorphic Virus - 1999</div>
                </div>
                <div id="ctx-log" style="flex-grow: 1; overflow-y: auto; padding: 15px; font-size: 11px;"></div>
                <div style="padding: 8px; background-color: #000; border-top: 2px solid #32CD32; font-size: 10px; text-align: center; color: #90EE90;">
                    Target: .EXE files | Stealth + Polymorphic
                </div>
            </div>
        `;
        const ctxWindow = createWindow({
            title: 'CTX Virus - System Infection',
            icon: 'https://win98icons.alexmeub.com/icons/png/virus-0.png',
            width: 500,
            height: 370,
            content: content
        });
        playSound('error');
        
        setTimeout(() => {
            const log = ctxWindow.querySelector('#ctx-log');
            const actions = [
                { text: '>>> CTX POLYMORPHIC VIRUS AKTIVÁLVA <<<', delay: 300, color: '#32CD32' },
                { text: '', delay: 500 },
                { text: '[PHASE 1] Memory rezidensé válás...', delay: 800, color: '#FFD700' },
                { text: '✓ Betöltve: High Memory Area', delay: 1100 },
                { text: '✓ INT 21h hooked', delay: 1400 },
                { text: '', delay: 1600 },
                { text: '[PHASE 2] Stealth mód aktiválás...', delay: 1900, color: '#FFD700' },
                { text: '✓ File size rejtés', delay: 2200 },
                { text: '✓ Dir listing módosítás', delay: 2500 },
                { text: '✓ Anti-debugging aktív', delay: 2800 },
                { text: '', delay: 3000 },
                { text: '[PHASE 3] .EXE fájlok keresése...', delay: 3300, color: '#FFD700' },
                { text: 'Talált fájlok:', delay: 3600, color: '#FFFF00' },
                { text: '  → C:\\Windows\
OTEPAD.EXE', delay: 3900 },
                { text: '  → C:\\Windows\\CALC.EXE', delay: 4200 },
                { text: '  → C:\\Windows\\EXPLORER.EXE', delay: 4500 },
                { text: '', delay: 4700 },
                { text: '[PHASE 4] Polimorf kód generálás...', delay: 5000, color: '#FFD700' },
                { text: 'Encryption engine: XOR + ADD változó kulccsal', delay: 5300 },
                { text: 'Decryptor generálva: egyedi minden fertőzéshez', delay: 5600 },
                { text: '', delay: 5800 },
                { text: '[PHASE 5] Fájlok fertőzése...', delay: 6100, color: '#FF0000' },
                { text: '✓ NOTEPAD.EXE fertőzve (Stealth mode)', delay: 6400, color: '#FF6666' },
                { text: '✓ CALC.EXE fertőzve (Stealth mode)', delay: 6700, color: '#FF6666' },
                { text: '✓ EXPLORER.EXE fertőzve (Stealth mode)', delay: 7000, color: '#FF6666' },
                { text: '', delay: 7200 },
                { text: '🦠 CTX VIRUS AKTÍV! Minden .EXE fertőzve lesz!', delay: 7500, color: '#32CD32' },
                { text: '', delay: 7700 },
                { text: '(Szimuláció - fájlok biztonságban)', delay: 8000, color: '#666' }
            ];
            
            actions.forEach(action => {
                setTimeout(() => {
                    if (log) {
                        const line = document.createElement('div');
                        line.style.color = action.color || '#32CD32';
                        line.style.marginBottom = '3px';
                        line.textContent = action.text;
                        log.appendChild(line);
                        log.scrollTop = log.scrollHeight;
                        if (action.text) playSound('click');
                    }
                }, action.delay);
            });
            
            // Serious effect: Show stealth warning
            setTimeout(() => {
                playSound('error');
                showMessageBox({
                    title: 'CTX Virus - Stealth Fertőzés',
                    message: 'A CTX vírus polimorf kóddal fertőzi a .EXE fájlokat! Stealth technika: A vírus elrejti saját méretét és módosításait. Nehéz észrevenni hagyományos vírusírtókkal! ⚠️ Szimuláció - rendszer biztonságos',
                    icon: 'warning',
                    buttons: ['OK']
                });
            }, 8500);
        }, 300);
    }
    
    // Sub7 (SubSeven) - Remote Administration Trojan (1999)
    function triggerSub7() {
        const content = `
            <div style="display: flex; flex-direction: column; height: 100%; background-color: #000; color: #FF0000; font-family: Arial, sans-serif;">
                <div style="padding: 10px; background: linear-gradient(90deg, #8B0000, #FF0000); border-bottom: 2px solid #FF0000;">
                    <div style="font-size: 18px; font-weight: bold; text-align: center; color: #FFF; text-shadow: 2px 2px #000;">👁️ SubSeven 2.2 👁️</div>
                    <div style="font-size: 10px; text-align: center; margin-top: 4px; color: #FFB6C1;">The Ultimate Remote Control Tool</div>
                </div>
                <div id="sub7-log" style="flex-grow: 1; overflow-y: auto; padding: 15px; font-size: 11px; background-color: #1a0000;"></div>
                <div style="padding: 8px; background: linear-gradient(90deg, #8B0000, #FF0000); border-top: 2px solid #FF0000; font-size: 10px; text-align: center; color: #FFF;">
                    Default Port: 27374 | Server Version: 2.2 Gold
                </div>
            </div>
        `;
        const sub7Window = createWindow({
            title: 'SubSeven.exe - Server Running',
            icon: 'https://win98icons.alexmeub.com/icons/png/windows-0.png',
            width: 520,
            height: 400,
            content: content
        });
        playSound('ding');
        
        setTimeout(() => {
            const log = sub7Window.querySelector('#sub7-log');
            const actions = [
                { text: '=== SubSeven 2.2 Gold Edition ===', delay: 400, color: '#FF0000' },
                { text: 'Developed by: Mobman', delay: 700, color: '#FF6666' },
                { text: '', delay: 900 },
                { text: '[INIT] Server indítás...', delay: 1200, color: '#FFD700' },
                { text: '✓ Port megnyitva: 27374 (TCP)', delay: 1500 },
                { text: '✓ Alternatív port: 27373', delay: 1800 },
                { text: '✓ ICQ notify: KIKAPCSOLVA', delay: 2100 },
                { text: '', delay: 2300 },
                { text: '[FEATURES] Funkciók betöltése...', delay: 2600, color: '#00FF00' },
                { text: '  [OK] Távoli fájlkezelő', delay: 2900 },
                { text: '  [OK] Registry szerkesztő', delay: 3200 },
                { text: '  [OK] Képernyőfotó készítés', delay: 3500 },
                { text: '  [OK] Keylogger', delay: 3800 },
                { text: '  [OK] Webcam vezérlés', delay: 4100 },
                { text: '  [OK] Hangfelvétel (mikrofonról)', delay: 4400 },
                { text: '  [OK] Jelszó lopás (cached passwords)', delay: 4700 },
                { text: '  [OK] Port redirect', delay: 5000 },
                { text: '  [OK] Matrix mode (fun)', delay: 5300, color: '#00FF00' },
                { text: '  [OK] Mouse/Keyboard control', delay: 5600 },
                { text: '  [OK] Chat funkció', delay: 5900 },
                { text: '', delay: 6100 },
                { text: '[STEALTH] Rejtőzködés aktiválás...', delay: 6400, color: '#FFFF00' },
                { text: '✓ Process name: KERNEL32.DLL (fake)', delay: 6700 },
                { text: '✓ Task Manager elrejtés', delay: 7000 },
                { text: '✓ Registry Auto-start hozzáadva', delay: 7300 },
                { text: '', delay: 7500 },
                { text: '👁️ SubSeven szerver aktív!', delay: 7800, color: '#FF0000' },
                { text: 'Várakozás kliens kapcsolatra...', delay: 8100, color: '#FF6666' },
                { text: '', delay: 8300 },
                { text: '(Szimuláció - nincs valós backdoor)', delay: 8600, color: '#888' }
            ];
            
            actions.forEach(action => {
                setTimeout(() => {
                    if (log) {
                        const line = document.createElement('div');
                        line.style.color = action.color || '#FFFFFF';
                        line.style.marginBottom = '3px';
                        line.textContent = action.text;
                        log.appendChild(line);
                        log.scrollTop = log.scrollHeight;
                        if (action.text && !action.text.startsWith(' ')) playSound('click');
                    }
                }, action.delay);
            });
            
            // Serious effect: Show Matrix mode and connection attempt
            setTimeout(() => {
                playSound('ding');
                showMessageBox({
                    title: 'SubSeven - Kapcsolat érzékelve',
                    message: 'Távoli kliens csatlakozási kísérlet! IP: 192.168.1.50 Port: 27374 A támadó teljes hozzáféréssel rendelkezne: - Fájlok  - Képernyő - Kamera - Jelszavak- Kamera ⚠️ Szimuláció - biztonságos',
                    icon: 'warning',
                    buttons: ['OK']
                });
            }, 9000);
        }, 300);
    }
    
    // MSN Hotmail - Email with malware attachments
    function openHotmail() {
        dialUpConnection(() => {
        const emails = [
            { 
                from: 'Barát János', 
                subject: 'Boldog új évet! 1999', 
                date: '1999.01.05', 
                size: '45 KB',
                body: 'Kedves Barátom! Boldog új évet kívánok! Csatolva küldöm neked ezt a szép tűzijáték programot. Üdvözlettel, János',
                attachment: { name: 'Happy99.exe', action: 'triggerHappy99()' }
            },
            { 
                from: 'Kovács Anna', 
                subject: 'Fontos dokumentum', 
                date: '1999.03.26', 
                size: '28 KB',
                body: 'Szia! Elküldöm azt a dokumentumot, amit kértél. Kérlek, ne mutasd meg senkinek ;-) Üdv, Anna',
                attachment: { name: 'Melissa.doc', action: 'triggerMelissa()' }
            },
            { 
                from: 'Ismeretlen', 
                subject: 'Szerelmes levél neked', 
                date: '2000.05.04', 
                size: '12 KB',
                body: 'Kedvesem! Kérlek, nézd meg a csatolt szerelmes levelet tőlem.Szeretettel',
                attachment: { name: 'LOVE-LETTER-FOR-YOU.TXT.vbs', action: 'triggerILoveYou()' }
            },
            { 
                from: 'Sport Magazin', 
                subject: 'Anna Kournikova képek!', 
                date: '2001.02.12', 
                size: '156 KB',
                body: 'Exkluzív képek Anna Kournikovától! Nézd meg a csatolt fájlt a legújabb fotókért.',
                attachment: { name: 'AnnaKournikova.jpg.vbs', action: 'triggerAnnaKournikova()' }
            },
            { 
                from: 'Rendszerüzemeltető', 
                subject: 'BIOS Frissítés Elérhető', 
                date: '1998.04.26', 
                size: '89 KB',
                body: 'Fontos BIOS frissítés érhető el a rendszered számára! Telepítsd a csatolt fájlt a stabil működésért. Sys Admin',
                attachment: { name: 'CIH.EXE', action: 'triggerCIH()' }
            },
            { 
                from: 'Pokemon Fan Club', 
                subject: 'Pikachu Pokemon!', 
                date: '2000.06.28', 
                size: '32 KB',
                body: 'Szia Pokemon rajongó! Letölthető Pikachu képernyővédő! Pika Pika! Jó szórakozást!',
                attachment: { name: 'Pikachu.exe', action: 'triggerPikachu()' }
            },
            { 
                from: 'IT Security', 
                subject: 'Biztonsági riasztás - IIS szerver', 
                date: '2001.07.13', 
                size: '18 KB',
                body: 'Kritikus biztonsági rés az IIS szerverekben! Frissítsd a szervered mielőbb. Részletek a mellékletben.',
                attachment: { name: 'CodeRed.exe', action: 'triggerCodeRed()' }
            },
            { 
                from: 'Hacker Kultura', 
                subject: 'Távoli hozzáférés eszköz', 
                date: '1998.08.01', 
                size: '245 KB',
                body: 'Szia! Ezt a remek admin tool-t kell kipróbálnod. Távolról tudsz hozzáférni bármelyik PC-hez. DefCon-ról szereztem be. cDc',
                attachment: { name: 'BO2K.EXE', action: 'triggerBackOrifice()' }
            },
            { 
                from: 'Carl-Fredrik Neikter', 
                subject: 'NetBus Pro - Remote Admin', 
                date: '1998.03.15', 
                size: '178 KB',
                body: 'Try this cool remote administration tool! NetBus Pro 2.0 - The ultimate RAT Port: 12345 No password needed :)',
                attachment: { name: 'NetBus.exe', action: 'triggerNetBus()' }
            },
            { 
                from: 'IT Részleg', 
                subject: 'Fontos: tömörített dokumentumok', 
                date: '1999.06.06', 
                size: '89 KB',
                body: 'Csatoltam a kért dokumentumokat ZIP formátumban. Kérlek, nyisd meg és ellenőrizd! Üdv, IT Admin',
                attachment: { name: 'zipped_files.exe', action: 'triggerExploreZip()' }
            },
            { 
                from: 'Barát', 
                subject: 'Fun stuff!', 
                date: '2000.09.18', 
                size: '12 KB',
                body: 'Szia! Nézd meg ezt a vicces scriptet! :) HTML formátumban van. Barát',
                attachment: { name: 'Triplicate.vbs', action: 'triggerTriplicate()' }
            },
            { 
                from: 'Vx Underground', 
                subject: 'CTX polymorphic virus sample', 
                date: '1999.07.29', 
                size: '8 KB',
                body: 'Educational virus sample for research purposes. CTX is a stealth polymorphic virus from 1999. DO NOT execute on production systems!\n\nFor study only.',
                attachment: { name: 'CTX.COM', action: 'triggerCTX()' }
            },
            { 
                from: 'Mobman', 
                subject: 'SubSeven 2.2 Gold - RAT Tool', 
                date: '1999.03.22', 
                size: '312 KB',
                body: 'SubSeven 2.2 Gold Edition!\n\nThe most powerful remote admin tool.\n\nPort: 27374\nFeatures: Everything you need for remote control.\n\nEnjoy! - Mobman',
                attachment: { name: 'SubSeven.exe', action: 'triggerSub7()' }
            },
            { 
                from: 'Nagy Eszter', 
                subject: 'Családi fotók - nyaralás', 
                date: '1999.08.14', 
                size: '1.2 MB',
                body: 'Szia!\n\nCsatolva küldöm a nyaralásról készült fotókat. Sajnos csak low quality, mert a mailbox korlát miatt.\n\nRemélem tetszik!\nEszter',
                attachment: { name: 'photos.zip', action: 'playSound("ding"); showMessageBox({title:"Fotók", message:"A photos.zip fájl letöltve!\n\n12 fénykép található benne.", icon:"info", buttons:["OK"]});' }
            },
            { 
                from: 'Microsoft Download Center', 
                subject: 'DirectX 7.0 frissítés elérhető', 
                date: '1999.09.23', 
                size: '15.8 MB',
                body: 'A DirectX 7.0 már letölthető!\n\nÚj funkciók:\n- Jobb 3D grafika\n- DirectMusic támogatás\n- DirectPlay fejlesztések\n\nLátogass el a microsoft.com/directx oldalra!',
                attachment: { name: 'dx7_install.exe', action: 'playSound("ding"); showMessageBox({title:"DirectX 7.0", message:"DirectX 7.0 telepítő letöltve!\n\nMéret: 15.8 MB\n\nTelepítés szimuláció.", icon:"info", buttons:["OK"]});' }
            },
            { 
                from: 'Kollega Tamás', 
                subject: 'Q4 jelentés - Excel táblázat', 
                date: '1999.12.28', 
                size: '245 KB',
                body: 'Kedves Kollégák!\n\nCsatolva küldöm a Q4 pénzügyi jelentést Excel formátumban.\n\nKérlek, ellenőrizzétek és küldjétek vissza észrevételeitekkel.\n\nÜdv,\nTamás',
                attachment: { name: 'Q4_report.xls', action: 'playSound("open"); showMessageBox({title:"Excel fájl", message:"Q4_report.xls megnyitva!\n\nTáblázat: 8 munkalap\nAdatok: Bevétel, kiadás, profit\n\n(Szimuláció)", icon:"info", buttons:["OK"]});' }
            },
            { 
                from: 'Winamp Team', 
                subject: 'Winamp 2.91 megjelent!', 
                date: '2000.05.12', 
                size: '1.4 MB',
                body: 'A Winamp 2.91 elérhető!\n\nÚj vizualizációk és skin-ek.\n\nIt really whips the llama\'s ass!\n\nLetöltés: winamp.com',
                attachment: { name: 'winamp291.exe', action: 'playSound("ding"); showMessageBox({title:"Winamp", message:"Winamp 2.91 telepítő letöltve!\n\nA legjobb MP3 lejátszó!\n\n(Szimuláció)", icon:"info", buttons:["OK"]});' }
            },
            { 
                from: 'Adobe', 
                subject: 'Adobe Photoshop 5.5 trial verzió', 
                date: '1999.04.20', 
                size: '28 MB',
                body: 'Próbálja ki az Adobe Photoshop 5.5-öt 30 napig ingyen!\n\nProfesszionális képszerkesztés.\n\nwww.adobe.com/photoshop',
                attachment: { name: 'ps55trial.exe', action: 'playSound("ding"); showMessageBox({title:"Photoshop 5.5", message:"Adobe Photoshop 5.5 Trial letöltve!\n\n30 napos próbaverzió\nMéret: 28 MB\n\n(Szimuláció)", icon:"info", buttons:["OK"]});' }
            },
            { 
                from: 'ICQ', 
                subject: 'ICQ 2000b Build 3278', 
                date: '2000.02.08', 
                size: '2.1 MB',
                body: 'Az új ICQ 2000b verzió elérhető!\n\nÚj funkciók:\n- Jobb file transfer\n- SMS küldés\n- Hangüzenetek\n\nUh-oh! Letöltés: icq.com',
                attachment: { name: 'icq2000b.exe', action: 'playSound("ding"); showMessageBox({title:"ICQ 2000b", message:"ICQ 2000b telepítő letöltve!\n\nUh-oh! üzenet értesítés\n\n(Szimuláció)", icon:"info", buttons:["OK"]});' }
            },
            { 
                from: 'MSN Csapat', 
                subject: 'Üdvözlünk a Hotmail-ben!', 
                date: '1998.12.15', 
                size: '8 KB',
                body: 'Köszönjük, hogy a Hotmail szolgáltatást választottad!\n\nFiókod neve: felhasznalo@hotmail.com\nTárhelyed: 2 MB\n\nÜdvözlettel,\nAz MSN Hotmail Csapata',
                attachment: null
            },
            { 
                from: 'Péter', 
                subject: 'Holnapi találkozó', 
                date: '1999.11.22', 
                size: '5 KB',
                body: 'Szia!\n\nHolnap 15:00-kor találkozunk a szokott helyen?\n\nVárom válaszod,\nPéter',
                attachment: null
            },
            { 
                from: 'Windows Frissítés', 
                subject: 'Windows 98 frissítések elérhetők', 
                date: '1999.06.10', 
                size: '3 KB',
                body: 'Új biztonsági frissítések érhetők el a Windows 98-hoz.\n\nLátogass el a windows.microsoft.com oldalra a letöltéshez.',
                attachment: null
            }
        ];
        
        const content = `
            <div style="display: flex; flex-direction: column; height: 100%; background-color: white; font-family: Arial, sans-serif;">
                <!-- Header -->
                <div style="background-color: #0066CC; padding: 8px; display: flex; align-items: center; gap: 8px;">
                    <img src="https://win98icons.alexmeub.com/icons/png/msn3-0.png" style="width: 24px; height: 24px;">
                    <span style="color: white; font-size: 20px; font-weight: bold;">Hotmail</span>
                </div>
                
                <!-- Navigation Bar -->
                <div style="background-color: #0099FF; padding: 4px 8px; display: flex; gap: 12px; font-size: 12px;">
                    <span style="color: white; font-weight: bold; background-color: #0066CC; padding: 4px 8px;">MSN Kezdőlap</span>
                    <span style="color: white; padding: 4px 8px;">Hotmail</span>
                    <span style="color: white; padding: 4px 8px;">Keresés</span>
                    <span style="color: white; padding: 4px 8px;">Vásárlás</span>
                    <span style="color: white; padding: 4px 8px;">Pénzügyek</span>
                    <span style="color: white; padding: 4px 8px;">Emberek és Chat</span>
                </div>
                
                <!-- Toolbar -->
                <div style="background-color: #F0F0F0; padding: 4px 8px; border-bottom: 1px solid #CCC; display: flex; align-items: center; gap: 8px;">
                    <button class="btn" id="hotmail-compose-btn" style="font-size: 11px; padding: 4px 12px; background-color: #FFD700; font-weight: bold;">✉️ Új üzenet</button>
                    <button class="btn" id="hotmail-reply-btn" style="font-size: 11px; padding: 4px 12px;">↩️ Válasz</button>
                    <button class="btn" id="hotmail-forward-btn" style="font-size: 11px; padding: 4px 12px;">↪️ Továbbítás</button>
                    <button class="btn" id="hotmail-delete-btn" style="font-size: 11px; padding: 4px 12px; background-color: #FFB6C1;">🗑️ Törlés</button>
                    <div style="width: 1px; height: 20px; background-color: #CCC; margin: 0 8px;"></div>
                    <span style="font-size: 11px;">Keresés:</span>
                    <input type="text" id="hotmail-search" style="padding: 2px; font-size: 11px; width: 150px;" placeholder="Keresés..." />
                    <button class="btn" id="hotmail-search-btn" style="font-size: 11px; padding: 2px 8px;">🔍</button>
                    <span style="flex-grow: 1;"></span>
                    <span style="font-size: 11px; color: #0066CC;">📧 Beérkezett: ${emails.length}</span>
                </div>
                
                <!-- Main Content Area -->
                <div style="display: flex; flex-grow: 1; overflow: hidden;">
                    <!-- Sidebar -->
                    <div style="width: 180px; background-color: #E6F2FF; padding: 8px; border-right: 1px solid #CCC; overflow-y: auto;">
                        <div style="font-weight: bold; color: #0066CC; margin-bottom: 8px; font-size: 12px;">Küldés</div>
                        <div style="font-size: 11px; margin-bottom: 4px; color: #0066CC;">• Üdvözlőkártya</div>
                        <div style="font-size: 11px; margin-bottom: 4px; color: #0066CC;">• Képeslap</div>
                        <div style="font-weight: bold; color: #0066CC; margin: 12px 0 8px 0; font-size: 12px;">Kapcsolat</div>
                        <div style="font-size: 11px; margin-bottom: 4px; color: #0066CC;">• Messenger</div>
                        <div style="font-size: 11px; margin-bottom: 4px; color: #0066CC;">• Chat</div>
                        <div style="font-size: 11px; margin-bottom: 4px; color: #0066CC;">• Letöltések</div>
                        <div style="font-weight: bold; color: #0066CC; margin: 12px 0 8px 0; font-size: 12px;">INGYENES Hírlevelek</div>
                    </div>
                    
                    <!-- Email List -->
                    <div id="email-list-view" style="flex-grow: 1; overflow-y: auto; background-color: white;">
                        <div style="background-color: #0066CC; color: white; padding: 4px 8px; font-size: 12px; font-weight: bold;">Beérkezett üzenetek</div>
                        <table style="width: 100%; border-collapse: collapse; font-size: 11px;">
                            <thead>
                                <tr style="background-color: #C0C0C0; border-bottom: 1px solid #808080;">
                                    <th style="padding: 4px; text-align: left; width: 30px; color: #000;"></th>
                                    <th style="padding: 4px; text-align: left; width: 120px; color: #000; font-weight: bold;">Feladó</th>
                                    <th style="padding: 4px; text-align: left; color: #000; font-weight: bold;">Tárgy</th>
                                    <th style="padding: 4px; text-align: left; width: 100px; color: #000; font-weight: bold;">Dátum</th>
                                    <th style="padding: 4px; text-align: left; width: 60px; color: #000; font-weight: bold;">Méret</th>
                                </tr>
                            </thead>
                            <tbody id="email-rows">
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        `;
        const hotmailWindow = createWindow({
            title: "Hotmail - Microsoft Internet Explorer",
            icon: "https://win98icons.alexmeub.com/icons/png/mailbox_world-0.png",
            width: 700,
            height: 500,
            content: content
        });
        playSound('open');
        
        setTimeout(() => {
            const emailRows = hotmailWindow.querySelector('#email-rows');
            const emailListView = hotmailWindow.querySelector('#email-list-view');
            const composeBtn = hotmailWindow.querySelector('#hotmail-compose-btn');
            const replyBtn = hotmailWindow.querySelector('#hotmail-reply-btn');
            const forwardBtn = hotmailWindow.querySelector('#hotmail-forward-btn');
            const deleteBtn = hotmailWindow.querySelector('#hotmail-delete-btn');
            const searchBtn = hotmailWindow.querySelector('#hotmail-search-btn');
            const searchInput = hotmailWindow.querySelector('#hotmail-search');
            
            let selectedEmail = null;
            let selectedRow = null;
            
            if (!emailRows) return;
            
            // Compose new email
            if (composeBtn) {
                composeBtn.addEventListener('click', () => {
                    playSound('ding');
                    showComposeWindow();
                });
            }
            
            // Reply to email
            if (replyBtn) {
                replyBtn.addEventListener('click', () => {
                    if (!selectedEmail) {
                        playSound('error');
                        showMessageBox({
                            title: 'Hotmail',
                            message: 'Kérlek, válassz ki egy emailt a válaszoláshoz!',
                            icon: 'info',
                            buttons: ['OK']
                        });
                        return;
                    }
                    playSound('ding');
                    showComposeWindow(selectedEmail, 'reply');
                });
            }
            
            // Forward email
            if (forwardBtn) {
                forwardBtn.addEventListener('click', () => {
                    if (!selectedEmail) {
                        playSound('error');
                        showMessageBox({
                            title: 'Hotmail',
                            message: 'Kérlek, válassz ki egy emailt a továbbításhoz!',
                            icon: 'info',
                            buttons: ['OK']
                        });
                        return;
                    }
                    playSound('ding');
                    showComposeWindow(selectedEmail, 'forward');
                });
            }
            
            // Delete email
            if (deleteBtn) {
                deleteBtn.addEventListener('click', () => {
                    if (!selectedEmail || !selectedRow) {
                        playSound('error');
                        showMessageBox({
                            title: 'Hotmail',
                            message: 'Kérlek, válassz ki egy emailt a törléshez!',
                            icon: 'info',
                            buttons: ['OK']
                        });
                        return;
                    }
                    playSound('error');
                    showMessageBox({
                        title: 'Email törlése',
                        message: `Biztosan törölni szeretnéd ezt az emailt?

Feladó: ${selectedEmail.from}
Tárgy: ${selectedEmail.subject}`,
                        icon: 'warning',
                        buttons: ['Igen', 'Nem'],
                        callback: (result) => {
                            if (result === 'Igen') {
                                selectedRow.remove();
                                selectedEmail = null;
                                selectedRow = null;
                                playSound('ding');
                                showMessageBox({
                                    title: 'Hotmail',
                                    message: 'Az email sikeresen törölve!',
                                    icon: 'info',
                                    buttons: ['OK']
                                });
                            }
                        }
                    });
                });
            }
            
            // Search emails
            if (searchBtn && searchInput) {
                const performSearch = () => {
                    const query = searchInput.value.toLowerCase().trim();
                    if (!query) {
                        Array.from(emailRows.children).forEach(row => row.style.display = '');
                        return;
                    }
                    playSound('click');
                    let foundCount = 0;
                    Array.from(emailRows.children).forEach((row, idx) => {
                        const email = emails[idx];
                        const matches = email.from.toLowerCase().includes(query) || 
                                      email.subject.toLowerCase().includes(query) ||
                                      email.body.toLowerCase().includes(query);
                        row.style.display = matches ? '' : 'none';
                        if (matches) foundCount++;
                    });
                    showMessageBox({
                        title: 'Keresés',
                        message: `Találatok száma: ${foundCount}`,
                        icon: 'info',
                        buttons: ['OK']
                    });
                };
                searchBtn.addEventListener('click', performSearch);
                searchInput.addEventListener('keypress', (e) => {
                    if (e.key === 'Enter') performSearch();
                });
            }
            
            // Compose window function
            function showComposeWindow(replyToEmail = null, mode = 'new') {
                const isReply = mode === 'reply';
                const isForward = mode === 'forward';
                const composeContent = `
                    <div style="display: flex; flex-direction: column; height: 100%; background-color: #F0F0F0; font-family: Arial, sans-serif;">
                        <div style="background-color: #0066CC; padding: 8px; color: white; font-weight: bold;">Új üzenet írása</div>
                        <div style="padding: 10px; background-color: white; flex-grow: 1; overflow-y: auto;">
                            <div style="margin-bottom: 10px;">
                                <label style="font-size: 11px; font-weight: bold;">Címzett:</label><br>
                                <input type="text" id="compose-to" value="${isReply ? replyToEmail.from : ''}" style="width: 100%; padding: 4px; font-size: 11px;" placeholder="pelda@hotmail.com" />
                            </div>
                            <div style="margin-bottom: 10px;">
                                <label style="font-size: 11px; font-weight: bold;">Tárgy:</label><br>
                                <input type="text" id="compose-subject" value="${isReply ? 'RE: ' + replyToEmail.subject : isForward ? 'FW: ' + replyToEmail.subject : ''}" style="width: 100%; padding: 4px; font-size: 11px;" placeholder="Tárgy..." />
                            </div>
                            <div style="margin-bottom: 10px;">
                                <label style="font-size: 11px; font-weight: bold;">Üzenet:</label><br>
                                <textarea id="compose-body" style="width: 100%; height: 250px; padding: 8px; font-size: 11px; font-family: Arial, sans-serif; resize: none;" placeholder="Üzenet szövege...">${isReply || isForward ? '---Eredeti üzenet--- \n' + (replyToEmail ? replyToEmail.body : '') : ''}</textarea>
                            </div>
                            <div style="display: flex; gap: 8px;">
                                <button class="btn" id="send-email-btn" style="padding: 6px 20px; background-color: #0066CC; color: white; font-weight: bold;">📧 Küldés</button>
                                <button class="btn" id="cancel-email-btn" style="padding: 6px 20px;">❌ Mégse</button>
                                <button class="btn" style="padding: 6px 20px;">📎 Csatolmány</button>
                            </div>
                        </div>
                    </div>
                `;
                
                const composeWindow = createWindow({
                    title: 'Új üzenet - Hotmail',
                    icon: 'https://win98icons.alexmeub.com/icons/png/mail_new-0.png',
                    width: 600,
                    height: 450,
                    content: composeContent
                });
                
                setTimeout(() => {
                    const sendBtn = composeWindow.querySelector('#send-email-btn');
                    const cancelBtn = composeWindow.querySelector('#cancel-email-btn');
                    const toInput = composeWindow.querySelector('#compose-to');
                    const subjectInput = composeWindow.querySelector('#compose-subject');
                    const bodyInput = composeWindow.querySelector('#compose-body');
                    
                    if (sendBtn) {
                        sendBtn.addEventListener('click', () => {
                            if (!toInput.value || !subjectInput.value) {
                                playSound('error');
                                showMessageBox({
                                    title: 'Hotmail',
                                    message: 'Kérlek, töltsd ki a címzett és tárgy mezőket!',
                                    icon: 'warning',
                                    buttons: ['OK']
                                });
                                return;
                            }
                            playSound('ding');
                            const sendingMsg = showMessageBox({
                                title: 'Email küldése',
                                message: 'Email küldése folyamatban...\n📧 ➜ ' + toInput.value,
                                icon: 'info',
                                buttons: ['OK']
                            });
                            setTimeout(() => {
                                composeWindow.remove();
                                showMessageBox({
                                    title: 'Sikeres küldés!',
                                    message: `Az email sikeresen elküldve! Címzett: ${toInput.value} Tárgy: ${subjectInput.value}(Ez egy szimuláció - valójában nem került elküldésre)`,
                                    icon: 'info',
                                    buttons: ['OK']
                                });
                            }, 1500);
                        });
                    }
                    
                    if (cancelBtn) {
                        cancelBtn.addEventListener('click', () => {
                            playSound('click');
                            composeWindow.remove();
                        });
                    }
                }, 100);
            }
            
            // Populate email list
            emails.forEach((email, index) => {
                const row = document.createElement('tr');
                row.style.cssText = 'border-bottom: 1px solid #E6E6E6; cursor: url("https://files.catbox.moe/rllfo2.cur"), pointer;';
                row.dataset.emailIndex = index;
                
                row.onmouseover = () => {
                    if (!row.classList.contains('selected-email')) {
                        row.style.backgroundColor = '#000080';
                        Array.from(row.querySelectorAll('td')).forEach(td => td.style.color = 'white');
                    }
                };
                row.onmouseout = () => {
                    if (!row.classList.contains('selected-email')) {
                        row.style.backgroundColor = 'white';
                        Array.from(row.querySelectorAll('td')).forEach(td => td.style.color = 'black');
                    }
                };
                
                // Single click to select
                row.onclick = (e) => {
                    if (e.target.type === 'checkbox') return;
                    playSound('click');
                    // Deselect all
                    Array.from(emailRows.children).forEach(r => {
                        r.classList.remove('selected-email');
                        r.style.backgroundColor = 'white';
                        Array.from(r.querySelectorAll('td')).forEach(td => td.style.color = 'black');
                    });
                    // Select this one
                    row.classList.add('selected-email');
                    row.style.backgroundColor = '#0066CC';
                    Array.from(row.querySelectorAll('td')).forEach(td => td.style.color = 'white');
                    selectedEmail = email;
                    selectedRow = row;
                };
                
                // Double click to open
                row.ondblclick = () => openEmail(email, emailListView);
                
                row.innerHTML = `
                    <td style="padding: 4px; text-align: center; color: black;">
                        <input type="checkbox" onclick="event.stopPropagation();" />
                    </td>
                    <td style="padding: 4px; font-weight: bold; color: black;">${email.from}</td>
                    <td style="padding: 4px; color: black;">${email.attachment ? '📎 ' : ''}${email.subject}</td>
                    <td style="padding: 4px; color: black;">${email.date}</td>
                    <td style="padding: 4px; color: black;">${email.size}</td>
                `;
                emailRows.appendChild(row);
            });
            
            function openEmail(email, container) {
                playSound('click');
                const originalContent = container.innerHTML;
                container.innerHTML = `
                    <div style="display: flex; flex-direction: column; height: 100%; background-color: white;">
                        <div style="background-color: #0066CC; color: white; padding: 4px 8px; font-size: 12px; font-weight: bold; display: flex; justify-content: space-between;">
                            <span>Üzenet</span>
                            <button class="btn" id="back-to-inbox-btn" style="font-size: 10px; padding: 2px 6px;">← Vissza</button>
                        </div>
                        <div style="padding: 12px; overflow-y: auto; flex-grow: 1; background-color: white;">
                            <div style="border-bottom: 1px solid #CCC; padding-bottom: 8px; margin-bottom: 12px; background-color: #F0F0F0; padding: 8px;">
                                <div style="font-size: 12px; margin-bottom: 4px; color: #000;"><strong>Feladó:</strong> ${email.from}</div>
                                <div style="font-size: 12px; margin-bottom: 4px; color: #000;"><strong>Tárgy:</strong> ${email.subject}</div>
                                <div style="font-size: 12px; margin-bottom: 4px; color: #000;"><strong>Dátum:</strong> ${email.date}</div>
                                ${email.attachment ? `
                                    <div style="font-size: 12px; margin-top: 8px; padding: 8px; background-color: #FFFFCC; border: 2px solid #808080; box-shadow: inset -1px -1px 0 #FFFFFF, inset 1px 1px 0 #000000;">
                                        <strong style="color: #000;">📎 Csatolmány:</strong> 
                                        <button class="btn" onclick="${email.attachment.action}; playSound('click');" style="font-size: 11px; padding: 2px 8px; margin-left: 8px;">
                                            ${email.attachment.name}
                                        </button>
                                        <div style="font-size: 10px; color: #800000; margin-top: 4px;">⚠️ Figyelem: Ez egy szimulátor - a fájl biztonságos és nem károsítja a számítógéped.</div>
                                    </div>
                                ` : ''}
                            </div>
                            <div style="font-size: 12px; white-space: pre-wrap; font-family: Arial, sans-serif; color: #000; background-color: white; padding: 8px;">${email.body}</div>
                        </div>
                    </div>
                `;
                
                // Add back button functionality
                setTimeout(() => {
                    const backBtn = container.querySelector('#back-to-inbox-btn');
                    if (backBtn) {
                        backBtn.onclick = () => {
                            playSound('click');
                            container.innerHTML = originalContent;
                            // Re-attach event listeners
                            const newRows = container.querySelectorAll('tbody tr');
                            newRows.forEach((row, idx) => {
                                row.onclick = () => openEmail(emails[idx], container);
                            });
                        };
                    }
                }, 10);
            }
        }, 100);
        });
    }

    // --- Microsoft Office 97 Applications ---
    
    function openWord() {
        const content = `
            <div style="display: flex; flex-direction: column; height: 100%; background-color: #C0C0C0;">
                <!-- Menu Bar -->
                <div style="background-color: #C0C0C0; border-bottom: 1px solid #808080; padding: 2px 4px; display: flex; gap: 8px; font-size: 11px;">
                    <span style="padding: 2px 6px;">Fájl</span>
                    <span style="padding: 2px 6px;">Szerkesztés</span>
                    <span style="padding: 2px 6px;">Nézet</span>
                    <span style="padding: 2px 6px;">Beszúrás</span>
                    <span style="padding: 2px 6px;">Formátum</span>
                    <span style="padding: 2px 6px;">Eszközök</span>
                    <span style="padding: 2px 6px;">Táblázat</span>
                    <span style="padding: 2px 6px;">Ablak</span>
                    <span style="padding: 2px 6px;">Súgó</span>
                </div>
                <!-- Toolbar -->
                <div style="background-color: #C0C0C0; border-bottom: 1px solid #808080; padding: 4px; display: flex; gap: 2px; flex-wrap: wrap;">
                    <button class="btn" id="word-new-btn" style="padding: 2px 4px; font-size: 10px;">📄 Új</button>
                    <button class="btn" id="word-save-btn" style="padding: 2px 4px; font-size: 10px;">💾 Mentés</button>
                    <button class="btn" id="word-print-btn" style="padding: 2px 4px; font-size: 10px;">🖨️ Nyomtatás</button>
                    <div style="width: 1px; height: 20px; background-color: #808080; margin: 0 4px;"></div>
                    <button class="btn" id="word-bold-btn" style="padding: 2px 4px; font-size: 10px;"><b>B</b></button>
                    <button class="btn" id="word-italic-btn" style="padding: 2px 4px; font-size: 10px;"><i>I</i></button>
                    <button class="btn" id="word-underline-btn" style="padding: 2px 4px; font-size: 10px;"><u>U</u></button>
                    <div style="width: 1px; height: 20px; background-color: #808080; margin: 0 4px;"></div>
                    <button class="btn" id="word-upgrade-btn" style="padding: 2px 4px; font-size: 10px; background-color: #FFD700; font-weight: bold;">⭐ Teljes verzió megvásárlása</button>
                </div>
                <!-- Document Area -->
                <div style="flex-grow: 1; background-color: #808080; padding: 20px; overflow-y: auto;">
                    <div style="background-color: white; min-height: 100%; padding: 40px; box-shadow: 2px 2px 4px rgba(0,0,0,0.3);">
                        <textarea id="word-content" style="width: 100%; height: 100%; min-height: 400px; border: none; outline: none; font-family: 'Times New Roman', serif; font-size: 12pt; resize: none; color: #000;" placeholder="Kezdjen el gépelni... (DEMO: Maximum 500 karakter)"></textarea>
                    </div>
                </div>
                <!-- Status Bar -->
                <div style="background-color: #C0C0C0; border-top: 1px solid #808080; padding: 2px 8px; font-size: 10px; display: flex; justify-content: space-between;">
                    <span>1. oldal</span>
                    <span id="word-char-count">Karakterek: 0/500 (DEMO)</span>
                    <span style="color: #FF0000; font-weight: bold;">Microsoft Word 97 - DEMO VERZIÓ</span>
                </div>
            </div>
        `;
        const wordWindow = createWindow({
            title: 'Document1 - Microsoft Word 97 (DEMO)',
            icon: 'https://files.catbox.moe/zadrz1.png',
            width: 700,
            height: 500,
            content: content
        });
        playSound('open');
        
        setTimeout(() => {
            const textarea = wordWindow.querySelector('#word-content');
            const charCount = wordWindow.querySelector('#word-char-count');
            const upgradeBtn = wordWindow.querySelector('#word-upgrade-btn');
            const saveBtn = wordWindow.querySelector('#word-save-btn');
            const printBtn = wordWindow.querySelector('#word-print-btn');
            const boldBtn = wordWindow.querySelector('#word-bold-btn');
            const italicBtn = wordWindow.querySelector('#word-italic-btn');
            const underlineBtn = wordWindow.querySelector('#word-underline-btn');
            const newBtn = wordWindow.querySelector('#word-new-btn');
            
            // Character limit for demo
            if (textarea) {
                textarea.addEventListener('input', () => {
                    const len = textarea.value.length;
                    charCount.textContent = `Karakterek: ${len}/500 (DEMO)`;
                    if (len >= 500) {
                        textarea.value = textarea.value.substring(0, 500);
                        playSound('error');
                        showMessageBox({
                            title: 'Microsoft Word 97 - DEMO Korlát',
                            message: 'Elérte a DEMO verzió 500 karakteres korlátját! Vásárolja meg a teljes Microsoft Office 97-et a korlátlan használathoz. Rendelés: microsoft.com/office',
                            icon: 'warning',
                            buttons: ['OK']
                        });
                    }
                });
            }
            
            // Upgrade button
            if (upgradeBtn) {
                upgradeBtn.addEventListener('click', () => {
                    playSound('ding');
                    showMessageBox({
                        title: 'Teljes verzió vásárlása',
                        message: 'Microsoft Office 97 Professional Ár: 199,990 Ft Teljes funkciók: ✓ Korlátlan karakter ✓ Mentés és nyomtatás ✓ Formázási lehetőségek ✓ Táblázatok és képek ✓ Makrók és bővítmények Látogasson el a microsoft.com/office oldalra! Ez egy oktatási célú szimuláció.',
                        icon: 'info',
                        buttons: ['OK']
                    });
                });
            }
            
            // Save and Print disabled in demo
            if (saveBtn) {
                saveBtn.addEventListener('click', () => {
                    playSound('error');
                    showMessageBox({
                        title: 'DEMO Korlát',
                        message: 'A mentés funkció nem elérhető a DEMO verzióban. Vásárolja meg a teljes Office 97-et a microsoft.com oldalon!',
                        icon: 'warning',
                        buttons: ['OK']
                    });
                });
            }
            
            if (printBtn) {
                printBtn.addEventListener('click', () => {
                    playSound('error');
                    showMessageBox({
                        title: 'DEMO Korlát',
                        message: 'A nyomtatás funkció nem elérhető a DEMO verzióban. Vásárolja meg a teljes Office 97-et a microsoft.com oldalon!',
                        icon: 'warning',
                        buttons: ['OK']
                    });
                });
            }
            
            // Formatting buttons work but show reminder
            [boldBtn, italicBtn, underlineBtn].forEach(btn => {
                if (btn) {
                    btn.addEventListener('click', () => {
                        playSound('click');
                        showMessageBox({
                            title: 'Formázás',
                            message: 'A formázás korlátozott a DEMO verzióban. A teljes verzióban minden formázási lehetőség elérhető!',
                            icon: 'info',
                            buttons: ['OK']
                        });
                    });
                }
            });
            
            if (newBtn) {
                newBtn.addEventListener('click', () => {
                    textarea.value = '';
                    charCount.textContent = 'Karakterek: 0/500 (DEMO)';
                    playSound('ding');
                });
            }
        }, 100);
    }
    
    function openExcel() {
        const content = `
            <div style="display: flex; flex-direction: column; height: 100%; background-color: #C0C0C0;">
                <!-- Menu Bar -->
                <div style="background-color: #C0C0C0; border-bottom: 1px solid #808080; padding: 2px 4px; display: flex; gap: 8px; font-size: 11px;">
                    <span style="padding: 2px 6px;">Fájl</span>
                    <span style="padding: 2px 6px;">Szerkesztés</span>
                    <span style="padding: 2px 6px;">Nézet</span>
                    <span style="padding: 2px 6px;">Beszúrás</span>
                    <span style="padding: 2px 6px;">Formátum</span>
                    <span style="padding: 2px 6px;">Eszközök</span>
                    <span style="padding: 2px 6px;">Adatok</span>
                    <span style="padding: 2px 6px;">Ablak</span>
                    <span style="padding: 2px 6px;">Súgó</span>
                </div>
                <!-- Toolbar -->
                <div style="background-color: #C0C0C0; border-bottom: 1px solid #808080; padding: 4px; display: flex; gap: 2px;">
                    <button class="btn" id="excel-save-btn" style="padding: 2px 4px; font-size: 10px;">💾 Mentés</button>
                    <button class="btn" id="excel-chart-btn" style="padding: 2px 4px; font-size: 10px;">📊 Diagram</button>
                    <button class="btn" id="excel-sum-btn" style="padding: 2px 4px; font-size: 10px;">Σ Összeg</button>
                    <div style="width: 1px; height: 20px; background-color: #808080; margin: 0 4px;"></div>
                    <button class="btn" id="excel-upgrade-btn" style="padding: 2px 4px; font-size: 10px; background-color: #FFD700; font-weight: bold;">⭐ Teljes verzió</button>
                </div>
                <!-- Spreadsheet Area -->
                <div style="flex-grow: 1; background-color: white; overflow: auto; position: relative;">
                    <table style="border-collapse: collapse; font-family: Arial, sans-serif; font-size: 11px;">
                        <thead>
                            <tr>
                                <th style="width: 40px; background-color: #C0C0C0; border: 1px solid #808080; padding: 2px;"></th>
                                <th style="width: 80px; background-color: #C0C0C0; border: 1px solid #808080; padding: 2px; text-align: center;"><b>A</b></th>
                                <th style="width: 80px; background-color: #C0C0C0; border: 1px solid #808080; padding: 2px; text-align: center;"><b>B</b></th>
                                <th style="width: 80px; background-color: #C0C0C0; border: 1px solid #808080; padding: 2px; text-align: center;"><b>C</b></th>
                                <th style="width: 80px; background-color: #C0C0C0; border: 1px solid #808080; padding: 2px; text-align: center;"><b>D</b></th>
                                <th style="width: 80px; background-color: #C0C0C0; border: 1px solid #808080; padding: 2px; text-align: center;"><b>E</b></th>
                                <th style="width: 80px; background-color: #C0C0C0; border: 1px solid #808080; padding: 2px; text-align: center;"><b>F</b></th>
                            </tr>
                        </thead>
                        <tbody id="excel-body"></tbody>
                    </table>
                </div>
                <!-- Status Bar -->
                <div style="background-color: #C0C0C0; border-top: 1px solid #808080; padding: 2px 8px; font-size: 10px; display: flex; justify-content: space-between;">
                    <span>Kész</span>
                    <span id="excel-edit-count" style="color: #FF0000; font-weight: bold;">Szerkesztések: 0/10 (DEMO)</span>
                </div>
            </div>
        `;
        const excelWindow = createWindow({
            title: 'Munkafüzet1 - Microsoft Excel 97 (DEMO)',
            icon: 'https://win98icons.alexmeub.com/icons/png/msexcel-0.png',
            width: 600,
            height: 450,
            content: content
        });
        
        // Generate rows with editable cells
        setTimeout(() => {
            const tbody = excelWindow.querySelector('#excel-body');
            const editCountSpan = excelWindow.querySelector('#excel-edit-count');
            const saveBtn = excelWindow.querySelector('#excel-save-btn');
            const chartBtn = excelWindow.querySelector('#excel-chart-btn');
            const sumBtn = excelWindow.querySelector('#excel-sum-btn');
            const upgradeBtn = excelWindow.querySelector('#excel-upgrade-btn');
            let editCount = 0;
            
            for (let i = 1; i <= 20; i++) {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td style="background-color: #C0C0C0; border: 1px solid #808080; padding: 2px; text-align: center;"><b>${i}</b></td>
                    <td class="excel-cell" contenteditable="true" style="border: 1px solid #D3D3D3; padding: 2px; min-height: 20px; background-color: white;"></td>
                    <td class="excel-cell" contenteditable="true" style="border: 1px solid #D3D3D3; padding: 2px; background-color: white;"></td>
                    <td class="excel-cell" contenteditable="true" style="border: 1px solid #D3D3D3; padding: 2px; background-color: white;"></td>
                    <td class="excel-cell" contenteditable="true" style="border: 1px solid #D3D3D3; padding: 2px; background-color: white;"></td>
                    <td class="excel-cell" contenteditable="true" style="border: 1px solid #D3D3D3; padding: 2px; background-color: white;"></td>
                    <td class="excel-cell" contenteditable="true" style="border: 1px solid #D3D3D3; padding: 2px; background-color: white;"></td>
                `;
                tbody.appendChild(row);
            }
            
            // Track edits
            const cells = excelWindow.querySelectorAll('.excel-cell');
            cells.forEach(cell => {
                cell.addEventListener('input', () => {
                    if (editCount < 10) {
                        editCount++;
                        editCountSpan.textContent = `Szerkesztések: ${editCount}/10 (DEMO)`;
                        playSound('click');
                        
                        if (editCount >= 10) {
                            playSound('error');
                            cells.forEach(c => c.contentEditable = 'false');
                            showMessageBox({
                                title: 'Microsoft Excel 97 - DEMO Korlát',
                                message: 'Elérte a DEMO verzió 10 cellás szerkesztési korlátját! Vásárolja meg a teljes Microsoft Office 97-et a korlátlan használathoz. Rendelés: microsoft.com/office',
                                icon: 'warning',
                                buttons: ['OK']
                            });
                        }
                    }
                });
            });
            
            // Upgrade button
            if (upgradeBtn) {
                upgradeBtn.addEventListener('click', () => {
                    playSound('ding');
                    showMessageBox({
                        title: 'Teljes verzió vásárlása',
                        message: 'Microsoft Office 97 Professional Ár: 199,990 Ft Teljes Excel funkciók: ✓ Korlátlan cellaszerkesztés ✓ Formulák és függvények ✓ Diagramok és grafikonok ✓ Makrók ✓ Adatbázis funkciók Látogasson el a microsoft.com/office oldalra! Ez egy oktatási célú szimuláció.',
                        icon: 'info',
                        buttons: ['OK']
                    });
                });
            }
            
            // Disabled features in demo
            [saveBtn, chartBtn, sumBtn].forEach(btn => {
                if (btn) {
                    btn.addEventListener('click', () => {
                        playSound('error');
                        showMessageBox({
                            title: 'DEMO Korlát',
                            message: 'Ez a funkció nem elérhető a DEMO verzióban. Vásárolja meg a teljes Office 97-et!',
                            icon: 'warning',
                            buttons: ['OK']
                        });
                    });
                }
            });
        }, 100);
        playSound('open');
    }
    
    function openPowerPoint() {
        const content = `
            <div style="display: flex; flex-direction: column; height: 100%; background-color: #C0C0C0;">
                <!-- Menu Bar -->
                <div style="background-color: #C0C0C0; border-bottom: 1px solid #808080; padding: 2px 4px; display: flex; gap: 8px; font-size: 11px;">
                    <span style="padding: 2px 6px;">Fájl</span>
                    <span style="padding: 2px 6px;">Szerkesztés</span>
                    <span style="padding: 2px 6px;">Nézet</span>
                    <span style="padding: 2px 6px;">Beszúrás</span>
                    <span style="padding: 2px 6px;">Formátum</span>
                    <span style="padding: 2px 6px;">Eszközök</span>
                    <span style="padding: 2px 6px;">Diavetítés</span>
                    <span style="padding: 2px 6px;">Ablak</span>
                    <span style="padding: 2px 6px;">Súgó</span>
                </div>
                <!-- Toolbar -->
                <div style="background-color: #C0C0C0; border-bottom: 1px solid #808080; padding: 4px; display: flex; gap: 2px;">
                    <button class="btn" id="ppt-newslide-btn" style="padding: 2px 4px; font-size: 10px;">📄 Új dia</button>
                    <button class="btn" id="ppt-save-btn" style="padding: 2px 4px; font-size: 10px;">💾 Mentés</button>
                    <button class="btn" id="ppt-play-btn" style="padding: 2px 4px; font-size: 10px;">▶️ Vetítés</button>
                    <div style="width: 1px; height: 20px; background-color: #808080; margin: 0 4px;"></div>
                    <button class="btn" id="ppt-upgrade-btn" style="padding: 2px 4px; font-size: 10px; background-color: #FFD700; font-weight: bold;">⭐ Teljes verzió</button>
                </div>
                <!-- Main Area -->
                <div style="display: flex; flex-grow: 1; overflow: hidden;">
                    <!-- Slide Thumbnails -->
                    <div id="ppt-thumbnails" style="width: 120px; background-color: #F0F0F0; border-right: 1px solid #808080; overflow-y: auto; padding: 8px;">
                        <div class="ppt-slide-thumb" data-slide="1" style="background-color: white; border: 2px solid #0000FF; padding: 4px; margin-bottom: 8px; text-align: center; font-size: 10px; cursor: pointer;">
                            <div style="background-color: #F0F0F0; height: 60px; display: flex; align-items: center; justify-content: center; margin-bottom: 4px;">1</div>
                            <div>Dia 1</div>
                        </div>
                    </div>
                    <!-- Slide Editor -->
                    <div style="flex-grow: 1; background-color: #808080; padding: 20px; overflow: auto; display: flex; justify-content: center; align-items: center;">
                        <div style="background-color: white; width: 500px; height: 375px; box-shadow: 3px 3px 8px rgba(0,0,0,0.3); position: relative; display: flex; flex-direction: column; justify-content: center; align-items: center; padding: 40px;">
                            <input id="ppt-title" type="text" placeholder="Kattintson ide a cím hozzáadásához (DEMO: max 50 kar.)" style="width: 100%; padding: 10px; font-size: 32px; font-weight: bold; text-align: center; border: 2px dashed #CCC; margin-bottom: 20px; background-color: #FFFACD;">
                            <textarea id="ppt-content" placeholder="Kattintson ide a szöveg hozzáadásához (DEMO: max 100 kar.)" style="width: 100%; flex-grow: 1; padding: 10px; font-size: 18px; border: 2px dashed #CCC; resize: none; background-color: #F0F8FF;"></textarea>
                        </div>
                    </div>
                </div>
                <!-- Status Bar -->
                <div style="background-color: #C0C0C0; border-top: 1px solid #808080; padding: 2px 8px; font-size: 10px; display: flex; justify-content: space-between;">
                    <span id="ppt-status">Dia 1 / 1</span>
                    <span style="color: #FF0000; font-weight: bold;">DEMO: Maximum 3 dia</span>
                </div>
            </div>
        `;
        const pptWindow = createWindow({
            title: 'Bemutató1 - Microsoft PowerPoint 97 (DEMO)',
            icon: 'https://win98icons.alexmeub.com/icons/png/mspowerpoint-0.png',
            width: 700,
            height: 500,
            content: content
        });
        playSound('open');
        
        setTimeout(() => {
            const titleInput = pptWindow.querySelector('#ppt-title');
            const contentArea = pptWindow.querySelector('#ppt-content');
            const newSlideBtn = pptWindow.querySelector('#ppt-newslide-btn');
            const saveBtn = pptWindow.querySelector('#ppt-save-btn');
            const playBtn = pptWindow.querySelector('#ppt-play-btn');
            const upgradeBtn = pptWindow.querySelector('#ppt-upgrade-btn');
            const thumbnails = pptWindow.querySelector('#ppt-thumbnails');
            const statusSpan = pptWindow.querySelector('#ppt-status');
            let slideCount = 1;
            
            // Limit title length
            if (titleInput) {
                titleInput.addEventListener('input', () => {
                    if (titleInput.value.length > 50) {
                        titleInput.value = titleInput.value.substring(0, 50);
                        playSound('error');
                    }
                });
            }
            
            // Limit content length
            if (contentArea) {
                contentArea.addEventListener('input', () => {
                    if (contentArea.value.length > 100) {
                        contentArea.value = contentArea.value.substring(0, 100);
                        playSound('error');
                    }
                });
            }
            
            // New slide button
            if (newSlideBtn) {
                newSlideBtn.addEventListener('click', () => {
                    if (slideCount >= 3) {
                        playSound('error');
                        showMessageBox({
                            title: 'Microsoft PowerPoint 97 - DEMO Korlát',
                            message: 'Elérte a DEMO verzió 3 diás korlátját! Vásárolja meg a teljes Microsoft Office 97-et a korlátlan diákhoz. Rendelés: microsoft.com/office',
                            icon: 'warning',
                            buttons: ['OK']
                        });
                        return;
                    }
                    slideCount++;
                    playSound('ding');
                    statusSpan.textContent = `Dia ${slideCount} / ${slideCount}`;
                    
                    // Add new thumbnail
                    const newThumb = document.createElement('div');
                    newThumb.className = 'ppt-slide-thumb';
                    newThumb.dataset.slide = slideCount;
                    newThumb.style.cssText = 'background-color: white; border: 2px solid #808080; padding: 4px; margin-bottom: 8px; text-align: center; font-size: 10px; cursor: pointer;';
                    newThumb.innerHTML = `
                        <div style="background-color: #F0F0F0; height: 60px; display: flex; align-items: center; justify-content: center; margin-bottom: 4px;">${slideCount}</div>
                        <div>Dia ${slideCount}</div>
                    `;
                    thumbnails.appendChild(newThumb);
                    
                    // Clear editor for new slide
                    titleInput.value = '';
                    contentArea.value = '';
                });
            }
            
            // Upgrade button
            if (upgradeBtn) {
                upgradeBtn.addEventListener('click', () => {
                    playSound('ding');
                    showMessageBox({
                        title: 'Teljes verzió vásárlása',
                        message: 'Microsoft Office 97 Professional Ár: 199,990 Ft Teljes PowerPoint funkciók: ✓ Korlátlan diák száma ✓ Animációk és átmenetek ✓ Képek és klipek ✓ Diagramok és táblázatok ✓ Jegyzetfüzet Látogasson el a microsoft.com/office oldalra! Ez egy oktatási célú szimuláció.',
                        icon: 'info',
                        buttons: ['OK']
                    });
                });
            }
            
            // Disabled features
            [saveBtn, playBtn].forEach(btn => {
                if (btn) {
                    btn.addEventListener('click', () => {
                        playSound('error');
                        showMessageBox({
                            title: 'DEMO Korlát',
                            message: 'Ez a funkció nem elérhető a DEMO verzióban.Vásárolja meg a teljes Office 97-et!',
                            icon: 'warning',
                            buttons: ['OK']
                        });
                    });
                }
            });
        }, 100);
    }

    // --- Initialize Desktop ---
    document.addEventListener('DOMContentLoaded', () => {
        const desktop = document.getElementById('desktop');

        const icons = [
            // Column 1 (left) - matching screenshot layout
            {
                title: "Internet Explorer",
                icon: "https://win98icons.alexmeub.com/icons/png/msie1-0.png",
                action: "openBrowser(); playSound('click')",
                top: 10, left: 10, id: 'icon-ie'
            },
            {
                title: "Emoji Registry",
                icon: "https://urbanmove8.neocities.org/emojis/nyitotttenyeruember.png",
                action: "openEmojiRegistry(); playSound('click')",
                top: 10, left: 85, id: 'icon-ie'
            },
            {
                title: "MSN<br>Hotmail",
                icon: "https://win98icons.alexmeub.com/icons/png/mailbox_world-0.png",
                action: "openHotmail(); playSound('click')",
                top: 85, left: 10, id: 'icon-hotmail'
            },
            {
                title: "Jegyzettömb",
                icon: "https://win98icons.alexmeub.com/icons/png/notepad-1.png",
                action: "openNotepad(); playSound('click')",
                top: 160, left: 10, id: 'icon-notepad'
            },
            {
                title: "Aknakereső",
                icon: "https://98.js.org/images/icons/minesweeper-32x32.png",
                action: "openMinesweeper(); playSound('click')",
                top: 235, left: 10, id: 'icon-minesweeper'
            },
            {
                title: "Lomtár",
                icon: "https://win98icons.alexmeub.com/icons/png/recycle_bin_empty-0.png",
                action: "openRecycleBin(); playSound('click')",
                top: 310, left: 10, id: 'icon-recyclebin'
            },
            {
                title: "Hálózati<br>környezet",
                icon: "https://win98icons.alexmeub.com/icons/png/conn_cloud.png",
                action: "playSound('error'); showMessageBox({title:'Hálózati környezet', message:'Nincs hálózati kapcsolat.', icon:'info', buttons:['OK']});",
                top: 385, left: 10, id: 'icon-network'
            },
            {
                title: "3D Pinball",
                icon: "https://98.js.org/images/icons/pinball-32x32.png",
                action: "openPinball(); playSound('click')",
                top: 460, left: 10, id: 'icon-pinball'
            },
            
            // Column 2 (right) - matching screenshot layout
            {
                title: "MSN<br>Messenger",
                icon: "https://files.catbox.moe/bnnmoz.webp",
                action: "openMSNMessenger(); playSound('click')",
                top: 85, left: 85, id: 'icon-msn'
            },
            {
                title: "Paint",
                icon: "https://win98icons.alexmeub.com/icons/png/paint_old-0.png",
                action: "openPaint(); playSound('click')",
                top: 160, left: 85, id: 'icon-paint'
            },
            {
                title: "Media Player",
                icon: "https://win98icons.alexmeub.com/icons/png/media_player-0.png",
                action: "openWindowsMediaPlayer(); playSound('click')",
                top: 235, left: 85, id: 'icon-wmp'
            },
            {
                title: "Microsoft<br>Plus!",
                icon: "https://win98icons.alexmeub.com/icons/png/themes-0.png",
                action: "openMicrosoftPlus(); playSound('click')",
                top: 310, left: 85, id: 'icon-plus'
            },
            {
                title: "credits.txt",
                icon: "https://win98icons.alexmeub.com/icons/png/notepad_file-2.png",
                action: "openCredits(); playSound('click')",
                top: 385, left: 85, id: 'icon-credits'
            },
            {
                title: "💻😎😠💀😭.emo",
                icon: "https://win98icons.alexmeub.com/icons/png/font_bitmap-0.png",
                action: "openEmojiRegistryWithFile('💻😎😠💀😭.emo'); playSound('click')",
                top: 460, left: 85, id: 'icon-testemo'
            },
        ];

        icons.forEach(data => {
            const iconElement = document.createElement('div');
            iconElement.className = 'desktop-icon';
            iconElement.id = data.id;
            iconElement.title = data.title.replace('<br>', ' ');
            iconElement.style.cssText = `top:${data.top}px; left:${data.left}px;`;
            iconElement.setAttribute('ondblclick', data.action); // Double-click to open
            iconElement.innerHTML = `
                <img src="${data.icon}" alt="${data.title.replace('<br>', ' ')}" />
                <span>${data.title}</span>
            `;
            desktop.appendChild(iconElement);

            // Icon drag logic
            iconElement.addEventListener("mousedown", e => {
                if (e.button !== 0) return;
                e.preventDefault();
                iconDragInfo = {
                    element: iconElement,
                    offsetX: e.clientX - iconElement.offsetLeft,
                    offsetY: e.clientY - iconElement.offsetTop
                };
                iconElement.style.zIndex = ++zIndexCounter;
            });
            iconElement.addEventListener("mouseup", () => {
                iconDragInfo = null;
            });
            
            // Right-click context menu
            iconElement.addEventListener('contextmenu', (e) => {
                e.preventDefault();
                e.stopPropagation();
                selectedIcon = iconElement;
                iconElement.classList.add('selected');
                
                const menuItems = [
                    { label: 'Megnyitás', action: data.action },
                    'separator',
                    { label: 'Tulajdonságok', action: `showPropertiesDialog('${data.title.replace('<br>', ' ')}', 'Parancsikon', {description: 'Windows 98 asztal parancsikon'})` }
                ];
                
                // Special actions for specific icons
                if (data.id === 'icon-recyclebin') {
                    menuItems.splice(1, 0, { label: 'Lomtár ürítése', action: 'emptyRecycleBin()' });
                }
                
                showContextMenu(e.clientX, e.clientY, menuItems, iconElement);
            });
            
            // Single click to select
            iconElement.addEventListener('click', (e) => {
                e.stopPropagation();
                document.querySelectorAll('.desktop-icon').forEach(icon => icon.classList.remove('selected'));
                iconElement.classList.add('selected');
                selectedIcon = iconElement;
            });
        });
    });
    
    // Deselect icons when clicking on desktop
    document.getElementById('desktop').addEventListener('click', (e) => {
        if (e.target.id === 'desktop') {
            document.querySelectorAll('.desktop-icon').forEach(icon => icon.classList.remove('selected'));
            selectedIcon = null;
        }
    });

    // --- Stress Test Function ---
    function openStressTest() {
        const stressContent = `
            <div style="padding: 20px; font-family: Arial, sans-serif; background: white; height: 100%;">
                <h2 style="color: #CC0000; margin-top: 0;">⚠️ Rendszer Stressz Teszt</h2>
                <p style="font-size: 13px; line-height: 1.6;">
                    Ez a program 100 Jegyzettömb ablakot fog megnyitni a rendszer stabilitásának tesztelésére.
                </p>
                <p style="font-size: 13px; line-height: 1.6; background: #FFFFCC; padding: 10px; border: 1px solid #CCCC00;">
                    <strong>Figyelem:</strong> Ez összeomlaszthatja a szimulátort!<br>
                    A rendszer Blue Screen-t fog mutatni, ha túl sok program fut.
                </p>
                <div style="margin-top: 20px;">
                    <button class="btn" onclick="runStressTest()" style="padding: 8px 20px; font-size: 13px; font-weight: bold; background: #CC0000; color: white;">Indítás (100 ablak)</button>
                    <button class="btn" onclick="runStressTest(50)" style="padding: 8px 20px; font-size: 13px; margin-left: 10px;">Közepes teszt (50 ablak)</button>
                    <button class="btn" onclick="runStressTest(25)" style="padding: 8px 20px; font-size: 13px; margin-left: 10px;">Enyhe teszt (25 ablak)</button>
                </div>
                <div id="stress-status" style="margin-top: 20px; padding: 10px; background: #F0F0F0; border: 2px inset #808080; font-family: 'Courier New', monospace; font-size: 12px; min-height: 100px;">
                    Várjon...
                </div>
            </div>
        `;
        
        createWindow({
            title: 'Stressz Teszt',
            icon: 'https://win98icons.alexmeub.com/icons/png/msg_warning-0.png',
            width: 500,
            height: 400,
            content: stressContent
        });
        
        playSound('open');
    }
    
    function runStressTest(count = 100) {
        const statusDiv = document.querySelector('#stress-status');
        if (!statusDiv) return;
        
        statusDiv.innerHTML = `Indítás...<br>Cél: ${count} ablak<br><br>`;
        playSound('ding');
        
        let created = 0;
        const createInterval = setInterval(() => {
            if (created >= count) {
                clearInterval(createInterval);
                statusDiv.innerHTML += `<br><span style="color: #00AA00; font-weight: bold;">Kész!</span><br>Megnyitott ablakok: ${created}<br>Összes program: ${windows.length}<br><br>`;
                
                if (windows.length > 100) {
                    statusDiv.innerHTML += `<span style="color: #CC0000; font-weight: bold;">FIGYELEM: Túl sok program fut!<br>BSoD hamarosan...</span>`;
                } else {
                    statusDiv.innerHTML += `Rendszer terhelés: ${Math.floor((windows.length / 100) * 100)}%`;
                }
                return;
            }
            
            // Create a small notepad window
            const x = 50 + (created % 10) * 30;
            const y = 50 + Math.floor(created / 10) * 30;
            
            const notepadContent = `
                <div style="padding: 10px; font-family: 'Courier New', monospace; font-size: 12px;">
                    Teszt ablak #${created + 1}<br>
                    Jelenlegi ablakok: ${windows.length + 1}<br>
                    <br>
                    Ez egy stressz teszt ablak.
                </div>
            `;
            
            const win = createWindow({
                title: `Teszt #${created + 1}`,
                icon: 'https://win98icons.alexmeub.com/icons/png/notepad-0.png',
                width: 250,
                height: 150,
                content: notepadContent
            });
            
            if (win) {
                win.style.left = x + 'px';
                win.style.top = y + 'px';
            }
            
            created++;
            statusDiv.innerHTML = `Indítás...<br>Cél: ${count} ablak<br><br>Létrehozva: ${created} / ${count}<br>Összes program: ${windows.length}`;
            
            // Slow down creation to make it visible
        }, 50); // Create one window every 50ms
    }
    
    // --- Stress Test Function ---
    function openStressTest() {
        const stressContent = `
            <div style="padding: 20px; font-family: Arial, sans-serif; background: white; height: 100%;">
                <h2 style="color: #CC0000; margin-top: 0;">⚠️ Rendszer Stressz Teszt</h2>
                <p style="font-size: 13px; line-height: 1.6;">
                    Ez a program több Jegyzettömb ablakot fog megnyitni a rendszer stabilitásának tesztelésére.
                </p>
                <p style="font-size: 13px; line-height: 1.6; background: #FFFFCC; padding: 10px; border: 1px solid #CCCC00;">
                    <strong>Figyelem:</strong> Ez összeomlaszthatja a szimulátort!<br>
                    A rendszer Blue Screen-t fog mutatni, ha túl sok program fut (>100).
                </p>
                <div style="margin-top: 20px;">
                    <button class="btn" onclick="runStressTest(100)" style="padding: 8px 20px; font-size: 13px; font-weight: bold; background: #CC0000; color: white;">Indítás (100 ablak)</button>
                    <button class="btn" onclick="runStressTest(50)" style="padding: 8px 20px; font-size: 13px; margin-left: 10px;">Közepes teszt (50 ablak)</button>
                    <button class="btn" onclick="runStressTest(25)" style="padding: 8px 20px; font-size: 13px; margin-left: 10px;">Enyhe teszt (25 ablak)</button>
                </div>
                <div id="stress-status" style="margin-top: 20px; padding: 10px; background: #F0F0F0; border: 2px inset #808080; font-family: 'Courier New', monospace; font-size: 12px; min-height: 100px;">
                    Válasszon egy tesztet az indításhoz...
                </div>
            </div>
        `;
        
        createWindow({
            title: 'Stressz Teszt',
            icon: 'https://win98icons.alexmeub.com/icons/png/msg_warning-0.png',
            width: 500,
            height: 400,
            content: stressContent
        });
        
        playSound('open');
    }
    
    function runStressTest(count = 100) {
        const statusDiv = document.querySelector('#stress-status');
        if (!statusDiv) return;
        
        statusDiv.innerHTML = `Indítás...<br>Cél: ${count} ablak<br><br>`;
        playSound('ding');
        
        let created = 0;
        const createInterval = setInterval(() => {
            if (created >= count) {
                clearInterval(createInterval);
                statusDiv.innerHTML += `<br><span style="color: #00AA00; font-weight: bold;">Kész!</span><br>Megnyitott ablakok: ${created}<br>Összes program: ${windows.length}<br><br>`;
                
                if (windows.length > 100) {
                    statusDiv.innerHTML += `<span style="color: #CC0000; font-weight: bold;">FIGYELEM: Túl sok program fut!<br>BSoD hamarosan...</span>`;
                    playSound('error');
                } else {
                    statusDiv.innerHTML += `Rendszer terhelés: ${Math.floor((windows.length / 100) * 100)}%`;
                }
                return;
            }
            
            // Create a small notepad window
            const x = 50 + (created % 10) * 30;
            const y = 50 + Math.floor(created / 10) * 30;
            
            const notepadContent = `
                <div style="padding: 10px; font-family: 'Courier New', monospace; font-size: 12px;">
                    Teszt ablak #${created + 1}<br>
                    Jelenlegi ablakok: ${windows.length + 1}<br>
                    <br>
                    Ez egy stressz teszt ablak.
                </div>
            `;
            
            const win = createWindow({
                title: `Teszt #${created + 1}`,
                icon: 'https://win98icons.alexmeub.com/icons/png/notepad-0.png',
                width: 250,
                height: 150,
                content: notepadContent
            });
            
            if (win) {
                win.style.left = x + 'px';
                win.style.top = y + 'px';
            }
            
            created++;
            statusDiv.innerHTML = `Indítás...<br>Cél: ${count} ablak<br><br>Létrehozva: ${created} / ${count}<br>Összes program: ${windows.length}`;
            
            // Slow down creation to make it visible
        }, 50); // Create one window every 50ms
    }
    
    // --- Task Manager ---
    function openTaskManager() {
        const taskManagerContent = `
            <div style="display: flex; flex-direction: column; height: 100%; background: #C0C0C0; font-family: Arial, sans-serif;">
                <!-- Tabs -->
                <div style="display: flex; border-bottom: 2px solid #808080; background: #C0C0C0; padding: 0 6px;">
                    <div class="tm-tab" data-tab="applications" style="padding: 10px 20px; border: 2px outset #C0C0C0; border-bottom: none; background: white; cursor: pointer; font-weight: bold; font-size: 13px; color: #000;">Alkalmazások</div>
                    <div class="tm-tab" data-tab="performance" style="padding: 10px 20px; border: 2px outset #C0C0C0; border-bottom: none; background: #C0C0C0; cursor: pointer; margin-left: -2px; font-size: 13px; color: #000;">Teljesítmény</div>
                    <div class="tm-tab" data-tab="system" style="padding: 10px 20px; border: 2px outset #C0C0C0; border-bottom: none; background: #C0C0C0; cursor: pointer; margin-left: -2px; font-size: 13px; color: #000;">Rendszer</div>
                </div>
                
                <!-- Applications Tab Content -->
                <div id="tm-applications-tab" style="display: flex; flex-direction: column; flex: 1;">
                    <div style="padding: 6px; border-bottom: 2px solid #808080; background: #C0C0C0;">
                        <div style="display: flex; gap: 6px; flex-wrap: wrap;">
                            <button class="btn" id="tm-end-task" style="padding: 6px 16px; font-weight: bold; min-width: 100px;">Feladat befejezése</button>
                            <button class="btn" id="tm-switch-to" style="padding: 6px 16px; min-width: 100px;">Váltás rá</button>
                            <button class="btn" id="tm-refresh" style="padding: 6px 16px; min-width: 80px;">Frissítés</button>
                            <button class="btn" id="tm-new-task" style="padding: 6px 16px; min-width: 80px;">Új feladat</button>
                        </div>
                    </div>
                    <div style="flex-grow: 1; background: white; overflow: auto; border: 2px inset #808080; margin: 6px;">
                        <table id="task-list" style="width: 100%; border-collapse: collapse; font-size: 12px; table-layout: fixed;">
                            <thead>
                                <tr style="background: #C0C0C0; position: sticky; top: 0; z-index: 10;">
                                    <th style="padding: 6px 10px; border: 1px solid #808080; text-align: left; font-weight: bold; width: 70%;">Alkalmazás</th>
                                    <th style="padding: 6px 10px; border: 1px solid #808080; text-align: center; font-weight: bold; width: 30%;">Állapot</th>
                                </tr>
                            </thead>
                            <tbody id="task-list-body">
                            </tbody>
                        </table>
                    </div>
                    <div style="padding: 6px 8px; border-top: 2px solid #DFDFDF; display: flex; justify-content: space-between; align-items: center; background: #C0C0C0;">
                        <span style="font-size: 12px; color: black; font-weight: bold;">Folyamatok: <span id="task-count">0</span></span>
                        <button class="btn" onclick="closeWindow(document.querySelector('.window.active')); playSound('click');" style="padding: 6px 24px; font-weight: bold;">Bezárás</button>
                    </div>
                </div>
                
                <!-- Performance Tab Content -->
                <div id="tm-performance-tab" style="display: none; flex-direction: column; flex: 1; padding: 10px; overflow-y: auto;">
                    <div style="background: white; border: 2px inset #808080; padding: 15px; margin-bottom: 10px;">
                        <h3 style="margin: 0 0 10px 0; font-size: 14px; color: #000080;">CPU használat</h3>
                        <div style="background: #000; height: 80px; position: relative; border: 1px solid #808080;">
                            <canvas id="cpu-graph" width="460" height="80"></canvas>
                        </div>
                        <div style="margin-top: 8px; font-size: 12px;">
                            <strong>CPU használat:</strong> <span id="cpu-percent">0</span>%
                        </div>
                    </div>
                    
                    <div style="background: white; border: 2px inset #808080; padding: 15px; margin-bottom: 10px;">
                        <h3 style="margin: 0 0 10px 0; font-size: 14px; color: #000080;">Memória használat</h3>
                        <div style="display: flex; gap: 10px; align-items: center;">
                            <div style="flex: 1; background: #C0C0C0; border: 1px solid #808080; height: 24px; position: relative;">
                                <div id="memory-bar" style="background: linear-gradient(to bottom, #00CC00 0%, #009900 100%); height: 100%; width: 0%; transition: width 0.3s;"></div>
                            </div>
                            <div style="font-size: 12px; min-width: 100px;"><span id="memory-used">0</span> MB / <span id="memory-total">128</span> MB</div>
                        </div>
                        <div style="margin-top: 15px; font-size: 11px; color: #333;">
                            <div style="margin-bottom: 5px;"><strong>Összes fizikai memória:</strong> <span id="phys-total">128</span> MB</div>
                            <div style="margin-bottom: 5px;"><strong>Elérhető:</strong> <span id="phys-available">64</span> MB</div>
                            <div style="margin-bottom: 5px;"><strong>Rendszer gyorsítótár:</strong> <span id="sys-cache">32</span> MB</div>
                        </div>
                    </div>
                    
                    <div style="background: white; border: 2px inset #808080; padding: 15px; margin-bottom: 10px;">
                        <h3 style="margin: 0 0 10px 0; font-size: 14px; color: #000080;">GPU használat</h3>
                        <div style="background: #000; height: 80px; position: relative; border: 1px solid #808080;">
                            <canvas id="gpu-graph" width="460" height="80"></canvas>
                        </div>
                        <div style="margin-top: 8px; font-size: 12px;">
                            <strong>GPU használat:</strong> <span id="gpu-percent">0</span>%
                        </div>
                        <div style="margin-top: 8px; font-size: 11px; color: #333;">
                            <div style="margin-bottom: 5px;"><strong>Grafikus kártya:</strong> S3 Trio64V+</div>
                            <div style="margin-bottom: 5px;"><strong>Video RAM:</strong> 2 MB</div>
                        </div>
                    </div>
                    
                    <div style="background: white; border: 2px inset #808080; padding: 15px;">
                        <h3 style="margin: 0 0 10px 0; font-size: 14px; color: #000080;">Rendszer információ</h3>
                        <div style="font-size: 11px; color: #333;">
                            <div style="margin-bottom: 5px;"><strong>Végrehajtott folyamatok:</strong> <span id="process-count">0</span></div>
                            <div style="margin-bottom: 5px;"><strong>Futási idő:</strong> <span id="uptime">0:00:00</span></div>
                            <div style="margin-bottom: 5px;"><strong>Rendszer:</strong> Microsoft Windows 98</div>
                        </div>
                    </div>
                </div>
                
                <!-- System Tab Content -->
                <div id="tm-system-tab" style="display: none; flex-direction: column; flex: 1; padding: 12px; overflow-y: auto; background: #C0C0C0;">
                    <div style="background: white; border: 2px inset #808080; padding: 16px; margin-bottom: 10px;">
                        <div style="display: flex; align-items: center; margin-bottom: 16px; padding-bottom: 12px; border-bottom: 2px solid #C0C0C0;">
                            <img src="https://win98icons.alexmeub.com/icons/png/computer_explorer-4.png" style="width: 48px; height: 48px; margin-right: 16px;">
                            <div>
                                <h2 style="margin: 0 0 6px 0; font-size: 18px; color: #000080; font-weight: bold;">Microsoft Windows 98</h2>
                                <div style="font-size: 13px; color: #333;">Second Edition 4.10.2222 A</div>
                            </div>
                        </div>
                        
                        <div style="font-size: 12px; color: #000; line-height: 1.8;">
                            <div style="margin-bottom: 8px; padding: 6px; background: #F0F0F0; border: 1px solid #D0D0D0;">
                                <strong style="color: #000080;">🖥️ Számítógép:</strong>
                                <div style="margin-left: 24px; margin-top: 4px;">
                                    <div>Név: <strong>WORKSTATION</strong></div>
                                    <div>Felhasználó: <strong>Administrator</strong></div>
                                    <div>Munkacsoport: <strong>MSHOME</strong></div>
                                </div>
                            </div>
                            
                            <div style="margin-bottom: 8px; padding: 6px; background: #F0F0F0; border: 1px solid #D0D0D0;">
                                <strong style="color: #000080;">⚙️ Processzor:</strong>
                                <div style="margin-left: 24px; margin-top: 4px;">
                                    <div>Intel Pentium II 450 MHz</div>
                                    <div>MMX Technology</div>
                                    <div>L2 Cache: 512 KB</div>
                                </div>
                            </div>
                            
                            <div style="margin-bottom: 8px; padding: 6px; background: #F0F0F0; border: 1px solid #D0D0D0;">
                                <strong style="color: #000080;">💾 Memória:</strong>
                                <div style="margin-left: 24px; margin-top: 4px;">
                                    <div>RAM: <strong><span id="sys-ram-total">128</span> MB</strong></div>
                                    <div>Típus: SDRAM PC100</div>
                                    <div>Szabad: <span id="sys-ram-free">64</span> MB</div>
                                </div>
                            </div>
                            
                            <div style="margin-bottom: 8px; padding: 6px; background: #F0F0F0; border: 1px solid #D0D0D0;">
                                <strong style="color: #000080;">🎨 Videokártya:</strong>
                                <div style="margin-left: 24px; margin-top: 4px;">
                                    <div>S3 Trio64V+ (86C765)</div>
                                    <div>Video RAM: 2 MB</div>
                                    <div>Felbontás: 800x600 - 16 bit</div>
                                </div>
                            </div>
                            
                            <div style="margin-bottom: 8px; padding: 6px; background: #F0F0F0; border: 1px solid #D0D0D0;">
                                <strong style="color: #000080;">💿 Háttértár:</strong>
                                <div style="margin-left: 24px; margin-top: 4px;">
                                    <div>C:\ (Primary IDE): 8.4 GB</div>
                                    <div>Szabad: 4.2 GB</div>
                                    <div>CD-ROM: 48X IDE</div>
                                </div>
                            </div>
                            
                            <div style="margin-bottom: 8px; padding: 6px; background: #F0F0F0; border: 1px solid #D0D0D0;">
                                <strong style="color: #000080;">🔊 Hangkártya:</strong>
                                <div style="margin-left: 24px; margin-top: 4px;">
                                    <div>Sound Blaster 16 PnP</div>
                                    <div>IRQ: 5, DMA: 1, Port: 220h</div>
                                </div>
                            </div>
                            
                            <div style="margin-bottom: 8px; padding: 6px; background: #F0F0F0; border: 1px solid #D0D0D0;">
                                <strong style="color: #000080;">📅 Rendszer:</strong>
                                <div style="margin-left: 24px; margin-top: 4px;">
                                    <div>Verzió: 4.10.2222 A</div>
                                    <div>Telepítve: 1998. november 15.</div>
                                    <div>Futási idő: <span id="sys-uptime">0:00:00</span></div>
                                    <div>DirectX: 6.1</div>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <div style="padding: 8px; text-align: center; font-size: 11px; color: #666;">
                        © 1981-1999 Microsoft Corporation
                    </div>
                </div>
            </div>
        `;

        const tmWindow = createWindow({
            title: "Feladatkezelő",
            icon: "https://win98icons.alexmeub.com/icons/png/computer_taskmgr-0.png",
            width: 550,
            height: 450,
            content: taskManagerContent
        });

        let selectedRow = null;
        
        // Tab switching
        const tabs = tmWindow.querySelectorAll('.tm-tab');
        tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                const tabName = tab.dataset.tab;
                tabs.forEach(t => {
                    t.style.background = '#C0C0C0';
                    t.style.fontWeight = 'normal';
                });
                tab.style.background = 'white';
                tab.style.fontWeight = 'bold';
                
                tmWindow.querySelector('#tm-applications-tab').style.display = tabName === 'applications' ? 'flex' : 'none';
                tmWindow.querySelector('#tm-performance-tab').style.display = tabName === 'performance' ? 'flex' : 'none';
                tmWindow.querySelector('#tm-system-tab').style.display = tabName === 'system' ? 'flex' : 'none';
                
                if (tabName === 'performance') {
                    startPerformanceMonitoring();
                } else {
                    stopPerformanceMonitoring();
                }
            });
        });

        function refreshTaskList() {
            const tbody = tmWindow.querySelector('#task-list-body');
            tbody.innerHTML = '';
            
            windows.forEach((win, index) => {
                if (win === tmWindow) return; // Don't show Task Manager itself
                
                const titleText = win.querySelector('.titlebar-text')?.textContent || 'Unknown';
                const isMinimized = win.classList.contains('minimized');
                const status = isMinimized ? 'Minimalizálva' : 'Fut';
                
                const row = document.createElement('tr');
                row.style.cursor = 'pointer';
                row.style.color = 'black';
                row.dataset.windowId = win.id;
                
                row.innerHTML = `
                    <td style="padding: 6px 10px; border: 1px solid #E0E0E0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; color: inherit;">${titleText}</td>
                    <td style="padding: 6px 10px; border: 1px solid #E0E0E0; text-align: center; font-weight: bold; color: inherit;">${status}</td>
                `;
                
                row.addEventListener('click', () => {
                    if (selectedRow) {
                        selectedRow.style.background = '';
                        selectedRow.style.color = 'black';
                    }
                    selectedRow = row;
                    row.style.background = '#000080';
                    row.style.color = 'white';
                });
                
                row.addEventListener('dblclick', () => {
                    if (isMinimized) {
                        restoreWindow(win);
                    }
                    focusWindow(win);
                });
                
                tbody.appendChild(row);
            });
            
            tmWindow.querySelector('#task-count').textContent = windows.length - 1;
            tmWindow.querySelector('#process-count').textContent = windows.length - 1;
        }
        
        // Performance monitoring
        let perfInterval = null;
        let cpuHistory = Array(100).fill(0);
        let startTime = Date.now();
        
        function startPerformanceMonitoring() {
            const canvas = tmWindow.querySelector('#cpu-graph');
            const gpuCanvas = tmWindow.querySelector('#gpu-graph');
            if (!canvas || !gpuCanvas) return;
            const ctx = canvas.getContext('2d');
            const gpuCtx = gpuCanvas.getContext('2d');
            let gpuHistory = Array(100).fill(0);
            
            perfInterval = setInterval(() => {
                // Count actual processes (excluding Task Manager)
                const processCount = windows.filter(w => w !== tmWindow).length;
                
                // Check for too many windows - trigger BSoD
                if (processCount > 100) {
                    stopPerformanceMonitoring();
                    setTimeout(() => {
                        showMessageBox({
                            title: 'Kritikus rendszerhiba',
                            message: 'Túl sok program fut!\n\nA rendszer instabillá vált és lefagy.',
                            icon: 'error',
                            buttons: ['OK']
                        });
                        setTimeout(() => triggerBSOD(), 2000);
                    }, 500);
                    return;
                }
                
                // Dynamic CPU usage: scales with process count
                // Base: 5%, each process adds 7-12%, max 100%
                const baseCPU = 5;
                const cpuPerProcess = 7 + Math.random() * 5;
                const cpuUsage = Math.min(100, baseCPU + (processCount * cpuPerProcess) + Math.random() * 15);
                cpuHistory.push(cpuUsage);
                if (cpuHistory.length > 100) cpuHistory.shift();
                
                // Dynamic GPU usage: based on windows and graphical elements
                const baseGPU = 2;
                const gpuPerProcess = 5 + Math.random() * 4;
                const gpuUsage = Math.min(100, baseGPU + (processCount * gpuPerProcess) + Math.random() * 12);
                gpuHistory.push(gpuUsage);
                if (gpuHistory.length > 100) gpuHistory.shift();
                
                // Dynamic memory usage: 20 MB base + 8-15 MB per process
                const baseMemory = 20;
                const memPerProcess = 8 + Math.random() * 7;
                const memUsed = Math.min(128, baseMemory + (processCount * memPerProcess) + Math.random() * 5);
                const memPercent = (memUsed / 128) * 100;
                
                // CHECK FOR SYSTEM LAG - All three at 100%
                const isMaxedOut = cpuUsage >= 99.5 && memPercent >= 99 && gpuUsage >= 99.5;
                if (isMaxedOut && !window.systemLagging) {
                    window.systemLagging = true;
                    document.body.style.filter = 'saturate(0.5) brightness(0.8)';
                    document.body.style.pointerEvents = 'none';
                    setTimeout(() => {
                        document.body.style.pointerEvents = 'auto';
                    }, 3000 + Math.random() * 2000); // 3-5 second freeze
                    playSound('error');
                    showMessageBox({
                        title: 'Rendszer figyelmeztetés',
                        message: 'A rendszer erőforrásai kimerültek!\n\nCPU: 100%\nRAM: 100%\nGPU: 100%\n\nA rendszer lassú lehet. Zárjon be néhány programot!',
                        icon: 'warning',
                        buttons: ['OK']
                    });
                    setTimeout(() => {
                        document.body.style.filter = '';
                        window.systemLagging = false;
                    }, 5000);
                } else if (!isMaxedOut && window.systemLagging) {
                    document.body.style.filter = '';
                    document.body.style.pointerEvents = 'auto';
                    window.systemLagging = false;
                }
                
                // Color changes based on load
                const graphColor = cpuUsage > 80 ? '#FF0000' : cpuUsage > 50 ? '#FFFF00' : '#00FF00';
                const gpuColor = gpuUsage > 80 ? '#FF0000' : gpuUsage > 50 ? '#FFFF00' : '#00FFFF';
                
                // Draw CPU graph
                ctx.fillStyle = '#000';
                ctx.fillRect(0, 0, canvas.width, canvas.height);
                ctx.strokeStyle = graphColor;
                ctx.lineWidth = 2;
                ctx.beginPath();
                cpuHistory.forEach((val, i) => {
                    const x = (i / 100) * canvas.width;
                    const y = canvas.height - (val / 100) * canvas.height;
                    if (i === 0) ctx.moveTo(x, y);
                    else ctx.lineTo(x, y);
                });
                ctx.stroke();
                
                // Draw GPU graph
                gpuCtx.fillStyle = '#000';
                gpuCtx.fillRect(0, 0, gpuCanvas.width, gpuCanvas.height);
                gpuCtx.strokeStyle = gpuColor;
                gpuCtx.lineWidth = 2;
                gpuCtx.beginPath();
                gpuHistory.forEach((val, i) => {
                    const x = (i / 100) * gpuCanvas.width;
                    const y = gpuCanvas.height - (val / 100) * gpuCanvas.height;
                    if (i === 0) gpuCtx.moveTo(x, y);
                    else gpuCtx.lineTo(x, y);
                });
                gpuCtx.stroke();
                
                // Update percentages
                tmWindow.querySelector('#cpu-percent').textContent = Math.floor(cpuUsage);
                tmWindow.querySelector('#gpu-percent').textContent = Math.floor(gpuUsage);
                
                // Memory bar color changes based on usage
                const memBar = tmWindow.querySelector('#memory-bar');
                if (memBar) {
                    memBar.style.background = memPercent > 85 ? 'linear-gradient(to bottom, #FF0000 0%, #CC0000 100%)' : 
                                              memPercent > 60 ? 'linear-gradient(to bottom, #FFCC00 0%, #FF9900 100%)' :
                                              'linear-gradient(to bottom, #00CC00 0%, #009900 100%)';
                    memBar.style.width = memPercent + '%';
                }
                
                tmWindow.querySelector('#memory-used').textContent = Math.floor(memUsed);
                tmWindow.querySelector('#phys-available').textContent = Math.floor(128 - memUsed);
                tmWindow.querySelector('#sys-cache').textContent = Math.floor(memUsed * 0.3);
                
                // Update uptime
                const elapsed = Math.floor((Date.now() - startTime) / 1000);
                const hours = Math.floor(elapsed / 3600);
                const minutes = Math.floor((elapsed % 3600) / 60);
                const seconds = elapsed % 60;
                const timeStr = `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
                const uptimeEl = tmWindow.querySelector('#uptime');
                if (uptimeEl) uptimeEl.textContent = timeStr;
                const sysUptimeEl = tmWindow.querySelector('#sys-uptime');
                if (sysUptimeEl) sysUptimeEl.textContent = timeStr;
                
                // Update system tab RAM info
                const sysRamFree = tmWindow.querySelector('#sys-ram-free');
                if (sysRamFree) sysRamFree.textContent = Math.floor(128 - memUsed);
            }, 1000);
        }
        
        function stopPerformanceMonitoring() {
            if (perfInterval) {
                clearInterval(perfInterval);
                perfInterval = null;
            }
        }

        // Function to end selected task
        function endSelectedTask() {
            if (selectedRow) {
                const windowId = selectedRow.dataset.windowId;
                const targetWindow = windows.find(w => w.id === windowId);
                if (targetWindow) {
                    // Stop audio if this window has it
                    if (targetWindow._idiotAudio) {
                        targetWindow._idiotAudio.pause();
                        targetWindow._idiotAudio.currentTime = 0;
                        targetWindow._idiotAudio = null;
                    }
                    // Stop movement interval if exists
                    if (targetWindow._moveInterval) {
                        clearInterval(targetWindow._moveInterval);
                    }
                    closeWindow(targetWindow);
                    playSound('close');
                    selectedRow = null;
                    refreshTaskList();
                }
            } else {
                playSound('error');
                showMessageBox({title: 'Feladatkezelő', message: 'Válasszon ki egy feladatot a befejezéshez.', icon: 'warning', buttons: ['OK']});
            }
        }
        
        // End Task button
        tmWindow.querySelector('#tm-end-task').addEventListener('click', endSelectedTask);
        
        // Delete key support for killing tasks
        const taskManagerKeyHandler = (e) => {
            if (e.key === 'Delete' && tmWindow.classList.contains('active')) {
                e.preventDefault();
                endSelectedTask();
            }
        };
        document.addEventListener('keydown', taskManagerKeyHandler);
        
        // Clean up event listener when Task Manager closes
        const originalTMClose = () => {
            document.removeEventListener('keydown', taskManagerKeyHandler);
            stopPerformanceMonitoring();
        };
        tmWindow.addEventListener('close', originalTMClose);
        
        // Switch To button
        tmWindow.querySelector('#tm-switch-to')?.addEventListener('click', () => {
            if (selectedRow) {
                const windowId = selectedRow.dataset.windowId;
                const targetWindow = windows.find(w => w.id === windowId);
                if (targetWindow) {
                    if (targetWindow.classList.contains('minimized')) {
                        restoreWindow(targetWindow);
                    }
                    focusWindow(targetWindow);
                    playSound('click');
                }
            } else {
                playSound('error');
                showMessageBox({title: 'Feladatkezelő', message: 'Válasszon ki egy feladatot.', icon: 'warning', buttons: ['OK']});
            }
        });
        
        // New Task button
        tmWindow.querySelector('#tm-new-task')?.addEventListener('click', () => {
            const appName = prompt('Adja meg az alkalmazás nevét:\\n\\nPéldák:\\n- Notepad (Jegyzettömb)\\n- Paint\\n- Calculator (Számológép)\\n- Minesweeper (Aknakereső)');
            if (!appName) return;
            
            const appMap = {
                'notepad': openNotepad,
                'jegyzettömb': openNotepad,
                'paint': openPaint,
                'calculator': openCalculator,
                'számológép': openCalculator,
                'calc': openCalculator,
                'minesweeper': openMinesweeper,
                'aknakereső': openMinesweeper,
                'pinball': openPinball,
                'ie': openBrowser,
                'internet explorer': openBrowser,
                'explorer': openWindowsExplorer
            };
            
            const func = appMap[appName.toLowerCase()];
            if (func) {
                func();
                playSound('open');
                setTimeout(refreshTaskList, 100);
            } else {
                playSound('error');
                showMessageBox({title: 'Hiba', message: `Az alkalmazás "${appName}" nem található.`, icon: 'error', buttons: ['OK']});
            }
        });

        // Refresh button
        tmWindow.querySelector('#tm-refresh').addEventListener('click', () => {
            playSound('click');
            selectedRow = null;
            refreshTaskList();
        });

        // Auto-refresh every 2 seconds
        const refreshInterval = setInterval(() => {
            if (!document.body.contains(tmWindow)) {
                clearInterval(refreshInterval);
                return;
            }
            refreshTaskList();
        }, 2000);

        // Initial load
        refreshTaskList();
    }

    // --- You Are An Idiot Malware Simulation ---
    let youAreAnIdiotPopups = [];
    let youAreAnIdiotAudio = null;
    let idiotWarningTimeout = null;
    
    // Monitor for idiot popups and show warning after delay
    function checkIdiotPopups() {
        // Count active idiot popups
        const activeIdiotPopups = windows.filter(w => 
            w.querySelector('.titlebar-text')?.textContent === 'You are an idiot!' &&
            document.body.contains(w)
        ).length;
        
        // If popups exist and no timeout is running, start one
        if (activeIdiotPopups > 0 && !idiotWarningTimeout) {
            const delay = 10000 + Math.random() * 10000; // 10-20 seconds
            idiotWarningTimeout = setTimeout(() => {
                // Check again if popups still exist
                const stillActive = windows.filter(w => 
                    w.querySelector('.titlebar-text')?.textContent === 'You are an idiot!' &&
                    document.body.contains(w)
                ).length;
                
                if (stillActive > 0) {
                    playSound('error');
                    showMessageBox({
                        title: 'Warning',
                        message: 'You are an idiot!\n\nYour computer has been infected with annoying popups.\n\nUse Task Manager (Ctrl+Shift+Esc) to close them!',
                        icon: 'warning',
                        buttons: ['OK']
                    });
                }
                idiotWarningTimeout = null;
            }, delay);
        }
        
        // If no popups, clear timeout
        if (activeIdiotPopups === 0 && idiotWarningTimeout) {
            clearTimeout(idiotWarningTimeout);
            idiotWarningTimeout = null;
        }
    }
    
    // Check every 2 seconds
    setInterval(checkIdiotPopups, 2000);
    
    // --- Windows 98 Team Easter Egg ---
    let easterEggBuffer = '';
    document.addEventListener('keypress', (e) => {
        easterEggBuffer += e.key.toLowerCase();
        if (easterEggBuffer.length > 20) {
            easterEggBuffer = easterEggBuffer.slice(-20);
        }
        
        if (easterEggBuffer.includes('win98team')) {
            easterEggBuffer = '';
            showWindows98Team();
        }
    });
    
    function showWindows98Team() {
        const teamContent = `
            <div style="padding: 20px; font-family: Arial, sans-serif; background: linear-gradient(to bottom, #000080 0%, #0066CC 100%); color: white; height: 100%; overflow-y: auto;">
                <div style="text-align: center; margin-bottom: 30px;">
                    <img src="https://win98icons.alexmeub.com/icons/png/windows-4.png" style="width: 64px; height: 64px;">
                    <h1 style="margin: 10px 0; font-size: 28px; text-shadow: 2px 2px 4px rgba(0,0,0,0.5);">Windows 98 Team</h1>
                    <div style="font-size: 14px; opacity: 0.9;">Az emberek, akik lehetővé tették ezt a szimulátort</div>
                </div>
                
                <div style="background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.3); padding: 20px; margin-bottom: 20px; border-radius: 8px;">
                    <h2 style="margin-top: 0; font-size: 18px; border-bottom: 2px solid rgba(255,255,255,0.5); padding-bottom: 8px;">🎮 Fő Fejlesztő</h2>
                    <div style="font-size: 14px; line-height: 2;">
                        <div><strong>NagyLevediScratch10</strong></div>
                        <div style="opacity: 0.8; font-size: 12px;">Projektvezető, fő programozó és dizájner</div>
                    </div>
                </div>
                
                <div style="background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.3); padding: 20px; margin-bottom: 20px; border-radius: 8px;">
                    <h2 style="margin-top: 0; font-size: 18px; border-bottom: 2px solid rgba(255,255,255,0.5); padding-bottom: 8px;">🛠️ Közreműködők</h2>
                    <div style="font-size: 13px; line-height: 1.8;">
                        <div>• <strong>win98icons.alexmeub.com</strong> - Windows 98 ikonok gyűjteménye</div>
                        <div>• <strong>iframe.chat</strong> - Chattable iframe az MSN Messenger-hez</div>
                        <div>• <strong>101soundboard.com</strong> - Hangok forrása</div>
                        <div>• <strong>pixabay.com</strong> - Ingyenes egér kattintás hangja</div>
                        <div>• <strong>rw-designer.com</strong> - Saját egérmutató készítése</div>
                        <div>• <strong>98.js.org</strong> - 3D Pinball és Aknakereső játékok</div>
                        <div>• <strong>Mat Brennan (loadx)</strong> - Wolfenstein 3D HTML5 port</div>
                        <div>• <strong>Urbanmove 8</strong> - Fejlesztési idő szponzorálásáért</div>
                    </div>
                </div>
                
                <div style="background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.3); padding: 20px; margin-bottom: 20px; border-radius: 8px;">
                    <h2 style="margin-top: 0; font-size: 18px; border-bottom: 2px solid rgba(255,255,255,0.5); padding-bottom: 8px;">🎆 Külön Köszönet</h2>
                    <div style="font-size: 13px; line-height: 1.8;">
                        <div>• A Béta Tesztelő közösségnek a szigorú tesztelésért</div>
                        <div>• Mindenkinek, aki visszajelzést adott és hibákat jelentett</div>
                        <div>• A Windows 98 nosztalgikus közösségnek a támogatásáért</div>
                    </div>
                </div>
                
                <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid rgba(255,255,255,0.3);">
                    <div style="font-size: 12px; opacity: 0.8;">
                        Windows 98 Web Szimulátor v0.9 Béta<br>
                        © 1981-1999 Microsoft Corporation (eredeti OS)<br>
                        © 2025 NagyLevediScratch10 (web szimulátor)<br>
                        <br>
                        <em>"A nosztalgikus élmény újraéled..."</em>
                    </div>
                </div>
            </div>
        `;
        
        createWindow({
            title: 'Windows 98 Team - Easter Egg',
            icon: 'https://win98icons.alexmeub.com/icons/png/windows-4.png',
            width: 600,
            height: 500,
            content: teamContent
        });
        
        playSound('ding');
    }

    function loadYouAreAnIdiot(iframe, browserWindow) {
        window.youAreAnIdiotActive = true;
        
        // Create the HTML content for the page
        const idiotHTML = `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <title>You are an idiot!</title>
                <style>
                    body {
                        margin: 0;
                        padding: 0;
                        background: black;
                        display: flex;
                        justify-content: center;
                        align-items: center;
                        height: 100vh;
                        overflow: hidden;
                    }
                    video {
                        max-width: 100%;
                        max-height: 100%;
                    }
                </style>
            </head>
            <body>
                <video autoplay loop muted playsinline>
                    <source src="https://github.com/urbanmove8-qatar/urbanmove-media/raw/refs/heads/main/videoplayback%20(3).mp4" type="video/mp4">
                </video>
            </body>
            </html>
        `;
        
        // Load the HTML into the iframe
        const blob = new Blob([idiotHTML], { type: 'text/html' });
        iframe.src = URL.createObjectURL(blob);
        
        // Play the audio
        if (youAreAnIdiotAudio) {
            youAreAnIdiotAudio.pause();
            youAreAnIdiotAudio.currentTime = 0;
        }
        youAreAnIdiotAudio = new Audio('https://static.wikia.nocookie.net/malware-history/images/e/e0/YouAreAnIdiot_audio.wav/revision/latest?cb=20221111195341');
        youAreAnIdiotAudio.loop = true;
        youAreAnIdiotAudio.play().catch(e => console.log('Audio play failed:', e));
    }

    function startYouAreAnIdiotPopups() {
        // Stop the audio
        if (youAreAnIdiotAudio) {
            youAreAnIdiotAudio.pause();
            youAreAnIdiotAudio = null;
        }
        
        // Create multiple popup windows that move around
        const numPopups = 5;
        
        for (let i = 0; i < numPopups; i++) {
            setTimeout(() => {
                createMovingIdiotPopup();
            }, i * 200);
        }
    }

    function createMovingIdiotPopup() {
        const idiotContent = `
            <div style="display: flex; justify-content: center; align-items: center; height: 100%; background: black;">
                <video autoplay loop muted playsinline style="width: 100%; height: 100%; object-fit: contain;">
                    <source src="https://github.com/urbanmove8-qatar/urbanmove-media/raw/refs/heads/main/videoplayback%20(3).mp4" type="video/mp4">
                </video>
            </div>
        `;
        
        // Random position
        const maxX = window.innerWidth - 300;
        const maxY = window.innerHeight - 250;
        const startX = Math.random() * maxX;
        const startY = Math.random() * maxY;
        
        const popup = createWindow({
            title: "You are an idiot!",
            icon: "https://win98icons.alexmeub.com/icons/png/msie1-0.png",
            width: 250,
            height: 200,
            content: idiotContent,
            x: startX,
            y: startY
        });
        
        // Play audio in each popup and store reference in window
        const popupAudio = new Audio('https://static.wikia.nocookie.net/malware-history/images/e/e0/YouAreAnIdiot_audio.wav/revision/latest?cb=20221111195341');
        popupAudio.loop = true;
        popupAudio.play().catch(e => console.log('Audio play failed:', e));
        popup._idiotAudio = popupAudio; // Store audio reference for cleanup
        
        // Make the window move around randomly (faster)
        let velocityX = (Math.random() - 0.5) * 8;
        let velocityY = (Math.random() - 0.5) * 8;
        let posX = startX;
        let posY = startY;
        
        const moveInterval = setInterval(() => {
            // Check if window still exists
            if (!document.body.contains(popup)) {
                clearInterval(moveInterval);
                if (popup._idiotAudio) {
                    popup._idiotAudio.pause();
                    popup._idiotAudio.currentTime = 0;
                    popup._idiotAudio = null;
                }
                youAreAnIdiotPopups = youAreAnIdiotPopups.filter(p => p !== popup);
                return;
            }
            
            // Update position
            posX += velocityX;
            posY += velocityY;
            
            // Bounce off edges
            const rect = popup.getBoundingClientRect();
            if (posX <= 0 || posX + rect.width >= window.innerWidth) {
                velocityX = -velocityX;
                posX = Math.max(0, Math.min(posX, window.innerWidth - rect.width));
            }
            if (posY <= 0 || posY + rect.height >= window.innerHeight - 28) { // 28px for taskbar
                velocityY = -velocityY;
                posY = Math.max(0, Math.min(posY, window.innerHeight - rect.height - 28));
            }
            
            popup.style.left = posX + 'px';
            popup.style.top = posY + 'px';
        }, 30);
        
        popup._moveInterval = moveInterval; // Store interval reference for cleanup
        youAreAnIdiotPopups.push(popup);
        
        // Trigger warning check
        checkIdiotPopups();
        
        // Override close button to create more popups
        const closeBtn = popup.querySelector('.close-btn');
        const originalClose = closeBtn.onclick;
        closeBtn.onclick = (e) => {
            e.preventDefault();
            e.stopPropagation();
            
            // Small chance to actually close (20%)
            if (Math.random() < 0.2) {
                clearInterval(moveInterval);
                if (popup._idiotAudio) {
                    popup._idiotAudio.pause();
                    popup._idiotAudio.currentTime = 0;
                    popup._idiotAudio = null;
                }
                if (originalClose) originalClose();
                else closeWindow(popup);
            } else {
                // Create four more popups instead!
                createMovingIdiotPopup();
                createMovingIdiotPopup();
                createMovingIdiotPopup();
                createMovingIdiotPopup();
            }
        };
    }

    // EMOJI Registry Program
    let currentEmoFile = null;
    let selectedEmojiIndex = -1;

    function openEmojiRegistry() {
        playSound('click');
        const winId = 'emoji-registry-' + Date.now();
        
        const win = createWindow({
            id: winId,
            title: 'EMOJI Registry',
            content: `
                <div style="display: flex; flex-direction: column; height: 100%; background: #c0c0c0;">
                    <div style="background: #c0c0c0; padding: 2px; border-bottom: 1px solid #808080;">
                        <button onclick="emojiRegistryMenu('open')" style="margin: 2px; padding: 4px 10px;">📂 Open</button>
                        <button onclick="emojiRegistryMenu('save')" style="margin: 2px; padding: 4px 10px;">💾 Save</button>
                        <button onclick="emojiRegistryMenu('new')" style="margin: 2px; padding: 4px 10px;">📄 New</button>
                        <button onclick="emojiRegistryMenu('add')" style="margin: 2px; padding: 4px 10px;">➕ Add Emoji</button>
                        <button onclick="emojiRegistryMenu('remove')" style="margin: 2px; padding: 4px 10px;">➖ Remove</button>
                    </div>
                    <div style="flex: 1; display: flex; overflow: hidden;">
                        <div id="emoji-grid" style="flex: 2; overflow-y: auto; padding: 10px; background: white; border: 2px inset #808080; margin: 5px;">
                            <div style="text-align: center; color: #808080; padding: 50px;">No .emo file loaded</div>
                        </div>
                        <div id="emoji-properties" style="flex: 1; overflow-y: auto; padding: 10px; background: white; border: 2px inset #808080; margin: 5px;">
                            <div style="font-family: 'MS Sans Serif', sans-serif; font-size: 13px; color: #000;">
                                <b>File Properties:</b><br><br>
                                <div id="emoji-file-props" style="font-size: 13px; color: #000;">No file selected</div>
                            </div>
                        </div>
                    </div>
                    <div style="background: #c0c0c0; padding: 5px; border-top: 2px solid white; font-family: 'MS Sans Serif', sans-serif; font-size: 11px;">
                        <span id="emoji-status">Ready</span>
                    </div>
                </div>
            `,
            width: 800,
            height: 600,
            x: 100,
            y: 80
        });
        
        // Load default file if exists
        loadSpecificEmoFile('💻😎😠💀😭.emo');
    }

    function openEmojiRegistryWithFile(filename) {
        openEmojiRegistry();
        setTimeout(() => {
            loadSpecificEmoFile(filename);
        }, 100);
    }

    function loadSpecificEmoFile(filename) {
        const saved = localStorage.getItem('emo_' + filename);
        let emoData;
        
        if (saved) {
            emoData = JSON.parse(saved);
        } else {
            // Create default file
            emoData = {
                name: filename,
                version: "1.0",
                author: "NagyLevediScratch10",
                created: new Date().toISOString().split('T')[0],
                format: "JSON/XML",
                emojis: [
                    {char: "🙍", name: "Person Frowning", unicode: "U+1F64D"},
                    {char: "😫", name: "Tired Face", unicode: "U+1F62B"},
                    {char: "😂", name: "Laughing", unicode: "U+1F602"},
                    {char: "👩", name: "Woman", unicode: "U+1F469"},
                    {char: "👨", name: "Man", unicode: "U+1F468"},
                    {char: "💻", name: "Computer", unicode: "U+1F4BB"},
                    {char: "😎", name: "Cool Face", unicode: "U+1F60E"},
                    {char: "😠", name: "Angry Face", unicode: "U+1F620"},
                    {char: "😭", name: "Crying Face", unicode: "U+1F62D"},
                    {char: "💀", name: "Skull", unicode: "U+1F480"}
                ]
            };
            localStorage.setItem('emo_' + filename, JSON.stringify(emoData));
        }
        
        currentEmoFile = emoData;
        displayEmoFile(emoData);
        
        const statusEl = document.getElementById('emoji-status');
        if (statusEl) {
            statusEl.textContent = `Loaded: ${filename} (${emoData.emojis.length} emojis)`;
        }
    }

    function displayEmoFile(emoData) {
        const gridEl = document.getElementById('emoji-grid');
        const propsEl = document.getElementById('emoji-file-props');
        
        if (!gridEl || !propsEl) return;
        
        // Display emoji grid
        let gridHtml = '<div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(80px, 1fr)); gap: 10px;">';
        emoData.emojis.forEach((emoji, index) => {
            gridHtml += `
                <div onclick="selectEmoji(${index})" 
                     id="emoji-card-${index}"
                     style="border: 2px outset #c0c0c0; padding: 10px; text-align: center; cursor: pointer; background: #c0c0c0;
                            transition: all 0.1s;">
                    <div style="font-size: 32px; margin-bottom: 5px;">${emoji.char}</div>
                    <div style="font-family: 'MS Sans Serif', sans-serif; font-size: 9px; overflow: hidden; text-overflow: ellipsis;">${emoji.name}</div>
                </div>
            `;
        });
        gridHtml += '</div>';
        gridEl.innerHTML = gridHtml;
        
        // Display file properties
        propsEl.innerHTML = `
            <div style="font-size: 13px; color: #000;">
            <b>Name:</b> ${emoData.name}<br><br>
            <b>Version:</b> ${emoData.version}<br><br>
            <b>Author:</b> ${emoData.author}<br><br>
            <b>Created:</b> ${emoData.created}<br><br>
            <b>Format:</b> ${emoData.format || 'JSON/XML'}<br><br>
            <b>Total Emojis:</b> ${emoData.emojis.length}<br><br>
            <hr>
            <div id="selected-emoji-info" style="font-size: 13px; color: #000;">Click an emoji to see details</div>
            </div>
        `;
    }

    function selectEmoji(index) {
        selectedEmojiIndex = index;
        
        // Remove previous selection
        document.querySelectorAll('[id^="emoji-card-"]').forEach(card => {
            card.style.border = '2px outset #c0c0c0';
            card.style.background = '#c0c0c0';
        });
        
        // Highlight selected
        const card = document.getElementById('emoji-card-' + index);
        if (card) {
            card.style.border = '2px solid #000080';
            card.style.background = '#0000aa';
            card.style.color = 'white';
        }
        
        // Update info panel
        const infoEl = document.getElementById('selected-emoji-info');
        if (infoEl && currentEmoFile && currentEmoFile.emojis[index]) {
            const emoji = currentEmoFile.emojis[index];
            infoEl.innerHTML = `
                <div style="font-size: 13px; color: #000;">
                <b>Selected Emoji:</b><br><br>
                <div style="font-size: 48px; text-align: center; margin: 10px 0;">${emoji.char}</div>
                <b>Name:</b> ${emoji.name}<br><br>
                <b>Unicode:</b> ${emoji.unicode}<br><br>
                <b>Index:</b> ${index}
                </div>
            `;
        }
    }

    function emojiRegistryMenu(menu) {
        playSound('click');
        
        if (menu === 'open') {
            showInputDialog('Open File', 'Enter .emo filename to open:', '🙍😫😂👩👨💻😎😠😭💀.emo', (filename) => {
                if (filename) {
                    loadSpecificEmoFile(filename);
                }
            });
        } else if (menu === 'save') {
            if (!currentEmoFile) {
                showMessageBox('Error', 'No file to save!', ['OK']);
                return;
            }
            localStorage.setItem('emo_' + currentEmoFile.name, JSON.stringify(currentEmoFile));
            showMessageBox('Success', 'File saved successfully!', ['OK']);
            playSound('notify');
        } else if (menu === 'new') {
            showInputDialog('New File', 'Enter new .emo filename:', 'myemojis.emo', (filename) => {
                if (filename) {
                    const newEmo = {
                        name: filename,
                        version: "1.0",
                        author: "User",
                        created: new Date().toISOString().split('T')[0],
                        format: "JSON/XML",
                        emojis: []
                    };
                    currentEmoFile = newEmo;
                    localStorage.setItem('emo_' + filename, JSON.stringify(newEmo));
                    displayEmoFile(newEmo);
                    document.getElementById('emoji-status').textContent = `Created: ${filename}`;
                }
            });
        } else if (menu === 'add') {
            if (!currentEmoFile) {
                showMessageBox('Error', 'No file loaded!', ['OK']);
                return;
            }
            showInputDialog('Add Emoji', 'Enter emoji character:', '🎨', (char) => {
                if (!char) return;
                showInputDialog('Add Emoji', 'Enter emoji name:', 'Custom Emoji', (name) => {
                    if (!name) return;
                    
                    // Try to get unicode
                    let unicode = '';
                    try {
                        unicode = Array.from(char).map(c => 'U+' + c.codePointAt(0).toString(16).toUpperCase()).join(' ');
                    } catch(e) {
                        unicode = 'Unknown';
                    }
                    
                    currentEmoFile.emojis.push({char, name, unicode});
                    localStorage.setItem('emo_' + currentEmoFile.name, JSON.stringify(currentEmoFile));
                    displayEmoFile(currentEmoFile);
                    document.getElementById('emoji-status').textContent = `Added: ${name}`;
                    playSound('notify');
                });
            });
        } else if (menu === 'remove') {
            if (!currentEmoFile) {
                showMessageBox('Error', 'No file loaded!', ['OK']);
                return;
            }
            if (selectedEmojiIndex < 0 || selectedEmojiIndex >= currentEmoFile.emojis.length) {
                showMessageBox('Error', 'No emoji selected!', ['OK']);
                return;
            }
            
            const emoji = currentEmoFile.emojis[selectedEmojiIndex];
            if (!emoji) {
                showMessageBox('Error', 'Emoji not found!', ['OK']);
                return;
            }
            
            const emojiName = emoji.name;
            showMessageBox('Confirm Delete', `Delete "${emojiName}"?`, [
                {text: 'Yes', callback: () => {
                    if (currentEmoFile && currentEmoFile.emojis[selectedEmojiIndex]) {
                        currentEmoFile.emojis.splice(selectedEmojiIndex, 1);
                        localStorage.setItem('emo_' + currentEmoFile.name, JSON.stringify(currentEmoFile));
                        selectedEmojiIndex = -1;
                        displayEmoFile(currentEmoFile);
                        document.getElementById('emoji-status').textContent = `Deleted: ${emojiName}`;
                        playSound('error');
                    }
                }},
                'No'
            ]);
        }
    }
