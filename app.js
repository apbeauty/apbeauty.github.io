// AP BEAUTY BI Manual Application Controller

// Dynamic Injection of CSS to bypass cache and solve range input issues completely
(function injectSliderStyles() {
    const styleId = 'injected-slider-styles';
    if (document.getElementById(styleId)) return;
    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = `
        /* Invisible native input - handles drag/click interaction */
        [id^="wordmark-size-slider"] {
            -webkit-appearance: none !important;
            appearance: none !important;
            position: absolute !important;
            top: 0 !important;
            left: 0 !important;
            width: 100% !important;
            height: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            opacity: 0 !important;
            cursor: pointer !important;
            z-index: 2 !important;
            background: transparent !important;
            border: none !important;
            outline: none !important;
            box-sizing: border-box !important;
        }
        [id^="wordmark-size-slider"]::-webkit-slider-runnable-track {
            background: transparent !important;
            border: none !important;
            height: 100% !important;
            width: 100% !important;
        }
        [id^="wordmark-size-slider"]::-moz-range-track {
            background: transparent !important;
            border: none !important;
            height: 100% !important;
            width: 100% !important;
        }
        /* Make the webkit and firefox range thumb 1px wide so it can reach absolute edges (0% and 100%) */
        [id^="wordmark-size-slider"]::-webkit-slider-thumb {
            -webkit-appearance: none !important;
            appearance: none !important;
            width: 1px !important;
            height: 20px !important;
            background: transparent !important;
            border: none !important;
            cursor: pointer !important;
        }
        [id^="wordmark-size-slider"]::-moz-range-thumb {
            width: 1px !important;
            height: 20px !important;
            background: transparent !important;
            border: none !important;
            cursor: pointer !important;
        }
        /* Visible track line spanning the full wrapper width */
        [id^="slider-track-line"] {
            position: absolute !important;
            top: 50% !important;
            left: 0 !important;
            right: 0 !important;
            height: 2px !important;
            background: var(--slider-track-color, rgba(0, 0, 0, 0.12)) !important;
            transform: translateY(-50%) !important;
            pointer-events: none !important;
            z-index: 0 !important;
        }
        /* Visible thumb circle - positioned via JS at exact percentage */
        [id^="slider-visual-thumb"] {
            position: absolute !important;
            top: 50% !important;
            width: 10px !important;
            height: 10px !important;
            border-radius: 50% !important;
            background: var(--slider-thumb-color, #555555) !important;
            transform: translate(-50%, -50%) !important;
            pointer-events: none !important;
            z-index: 1 !important;
            left: 100%; /* default at max */
            transition: left 0.05s ease !important;
            box-sizing: border-box !important;
        }
    `;
    document.head.appendChild(style);
})();

let guidelineData = null;
let activeSectionId = '';
let activeBlockId = '';
let isScrollingManual = false;
let manualScrollTimer = null;
let currentLang = 'ko'; // 'ko' or 'en'

function updateLanguageClass() {
    if (currentLang === 'en') {
        document.body.classList.add('lang-en');
        document.body.classList.remove('lang-ko');
    } else {
        document.body.classList.add('lang-ko');
        document.body.classList.remove('lang-en');
    }
}

// DOM Elements
const sidebarLinks = document.getElementById('nav-links');
const sectionsWrapper = document.getElementById('sections-wrapper');
const menuToggleBtn = document.getElementById('menu-toggle-btn');
const appSidebar = document.getElementById('app-sidebar');
const headerNavLinks = document.getElementById('header-nav-links');

// Initialize App
window.addEventListener('DOMContentLoaded', () => {
    updateLanguageClass();
    fetchGuidelinesData();
    setupEventListeners();
});

// Setup Global Event Listeners
function setupEventListeners() {
    const brandLogo = document.querySelector('.brand-logo');
    const mobileLogoBtn = document.getElementById('mobile-logo-btn');
    const sidebarOverlay = document.getElementById('sidebar-overlay');
    const mobileMenuDropdown = document.getElementById('mobile-menu-dropdown');
    
    // Logo click to scroll to top (Desktop)
    if (brandLogo) {
        brandLogo.addEventListener('click', () => {
            window.scrollTo({
                top: 0,
                behavior: 'smooth'
            });
            activeSectionId = '';
            updateActiveNavLink('', '');
            // Clear search query
            syncSearch('');
        });
    }

    // Logo click to scroll to top (Mobile)
    if (mobileLogoBtn) {
        mobileLogoBtn.addEventListener('click', () => {
            window.scrollTo({
                top: 0,
                behavior: 'smooth'
            });
            activeSectionId = '';
            updateActiveNavLink('', '');
            // Clear search query
            syncSearch('');
            // Close mobile menu dropdown and overlay
            if (mobileMenuDropdown) mobileMenuDropdown.classList.remove('active');
            if (sidebarOverlay) sidebarOverlay.classList.remove('active');
            if (menuToggleBtn) menuToggleBtn.classList.remove('open');
        });
    }

    // Mobile menu toggle (Hamburger Button)
    if (menuToggleBtn && mobileMenuDropdown) {
        menuToggleBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            const isActive = mobileMenuDropdown.classList.toggle('active');
            menuToggleBtn.classList.toggle('open', isActive);
            if (sidebarOverlay) {
                sidebarOverlay.classList.toggle('active', isActive);
            }
        });
    }

    // Sidebar Overlay Click (Close Dropdown Menu)
    if (sidebarOverlay) {
        sidebarOverlay.addEventListener('click', () => {
            if (mobileMenuDropdown) mobileMenuDropdown.classList.remove('active');
            sidebarOverlay.classList.remove('active');
            if (menuToggleBtn) menuToggleBtn.classList.remove('open');
        });
    }

    // Close mobile menu when clicking outside
    document.addEventListener('click', (e) => {
        if (mobileMenuDropdown && mobileMenuDropdown.classList.contains('active')) {
            if (!mobileMenuDropdown.contains(e.target) && (!menuToggleBtn || !menuToggleBtn.contains(e.target))) {
                mobileMenuDropdown.classList.remove('active');
                if (sidebarOverlay) sidebarOverlay.classList.remove('active');
                if (menuToggleBtn) menuToggleBtn.classList.remove('open');
            }
        }
    });

    // Search Synchronizer & Initializer
    const sidebarSearch = document.getElementById('sidebar-search-input');
    const mobileDropdownSearch = document.getElementById('mobile-dropdown-search-input');
    const mobileDropdownSearchClear = document.getElementById('mobile-dropdown-search-clear');
    const searchClearBtn = document.getElementById('search-clear-btn');

    function syncSearch(query) {
        const normalized = query.toLowerCase().trim();
        if (sidebarSearch) sidebarSearch.value = query;
        if (mobileDropdownSearch) mobileDropdownSearch.value = query;
        
        // Show/hide clear button in mobile search
        if (mobileDropdownSearchClear) {
            mobileDropdownSearchClear.style.display = query ? 'flex' : 'none';
        }
        
        handleSearch(normalized);
    }

    if (sidebarSearch) {
        let debounceTimer;
        sidebarSearch.addEventListener('input', (e) => {
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(() => {
                syncSearch(e.target.value);
            }, 150);
        });
    }

    if (mobileDropdownSearch) {
        let debounceTimer;
        mobileDropdownSearch.addEventListener('input', (e) => {
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(() => {
                syncSearch(e.target.value);
            }, 150);
        });
        
        // Prevent closing dropdown when clicking input
        mobileDropdownSearch.addEventListener('click', (e) => {
            e.stopPropagation();
        });

        // Close dropdown menu when pressing Enter key
        mobileDropdownSearch.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                if (e.isComposing) return; // Prevent IME double commit duplication
                
                mobileDropdownSearch.blur(); // Hide virtual keyboard
                
                const mobileMenuDropdown = document.getElementById('mobile-menu-dropdown');
                if (mobileMenuDropdown) {
                    mobileMenuDropdown.classList.remove('active');
                }
                const sidebarOverlay = document.getElementById('sidebar-overlay');
                if (sidebarOverlay) {
                    sidebarOverlay.classList.remove('active');
                }
                const menuToggleBtn = document.getElementById('menu-toggle-btn');
                if (menuToggleBtn) {
                    menuToggleBtn.classList.remove('open');
                }
            }
        });
    }

    if (searchClearBtn) {
        searchClearBtn.addEventListener('click', () => {
            syncSearch('');
            if (sidebarSearch) sidebarSearch.focus();
        });
    }

    if (mobileDropdownSearchClear) {
        mobileDropdownSearchClear.addEventListener('click', (e) => {
            e.stopPropagation();
            syncSearch('');
            if (mobileDropdownSearch) mobileDropdownSearch.focus();
        });
    }

    // Language toggle buttons listener and synchronizer
    const langToggleBtn = document.getElementById('lang-toggle-btn');
    const headerLangToggleBtn = document.getElementById('header-lang-toggle-btn');
    
    function toggleLanguage() {
        currentLang = currentLang === 'ko' ? 'en' : 'ko';
        updateLanguageClass();
        const targetLabel = currentLang === 'ko' ? 'EN' : 'KR';
        const targetTitle = currentLang === 'ko' ? 'Language' : '언어 변경';
        
        if (langToggleBtn) {
            langToggleBtn.textContent = targetLabel;
        }
        if (headerLangToggleBtn) {
            headerLangToggleBtn.textContent = targetLabel;
            headerLangToggleBtn.setAttribute('title', targetTitle);
        }
        
        // Update browser-native titles on static elements
        const isEn = currentLang === 'en';
        const searchClearBtn = document.getElementById('search-clear-btn');
        if (searchClearBtn) {
            searchClearBtn.setAttribute('title', isEn ? 'Clear search' : '검색 지우기');
        }
        const mobileDropdownSearch = document.getElementById('mobile-dropdown-search-input');
        if (mobileDropdownSearch) {
            mobileDropdownSearch.placeholder = 'SEARCH';
        }
        const mobileDropdownClear = document.getElementById('mobile-dropdown-search-clear');
        if (mobileDropdownClear) {
            mobileDropdownClear.setAttribute('title', isEn ? 'Clear search' : '검색 지우기');
        }
        const mToggleBtn = document.getElementById('menu-toggle-btn');
        if (mToggleBtn) {
            mToggleBtn.setAttribute('title', isEn ? 'Menu' : '메뉴');
        }
        
        // Re-render components with translated contents
        renderSidebar();
        renderAllSections();
        updateActiveNavLink(activeSectionId, activeBlockId);
        
        // Show toast
        if (currentLang === 'en') {
            showToast('Language changed to English');
        } else {
            showToast('언어가 한국어로 변경되었습니다');
        }
    }
    
    if (langToggleBtn) {
        langToggleBtn.addEventListener('click', toggleLanguage);
    }
    if (headerLangToggleBtn) {
        headerLangToggleBtn.addEventListener('click', toggleLanguage);
    }
    if (sidebarLinks) {
        sidebarLinks.addEventListener('mouseleave', () => {
            updateActiveNavLink(activeSectionId, activeBlockId);
        });
    }
}

// Fetch Guidelines JSON
async function fetchGuidelinesData() {
    let loaded = false;

    // 1. Load from window.guidelineData immediately if available (instant local offline rendering)
    if (window.guidelineData) {
        guidelineData = window.guidelineData;
        renderSidebar();
        renderAllSections();
        setupScrollSpy();
        loaded = true;
        console.log("Loaded data from local fallback script (data.js) instantly.");
    }

    try {
        const response = await fetch('data.json');
        if (response && response.ok) {
            const serverData = await response.json();
            // Compare and only update if data is different
            if (!loaded || JSON.stringify(serverData) !== JSON.stringify(guidelineData)) {
                guidelineData = serverData;
                renderSidebar();
                renderAllSections();
                setupScrollSpy();
                loaded = true;
                console.log("Loaded/Updated data from active server (data.json).");
            }
        }
    } catch (error) {
        console.warn("Could not fetch data.json, using local fallback.", error);
    }

    // If both failed to load, display the error state
    if (!loaded) {
        const errMsg = currentLang === 'en' ? '⚠️ Could not load guidelines data.' : '⚠️ 가이드라인 데이터를 로드할 수 없습니다.';
        const subMsg = currentLang === 'en' ? 'Please verify that data.json is in the correct directory.' : 'data.json 파일이 올바르게 위치해 있는지 확인해주세요.';
        sectionsWrapper.innerHTML = `
            <div class="loader-container">
                <div class="error-msg" style="font-size: 1.2rem; text-align: center;">
                    ${errMsg}<br>
                    <small style="color: var(--ap-gray); font-size: 0.9rem;">${subMsg}</small>
                </div>
            </div>
        `;
        showToast(currentLang === 'en' ? "Data load failed" : "데이터 로드 실패", true);
    }
}


// Render Sidebar Navigation Links (One-Page scroll links)
function renderSidebar() {
    if (!guidelineData || !guidelineData.sections) return;
    
    sidebarLinks.innerHTML = '';
    const mobileMenuNav = document.getElementById('mobile-menu-nav');
    if (mobileMenuNav) {
        mobileMenuNav.innerHTML = '';
    }
    
    guidelineData.sections.forEach(section => {
        // Sidebar link
        const link = document.createElement('a');
        link.href = `#${section.id}`;
        link.className = `nav-link ${section.id === activeSectionId ? 'active' : ''}`;
        
        const secTitle = (currentLang === 'en' && section.title_en) ? section.title_en : section.title;
        link.innerHTML = `
            <span style="position: relative; display: inline-block;">
                ${secTitle}
            </span>
        `;
        
        link.addEventListener('mouseenter', () => {
            const submenus = sidebarLinks.querySelectorAll('.nav-submenu');
            submenus.forEach(sub => {
                if (sub.id === `submenu-${section.id}`) {
                    sub.classList.add('expanded');
                } else {
                    sub.classList.remove('expanded');
                }
            });
        });
        
        link.addEventListener('click', (e) => {
            e.preventDefault();
            
            isScrollingManual = true;
            clearTimeout(manualScrollTimer);
            manualScrollTimer = setTimeout(() => {
                isScrollingManual = false;
            }, 800);
            
            activeSectionId = section.id;
            updateActiveNavLink(section.id);
            
            const targetEl = document.getElementById(`section-${section.id}`);
            if (targetEl) {
                const offset = 90; // content-header offset
                const bodyRect = document.body.getBoundingClientRect().top;
                const elementRect = targetEl.getBoundingClientRect().top;
                const elementPosition = elementRect - bodyRect;
                const offsetPosition = elementPosition - offset;
                
                window.scrollTo({
                    top: offsetPosition,
                    behavior: 'smooth'
                });
            }
        });
        
        sidebarLinks.appendChild(link);

        // Dynamically add sub-menu if the section has blocks
        if (section.blocks && section.blocks.length > 0) {
            const submenu = document.createElement('div');
            submenu.id = `submenu-${section.id}`;
            submenu.className = 'nav-submenu';
            
            submenu.addEventListener('mouseenter', () => {
                const submenus = sidebarLinks.querySelectorAll('.nav-submenu');
                submenus.forEach(sub => {
                    if (sub.id === `submenu-${section.id}`) {
                        sub.classList.add('expanded');
                    } else {
                        sub.classList.remove('expanded');
                    }
                });
            });
            
            section.blocks.forEach(block => {
                const subLink = document.createElement('a');
                subLink.href = `#block-${block.id}`;
                subLink.className = 'nav-sub-link';
                let subTitleText = (currentLang === 'en' && block.title_en) ? block.title_en : block.title;
                if (subTitleText.includes('|')) {
                    subTitleText = subTitleText.split('|')[0].trim();
                }
                subLink.textContent = subTitleText.toUpperCase();
                
                subLink.addEventListener('click', (e) => {
                    e.preventDefault();
                    isScrollingManual = true;
                    clearTimeout(manualScrollTimer);
                    manualScrollTimer = setTimeout(() => {
                        isScrollingManual = false;
                    }, 800);
                    
                    activeBlockId = block.id;
                    const allSubLinks = submenu.querySelectorAll('.nav-sub-link');
                    allSubLinks.forEach(sl => sl.classList.remove('active'));
                    subLink.classList.add('active');
                    
                    const targetEl = document.getElementById(`block-${block.id}`);
                    if (targetEl) {
                        const offset = 90;
                        const bodyRect = document.body.getBoundingClientRect().top;
                        const elementRect = targetEl.getBoundingClientRect().top;
                        const elementPosition = elementRect - bodyRect;
                        const offsetPosition = elementPosition - offset;
                        
                        window.scrollTo({
                            top: offsetPosition,
                            behavior: 'smooth'
                        });
                    }
                });
                
                submenu.appendChild(subLink);
            });
            
            sidebarLinks.appendChild(submenu);
        }

        // Mobile header slide-down dropdown menu link
        if (mobileMenuNav) {
            const mobileLink = document.createElement('a');
            mobileLink.href = `#${section.id}`;
            mobileLink.className = `mobile-menu-link ${section.id === activeSectionId ? 'active' : ''}`;
            mobileLink.textContent = (currentLang === 'en' && section.title_en) ? section.title_en : section.title;
            
            mobileLink.addEventListener('click', (e) => {
                e.preventDefault();
                
                isScrollingManual = true;
                clearTimeout(manualScrollTimer);
                manualScrollTimer = setTimeout(() => {
                    isScrollingManual = false;
                }, 800);
                
                activeSectionId = section.id;
                updateActiveNavLink(section.id);
                
                const targetEl = document.getElementById(`section-${section.id}`);
                if (targetEl) {
                    const offset = 80; // content-header offset for mobile dropdown scroll
                    const bodyRect = document.body.getBoundingClientRect().top;
                    const elementRect = targetEl.getBoundingClientRect().top;
                    const elementPosition = elementRect - bodyRect;
                    const offsetPosition = elementPosition - offset;
                    
                    window.scrollTo({
                        top: offsetPosition,
                        behavior: 'smooth'
                    });
                }
                
                // Close dropdown menu immediately
                const mobileMenuDropdown = document.getElementById('mobile-menu-dropdown');
                if (mobileMenuDropdown) {
                    mobileMenuDropdown.classList.remove('active');
                }
                const sidebarOverlay = document.getElementById('sidebar-overlay');
                if (sidebarOverlay) {
                    sidebarOverlay.classList.remove('active');
                }
                if (menuToggleBtn) {
                    menuToggleBtn.classList.remove('open');
                }
            });
            mobileMenuNav.appendChild(mobileLink);
        }
    });
}

// ScrollSpy setup to dynamically update sidebar selection based on scroll position
function setupScrollSpy() {
    window.addEventListener('scroll', () => {
        if (isScrollingManual || !guidelineData) return;
        
        // Collapse all submenus when scrolled near the top
        if (window.scrollY < 50) {
            activeSectionId = '';
            updateActiveNavLink('', '');
            return;
        }
        
        let activeId = '';
        const sections = document.querySelectorAll('.guide-section');
        const scrollPos = window.scrollY + 130; // Header offset + cushion
        
        sections.forEach(sec => {
            const id = sec.id.replace('section-', '');
            const top = sec.offsetTop;
            const height = sec.offsetHeight;
            
            if (scrollPos >= top && scrollPos < top + height) {
                activeId = id;
            }
        });
        
        // Handle bottom of page edge case
        if ((window.innerHeight + window.scrollY) >= document.documentElement.scrollHeight - 30) {
            if (guidelineData.sections.length > 0) {
                activeId = guidelineData.sections[guidelineData.sections.length - 1].id;
            }
        }
        
        activeBlockId = '';
        if (activeId) {
            const currentSection = document.getElementById(`section-${activeId}`);
            if (currentSection) {
                const blocks = currentSection.querySelectorAll('.guide-block');
                blocks.forEach(blk => {
                    const actualTop = blk.offsetTop + currentSection.offsetTop;
                    const bHeight = blk.offsetHeight;
                    if (scrollPos >= actualTop - 10 && scrollPos < actualTop + bHeight) {
                        activeBlockId = blk.id.replace('block-', '');
                    }
                });
            }
        }
        
        if (activeId) {
            activeSectionId = activeId;
            updateActiveNavLink(activeId, activeBlockId);
        }
    });
}

// Update sidebar selection highlight
function updateActiveNavLink(sectionId, activeBlockId) {
    const links = sidebarLinks.querySelectorAll('.nav-link');
    links.forEach(link => {
        if (link.getAttribute('href') === `#${sectionId}`) {
            link.classList.add('active');
        } else {
            link.classList.remove('active');
        }
    });

    const mobileMenuLinks = document.querySelectorAll('.mobile-menu-link');
    mobileMenuLinks.forEach(link => {
        if (link.getAttribute('href') === `#${sectionId}`) {
            link.classList.add('active');
        } else {
            link.classList.remove('active');
        }
    });

    // Handle submenu expansion and active sub-link highlighting for all sections
    const submenus = sidebarLinks.querySelectorAll('.nav-submenu');
    submenus.forEach(submenu => {
        const sectId = submenu.id.replace('submenu-', '');
        if (sectId === sectionId) {
            submenu.classList.add('expanded');
            
            const subLinks = submenu.querySelectorAll('.nav-sub-link');
            subLinks.forEach(subLink => {
                if (activeBlockId && subLink.getAttribute('href') === `#block-${activeBlockId}`) {
                    subLink.classList.add('active');
                } else if (!activeBlockId && subLink === subLinks[0]) {
                    subLink.classList.add('active'); // fallback to first item
                } else {
                    subLink.classList.remove('active');
                }
            });
        } else {
            submenu.classList.remove('expanded');
            const subLinks = submenu.querySelectorAll('.nav-sub-link');
            subLinks.forEach(subLink => subLink.classList.remove('active'));
        }
    });
}

// Render All Manual Sections at once (One-Page Scroll layout)
function renderAllSections() {
    if (!guidelineData || !guidelineData.sections) return;
    
    let html = '';
    
    guidelineData.sections.forEach(section => {
        const secTitle = (currentLang === 'en' && section.title_en) ? section.title_en : section.title;
        html += `
            <section class="guide-section active" id="section-${section.id}" style="display: block; margin-bottom: 80px; scroll-margin-top: 100px;">
                <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 4px;">
                    <h1 class="section-title" style="margin-bottom: 0;">${secTitle}</h1>
                </div>
                
                <div class="blocks-container">
        `;
        
        if (section.blocks && section.blocks.length > 0) {
            section.blocks.forEach((block, index) => {
                html += renderBlockHTML(block, section.id, index, section.blocks.length);
            });
        } else {
            const noBlocksMsg = currentLang === 'en' ? 'There are no guideline blocks in this section.' : '현재 섹션에 가이드라인 블록이 없습니다.';
            html += `<div style="text-align: center; color: var(--ap-gray); padding: 40px; border: 1px dashed var(--ap-border); margin-bottom:32px;">${noBlocksMsg}</div>`;
        }
        
        html += `
                </div>
            </section>
        `;
    });
    
    sectionsWrapper.innerHTML = html;
    
    // Dynamically find and initialize all interactive wordmark blocks
    const bgToggleButtons = document.querySelectorAll('[id^="btn-wordmark-bg-toggle-"]');
    bgToggleButtons.forEach(btn => {
        const idSuffix = btn.id.replace('btn-wordmark-bg-toggle', ''); // e.g. "-block_wm_1"
        setupInteractiveWordmarkControls(idSuffix);
    });

    // Initialize interactive typeface tester controls
    const sizeSliders = document.querySelectorAll('[id^="tester-font-size-slider-"]');
    sizeSliders.forEach(slider => {
        const idSuffix = slider.id.replace('tester-font-size-slider-', ''); // e.g. "block_tf_1"
        setupTypefaceTesterControls(idSuffix);
    });
}

// Helper to update colors of the interactive control panel elements
function updateInteractiveControlColors(isPageDark, suffix = '') {
    const interactiveBox = document.getElementById('wordmark-interactive-box' + suffix);
    if (!interactiveBox) return;
    
    if (isPageDark) {
        interactiveBox.style.setProperty('--control-text-color', '#ffffff');
        interactiveBox.style.setProperty('--control-btn-bg', '#02060F');
        interactiveBox.style.setProperty('--control-btn-border', 'rgba(255, 255, 255, 0.08)');
        
        // Dark background button hover: white button background, dark text
        interactiveBox.style.setProperty('--control-btn-hover-bg', '#ffffff');
        interactiveBox.style.setProperty('--control-text-hover-color', '#02060F');
        interactiveBox.style.setProperty('--control-btn-hover-border', '#ffffff');
        
        interactiveBox.style.setProperty('--slider-track-color', 'rgba(255, 255, 255, 0.25)');
        interactiveBox.style.setProperty('--slider-thumb-color', '#ffffff');
    } else {
        interactiveBox.style.setProperty('--control-text-color', '#555555');
        interactiveBox.style.setProperty('--control-btn-bg', '#ffffff');
        interactiveBox.style.setProperty('--control-btn-border', 'rgba(0, 0, 0, 0.08)');
        
        // Light background button hover: dark gray button background, white text
        interactiveBox.style.setProperty('--control-btn-hover-bg', '#555555');
        interactiveBox.style.setProperty('--control-text-hover-color', '#ffffff');
        interactiveBox.style.setProperty('--control-btn-hover-border', '#555555');
        
        interactiveBox.style.setProperty('--slider-track-color', 'rgba(0, 0, 0, 0.12)');
        interactiveBox.style.setProperty('--slider-thumb-color', '#555555');
    }
}

// Sync the visual thumb div position with the invisible native slider's current value
function updateVisualThumb(suffix = '') {
    const slider = document.getElementById('wordmark-size-slider' + suffix);
    const visualThumb = document.getElementById('slider-visual-thumb' + suffix);
    if (!slider || !visualThumb) return;
    
    const min = parseFloat(slider.min) || 0.1;
    const max = parseFloat(slider.max) || 1.0;
    const val = parseFloat(slider.value) || 1.0;
    
    let pct = 100;
    if (max > min) {
        pct = ((val - min) / (max - min)) * 100;
    }
    visualThumb.style.left = pct + '%';
}

// Helper to calculate the min scale of the size slider based on SVG height >= 23px
function updateSliderMinScale(suffix = '') {
    const slider = document.getElementById('wordmark-size-slider' + suffix);
    const previewImg = document.getElementById('wordmark-preview-img' + suffix);
    if (!slider || !previewImg) return;
    
    // Explicitly enforce max to 0.90 to prevent layout/slider range sync issues due to browser cache
    slider.max = "0.90";
    
    // Calculate aspect ratio width/height of core_wordmark: 779.19 / 115.84 = 6.72643
    let baseWidth = previewImg.clientWidth || previewImg.getBoundingClientRect().width;
    if (baseWidth === 0) {
        const previewArea = document.getElementById('wordmark-preview-area' + suffix);
        if (previewArea) {
            baseWidth = previewArea.clientWidth - 40; // padding 20px each side
        }
    }
    if (baseWidth <= 0) {
        baseWidth = 700; // default fallback
    }
    
    // Core Monogram is constrained to 34% width on desktop, but 90% on mobile
    if (suffix.toLowerCase().includes('mono')) {
        const isMobile = window.innerWidth <= 768;
        baseWidth = baseWidth * (isMobile ? 0.90 : 0.34);
    }
    // Core Wordmark is constrained to 125% width on mobile
    if (suffix.toLowerCase().includes('wm_1')) {
        const isMobile = window.innerWidth <= 768;
        if (isMobile) {
            baseWidth = baseWidth * 1.25;
        }
    }
    
    let aspect = 6.72643;
    if (suffix.toLowerCase().includes('mono')) {
        aspect = 313.32 / 390; // 0.80338 (natural monogram aspect ratio)
    }
    if (previewImg.naturalWidth && previewImg.naturalHeight && previewImg.naturalHeight > 0) {
        aspect = previewImg.naturalWidth / previewImg.naturalHeight;
    }
    const baseHeight = baseWidth / aspect;
    // Minimum image scale should be 23 / baseHeight.
    // Since image scale is slider.value * 1.0, slider.min should be (23 / baseHeight) / 1.0.
    let minScale = (23 / baseHeight);
    
    if (minScale > 0.90) minScale = 0.90;
    if (minScale < 0.05) minScale = 0.05;
    
    slider.min = minScale.toFixed(3);
    
    if (parseFloat(slider.value) < minScale) {
        slider.value = minScale.toFixed(3);
    }
    previewImg.style.transform = `scale(${parseFloat(slider.value) * 1.0})`;
    updateVisualThumb(suffix);
}

// Programmatically adjust spacing and controls positioning based on viewport width (mobile <= 900px)
function adjustLayoutForViewport(suffix = '') {
    // Spacing and layout are now managed entirely by CSS media queries
}

// Bind event listeners for interactive typeface testers (en, ko, zh)
function setupTypefaceTesterControls(suffix) {
    const slider = document.getElementById('tester-font-size-slider-' + suffix);
    const label = document.getElementById('tester-size-label-' + suffix);
    const fill = document.getElementById('tester-slider-track-fill-' + suffix);
    const thumb = document.getElementById('tester-slider-visual-thumb-' + suffix);
    const playground = document.getElementById('tester-preview-text-' + suffix);
    const weightTabs = document.getElementById('tester-weight-tabs-' + suffix);
    const panel = document.getElementById('tester-panel-' + suffix);
    const bgToggle = document.getElementById('tester-btn-bg-toggle-' + suffix);
    const alignToggle = document.getElementById('tester-btn-align-toggle-' + suffix);

    if (!slider || !playground) return;

    // Size Slider logic
    function updateSize(val) {
        slider.value = val;
        label.textContent = `${val}px`;
        playground.style.fontSize = `${val}px`;

        // Calculate slider visual thumb position and fill width
        const min = parseInt(slider.min) || 16;
        const max = parseInt(slider.max) || 120;
        const pct = ((val - min) / (max - min)) * 100;
        if (fill) fill.style.width = `${pct}%`;
        if (thumb) thumb.style.left = `${pct}%`;
    }

    slider.addEventListener('input', (e) => {
        updateSize(parseInt(e.target.value));
    });

    // Weight Switcher logic
    if (weightTabs) {
        const tabs = weightTabs.querySelectorAll('.weight-tab');
        tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                tabs.forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                const weight = tab.getAttribute('data-weight');
                playground.style.fontWeight = weight;
            });
        });
    }

    // Contrast Toggle logic
    if (bgToggle && panel) {
        bgToggle.addEventListener('click', () => {
            panel.classList.toggle('dark-mode');
        });
    }

    // Alignment Toggle logic
    if (alignToggle) {
        alignToggle.addEventListener('click', () => {
            const currentAlign = alignToggle.getAttribute('data-align');
            let nextAlign = 'center';
            let nextIconPath = '';

            if (currentAlign === 'center') {
                nextAlign = 'left';
                nextIconPath = `
                    <line x1="3" y1="6" x2="21" y2="6"></line>
                    <line x1="3" y1="10" x2="15" y2="10"></line>
                    <line x1="3" y1="14" x2="18" y2="14"></line>
                    <line x1="3" y1="18" x2="12" y2="18"></line>
                `;
            } else if (currentAlign === 'left') {
                nextAlign = 'right';
                nextIconPath = `
                    <line x1="3" y1="6" x2="21" y2="6"></line>
                    <line x1="9" y1="10" x2="21" y2="10"></line>
                    <line x1="6" y1="14" x2="21" y2="14"></line>
                    <line x1="12" y1="18" x2="21" y2="18"></line>
                `;
            } else {
                nextAlign = 'center';
                nextIconPath = `
                    <line x1="3" y1="6" x2="21" y2="6"></line>
                    <line x1="6" y1="10" x2="18" y2="10"></line>
                    <line x1="4" y1="14" x2="20" y2="14"></line>
                    <line x1="7" y1="18" x2="17" y2="18"></line>
                `;
            }

            alignToggle.setAttribute('data-align', nextAlign);
            alignToggle.innerHTML = `
                <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    \${nextIconPath}
                </svg>
            `;
            playground.style.textAlign = nextAlign;
        });
    }

    // Set initial size
    updateSize(26);
}

// Bind event listeners for interactive wordmark preview elements
function setupInteractiveWordmarkControls(suffix = '') {
    const slider = document.getElementById('wordmark-size-slider' + suffix);
    const previewImg = document.getElementById('wordmark-preview-img' + suffix);
    const bgToggleBtn = document.getElementById('btn-wordmark-bg-toggle' + suffix);
    const previewArea = document.getElementById('wordmark-preview-area' + suffix);
    
    if (!previewImg || !bgToggleBtn || !previewArea) return;
    
    // Apply programmatic layout adjustments initially
    adjustLayoutForViewport(suffix);
    
    // Determine initial background theme
    const areaBg = window.getComputedStyle(previewArea).backgroundColor;
    const rgb = areaBg.match(/\d+/g);
    let isCurrentBgDark = false;
    if (rgb) {
        // If alpha is 0, it is transparent, so fallback to page body theme
        const alpha = rgb.length === 4 ? parseFloat(rgb[3]) : 1;
        if (alpha === 0) {
            isCurrentBgDark = !document.body.classList.contains('light-theme');
        } else {
            const r = parseInt(rgb[0]), g = parseInt(rgb[1]), b = parseInt(rgb[2]);
            isCurrentBgDark = (r * 0.299 + g * 0.587 + b * 0.114) < 128;
        }
    } else {
        isCurrentBgDark = !document.body.classList.contains('light-theme');
    }
    
    // Update initial colors based on page theme
    const isPageDark = document.body.classList.contains('dark-theme') || !document.body.classList.contains('light-theme');
    updateInteractiveControlColors(isPageDark, suffix);
    
    // Update initial tooltip
    bgToggleBtn.setAttribute('data-tooltip', isCurrentBgDark ? 'VIEW ON WHITE' : 'VIEW ON BLACK');
    
    if (slider) {
        // Explicitly enforce max to 0.90 to prevent layout/slider range sync issues due to browser cache
        slider.max = "0.90";
        
        // Calculate and update minimum scale
        setTimeout(() => {
            adjustLayoutForViewport(suffix);
            updateSliderMinScale(suffix);
        }, 50);
        
        // Bind load/resize listeners to keep layout and min scale updated
        previewImg.addEventListener('load', () => {
            adjustLayoutForViewport(suffix);
            updateSliderMinScale(suffix);
        });
        window.addEventListener('resize', () => {
            adjustLayoutForViewport(suffix);
            updateSliderMinScale(suffix);
        });
        
        // 1. Slider Event: Scale the image and update visual thumb
        slider.addEventListener('input', (e) => {
            const scaleVal = parseFloat(e.target.value) * 1.0;
            previewImg.style.transform = `scale(${scaleVal})`;
            updateVisualThumb(suffix);
        });
    } else {
        // If there is no slider, keep image transform consistent at 100% scale
        previewImg.style.transform = `scale(1.0)`;
    }
    
    // 2. Background Toggle Event
    bgToggleBtn.addEventListener('click', () => {
        const currentBg = window.getComputedStyle(previewArea).backgroundColor;
        const rgb = currentBg.match(/\d+/g);
        let isDark = false;
        if (rgb) {
            const alpha = rgb.length === 4 ? parseFloat(rgb[3]) : 1;
            if (alpha === 0) {
                isDark = !document.body.classList.contains('light-theme');
            } else {
                const r = parseInt(rgb[0]), g = parseInt(rgb[1]), b = parseInt(rgb[2]);
                isDark = (r * 0.299 + g * 0.587 + b * 0.114) < 128;
            }
        } else {
            isDark = !document.body.classList.contains('light-theme');
        }
        
        const isPageDark = document.body.classList.contains('dark-theme') || !document.body.classList.contains('light-theme');
        if (isDark) {
            // Switch to White background
            previewArea.style.setProperty('background-color', '#ffffff', 'important');
            previewArea.style.setProperty('border', 'none', 'important');
            updateInteractiveControlColors(isPageDark, suffix);
            bgToggleBtn.setAttribute('data-tooltip', 'VIEW ON BLACK');
            
            // If the image is the white SVG version, swap it with the black SVG version
            if (previewImg.src.includes('core_wordmark_w.svg')) {
                previewImg.src = previewImg.src.replace('core_wordmark_w.svg', 'core_wordmark_b.svg');
            } else if (previewImg.src.includes('core_monogram_w.svg')) {
                previewImg.src = previewImg.src.replace('core_monogram_w.svg', 'core_monogram_b.svg');
            }
        } else {
            // Switch to Black background
            previewArea.style.setProperty('background-color', '#02060F', 'important');
            previewArea.style.setProperty('border', 'none', 'important');
            updateInteractiveControlColors(isPageDark, suffix);
            bgToggleBtn.setAttribute('data-tooltip', 'VIEW ON WHITE');
            
            // If the image is the black SVG version, swap it with the white SVG version
            if (previewImg.src.includes('core_wordmark_b.svg')) {
                previewImg.src = previewImg.src.replace('core_wordmark_b.svg', 'core_wordmark_w.svg');
            } else if (previewImg.src.includes('core_monogram_b.svg')) {
                previewImg.src = previewImg.src.replace('core_monogram_b.svg', 'core_monogram_w.svg');
            }
        }
        
        // Recalculate min scale after src change or styling change (if slider exists)
        if (slider) {
            setTimeout(() => updateSliderMinScale(suffix), 50);
        }
    });
}

// Format markdown-like text to HTML helper
function formatContent(text) {
    if (!text) return '';
    
    // Escape HTML first to prevent injection
    let escaped = text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");
    
    // Convert **bold** to <strong>bold</strong>
    escaped = escaped.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    
    // Convert hex codes to non-clickable badges (e.g. #02060F)
    escaped = escaped.replace(/(#[A-Fa-f0-9]{6}|#[A-Fa-f0-9]{3})\b/g, '<span class="hex-copy-badge">$1</span>');
    
    // Convert double newlines to paragraph elements for layout control
    const paragraphs = escaped.split('\n\n').map(para => {
        return `<p class="content-paragraph">${para}</p>`;
    }).join('');

    return paragraphs;
}

// Render dynamic 2-column html block
function renderBlockHTML(block, sectionId, index, totalBlocks) {
    const isLight = document.body.classList.contains('light-theme');
    const blockTitle = (currentLang === 'en' && block.title_en) ? block.title_en : block.title;
    const blockContent = (currentLang === 'en' && block.content_en) ? block.content_en : block.content;
    
    if (sectionId === 'applications') {
        const images = (block.image || '').split(',').map(img => img.trim()).filter(Boolean);
        let visualContent = '';
        images.forEach(img => {
            visualContent += `
                <div class="visual-image-frame" style="cursor: default;">
                    <img src="${img}" alt="${blockTitle || 'AP BEAUTY'}" loading="lazy" style="width: 100%; height: auto; display: block;">
                </div>
            `;
        });

        return `
            <div class="guide-block block-full-width" id="block-${block.id}">
                <div class="block-header-full-width">
                    <h2 class="block-title">${blockTitle}</h2>
                    ${blockContent ? `<div class="text-block-content">${formatContent(blockContent)}</div>` : ''}
                </div>
                
                <div class="block-visual-column-full-width">
                    ${visualContent}
                </div>
            </div>
        `;
    }
    
    // Adapt image for theme if applicable
    let adaptedImage = block.image || '';
    if (adaptedImage.includes('core_wordmark_')) {
        adaptedImage = isLight ? 'assets/core_wordmark_b.svg' : 'assets/core_wordmark_w.svg';
    } else if (adaptedImage.includes('core_monogram_')) {
        adaptedImage = isLight ? 'assets/core_monogram_b.svg' : 'assets/core_monogram_w.svg';
    }

    let visualContent = '';
    if (block.id === 'block_tf_1' || block.id === 'block_tf_2' || block.id === 'block_tf_3') {
        let fontFamily = '';
        let defaultText = '';
        let weights = [];
        let colData = [];

        if (block.id === 'block_tf_1') {
            fontFamily = "'futura-pt', sans-serif";
            defaultText = 'APEX OF SKINCARE TO UNVEIL BEAUTY BEYOND';
            weights = [
                { name: 'Light', val: '300', active: false },
                { name: 'Book', val: '400', active: true },
                { name: 'Medium', val: '500', active: false },
                { name: 'Demi', val: '600', active: false }
            ];
            colData = [
                { class: 'weight-light', title: 'Futura PT Light', lines: ['ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz', '1234567890!@#$%^&*()_+'] },
                { class: 'weight-book', title: 'Futura PT Book', lines: ['ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz', '1234567890!@#$%^&*()_+'] },
                { class: 'weight-medium', title: 'Futura PT Medium', lines: ['ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz', '1234567890!@#$%^&*()_+'] },
                { class: 'weight-demi', title: 'Futura PT Demi', lines: ['ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz', '1234567890!@#$%^&*()_+'] }
            ];
        } else if (block.id === 'block_tf_2') {
            fontFamily = "'Noto Sans KR', sans-serif";
            defaultText = '한계를 뛰어넘는 혁신, 아름다움의 새로운 경지를 여는 스킨케어의 정점';
            weights = [
                { name: 'Light', val: '300', active: false },
                { name: 'Regular', val: '400', active: true },
                { name: 'Medium', val: '500', active: false },
                { name: 'Bold', val: '700', active: false }
            ];
            colData = [
                { class: 'weight-light', title: 'Noto Sans KR Light', lines: ['가나다라마바사아자차카타파하', '갬냄댐램맴뱀샘앰잼챔캠탬팸햄', '0123456789!@#$%^&*()_+'] },
                { class: 'weight-book', title: 'Noto Sans KR Regular', lines: ['가나다라마바사아자차카타파하', '갬냄댐램맴뱀샘앰잼챔캠탬팸햄', '0123456789!@#$%^&*()_+'] },
                { class: 'weight-medium', title: 'Noto Sans KR Medium', lines: ['가나다라마바사아자차카타파하', '갬냄댐램맴뱀샘앰잼챔캠탬팸햄', '0123456789!@#$%^&*()_+'] },
                { class: 'weight-bold', title: 'Noto Sans KR Bold', lines: ['가나다라마바사아자차카타파하', '갬냄댐램맴뱀샘앰잼챔캠탬팸햄', '0123456789!@#$%^&*()_+'] }
            ];
        } else {
            fontFamily = "'Noto Sans SC', sans-serif";
            defaultText = '肌肤之美 · 至此无界';
            weights = [
                { name: 'Light', val: '300', active: false },
                { name: 'Regular', val: '400', active: true },
                { name: 'Medium', val: '500', active: false },
                { name: 'Bold', val: '700', active: false }
            ];
            colData = [
                { class: 'weight-light', title: 'Noto Sans SC Light', lines: ['文则数言乃成其意家书一', '字可见心谓得简易之道欲', '0123456789!@#$%^&*()_+'] },
                { class: 'weight-book', title: 'Noto Sans SC Regular', lines: ['文则数言乃成其意家书一', '字可见心谓得简易之道欲', '0123456789!@#$%^&*()_+'] },
                { class: 'weight-medium', title: 'Noto Sans SC Medium', lines: ['文则数言乃成其意家书一', '字可见心谓得简易之道欲', '0123456789!@#$%^&*()_+'] },
                { class: 'weight-bold', title: 'Noto Sans SC Bold', lines: ['文则数言乃成其意家书一', '字可见心谓得简易之道欲', '0123456789!@#$%^&*()_+'] }
            ];
        }

        visualContent = `
            <div class="visual-image-frame typeface-showcase-box" style="cursor: default; --font-en: ${fontFamily};">
                <!-- Type Tester Panel -->
                <div class="type-tester-panel" id="tester-panel-${block.id}">
                    <div class="tester-controls-bar">
                        <!-- Left: Size Slider -->
                        <div class="control-group">
                            <span class="control-label">SIZE</span>
                            <div class="slider-wrapper">
                                <div class="slider-track-bg"></div>
                                <div class="slider-track-fill" id="tester-slider-track-fill-${block.id}" style="width: 9.62%;"></div>
                                <div class="slider-thumb" id="tester-slider-visual-thumb-${block.id}" style="left: 9.62%;"></div>
                                <input type="range" id="tester-font-size-slider-${block.id}" min="16" max="120" value="26" step="1">
                            </div>
                            <span class="size-value-label" id="tester-size-label-${block.id}">26px</span>
                        </div>
                        
                        <!-- Center: Weight Switcher -->
                        <div class="control-group">
                            <span class="control-label">WEIGHT</span>
                            <div class="weight-tabs-container" id="tester-weight-tabs-${block.id}">
                                ${weights.map(w => `<button class="weight-tab ${w.active ? 'active' : ''}" data-weight="${w.val}">${w.name}</button>`).join('')}
                            </div>
                        </div>
                        
                        <!-- Right: Theme and Alignment -->
                        <div class="control-group">
                            <button class="utility-btn" id="tester-btn-bg-toggle-${block.id}" title="Toggle Contrast Mode" style="border-radius:0;">
                                <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                    <circle cx="12" cy="12" r="10"></circle>
                                    <path d="M12 2v20a10 10 0 0 0 0-20z" fill="currentColor"></path>
                                </svg>
                            </button>
                            <button class="utility-btn" id="tester-btn-align-toggle-${block.id}" title="Toggle Alignment" data-align="center" style="border-radius:0;">
                                <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                    <line x1="3" y1="6" x2="21" y2="6"></line>
                                    <line x1="6" y1="10" x2="18" y2="10"></line>
                                    <line x1="4" y1="14" x2="20" y2="14"></line>
                                    <line x1="7" y1="18" x2="17" y2="18"></line>
                                </svg>
                            </button>
                        </div>
                    </div>
                    
                    <!-- Editable Playground -->
                    <div class="tester-playground-container" id="tester-playground-container-${block.id}">
                        <div class="tester-playground" id="tester-preview-text-${block.id}" contenteditable="true" spellcheck="false">${defaultText}</div>
                    </div>
                </div>
                
                <div class="typeface-grid">
                    ${colData.map(col => `
                        <div class="typeface-col ${col.class}">
                            <div class="typeface-col-title">${col.title}</div>
                            <div class="typeface-col-content">
                                ${col.lines.map((l, i) => i === col.lines.length - 1 ? `<div>${l}</div>` : `<div class="alphabet-row">${l}</div>`).join('')}
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    } else if (block.id === 'block_col_1') {
        visualContent = `
            <div class="brand-colors-showcase">
                <div class="color-group">
                    <h3 class="color-group-title">PRIMARY COLORS</h3>
                    <div class="color-cards-grid">
                        <div class="color-card dark-color" style="background-color: #02060F;" onclick="copyText('#02060F')">
                            <div class="color-info">
                                <span class="color-name">AP Infinity Black</span>
                                <div class="color-values">
                                    <span>PANTONE Black 6C</span>
                                    <span>R:2 G:6 B:15</span>
                                    <span>C:78 M:70 Y:62 K:84</span>
                                    <span class="hex-badge">HEX: #02060F</span>
                                </div>
                            </div>
                            <svg class="color-copy-icon" xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                            </svg>
                        </div>
                        <div class="color-card light-color" style="background-color: #FFFFFF;" onclick="copyText('#FFFFFF')">
                            <div class="color-info">
                                <span class="color-name">AP White</span>
                                <div class="color-values">
                                    <span>R:255 G:255 B:255</span>
                                    <span>C:0 M:0 Y:0 K:0</span>
                                    <span class="hex-badge">HEX: #FFFFFF</span>
                                </div>
                            </div>
                            <svg class="color-copy-icon" xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                            </svg>
                        </div>
                    </div>
                </div>
                <div class="color-group">
                    <h3 class="color-group-title">SECONDARY COLORS</h3>
                    <div class="color-cards-grid">
                        <div class="color-card gold-color" style="background-color: #B1A274;" onclick="copyText('#B1A274')">
                            <div class="color-info">
                                <span class="color-name">AP Eternal Gold</span>
                                <div class="color-values">
                                    <span>PANTONE 4515C</span>
                                    <span>R:177 G:162 B:116</span>
                                    <span>C:32 M:31 Y:62 K:2</span>
                                    <span class="hex-badge">HEX: #B1A274</span>
                                </div>
                            </div>
                            <svg class="color-copy-icon" xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                            </svg>
                        </div>
                        <div class="color-card silver-color" style="background-color: #E6E8E9;" onclick="copyText('#E6E8E9')">
                            <div class="color-info">
                                <span class="color-name">AP Silver</span>
                                <div class="color-values">
                                    <span>PANTONE Cool Gray 1C</span>
                                    <span>R:230 G:232 B:233</span>
                                    <span>C:9 M:5 Y:6 K:0</span>
                                    <span class="hex-badge">HEX: #E6E8E9</span>
                                </div>
                            </div>
                            <svg class="color-copy-icon" xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                            </svg>
                        </div>
                    </div>
                </div>
            </div>
        `;
    } else if (
        block.id === 'block_wm_1' || 
        block.id === 'block_mono_1'
    ) {
        const suffix = '-' + block.id;
        const encodedFilePath = encodeURI(block.download_file);
        const fileName = block.download_file.split('/').pop();
        const initialTooltip = isLight ? 'VIEW ON BLACK' : 'VIEW ON WHITE';
        const frameStyle = '';
        const previewStyle = '';
        
        const showSlider = block.id === 'block_wm_1' || block.id === 'block_mono_1';
        const justifyStyle = showSlider ? 'justify-content: space-between;' : 'justify-content: flex-end;';
        const sliderHtml = showSlider ? `
            <!-- Left: Slider range control (Stretched, no background) -->
            <div class="slider-control-container" style="display: flex; align-items: center; justify-content: flex-start; flex: 1; pointer-events: auto;">
                <div class="slider-control-inner" style="display: flex; align-items: center; gap: 12px; width: 100%;">
                    <span style="font-size: 10px; font-family: var(--font-en); font-weight: 400; letter-spacing: 1px; color: var(--control-text-color, var(--ap-gray)); user-select: none;">SIZE</span>
                    <div style="position: relative; flex: 1; height: 38px; display: flex; align-items: center;">
                        <div id="slider-track-line${suffix}" style="position: absolute; top: 50%; left: 0; right: 0; height: 2px; background: rgba(0, 0, 0, 0.12); background: var(--slider-track-color, rgba(0, 0, 0, 0.12)); transform: translateY(-50%); pointer-events: none; z-index: 0;"></div>
                        <div id="slider-visual-thumb${suffix}" style="position: absolute; top: 50%; width: 10px; height: 10px; border-radius: 50% !important; background: #555555; background: var(--slider-thumb-color, #555555); transform: translate(-50%, -50%); pointer-events: none; z-index: 1; left: 100%; transition: left 0.05s ease; box-sizing: border-box;"></div>
                        <input type="range" id="wordmark-size-slider${suffix}" min="0.1" max="0.90" step="0.01" value="0.90" style="-webkit-appearance: none; appearance: none; position: absolute; top: 0; left: 0; width: 100%; height: 100%; margin: 0; padding: 0; opacity: 0; cursor: pointer; z-index: 2; background: transparent; border: none; outline: none;">
                    </div>
                </div>
            </div>
        ` : '';
        
        visualContent = `
            <div class="interactive-wordmark-frame" id="wordmark-interactive-box${suffix}" style="display: flex; flex-direction: column; width: 100%; gap: 12px;">
                <div class="visual-image-frame visual-image-downloadable wordmark-preview-area" id="wordmark-preview-area${suffix}" style="${previewStyle}">
                    <img id="wordmark-preview-img${suffix}" src="${adaptedImage}" alt="${block.title || 'AP BEAUTY'}" loading="lazy" style="transition: transform 0.1s ease; transform-origin: center; display: block; margin: 0 auto; max-width: 100%; height: auto; transform: scale(0.90);">
                </div>
                <!-- Bottom controls container (moved outside) -->
                <div class="interactive-controls" style="display: flex; align-items: center; ${justifyStyle} gap: 24px; pointer-events: auto; z-index: 10; width: 100%;">
                    ${sliderHtml}
                    
                    <!-- Right: Action Buttons (Toggle Background & Download) -->
                    <div class="action-buttons-container" style="display: flex; gap: 8px; pointer-events: auto;">
                        <!-- Background Toggle Button -->
                        <button id="btn-wordmark-bg-toggle${suffix}" class="interactive-control-btn" data-tooltip="${initialTooltip}">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <circle cx="12" cy="12" r="10"></circle>
                                <path d="M12 2v20a10 10 0 0 0 0-20z" fill="currentColor"></path>
                            </svg>
                        </button>
                        
                        <!-- Download Button -->
                        <a href="${encodedFilePath}" download="${fileName}" class="interactive-control-btn" data-tooltip="DOWNLOAD">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                                <polyline points="7 10 12 15 17 10"></polyline>
                                <line x1="12" y1="15" x2="12" y2="3"></line>
                            </svg>
                        </a>
                    </div>
                </div>
            </div>
        `;
    } else if (block.download_file) {
        const encodedFilePath = encodeURI(block.download_file);
        visualContent = `
            <a href="${encodedFilePath}" download="${block.download_file.split('/').pop()}" style="text-decoration: none; display: block; width: 100%;">
                <div class="visual-image-frame visual-image-downloadable" title="${currentLang === 'en' ? 'Click to download the original file' : '클릭하여 원본 파일 다운로드'}">
                    <img src="${adaptedImage}" alt="${blockTitle || 'AP BEAUTY'}" loading="lazy" style="width: 100%; height: auto; display: block;">
                    <div class="download-icon-badge" style="border-radius: 0;">
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                            <polyline points="7 10 12 15 17 10"></polyline>
                            <line x1="12" y1="15" x2="12" y2="3"></line>
                        </svg>
                    </div>
                </div>
            </a>
        `;
    } else if (block.id === 'block_wm_2') {
        visualContent = `
            <div class="visual-image-frame visual-image-svg-box" style="cursor: default;">
                <svg viewBox="0 0 970 231.68" style="width: 100%; height: auto; display: block;">
                    <!-- Background -->
                    <rect width="970" height="231.68" fill="#ffffff" />
                    
                    <!-- Exclusion Zone Bands (Light Gray #f2f2f2) -->
                    <rect x="57.92" y="0" width="779.19" height="57.92" fill="#f2f2f2" />
                    <rect x="57.92" y="173.76" width="779.19" height="57.92" fill="#f2f2f2" />
                    <rect x="0" y="57.92" width="57.92" height="115.84" fill="#f2f2f2" />
                    <rect x="837.11" y="57.92" width="57.92" height="115.84" fill="#f2f2f2" />
                    
                    <!-- Corner Squares (Darker Gray #a3a3a3) -->
                    <rect x="0" y="0" width="57.92" height="57.92" fill="#a3a3a3" />
                    <rect x="837.11" y="0" width="57.92" height="57.92" fill="#a3a3a3" />
                    <rect x="0" y="173.76" width="57.92" height="57.92" fill="#a3a3a3" />
                    <rect x="837.11" y="173.76" width="57.92" height="57.92" fill="#a3a3a3" />
                    
                    <!-- Dotted lines -->
                    <line x1="0" y1="57.92" x2="895.03" y2="57.92" stroke="#c0c0c0" stroke-width="1.2" stroke-dasharray="4,4" />
                    <line x1="0" y1="115.84" x2="895.03" y2="115.84" stroke="#c0c0c0" stroke-width="1.2" stroke-dasharray="4,4" />
                    <line x1="0" y1="173.76" x2="895.03" y2="173.76" stroke="#c0c0c0" stroke-width="1.2" stroke-dasharray="4,4" />
                    
                    <line x1="57.92" y1="0" x2="57.92" y2="231.68" stroke="#c0c0c0" stroke-width="1.2" stroke-dasharray="4,4" />
                    <line x1="447.515" y1="0" x2="447.515" y2="231.68" stroke="#c0c0c0" stroke-width="1.2" stroke-dasharray="4,4" />
                    <line x1="837.11" y1="0" x2="837.11" y2="231.68" stroke="#c0c0c0" stroke-width="1.2" stroke-dasharray="4,4" />
                    
                    <!-- AP BEAUTY Wordmark -->
                    <g transform="translate(57.92, 57.92)" fill="#000000">
                        <path d="M48.04,0L0,113.16h19.07l11.72-27.6.32-.77h48.46l.32.77,11.72,27.6h19.07L62.65,0h-14.61ZM73.06,69.47h-35.44l.32-.77,17.4-40.98,17.4,40.98.32.77Z"/>
                        <polygon points="351.2 62.44 397.8 62.44 397.8 47.11 351.2 47.11 351.2 15.33 401.26 15.33 401.26 0 333.41 0 333.41 113.16 403.51 113.16 403.51 97.83 351.2 97.83 351.2 62.44"/>
                        <polygon points="614.73 15.33 643 15.33 643 113.16 660.79 113.16 660.79 15.33 689.06 15.33 689.06 0 614.73 0 614.73 15.33"/>
                        <polygon points="759.28 0 735.96 47.26 712.08 0 692.15 0 727.09 63.3 727.09 113.16 744.88 113.16 744.88 63.28 779.19 0 759.28 0"/>
                        <path d="M457.94,0l-48.04,113.16h19.07l11.72-27.6.32-.77h48.46l.32.77,11.72,27.6h19.07L472.55,0h-14.61ZM482.96,69.47h-35.44l.32-.77,17.4-40.98,17.4,40.98.32.77Z"/>
                        <path d="M160.18,0h-38.12v113.16h17.79v-44.1h20.33c24.28,0,40.59-13.88,40.59-34.53S184.45,0,160.18,0ZM168.71,52.39c-2.98.93-5.68,1.14-5.89,1.15-1.26.13-2.52.19-3.75.19h-19.23V15.33h19.23c14.33,0,23.6,7.54,23.6,19.2,0,8.64-5.07,15.15-13.96,17.86Z"/>
                        <path d="M584.54,64.52c0,25.05-5.7,34.37-21.04,34.37h0c-15.33,0-21.04-9.32-21.04-34.37V0h-17.79v68.04c0,16.83,4.06,29.52,12.06,37.7,6.57,6.71,15.57,10.11,26.76,10.11s20.2-3.4,26.76-10.11c8-8.18,12.06-20.86,12.06-37.7V0h-17.79v64.52Z"/>
                        <path d="M296.32,51.05c6.89-5.28,10.74-13.06,10.74-21.99,0-24.01-21.04-29.05-38.68-29.05h-28.12v113.16h36.54c24.87,0,39.13-12.23,39.13-33.57,0-13.54-6.26-22.72-19.62-28.55ZM258.05,15.33h10.32c9.54,0,20.92,2.82,20.92,13.57,0,11.36-9.37,16.56-27.84,16.56h-3.39V15.33ZM269.28,97.83h-11.23v-36.75h3.35c22.21,0,33.62,4.18,36.09,14.26.04.17.06.37.1.55.27,1.26.42,2.6.42,4.04,0,14.32-15.63,17.9-28.74,17.9Z"/>
                    </g>
                    
                    <!-- Dimension Line - Height 'a' (Red) -->
                    <line x1="910" y1="57.92" x2="920" y2="57.92" stroke="#ff0000" stroke-width="1.2" />
                    <line x1="910" y1="173.76" x2="920" y2="173.76" stroke="#ff0000" stroke-width="1.2" />
                    <line x1="915" y1="57.92" x2="915" y2="173.76" stroke="#ff0000" stroke-width="1.2" />
                    <text x="935" y="119.5" fill="#ff0000" font-family="var(--font-en)" font-size="18px" font-weight="400" dominant-baseline="middle" text-anchor="start">a</text>
                    
                    <!-- Dimension Line - Top Exclusion '0.5a' (Gray) -->
                    <line x1="910" y1="0" x2="920" y2="0" stroke="#a0a0a0" stroke-width="1.2" />
                    <line x1="910" y1="57.92" x2="920" y2="57.92" stroke="#a0a0a0" stroke-width="1.2" />
                    <line x1="915" y1="0" x2="915" y2="57.92" stroke="#a0a0a0" stroke-width="1.2" />
                    <text x="935" y="32" fill="#000000" font-family="var(--font-en)" font-size="18px" font-weight="400" dominant-baseline="middle" text-anchor="start">0.5a</text>
                </svg>
            </div>
        `;
    } else if (block.id === 'block_wm_2_2') {
        visualContent = `
            <div class="visual-image-frame visual-image-svg-box" style="cursor: default;">
                <div class="minimum-size-container">
                    <!-- AP BEAUTY Wordmark -->
                    <svg viewBox="0 0 779.19 115.84" class="minimum-size-wordmark">
                        <g fill="#000000">
                            <path d="M48.04,0L0,113.16h19.07l11.72-27.6.32-.77h48.46l.32.77,11.72,27.6h19.07L62.65,0h-14.61ZM73.06,69.47h-35.44l.32-.77,17.4-40.98,17.4,40.98.32.77Z"/>
                            <polygon points="351.2 62.44 397.8 62.44 397.8 47.11 351.2 47.11 351.2 15.33 401.26 15.33 401.26 0 333.41 0 333.41 113.16 403.51 113.16 403.51 97.83 351.2 97.83 351.2 62.44"/>
                            <polygon points="614.73 15.33 643 15.33 643 113.16 660.79 113.16 660.79 15.33 689.06 15.33 689.06 0 614.73 0 614.73 15.33"/>
                            <polygon points="759.28 0 735.96 47.26 712.08 0 692.15 0 727.09 63.3 727.09 113.16 744.88 113.16 744.88 63.28 779.19 0 759.28 0"/>
                            <path d="M457.94,0l-48.04,113.16h19.07l11.72-27.6.32-.77h48.46l.32.77,11.72,27.6h19.07L472.55,0h-14.61ZM482.96,69.47h-35.44l.32-.77,17.4-40.98,17.4,40.98.32.77Z"/>
                            <path d="M160.18,0h-38.12v113.16h17.79v-44.1h20.33c24.28,0,40.59-13.88,40.59-34.53S184.45,0,160.18,0ZM168.71,52.39c-2.98.93-5.68,1.14-5.89,1.15-1.26.13-2.52.19-3.75.19h-19.23V15.33h19.23c14.33,0,23.6,7.54,23.6,19.2,0,8.64-5.07,15.15-13.96,17.86Z"/>
                            <path d="M584.54,64.52c0,25.05-5.7,34.37-21.04,34.37h0c-15.33,0-21.04-9.32-21.04-34.37V0h-17.79v68.04c0,16.83,4.06,29.52,12.06,37.7,6.57,6.71,15.57,10.11,26.76,10.11s20.2-3.4,26.76-10.11c8-8.18,12.06-20.86,12.06-37.7V0h-17.79v64.52Z"/>
                            <path d="M296.32,51.05c6.89-5.28,10.74-13.06,10.74-21.99,0-24.01-21.04-29.05-38.68-29.05h-28.12v113.16h36.54c24.87,0,39.13-12.23,39.13-33.57,0-13.54-6.26-22.72-19.62-28.55ZM258.05,15.33h10.32c9.54,0,20.92,2.82,20.92,13.57,0,11.36-9.37,16.56-27.84,16.56h-3.39V15.33ZM269.28,97.83h-11.23v-36.75h3.35c22.21,0,33.62,4.18,36.09,14.26.04.17.06.37.1.55.27,1.26.42,2.6.42,4.04,0,14.32-15.63,17.9-28.74,17.9Z"/>
                        </g>
                    </svg>
                    <!-- Height indicator bracket ']' -->
                    <div class="minimum-size-bracket"></div>
                    <!-- Dimension Labels -->
                    <div class="minimum-size-text">
                        <span class="ms-printed">Printed: 8mm</span>
                        <span class="ms-divider">&nbsp;|&nbsp;</span>
                        <span class="ms-digital">Digital: 23px</span>
                    </div>
                </div>
            </div>
        `;
    } else if (block.id === 'block_wm_4') {
        visualContent = `
            <div class="visual-image-frame visual-image-svg-box" style="cursor: default;">
                <svg viewBox="0 14 1200.88 617" style="width: 100%; height: auto; display: block;">
                    <defs>
                        <style>
                            .bg-label {
                                font-family: 'futura-pt', 'Noto Sans', sans-serif;
                                font-size: 20px;
                                font-weight: 500;
                                letter-spacing: -.02em;
                                fill: #0a0f1d;
                            }
                        </style>
                        <g id="wm-path-wm4">
                            <path d="M48.04,0L0,113.16h19.07l11.72-27.6.32-.77h48.46l.32.77,11.72,27.6h19.07L62.65,0h-14.61ZM73.06,69.47h-35.44l.32-.77,17.4-40.98,17.4,40.98.32.77Z"/>
                            <polygon points="351.2 62.44 397.8 62.44 397.8 47.11 351.2 47.11 351.2 15.33 401.26 15.33 401.26 0 333.41 0 333.41 113.16 403.51 113.16 403.51 97.83 351.2 97.83 351.2 62.44"/>
                            <polygon points="614.73 15.33 643 15.33 643 113.16 660.79 113.16 660.79 15.33 689.06 15.33 689.06 0 614.73 0 614.73 15.33"/>
                            <polygon points="759.28 0 735.96 47.26 712.08 0 692.15 0 727.09 63.3 727.09 113.16 744.88 113.16 744.88 63.28 779.19 0 759.28 0"/>
                            <path d="M457.94,0l-48.04,113.16h19.07l11.72-27.6.32-.77h48.46l.32.77,11.72,27.6h19.07L472.55,0h-14.61ZM482.96,69.47h-35.44l.32-.77,17.4-40.98,17.4,40.98.32.77Z"/>
                            <path d="M160.18,0h-38.12v113.16h17.79v-44.1h20.33c24.28,0,40.59-13.88,40.59-34.53S184.45,0,160.18,0ZM168.71,52.39c-2.98.93-5.68,1.14-5.89,1.15-1.26.13-2.52.19-3.75.19h-19.23V15.33h19.23c14.33,0,23.6,7.54,23.6,19.2,0,8.64-5.07,15.15-13.96,17.86Z"/>
                            <path d="M584.54,64.52c0,25.05-5.7,34.37-21.04,34.37h0c-15.33,0-21.04-9.32-21.04-34.37V0h-17.79v68.04c0,16.83,4.06,29.52,12.06,37.7,6.57,6.71,15.57,10.11,26.76,10.11s20.2-3.4,26.76-10.11c8-8.18,12.06-20.86,12.06-37.7V0h-17.79v64.52Z"/>
                            <path d="M296.32,51.05c6.89-5.28,10.74-13.06,10.74-21.99,0-24.01-21.04-29.05-38.68-29.05h-28.12v113.16h36.54c24.87,0,39.13-12.23,39.13-33.57,0-13.54-6.26-22.72-19.62-28.55ZM258.05,15.33h10.32c9.54,0,20.92,2.82,20.92,13.57,0,11.36-9.37,16.56-27.84,16.56h-3.39V15.33ZM269.28,97.83h-11.23v-36.75h3.35c22.21,0,33.62,4.18,36.09,14.26.04.17.06.37.1.55.27,1.26.42,2.6.42,4.04,0,14.32-15.63,17.9-28.74,17.9Z"/>
                        </g>
                    </defs>
                    <rect fill="#e8e8e8" x="0" y="50" width="240.18" height="280"/>
                    <rect fill="#d5d5d5" x="240.18" y="50" width="240.18" height="280"/>
                    <rect fill="#c1c1c1" x="480.35" y="50" width="240.18" height="280"/>
                    <rect fill="#adadad" x="720.53" y="50" width="240.18" height="280"/>
                    <rect fill="#989897" x="960.7" y="50" width="240.18" height="280"/>
                    <rect fill="#828282" x="0" y="330" width="240.18" height="280"/>
                    <rect fill="#706f6f" x="240.18" y="330" width="240.18" height="280"/>
                    <rect fill="#575756" x="480.35" y="330" width="240.18" height="280"/>
                    <rect fill="#3c3c3b" x="720.53" y="330" width="240.18" height="280"/>
                    <rect fill="#1d1d1b" x="960.7" y="330" width="240.18" height="280"/>
                    <text class="bg-label" x="0" y="30">10%</text>
                    <text class="bg-label" x="240.5" y="30">20%</text>
                    <text class="bg-label" x="480.64" y="30">30%</text>
                    <text class="bg-label" x="720.98" y="30">40%</text>
                    <text class="bg-label" x="960.71" y="30">50%</text>
                    <text class="bg-label" x="0" y="630">60%</text>
                    <text class="bg-label" x="240.5" y="630">70%</text>
                    <text class="bg-label" x="480.64" y="630">80%</text>
                    <text class="bg-label" x="720.98" y="630">90%</text>
                    <text class="bg-label" x="960.71" y="630">100%</text>
                    <use href="#wm-path-wm4" fill="#000000" transform="translate(28.89, 227.83) scale(0.2341)" />
                    <use href="#wm-path-wm4" fill="#000000" transform="translate(269.07, 227.83) scale(0.2341)" />
                    <use href="#wm-path-wm4" fill="#ffffff" transform="translate(509.25, 125.67) scale(0.2341)" />
                    <use href="#wm-path-wm4" fill="#000000" transform="translate(509.25, 227.83) scale(0.2341)" />
                    <use href="#wm-path-wm4" fill="#ffffff" transform="translate(749.43, 125.67) scale(0.2341)" />
                    <use href="#wm-path-wm4" fill="#000000" transform="translate(749.43, 227.83) scale(0.2341)" />
                    <use href="#wm-path-wm4" fill="#ffffff" transform="translate(989.61, 125.67) scale(0.2341)" />
                    <use href="#wm-path-wm4" fill="#000000" transform="translate(989.61, 227.83) scale(0.2341)" />
                    <use href="#wm-path-wm4" fill="#ffffff" transform="translate(28.89, 405.67) scale(0.2341)" />
                    <use href="#wm-path-wm4" fill="#000000" transform="translate(28.89, 507.83) scale(0.2341)" />
                    <use href="#wm-path-wm4" fill="#ffffff" transform="translate(269.07, 405.67) scale(0.2341)" />
                    <use href="#wm-path-wm4" fill="#ffffff" transform="translate(509.25, 405.67) scale(0.2341)" />
                    <use href="#wm-path-wm4" fill="#ffffff" transform="translate(749.43, 405.67) scale(0.2341)" />
                    <use href="#wm-path-wm4" fill="#ffffff" transform="translate(989.61, 405.67) scale(0.2341)" />
                </svg>
            </div>
        `;
    } else if (block.id === 'block_mono_5') {
        visualContent = `
            <div class="visual-image-frame visual-image-svg-box" style="cursor: default;">
                <svg viewBox="0 14 1200.88 617" style="width: 100%; height: auto; display: block;">
                    <defs>
                        <style>
                            .bg-label {
                                font-family: 'futura-pt', 'Noto Sans', sans-serif;
                                font-size: 20px;
                                font-weight: 500;
                                letter-spacing: -.02em;
                                fill: #0a0f1d;
                            }
                        </style>
                        <g id="mono-path-mono5">
                            <path d="M217.5,120.49h-27.97L138.39,0h-19.95L0,279.02h19.33l32.02-75.42h77.07v186.4h18.44v-110.98h70.64c58.21,0,95.82-31.12,95.82-79.27s-37.61-79.27-95.82-79.27ZM58.09,187.71L128.41,22.04l41.79,98.45h-41.79v67.22H58.09ZM146.85,263.13v-126.76h30.09l53.57,126.21c-3.53.35-7.16.55-10.91.55h-72.76ZM248.35,259.07l-52.08-122.69h23.34c44.51,0,74.42,25.47,74.42,63.38,0,29-17.52,50.71-45.68,59.31Z"/>
                        </g>
                    </defs>
                    <rect fill="#e8e8e8" x="0" y="50" width="240.18" height="280"/>
                    <rect fill="#d5d5d5" x="240.18" y="50" width="240.18" height="280"/>
                    <rect fill="#c1c1c1" x="480.35" y="50" width="240.18" height="280"/>
                    <rect fill="#adadad" x="720.53" y="50" width="240.18" height="280"/>
                    <rect fill="#989897" x="960.7" y="50" width="240.18" height="280"/>
                    <rect fill="#828282" x="0" y="330" width="240.18" height="280"/>
                    <rect fill="#706f6f" x="240.18" y="330" width="240.18" height="280"/>
                    <rect fill="#575756" x="480.35" y="330" width="240.18" height="280"/>
                    <rect fill="#3c3c3b" x="720.53" y="330" width="240.18" height="280"/>
                    <rect fill="#1d1d1b" x="960.7" y="330" width="240.18" height="280"/>
                    <text class="bg-label" x="0" y="30">10%</text>
                    <text class="bg-label" x="240.5" y="30">20%</text>
                    <text class="bg-label" x="480.64" y="30">30%</text>
                    <text class="bg-label" x="720.98" y="30">40%</text>
                    <text class="bg-label" x="960.71" y="30">50%</text>
                    <text class="bg-label" x="0" y="630">60%</text>
                    <text class="bg-label" x="240.5" y="630">70%</text>
                    <text class="bg-label" x="480.64" y="630">80%</text>
                    <text class="bg-label" x="720.98" y="630">90%</text>
                    <text class="bg-label" x="960.71" y="630">100%</text>
                    <use href="#mono-path-mono5" fill="#000000" transform="translate(91.09, 212.62) scale(0.185)" />
                    <use href="#mono-path-mono5" fill="#000000" transform="translate(331.27, 212.62) scale(0.185)" />
                    <use href="#mono-path-mono5" fill="#ffffff" transform="translate(571.44, 95.23) scale(0.185)" />
                    <use href="#mono-path-mono5" fill="#000000" transform="translate(571.44, 212.62) scale(0.185)" />
                    <use href="#mono-path-mono5" fill="#ffffff" transform="translate(811.62, 95.23) scale(0.185)" />
                    <use href="#mono-path-mono5" fill="#000000" transform="translate(811.62, 212.62) scale(0.185)" />
                    <use href="#mono-path-mono5" fill="#ffffff" transform="translate(1051.8, 95.23) scale(0.185)" />
                    <use href="#mono-path-mono5" fill="#000000" transform="translate(1051.8, 212.62) scale(0.185)" />
                    <use href="#mono-path-mono5" fill="#ffffff" transform="translate(91.09, 375.23) scale(0.185)" />
                    <use href="#mono-path-mono5" fill="#000000" transform="translate(91.09, 492.62) scale(0.185)" />
                    <use href="#mono-path-mono5" fill="#ffffff" transform="translate(331.27, 375.23) scale(0.185)" />
                    <use href="#mono-path-mono5" fill="#ffffff" transform="translate(571.44, 375.23) scale(0.185)" />
                    <use href="#mono-path-mono5" fill="#ffffff" transform="translate(811.62, 375.23) scale(0.185)" />
                    <use href="#mono-path-mono5" fill="#ffffff" transform="translate(1051.8, 375.23) scale(0.185)" />
                </svg>
            </div>
        `;
    } else if (block.id === 'block_wm_7') {
        // Inline SVG path data for reliable cross-browser rendering
        const apPaths = '<path d="M48.04,0L0,113.16h19.07l11.72-27.6.32-.77h48.46l.32.77,11.72,27.6h19.07L62.65,0h-14.61ZM73.06,69.47h-35.44l.32-.77,17.4-40.98,17.4,40.98.32.77Z"/><path d="M160.18,0h-38.12v113.16h17.79v-44.1h20.33c24.28,0,40.59-13.88,40.59-34.53S184.45,0,160.18,0ZM168.71,52.39c-2.98.93-5.68,1.14-5.89,1.15-1.26.13-2.52.19-3.75.19h-19.23V15.33h19.23c14.33,0,23.6,7.54,23.6,19.2,0,8.64-5.07,15.15-13.96,17.86Z"/>';
        const beautyPaths = '<path d="M296.32,51.05c6.89-5.28,10.74-13.06,10.74-21.99,0-24.01-21.04-29.05-38.68-29.05h-28.12v113.16h36.54c24.87,0,39.13-12.23,39.13-33.57,0-13.54-6.26-22.72-19.62-28.55ZM258.05,15.33h10.32c9.54,0,20.92,2.82,20.92,13.57,0,11.36-9.37,16.56-27.84,16.56h-3.39V15.33ZM269.28,97.83h-11.23v-36.75h3.35c22.21,0,33.62,4.18,36.09,14.26.04.17.06.37.1.55.27,1.26.42,2.6.42,4.04,0,14.32-15.63,17.9-28.74,17.9Z"/><polygon points="351.2 62.44 397.8 62.44 397.8 47.11 351.2 47.11 351.2 15.33 401.26 15.33 401.26 0 333.41 0 333.41 113.16 403.51 113.16 403.51 97.83 351.2 97.83 351.2 62.44"/><path d="M457.94,0l-48.04,113.16h19.07l11.72-27.6.32-.77h48.46l.32.77,11.72,27.6h19.07L472.55,0h-14.61ZM482.96,69.47h-35.44l.32-.77,17.4-40.98,17.4,40.98.32.77Z"/><path d="M584.54,64.52c0,25.05-5.7,34.37-21.04,34.37h0c-15.33,0-21.04-9.32-21.04-34.37V0h-17.79v68.04c0,16.83,4.06,29.52,12.06,37.7,6.57,6.71,15.57,10.11,26.76,10.11s20.2-3.4,26.76-10.11c8-8.18,12.06-20.86,12.06-37.7V0h-17.79v64.52Z"/><polygon points="614.73 15.33 643 15.33 643 113.16 660.79 113.16 660.79 15.33 689.06 15.33 689.06 0 614.73 0 614.73 15.33"/><polygon points="759.28 0 735.96 47.26 712.08 0 692.15 0 727.09 63.3 727.09 113.16 744.88 113.16 744.88 63.28 779.19 0 759.28 0"/>';
        const allPaths = apPaths + beautyPaths;

        const incorrectItems = [
            {
                title_ko: "방향을 변경하는 경우",
                title_en: "Altering the orientation",
                svg: `
                    <svg viewBox="0 0 240 144" style="width: 100%; height: auto; display: block;">
                        <rect width="240" height="144" fill="#ffffff" />
                        <g fill="#000000" transform="translate(127, 25.25) rotate(90) scale(0.12)">${allPaths}</g>
                        <line x1="0" y1="144" x2="240" y2="0" stroke="#ff0004" stroke-width="1.2" />
                    </svg>
                `
            },
            {
                title_ko: "비율을 임의로 조정하는 경우",
                title_en: "Distorting the proportions",
                svg: `
                    <svg viewBox="0 0 240 144" style="width: 100%; height: auto; display: block;">
                        <rect width="240" height="144" fill="#ffffff" />
                        <g fill="#000000" transform="translate(26.5, 67.5) scale(0.24, 0.08)">${allPaths}</g>
                        <line x1="0" y1="144" x2="240" y2="0" stroke="#ff0004" stroke-width="1.2" />
                    </svg>
                `
            },
            {
                title_ko: "기울기를 적용하는 경우",
                title_en: "Applying a slant or skew",
                svg: `
                    <svg viewBox="0 0 240 144" style="width: 100%; height: auto; display: block;">
                        <rect width="240" height="144" fill="#ffffff" />
                        <g fill="#000000" transform="translate(50, 80) rotate(-14) skewX(-15) scale(0.18)">${allPaths}</g>
                        <line x1="0" y1="144" x2="240" y2="0" stroke="#ff0004" stroke-width="1.2" />
                    </svg>
                `
            },
            {
                title_ko: "요소의 크기나 형태, 위치, 굵기를 변형하는 경우",
                title_en: "Modifying the elements size or position",
                svg: `
                    <svg viewBox="0 0 240 144" style="width: 100%; height: auto; display: block;">
                        <rect width="240" height="144" fill="#ffffff" />
                        <g fill="#000000" stroke="#000000" stroke-width="5" transform="translate(56, 50.35) scale(0.28)">${apPaths}</g>
                        <g fill="#000000" transform="translate(126, 82.35) scale(0.1)">${beautyPaths}</g>
                        <line x1="0" y1="144" x2="240" y2="0" stroke="#ff0004" stroke-width="1.2" />
                    </svg>
                `
            },
            {
                title_ko: "임의의 폰트를 활용하여 다른 형태로 만드는 경우",
                title_en: "Recreating with an arbitrary font",
                svg: `
                    <svg viewBox="0 0 240 144" style="width: 100%; height: auto; display: block;">
                        <rect width="240" height="144" fill="#ffffff" />
                        <text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" font-family="Georgia, 'Times New Roman', serif" font-size="22px" font-weight="700" letter-spacing="1px" fill="#000000">AP BEAUTY</text>
                        <line x1="0" y1="144" x2="240" y2="0" stroke="#ff0004" stroke-width="1.2" />
                    </svg>
                `
            },
            {
                title_ko: "대비가 낮은 컬러나 이미지와 조합하여 가시성이 낮은경우",
                title_en: "Low visibility due to low-contrast backgrounds",
                svg: `
                    <svg viewBox="0 0 240 144" style="width: 100%; height: auto; display: block;">
                        <defs>
                             <pattern id="inc-busy-pattern" width="12" height="12" patternUnits="userSpaceOnUse">
                                <rect width="12" height="12" fill="#202630" />
                                <path d="M 12 0 L 0 12 M 0 0 L 12 12" stroke="#35383f" stroke-width="1.5" />
                            </pattern>
                        </defs>
                        <rect width="240" height="144" fill="url(#inc-busy-pattern)" />
                        <g fill="#02060f" transform="translate(42, 60.7) scale(0.2)">${allPaths}</g>
                        <line x1="0" y1="144" x2="240" y2="0" stroke="#ff0004" stroke-width="1.2" />
                    </svg>
                `
            }
        ];

        let gridHtml = '';
        incorrectItems.forEach(item => {
            const label = currentLang === 'en' ? item.title_en : item.title_ko;
            gridHtml += `
                <div class="incorrect-item">
                    <div class="incorrect-preview">
                        ${item.svg}
                        <div class="incorrect-warning-badge">✕</div>
                        <div class="incorrect-label">${label}</div>
                    </div>
                </div>
            `;
        });

        visualContent = `
            <div class="incorrect-grid">
                ${gridHtml}
            </div>
        `;
    } else if (block.id === 'block_mono_2') {
        visualContent = `
            <div class="visual-image-frame" style="max-width: 442px; margin: 0 auto; width: 100%; padding: 0 24px 8px 24px; background-color: #ffffff; box-sizing: border-box;">
                <svg viewBox="0 90 573.5 540" style="width: 100%; height: auto; display: block;">
                    <defs>
                        <style>
                            .mono-sys-grid {
                                stroke: #808184;
                                stroke-linecap: round;
                                stroke-linejoin: round;
                                stroke-width: 0.5px;
                            }
                            .mono-sys-diag {
                                stroke: #e56748;
                                stroke-width: 0.8px;
                                fill: none;
                            }
                            .mono-sys-wedge {
                                fill: #e0c4c5;
                                stroke: #e56748;
                                stroke-width: 0.8px;
                            }
                            .mono-sys-dim-line {
                                stroke: #231f20;
                                stroke-width: 0.8px;
                                fill: none;
                            }
                            .mono-sys-arrow {
                                fill: #231f20;
                            }
                            .mono-sys-text {
                                font-family: var(--font-en), sans-serif;
                                font-size: 18.5px;
                                font-weight: 500;
                                fill: #231f20;
                            }
                            .mono-sys-text-orange {
                                font-family: var(--font-en), sans-serif;
                                font-size: 18.5px;
                                font-weight: 500;
                                fill: #e56748;
                            }
                        </style>
                    </defs>
                    <!-- Grid Lines -->
                    <line class="mono-sys-grid" x1="239.4" y1="90" x2="239.4" y2="610"/>
                    <line class="mono-sys-grid" x1="257.9" y1="90" x2="257.9" y2="610"/>
                    <line class="mono-sys-grid" x1="425" y1="90" x2="425" y2="610"/>
                    <line class="mono-sys-grid" x1="110.5" y1="90" x2="110.5" y2="610"/>
                    <line class="mono-sys-grid" x1="110.5" y1="448.8" x2="573.5" y2="448.8"/>
                    <line class="mono-sys-grid" x1="110.5" y1="560.2" x2="573.5" y2="560.2"/>
                    <line class="mono-sys-grid" x1="110.5" y1="168.7" x2="573.5" y2="168.7"/>
                    <line class="mono-sys-grid" x1="110.5" y1="289.7" x2="573.5" y2="289.7"/>
                    
                    <!-- Diagonal Guide -->
                    <line class="mono-sys-diag" x1="262.8" y1="90" x2="41.9" y2="610"/>
                    
                    <!-- 23 Degree Wedge -->
                    <path class="mono-sys-wedge" d="M110.5,352.3h0c13.5,0,26.1,2.7,37.8,7.6l-37.8,88.9v-96.5Z"/>
                    
                    <!-- Dimension Lines and Arrows -->
                    <g>
                        <line class="mono-sys-dim-line" x1="507.3" y1="450" x2="507.3" y2="558.1"/>
                        <polygon class="mono-sys-arrow" points="505.8,450.5 507.3,447.9 508.8,450.5"/>
                        <polygon class="mono-sys-arrow" points="505.8,557.6 507.3,560.2 508.8,557.6"/>
                    </g>
                    <g>
                        <line class="mono-sys-dim-line" x1="507.3" y1="170.9" x2="507.3" y2="287.5"/>
                        <polygon class="mono-sys-arrow" points="505.8,171.3 507.3,168.7 508.8,171.3"/>
                        <polygon class="mono-sys-arrow" points="505.8,287.1 507.3,289.7 508.8,287.1"/>
                    </g>
                    <g>
                        <line class="mono-sys-dim-line" x1="237.2" y1="600" x2="112.6" y2="600"/>
                        <polygon class="mono-sys-arrow" points="236.8,598.5 239.4,600 236.8,601.5"/>
                        <polygon class="mono-sys-arrow" points="113.1,598.5 110.5,600 113.1,601.5"/>
                    </g>
                    <g>
                        <line class="mono-sys-dim-line" x1="422.9" y1="600" x2="260.1" y2="600"/>
                        <polygon class="mono-sys-arrow" points="422.4,598.5 425,600 422.4,601.5"/>
                        <polygon class="mono-sys-arrow" points="260.5,598.5 257.9,600 260.5,601.5"/>
                    </g>
                    
                    <!-- Dimension Text Labels -->
                    <text class="mono-sys-text" x="174.95" y="622.9" text-anchor="middle">8.1</text>
                    <text class="mono-sys-text" x="341.45" y="622.9" text-anchor="middle">10.05</text>
                    <text class="mono-sys-text" x="514.6" y="509.6">7</text>
                    <text class="mono-sys-text" x="514.6" y="235.2">10A</text>
                    <text class="mono-sys-text-orange" x="120.9" y="344.4">23°</text>
                    
                    <!-- Monogram Path (using path from core_monogram_b.svg, translated/scaled) -->
                    <g fill="#02060f" transform="translate(110.5, 168.7) scale(1.0038)">
                        <path d="M217.5,120.49h-27.97L138.39,0h-19.95L0,279.02h19.33l32.02-75.42h77.07v186.4h18.44v-110.98h70.64c58.21,0,95.82-31.12,95.82-79.27s-37.61-79.27-95.82-79.27ZM58.09,187.71L128.41,22.04l41.79,98.45h-41.79v67.22H58.09ZM146.85,263.13v-126.76h30.09l53.57,126.21c-3.53.35-7.16.55-10.91.55h-72.76ZM248.35,259.07l-52.08-122.69h23.34c44.51,0,74.42,25.47,74.42,63.38,0,29-17.52,50.71-45.68,59.31Z"/>
                    </g>
                </svg>
            </div>
        `;
    } else if (block.id === 'block_mono_3') {
        visualContent = `
            <div class="visual-image-frame" style="cursor: default; max-width: 400px; margin: 0 auto; width: 100%;">
                <svg viewBox="0 0 620 516" style="width: 100%; height: auto; display: block;">
                    <!-- Background -->
                    <rect width="620" height="516" fill="#ffffff" />
                    
                    <!-- Exclusion Zone Bands (Light Gray #f2f2f2) -->
                    <rect x="140" y="0" width="320" height="80" fill="#f2f2f2" />
                    <rect x="140" y="435.2" width="320" height="80" fill="#f2f2f2" />
                    <rect x="60" y="80" width="80" height="355.2" fill="#f2f2f2" />
                    <rect x="460" y="80" width="80" height="355.2" fill="#f2f2f2" />
                    
                    <!-- Corner Squares (Darker Gray #a3a3a3) -->
                    <rect x="60" y="0" width="80" height="80" fill="#a3a3a3" />
                    <rect x="460" y="0" width="80" height="80" fill="#a3a3a3" />
                    <rect x="60" y="435.2" width="80" height="80" fill="#a3a3a3" />
                    <rect x="460" y="435.2" width="80" height="80" fill="#a3a3a3" />
                    
                    <!-- Dotted guidelines -->
                    <!-- Horizontal guidelines -->
                    <line x1="60" y1="0" x2="540" y2="0" stroke="#c0c0c0" stroke-width="1.2" stroke-dasharray="4,4" />
                    <line x1="60" y1="80" x2="540" y2="80" stroke="#c0c0c0" stroke-width="1.2" stroke-dasharray="4,4" />
                    <line x1="60" y1="257.6" x2="540" y2="257.6" stroke="#c0c0c0" stroke-width="1.2" stroke-dasharray="4,4" opacity="0.5" />
                    <line x1="60" y1="435.2" x2="540" y2="435.2" stroke="#c0c0c0" stroke-width="1.2" stroke-dasharray="4,4" />
                    <line x1="60" y1="515.2" x2="540" y2="515.2" stroke="#c0c0c0" stroke-width="1.2" stroke-dasharray="4,4" />
                    
                    <!-- Vertical guidelines -->
                    <line x1="60" y1="0" x2="60" y2="515.2" stroke="#c0c0c0" stroke-width="1.2" stroke-dasharray="4,4" />
                    <line x1="140" y1="0" x2="140" y2="515.2" stroke="#c0c0c0" stroke-width="1.2" stroke-dasharray="4,4" />
                    <line x1="300" y1="0" x2="300" y2="515.2" stroke="#c0c0c0" stroke-width="1.2" stroke-dasharray="4,4" />
                    <line x1="460" y1="0" x2="460" y2="515.2" stroke="#c0c0c0" stroke-width="1.2" stroke-dasharray="4,4" />
                    <line x1="540" y1="0" x2="540" y2="515.2" stroke="#c0c0c0" stroke-width="1.2" stroke-dasharray="4,4" />
                    
                    <!-- Monogram Graphic -->
                    <g fill="#02060f" transform="translate(174.7, 80) scale(0.9108)">
                        <path d="M217.5,120.49h-27.97L138.39,0h-19.95L0,279.02h19.33l32.02-75.42h77.07v186.4h18.44v-110.98h70.64c58.21,0,95.82-31.12,95.82-79.27s-37.61-79.27-95.82-79.27ZM58.09,187.71L128.41,22.04l41.79,98.45h-41.79v67.22H58.09ZM146.85,263.13v-126.76h30.09l53.57,126.21c-3.53.35-7.16.55-10.91.55h-72.76ZM248.35,259.07l-52.08-122.69h23.34c44.51,0,74.42,25.47,74.42,63.38,0,29-17.52,50.71-45.68,59.31Z"/>
                    </g>
                    
                    <!-- Dimension Line: 'a' inside Monogram (Red) -->
                    <line x1="300" y1="470" x2="460" y2="470" stroke="#ff0000" stroke-width="1.2" />
                    <line x1="300" y1="465" x2="300" y2="475" stroke="#ff0000" stroke-width="1.2" />
                    <line x1="460" y1="465" x2="460" y2="475" stroke="#ff0000" stroke-width="1.2" />
                    <text x="380" y="456" fill="#ff0000" font-family="var(--font-en)" font-size="22.5px" font-weight="400" text-anchor="middle">a</text>
                    
                    <!-- Dimension Line - Bottom Right Exclusion '0.5a' (Gray) -->
                    <line x1="548" y1="435.2" x2="558" y2="435.2" stroke="#a0a0a0" stroke-width="1.2" />
                    <line x1="548" y1="515.2" x2="558" y2="515.2" stroke="#a0a0a0" stroke-width="1.2" />
                    <line x1="553" y1="435.2" x2="553" y2="515.2" stroke="#a0a0a0" stroke-width="1.2" />
                    <text x="565" y="475.2" fill="#000000" font-family="var(--font-en)" font-size="21px" font-weight="400" text-anchor="start" dominant-baseline="middle">0.5a</text>
                </svg>
            </div>
        `;
    } else if (block.id === 'block_mono_3_2') {
        visualContent = `
            <div class="visual-image-frame" style="max-width: 320px; margin: 0 auto; width: 100%; padding: 24px; background-color: #ffffff; box-sizing: border-box;">
                <svg viewBox="0 0 310 135" style="width: 100%; height: auto; display: block;">
                    <defs>
                        <style>
                            .mono-ms-bracket {
                                fill: none;
                                stroke: #000000;
                                stroke-miterlimit: 10;
                                stroke-width: 0.5px;
                            }
                            .mono-ms-text {
                                fill: #090c11;
                                font-family: var(--font-en), sans-serif;
                                font-size: 16px;
                                font-weight: 400;
                            }
                        </style>
                    </defs>
                    <!-- Bracket -->
                    <polyline class="mono-ms-bracket" points="116.4,10.8 154.8,10.8 154.8,121.8 116.4,121.8"/>
                    
                    <!-- Text Labels -->
                    <text class="mono-ms-text" x="190.4" y="62.8">Printed: 8mm</text>
                    <text class="mono-ms-text" x="190.4" y="79.5">Digital: 23px</text>
                    
                    <!-- Monogram Path (from core_monogram_b.svg, translated & scaled) -->
                    <g fill="#02060f" transform="translate(1.3, 10.8) scale(0.2846)">
                        <path d="M217.5,120.49h-27.97L138.39,0h-19.95L0,279.02h19.33l32.02-75.42h77.07v186.4h18.44v-110.98h70.64c58.21,0,95.82-31.12,95.82-79.27s-37.61-79.27-95.82-79.27ZM58.09,187.71L128.41,22.04l41.79,98.45h-41.79v67.22H58.09ZM146.85,263.13v-126.76h30.09l53.57,126.21c-3.53.35-7.16.55-10.91.55h-72.76ZM248.35,259.07l-52.08-122.69h23.34c44.51,0,74.42,25.47,74.42,63.38,0,29-17.52,50.71-45.68,59.31Z"/>
                    </g>
                </svg>
            </div>
        `;
    } else if (block.id === 'block_mono_6') {
        visualContent = `
            <div style="max-width: 273.6px; margin: 0 auto; width: 100%;">
                <div class="placement-item" style="padding-bottom: 0;">
                    <svg viewBox="0 85 398 470" style="width: 100%; height: auto; display: block;">
                        <path d="M288.8,238.7h-31.5l-57.7-135.9h-22.5L43.4,417.6h21.8l36.1-85.1h86.9v210.3h20.8v-125.2h79.7c65.7,0,108.1-35.1,108.1-89.4s-42.4-89.4-108.1-89.4h0ZM109,314.5l79.3-186.9,47.1,111.1h-47.1v75.8h-79.3ZM209.1,399.6v-143h33.9l60.4,142.4c-4,.4-8.1.6-12.3.6h-82.1ZM323.6,395.1l-58.8-138.4h26.3c50.2,0,84,28.7,84,71.5s-19.8,57.2-51.5,66.9h0Z" fill="#02060f"/>
                        <rect x="0.5" y="102.8" width="396.4" height="441.4" fill="none" stroke="red" stroke-width="1.2"/>
                        <line x1="198.7" y1="102.8" x2="198.7" y2="544.2" stroke="red" stroke-width="1.2"/>
                        <line x1="0.5" y1="323.5" x2="396.9" y2="323.5" stroke="red" stroke-width="1.2"/>
                    </svg>
                </div>
            </div>
        `;
    } else if (block.id === 'block_mono_9') {
        const monoPaths = '<path d="M217.5,120.49h-27.97L138.39,0h-19.95L0,279.02h19.33l32.02-75.42h77.07v186.4h18.44v-110.98h70.64c58.21,0,95.82-31.12,95.82-79.27s-37.61-79.27-95.82-79.27ZM58.09,187.71L128.41,22.04l41.79,98.45h-41.79v67.22H58.09ZM146.85,263.13v-126.76h30.09l53.57,126.21c-3.53.35-7.16.55-10.91.55h-72.76ZM248.35,259.07l-52.08-122.69h23.34c44.51,0,74.42,25.47,74.42,63.38,0,29-17.52,50.71-45.68,59.31Z"/>';

        const incorrectItems = [
            {
                title_ko: "방향을 변경하는 경우",
                title_en: "Altering the orientation",
                svg: '<svg viewBox="0 0 240 144" style="width: 100%; height: auto; display: block;"><rect width="240" height="144" fill="#ffffff" /><g fill="#02060f" transform="translate(160, 25) rotate(90) scale(0.24)">' + monoPaths + '</g><line x1="0" y1="144" x2="240" y2="0" stroke="#ff0004" stroke-width="1.2" /></svg>'
            },
            {
                title_ko: "비율을 임의로 조정하는 경우",
                title_en: "Distorting the proportions",
                svg: '<svg viewBox="0 0 240 144" style="width: 100%; height: auto; display: block;"><rect width="240" height="144" fill="#ffffff" /><g fill="#02060f" transform="translate(73, 45) scale(0.3, 0.14)">' + monoPaths + '</g><line x1="0" y1="144" x2="240" y2="0" stroke="#ff0004" stroke-width="1.2" /></svg>'
            },
            {
                title_ko: "기울기를 적용하는 경우",
                title_en: "Applying a slant or skew",
                svg: '<svg viewBox="0 0 240 144" style="width: 100%; height: auto; display: block;"><rect width="240" height="144" fill="#ffffff" /><g fill="#02060f" transform="translate(90, 42) rotate(-14) skewX(-15) scale(0.22)">' + monoPaths + '</g><line x1="0" y1="144" x2="240" y2="0" stroke="#ff0004" stroke-width="1.2" /></svg>'
            },
            {
                title_ko: "요소의 크기나 형태, 굵기를 변형하는 경우",
                title_en: "Modifying the elements size or weight",
                svg: '<svg viewBox="0 0 240 144" style="width: 100%; height: auto; display: block;"><rect width="240" height="144" fill="#ffffff" /><g fill="#02060f" transform="translate(-2, -245) scale(0.6)"><path d="M227.5,486.5h-17.3l-13.1-31.2h-7.1l-51.3,121.8h7.4l18.8-45h25.9v60.9h11.4v-28.7h24.5c28.9,0,47.6-15.3,47.6-38.9s-18.4-38.9-46.8-38.9h0ZM241.1,552.4l-1.4.4c-.5,0-1.1.2-1.6.3l-19.6-46.6-2.6-6.2h0l-1.5-3.5h14c20.3,0,33.9,11.5,33.9,28.7s-8,23.1-21.3,27h.1ZM202.2,532.1h19.1l9.1,22h-28.2v-22h0ZM208,500.3h0l2.6,6.2h0l8.1,19.4h-16.5v-29.1h4.4l1.5,3.5h-.1ZM167.4,525.9l25.7-61.6,9.3,22.3h-11.5v39.4h-23.5Z"/></g><line x1="0" y1="144" x2="240" y2="0" stroke="#ff0004" stroke-width="1.2" /></svg>'
            },
            {
                title_ko: "임의의 폰트를 활용하여 다른 형태로 만드는 경우",
                title_en: "Recreating with an arbitrary font",
                svg: '<svg viewBox="0 0 240 144" style="width: 100%; height: auto; display: block;"><rect width="240" height="144" fill="#ffffff" /><text x="50%" y="55%" dominant-baseline="middle" text-anchor="middle" font-family="Georgia, serif" font-size="60px" font-weight="700" letter-spacing="-5px" fill="#02060f">AP</text><line x1="0" y1="144" x2="240" y2="0" stroke="#ff0004" stroke-width="1.2" /></svg>'
            },
            {
                title_ko: "대비가 낮은 컬러나 이미지와 조합하여 가시성이 낮은경우",
                title_en: "Low visibility due to low-contrast backgrounds",
                svg: '<svg viewBox="0 0 240 144" style="width: 100%; height: auto; display: block;"><defs><pattern id="mono-inc-busy-pattern" width="12" height="12" patternUnits="userSpaceOnUse"><rect width="12" height="12" fill="#202630" /><path d="M 12 0 L 0 12 M 0 0 L 12 12" stroke="#35383f" stroke-width="1.5" /></pattern></defs><rect width="240" height="144" fill="url(#mono-inc-busy-pattern)" /><g fill="#02060f" transform="translate(85.5, 29.1) scale(0.22)">' + monoPaths + '</g><line x1="0" y1="144" x2="240" y2="0" stroke="#ff0004" stroke-width="1.2" /></svg>'
            }
        ];

        let gridHtml = '';
        incorrectItems.forEach(item => {
            const label = currentLang === 'en' ? item.title_en : item.title_ko;
            gridHtml += `
                <div class="incorrect-item">
                    <div class="incorrect-preview">
                        ${item.svg}
                        <div class="incorrect-warning-badge">✕</div>
                        <div class="incorrect-label">${label}</div>
                    </div>
                </div>
            `;
        });

        visualContent = `
            <div class="incorrect-grid">
                ${gridHtml}
            </div>
        `;
    } else if (block.id === 'block_slog_1' || block.id === 'block_slog_2' || block.id === 'block_slog_3') {
        const sloganMasterDefs = `
            <g id="slogan-master-paths">
                <path d="M37.44,44.08H14.64l-5.84,12.88H0L26.56.48l25.28,56.48h-8.8l-5.6-12.88ZM34.16,36.4l-7.92-18.08-8.24,18.08h16.16Z" fill="#02060f"/>
                <path d="M69.52,3.6c3.28,0,7.84.32,11.68,2.88,4.48,2.96,6.64,8.08,6.64,12.96,0,3.12-.8,7.92-5.2,11.68-4.24,3.6-9.12,4.16-13.04,4.16h-3.68v21.68h-8.16V3.6h11.76ZM65.92,27.76h3.68c7.04,0,10.4-3.44,10.4-8.4,0-2.96-1.2-8.24-10.48-8.24h-3.6v16.64Z" fill="#02060f"/>
                <path d="M124.8,11.28h-21.28v13.52h20.64v7.68h-20.64v16.8h21.28v7.68h-29.44V3.6h29.44v7.68Z" fill="#02060f"/>
                <path d="M145.76,29.12l-14.72-25.52h9.12l10.4,18.08,10.64-18.08h9.12l-15.36,25.52,16.08,27.84h-9.12l-11.68-20.4-12.16,20.4h-9.12l16.8-27.84Z" fill="#02060f"/>
                <path d="M248.24,30.32c0,15.68-11.76,27.68-27.76,27.68s-27.76-12-27.76-27.68,11.76-27.68,27.76-27.68,27.76,12,27.76,27.68ZM240.08,30.32c0-11.84-8.16-20.16-19.6-20.16s-19.6,8.32-19.6,20.16,8.16,20.16,19.6,20.16,19.6-8.32,19.6-20.16Z" fill="#02060f"/>
                <path d="M283.2,11.28h-18.56v13.52h17.92v7.68h-17.92v24.48h-8.16V3.6h26.72v7.68Z" fill="#02060f"/>
                <path d="M332.56,15.44c-.48-1.2-1.2-2.32-2.4-3.36-1.68-1.36-3.44-1.92-5.76-1.92-4.96,0-7.52,2.96-7.52,6.4,0,1.6.56,4.4,5.76,6.48l5.36,2.16c9.84,4,12.56,9.6,12.56,15.68,0,10.16-7.2,17.12-17.2,17.12-6.16,0-9.84-2.32-12.56-5.36-2.88-3.2-4.16-6.72-4.48-10.4l8.08-1.76c0,2.64.96,5.12,2.24,6.8,1.52,1.92,3.76,3.2,6.96,3.2,4.96,0,8.8-3.6,8.8-8.96s-4.16-7.68-7.68-9.12l-5.12-2.16c-4.4-1.84-10.88-5.52-10.88-13.52,0-7.2,5.6-14.08,15.6-14.08,5.76,0,9.04,2.16,10.72,3.6,1.44,1.28,2.96,3.12,4.08,5.36l-6.56,3.84Z" fill="#02060f"/>
                <path d="M358.16,24.88l20.64-21.28h10.72l-24.08,24.16,24.24,29.2h-10.88l-19.04-23.68-1.6,1.6v22.08h-8.16V3.6h8.16v21.28Z" fill="#02060f"/>
                <path d="M404.24,3.6v53.36h-8.16V3.6h8.16Z" fill="#02060f"/>
                <path d="M416.23,56.96V0l38.72,40.56V3.6h8.16v56.64l-38.72-40.56v37.28h-8.16Z" fill="#02060f"/>
                <path d="M514.63,16.08c-5.92-5.36-11.44-5.92-14.48-5.92-11.6,0-19.44,8.56-19.44,20.32s8.16,20,19.52,20c6.4,0,11.36-3.28,14.4-6.16v9.68c-5.36,3.2-10.96,4-14.64,4-9.68,0-15.76-4.4-18.88-7.36-6.24-5.84-8.56-12.64-8.56-20.16,0-9.84,4.08-16.64,8.56-20.88,5.52-5.2,11.92-6.96,19.28-6.96,4.88,0,9.6.88,14.24,3.84v9.6Z" fill="#02060f"/>
                <path d="M554.47,44.08h-22.8l-5.84,12.88h-8.8L543.59.48l25.28,56.48h-8.8l-5.6-12.88ZM551.19,36.4l-7.92-18.08-8.24,18.08h16.16Z" fill="#02060f"/>
                <path d="M584.31,3.6c6.48,0,10.64.8,14.08,3.12,5.84,3.92,6.32,10.24,6.32,12.56,0,7.68-4.72,13.28-11.84,14.88l16.64,22.8h-9.84l-15.28-21.84h-1.44v21.84h-8.16V3.6h9.52ZM582.95,28.08h2.56c2.24,0,11.36-.24,11.36-8.72,0-7.52-7.12-8.24-11.12-8.24h-2.8v16.96Z" fill="#02060f"/>
                <path d="M646.15,11.28h-21.28v13.52h20.64v7.68h-20.64v16.8h21.28v7.68h-29.44V3.6h29.44v7.68Z" fill="#02060f"/>
                <path d="M101.3,87.09v23.88h-2.96v-23.88h-6.48v-2.8h15.92v2.8h-6.48Z" fill="#02060f"/>
                <path d="M108.54,97.64c0-7.96,6.2-13.8,13.88-13.8s13.88,5.84,13.88,13.8-6.16,13.8-13.88,13.8-13.88-5.88-13.88-13.8ZM111.58,97.64c0,6.12,4.84,11,10.84,11s10.84-4.88,10.84-11-4.84-11-10.84-11-10.84,4.88-10.84,11Z" fill="#02060f"/>
                <path d="M153.22,100.64c0,2.24,0,4.68,2.12,6.48,1.08.92,2.92,1.52,4.4,1.52s3.32-.6,4.4-1.52c2.12-1.8,2.12-4.24,2.12-6.48v-16.36h2.96v17.16c0,2.24-.24,4.4-1.68,6.4-1.6,2.2-4.4,3.6-7.8,3.6s-6.2-1.4-7.8-3.6c-1.44-2-1.68-4.16-1.68-6.4v-17.16h2.96v16.36Z" fill="#02060f"/>
                <path d="M175.7,110.96v-27.8l20.8,21.8v-20.68h2.96v27.88l-20.8-21.8v20.6h-2.96Z" fill="#02060f"/>
                <path d="M206.1,84.29l7.52,20.36,7.52-20.36h3.28l-10.8,28.28-10.8-28.28h3.28Z" fill="#02060f"/>
                <path d="M241.62,87.09h-10.88v7.92h10.56v2.8h-10.56v10.36h10.88v2.8h-13.84v-26.68h13.84v2.8Z" fill="#02060f"/>
                <path d="M249.62,84.29v26.68h-2.96v-26.68h2.96Z" fill="#02060f"/>
                <path d="M259.06,84.29v23.88h7.36v2.8h-10.32v-26.68h2.96Z" fill="#02060f"/>
                <path d="M283.73,84.29c1.48,0,4.16.12,6.12,1.68.84.64,2.4,2.28,2.4,5.52,0,1.32-.28,3.64-2.64,5.24,3.72.92,5.08,4.16,5.08,6.72s-1.28,4.64-2.72,5.76c-2.12,1.68-4.56,1.76-6.4,1.76h-6.64v-26.68h4.8ZM281.9,96h2.24c1.56,0,5.24-.32,5.24-4.44,0-4.4-4.32-4.48-5.16-4.48h-2.32v8.92ZM281.9,108.16h3.4c1.72,0,3.4-.12,4.68-1.12,1.04-.76,1.76-2.08,1.76-3.68,0-2.12-1.24-3.36-2.28-3.92-1-.56-2.4-.8-4.52-.8h-3.04v9.52Z" fill="#02060f"/>
                <path d="M313.57,87.09h-10.88v7.92h10.56v2.8h-10.56v10.36h10.88v2.8h-13.84v-26.68h13.84v2.8Z" fill="#02060f"/>
                <path d="M333.33,103.44h-11.36l-3.2,7.52h-3.28l12.28-27.96,11.96,27.96h-3.28l-3.12-7.52ZM332.17,100.64l-4.48-10.68-4.56,10.68h9.04Z" fill="#02060f"/>
                <path d="M346.05,100.64c0,2.24,0,4.68,2.12,6.48,1.08.92,2.92,1.52,4.4,1.52s3.32-.6,4.4-1.52c2.12-1.8,2.12-4.24,2.12-6.48v-16.36h2.96v17.16c0,2.24-.24,4.4-1.68,6.4-1.6,2.2-4.4,3.6-7.8,3.6s-6.2-1.4-7.8-3.6c-1.44-2-1.68-4.16-1.68-6.4v-17.16h2.96v16.36Z" fill="#02060f"/>
                <path d="M375.09,87.09v23.88h-2.96v-23.88h-6.48v-2.8h15.92v2.8h-6.48Z" fill="#02060f"/>
                <path d="M391.65,99.48l-8.76-15.2h3.44l6.8,11.92,6.88-11.92h3.44l-8.84,15.2v11.48h-2.96v-11.48Z" fill="#02060f"/>
                <path d="M420.53,84.29c1.48,0,4.16.12,6.12,1.68.84.64,2.4,2.28,2.4,5.52,0,1.32-.28,3.64-2.64,5.24,3.72.92,5.08,4.16,5.08,6.72s-1.28,4.64-2.72,5.76c-2.12,1.68-4.56,1.76-6.4,1.76h-6.64v-26.68h4.8ZM418.69,96h2.24c1.56,0,5.24-.32,5.24-4.44,0-4.4-4.32-4.48-5.16-4.48h-2.32v8.92ZM418.69,108.16h3.4c1.72,0,3.4-.12,4.68-1.12,1.04-.76,1.76-2.08,1.76-3.68,0-2.12-1.24-3.36-2.28-3.92-1-.56-2.4-.8-4.52-.8h-3.04v9.52Z" fill="#02060f"/>
                <path d="M450.37,87.09h-10.88v7.92h10.56v2.8h-10.56v10.36h10.88v2.8h-13.84v-26.68h13.84v2.8Z" fill="#02060f"/>
                <path d="M461.05,99.48l-8.76-15.2h3.44l6.8,11.92,6.88-11.92h3.44l-8.84,15.2v11.48h-2.96v-11.48Z" fill="#02060f"/>
                <path d="M473.81,97.64c0-7.96,6.2-13.8,13.88-13.8s13.88,5.84,13.88,13.8-6.16,13.8-13.88,13.8-13.88-5.88-13.88-13.8ZM476.85,97.64c0,6.12,4.84,11,10.84,11s10.84-4.88,10.84-11-4.84-11-10.84-11-10.84,4.88-10.84,11Z" fill="#02060f"/>
                <path d="M506.61,110.96v-27.8l20.8,21.8v-20.68h2.96v27.88l-20.8-21.8v20.6h-2.96Z" fill="#02060f"/>
                <path d="M536.85,84.29h5.44c2.68,0,6.48.28,9.84,3.12,2.44,2.04,4.56,5.44,4.56,10.24,0,5.6-2.76,8.6-4.68,10.24-2.44,2.08-5,3.08-9.76,3.08h-5.4v-26.68ZM539.81,108.16h2.6c2.12,0,5.04-.24,7.64-2.4,2-1.68,3.6-4.32,3.6-8.12,0-6.4-4.48-10.56-11.24-10.56h-2.6v21.08Z" fill="#02060f"/>
            </g>
        `;

        if (block.id === 'block_slog_1') {
            visualContent = `
                <div class="visual-image-frame visual-image-svg-box" style="padding: 24px; background-color: #ffffff;">
                    <svg viewBox="0 0 646.15 112.56" style="width: 100%; height: auto; display: block; max-width: 810px; margin: 0 auto;">
                        <defs>
                            ${sloganMasterDefs}
                        </defs>
                        <use href="#slogan-master-paths" x="0" y="0" />
                    </svg>
                </div>
            `;
        } else if (block.id === 'block_slog_2') {
            visualContent = `
                <div class="visual-image-frame visual-image-svg-box" style="padding: 24px 0; background-color: #ffffff;">
                    <svg viewBox="0 0 935 240.36" style="width: 100%; height: auto; display: block; max-width: 810px; margin: 0 auto;">
                        <defs>
                            ${sloganMasterDefs}
                        </defs>
                        <!-- Center dashed alignment line -->
                        <line x1="490.19" y1="0" x2="490.19" y2="202.79" stroke="#000000" stroke-dasharray="6 6" stroke-width="0.5px" fill="none" opacity="0.3" />
                        
                        <!-- Horizontal guidelines -->
                        <line x1="135.12" y1="46.85" x2="841.27" y2="46.85" stroke="#02060f" stroke-width="0.5px" fill="none" opacity="0.3" />
                        <line x1="135.12" y1="100.81" x2="841.27" y2="100.81" stroke="#02060f" stroke-width="0.5px" fill="none" opacity="0.3" />
                        <line x1="135.12" y1="127.85" x2="841.27" y2="127.85" stroke="#02060f" stroke-width="0.5px" fill="none" opacity="0.3" />
                        <line x1="135.12" y1="154.89" x2="841.27" y2="154.89" stroke="#02060f" stroke-width="0.5px" fill="none" opacity="0.3" />
                        
                        <!-- Brackets on the left -->
                        <polyline points="96.61 102.01 61.24 102.01 61.24 127.85 96.61 127.85" stroke="#ed1c24" stroke-width="0.8px" fill="none" />
                        <polyline points="96.61 127.85 61.24 127.85 61.24 153.68 96.61 153.68" stroke="#ed1c24" stroke-width="0.8px" fill="none" />
                        <polyline points="96.61 44.85 61.24 44.85 61.24 101.81 96.61 101.81" stroke="#ed1c24" stroke-width="0.8px" fill="none" />
                        
                        <!-- Selectable dimension labels -->
                        <text x="36" y="78" fill="#ed1c24" font-family="var(--font-en)" font-size="16px" font-weight="500">X</text>
                        <text x="26" y="119" fill="#ed1c24" font-family="var(--font-en)" font-size="16px" font-weight="500">0.5x</text>
                        <text x="26" y="145" fill="#ed1c24" font-family="var(--font-en)" font-size="16px" font-weight="500">0.5x</text>
                        
                        <!-- Right text labels -->
                        <text x="854.5" y="69" fill="#ed1c24" font-family="var(--font-en)" font-size="12.5px" font-weight="500" letter-spacing="0.5px">FUTURA PT</text>
                        <text x="854.5" y="83" fill="#ed1c24" font-family="var(--font-en)" font-size="12.5px" font-weight="500" letter-spacing="0.5px">Medium</text>
                        
                        <text x="854.5" y="135" fill="#ed1c24" font-family="var(--font-en)" font-size="12.5px" font-weight="500" letter-spacing="0.5px">FUTURA PT</text>
                        <text x="854.5" y="149" fill="#ed1c24" font-family="var(--font-en)" font-size="12.5px" font-weight="500" letter-spacing="0.5px">Book</text>
                        <text x="491.75" y="232" fill="#ed1c24" font-family="var(--font-en)" font-size="13px" font-weight="500" text-anchor="middle" letter-spacing="0.5px">Tracking: -10</text>
                        
                        <!-- Slogan lettering -->
                        <use href="#slogan-master-paths" x="165.19" y="43.85" />
                    </svg>
                </div>
            `;
        } else if (block.id === 'block_slog_3') {
            visualContent = `
                <div class="visual-image-frame visual-image-svg-box" style="padding: 24px; background-color: #ffffff;">
                    <svg viewBox="0 0 824.29 218.45" style="width: 100%; height: auto; display: block; max-width: 810px; margin: 0 auto;">
                        <defs>
                            ${sloganMasterDefs}
                        </defs>
                        <!-- Center guidelines -->
                        <line x1="766.78" y1="108.47" x2="0.12" y2="108.47" stroke="#000000" stroke-dasharray="6 6" stroke-width="0.5px" fill="none" opacity="0.3" />
                        <line x1="385.44" y1="0.48" x2="385.44" y2="218.45" stroke="#000000" stroke-dasharray="6 6" stroke-width="0.5px" fill="none" opacity="0.3" />
                        
                        <!-- Corner gray squares -->
                        <rect x="0.12" y="0.48" width="53.37" height="53.37" fill="#dcdcdc" />
                        <rect x="713.41" y="0.48" width="53.37" height="53.37" fill="#dcdcdc" />
                        <rect x="0.12" y="162.08" width="53.37" height="53.37" fill="#dcdcdc" />
                        <rect x="714.51" y="162.08" width="52.27" height="53.37" fill="#dcdcdc" />
                        
                        <!-- Inner & outer boundary lines -->
                        <rect x="0.12" y="0.74" width="766.64" height="213.98" stroke="#02060f" stroke-width="0.5px" fill="none" opacity="0.3" />
                        <rect x="53.5" y="53.85" width="661.01" height="109.23" stroke="#02060f" stroke-width="0.5px" fill="none" opacity="0.3" />
                        
                        <!-- Right brackets -->
                        <polyline points="782.6 108.08 805.01 108.08 805.01 54.01 782.6 54.01" stroke="#ed1c24" stroke-width="0.8px" fill="none" />
                        <polyline points="782.6 54.2 805.01 54.2 805.01 0.13 782.6 0.13" stroke="#ed1c24" stroke-width="0.8px" fill="none" />
                        
                        <!-- Selectable labels -->
                        <text x="813.28" y="86.82" fill="#ed1c24" font-family="var(--font-en)" font-size="16px" font-weight="500" opacity="0.8">a</text>
                        <text x="813.28" y="32.94" fill="#ed1c24" font-family="var(--font-en)" font-size="16px" font-weight="500" opacity="0.8">a</text>
                        
                        <!-- Slogan lettering -->
                        <use href="#slogan-master-paths" x="60.45" y="51.12" />
                    </svg>
                </div>
            `;
        }
    } else {
        const isOtherSvg = adaptedImage.endsWith('.svg') && !adaptedImage.includes('core_wordmark');
        const frameClass = isOtherSvg ? 'visual-image-frame visual-image-svg-box' : 'visual-image-frame';
        visualContent = `
            <div class="${frameClass}">
                <img src="${adaptedImage}" alt="${blockTitle || 'AP BEAUTY'}" loading="lazy" style="width: 100%; height: auto; display: block;">
            </div>
        `;
    }

    const isFullWidth = block.layout === 'full-width-no-border';
    if (isFullWidth) {
        return `
            <div class="guide-block" id="block-${block.id}" style="display: block !important; padding: 40px 0 !important;">
                <div class="block-text-column" style="width: 100% !important; margin-bottom: 24px !important;">
                    <h2 class="block-title">${blockTitle}</h2>
                    <div class="text-block-content">${formatContent(blockContent)}</div>
                </div>
                
                <div class="block-visual-column" style="width: 100% !important;">
                    ${visualContent}
                </div>

                <div class="edit-actions-floating">
                    ${index > 0 ? `<button class="btn btn-secondary btn-xs" onclick="moveBlock('${sectionId}', '${block.id}', -1)" title="위로">↑</button>` : ''}
                    ${index < totalBlocks - 1 ? `<button class="btn btn-secondary btn-xs" onclick="moveBlock('${sectionId}', '${block.id}', 1)" title="아래로">↓</button>` : ''}
                    <button class="btn btn-secondary btn-xs" onclick="openEditBlockModal('${sectionId}', '${block.id}')">수정 ✏️</button>
                    <button class="btn btn-danger btn-xs" onclick="deleteBlock('${sectionId}', '${block.id}')">삭제 🗑️</button>
                </div>
            </div>
        `;
    }

    return `
        <div class="guide-block" id="block-${block.id}">
            <div class="block-text-column">
                <h2 class="block-title">${blockTitle}</h2>
                <div class="text-block-content">${formatContent(blockContent)}</div>
            </div>
            
            <div class="block-visual-column">
                ${visualContent}
            </div>
        </div>
    `;
}

// Clipboard copy utility
function copyText(text) {
    const message = currentLang === 'en' ? `Copied: ${text}` : `복사 완료: ${text}`;
    navigator.clipboard.writeText(text).then(() => {
        showToast(message);
    }).catch(err => {
        console.error('클립보드 복사 실패:', err);
    });
}

// Toast notification trigger
function showToast(message, isError = false) {
    const container = document.getElementById('toast-wrapper');
    const toast = document.createElement('div');
    toast.className = `toast ${isError ? 'toast-error' : ''}`;
    toast.innerHTML = `
        <span>${isError ? '⚠️' : '✓'}</span>
        <span>${message}</span>
    `;
    container.appendChild(toast);
    
    // Animate out and remove
    setTimeout(() => {
        toast.style.animation = 'none';
        toast.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(20px)';
        setTimeout(() => toast.remove(), 500);
    }, 3000);
}

// Helper for cross-lingual bilingual search
function checkMatch(text, query) {
    if (!text || !query) return false;
    const lowerText = text.toLowerCase();
    const lowerQuery = query.toLowerCase();
    
    // 1. Direct match check
    if (lowerText.includes(lowerQuery)) return true;
    
    const synonyms = [
        ['monogram', '모노그램'],
        ['wordmark', '워드마크'],
        ['slogan', '슬로건'],
        ['logo', '로고'],
        ['minimum', '최소'],
        ['size', '크기'],
        ['size', '사이즈'],
        ['exclusion', '안전'],
        ['exclusion', '여백'],
        ['zone', '영역'],
        ['zone', '공간'],
        ['placement', '배치'],
        ['placement', '정렬'],
        ['incorrect', '오용'],
        ['incorrect', '금지'],
        ['incorrect', '잘못된'],
        ['background', '배경'],
        ['usage', '사용'],
        ['usage', '활용'],
        ['download', '다운로드'],
        ['download', '다운'],
        ['color', '색상'],
        ['color', '컬러'],
        ['typeface', '서체'],
        ['typeface', '폰트'],
        ['typeface', '글꼴'],
        ['font', '서체'],
        ['font', '폰트'],
        ['font', '글꼴'],
        ['structure', '구조'],
        ['grid', '그리드']
    ];
    
    // 2. Fully translated query check (translate all matching terms)
    let altQuery = lowerQuery;
    let replacedAny = false;
    
    for (const pair of synonyms) {
        if (altQuery.includes(pair[0])) {
            altQuery = altQuery.replace(new RegExp(pair[0], 'g'), pair[1]);
            replacedAny = true;
        } else if (altQuery.includes(pair[1])) {
            altQuery = altQuery.replace(new RegExp(pair[1], 'g'), pair[0]);
            replacedAny = true;
        }
    }
    
    if (replacedAny && lowerText.includes(altQuery)) {
        return true;
    }
    
    // 3. Partial/Single synonym replacement fallback
    for (const pair of synonyms) {
        if (lowerQuery.includes(pair[0]) || lowerQuery.includes(pair[1])) {
            const termInQuery = lowerQuery.includes(pair[0]) ? pair[0] : pair[1];
            const altTerm = lowerQuery.includes(pair[0]) ? pair[1] : pair[0];
            const altQuerySingle = lowerQuery.replace(termInQuery, altTerm);
            if (lowerText.includes(altQuerySingle)) {
                return true;
            }
        }
    }
    
    return false;
}

// Client-Side Search Engine
function handleSearch(query) {
    const sections = document.querySelectorAll('.guide-section');
    const navLinks = document.querySelectorAll('#nav-links .nav-link');
    const submenus = document.querySelectorAll('#nav-links .nav-submenu');
    
    const searchClearBtn = document.getElementById('search-clear-btn');
    if (searchClearBtn) {
        searchClearBtn.style.display = query ? 'block' : 'none';
    }
    
    if (!query) {
        // Reset everything
        sections.forEach(sec => {
            sec.style.display = 'block';
            const blocks = sec.querySelectorAll('.guide-block');
            blocks.forEach(blk => {
                blk.style.display = '';
                restoreOriginalText(blk);
            });
        });
        
        // Reset sidebar
        navLinks.forEach(link => {
            link.style.display = '';
            link.classList.remove('active');
        });
        submenus.forEach(sub => {
            sub.style.display = '';
            sub.classList.remove('expanded');
            const subLinks = sub.querySelectorAll('.nav-sub-link');
            subLinks.forEach(sl => {
                sl.style.display = '';
                sl.classList.remove('active');
            });
        });
        
        // Reset scroll spy status
        activeSectionId = '';
        updateActiveNavLink('', '');
        
        // Reset mobile menu links
        const mobileMenuLinks = document.querySelectorAll('.mobile-menu-link');
        mobileMenuLinks.forEach(link => {
            link.style.display = 'block';
        });
        
        // Remove empty message if any
        const emptyMsg = document.getElementById('search-empty-message');
        if (emptyMsg) emptyMsg.remove();
        
        return;
    }
    
    let totalMatches = 0;
    
    sections.forEach(sec => {
        const sectionTitle = sec.querySelector('.section-title').textContent;
        const sectionMatchesTitle = checkMatch(sectionTitle, query);
        
        let sectionMatchesCount = 0;
        const blocks = sec.querySelectorAll('.guide-block');
        
        blocks.forEach(blk => {
            const blockTitleEl = blk.querySelector('.block-title');
            const blockContentEl = blk.querySelector('.text-block-content');
            
            const titleText = blockTitleEl ? blockTitleEl.textContent : '';
            const contentText = blockContentEl ? blockContentEl.textContent : '';
            
            const titleMatches = checkMatch(titleText, query);
            const contentMatches = checkMatch(contentText, query);
            
            if (titleMatches || contentMatches || sectionMatchesTitle) {
                blk.style.display = ''; // Show block
                sectionMatchesCount++;
                totalMatches++;
                
                // Highlight text
                if (blockTitleEl) highlightText(blockTitleEl, query);
                if (blockContentEl) highlightText(blockContentEl, query);
            } else {
                blk.style.display = 'none'; // Hide block
                restoreOriginalText(blk);
            }
        });
        
        // Show section if it has matches
        if (sectionMatchesCount > 0 || sectionMatchesTitle) {
            sec.style.display = 'block';
            if (sectionMatchesTitle) {
                // If section title matches, show all blocks in that section
                blocks.forEach(blk => {
                    blk.style.display = '';
                    const blockTitleEl = blk.querySelector('.block-title');
                    const blockContentEl = blk.querySelector('.text-block-content');
                    if (blockTitleEl) highlightText(blockTitleEl, query);
                    if (blockContentEl) highlightText(blockContentEl, query);
                });
            }
        } else {
            sec.style.display = 'none';
        }
    });
    
    // Filter Navigation Links
    navLinks.forEach(link => {
        const targetId = link.getAttribute('href').replace('#', '');
        const text = link.textContent;
        const submenu = document.getElementById(`submenu-${targetId}`);
        
        let hasSubmenuMatch = false;
        if (submenu) {
            const subLinks = submenu.querySelectorAll('.nav-sub-link');
            subLinks.forEach(sl => {
                const subText = sl.textContent;
                const blockId = sl.getAttribute('href').replace('#block-', '');
                const blockEl = document.getElementById(`block-${blockId}`);
                const isBlockVisible = blockEl && blockEl.style.display !== 'none';
                
                const subMatch = checkMatch(subText, query) || isBlockVisible;
                if (subMatch) {
                    sl.style.display = 'block';
                    hasSubmenuMatch = true;
                } else {
                    sl.style.display = 'none';
                }
            });
        }
        
        // Keep the main link always visible during search
        link.style.display = 'block';
        
        const mainMatch = checkMatch(text, query);
        if (hasSubmenuMatch || mainMatch) {
            if (submenu) {
                submenu.classList.add('expanded');
                // If main link matched, show all sublinks of this section
                if (mainMatch) {
                    const subLinks = submenu.querySelectorAll('.nav-sub-link');
                    subLinks.forEach(sl => sl.style.display = 'block');
                }
            }
        } else {
            if (submenu) {
                submenu.classList.remove('expanded');
            }
        }
    });
    
    // Filter Mobile Menu Links
    const mobileMenuLinks = document.querySelectorAll('.mobile-menu-link');
    mobileMenuLinks.forEach(link => {
        const targetId = link.getAttribute('href').replace('#', '');
        const sectionEl = document.getElementById(`section-${targetId}`);
        const isSectionVisible = sectionEl && sectionEl.style.display !== 'none';
        link.style.display = isSectionVisible ? 'block' : 'none';
    });
    
    // Handle empty state
    let emptyMsg = document.getElementById('search-empty-message');
    if (totalMatches === 0) {
        if (!emptyMsg) {
            emptyMsg = document.createElement('div');
            emptyMsg.id = 'search-empty-message';
            emptyMsg.style.textAlign = 'center';
            emptyMsg.style.padding = '80px 20px';
            emptyMsg.style.color = 'var(--ap-gray)';
            emptyMsg.style.fontFamily = 'var(--font-en)';
            emptyMsg.style.fontSize = '1.2rem';
            emptyMsg.style.letterSpacing = '1px';
            const msg = currentLang === 'en' ? `No results found for "<strong>${escapeHTML(query)}</strong>".` : `"${escapeHTML(query)}"에 대한 검색 결과가 없습니다.`;
            const sub = currentLang === 'en' ? 'Try searching with different keywords.' : '다른 키워드로 검색해 보세요.';
            emptyMsg.innerHTML = `
                <div style="font-size: 2rem; margin-bottom: 16px;">🔍</div>
                ${msg}<br>
                <small style="font-size: 0.9rem; margin-top: 8px; display: inline-block;">${sub}</small>
            `;
            const sectionsWrapper = document.getElementById('sections-wrapper');
            if (sectionsWrapper) sectionsWrapper.appendChild(emptyMsg);
        }
    } else {
        if (emptyMsg) emptyMsg.remove();
    }
}

// Tree-walking text highlighter (DOM-safe, does not corrupt HTML structures)
function highlightText(el, query) {
    if (!el) return;
    
    // Store original HTML if not already stored
    if (!el.hasAttribute('data-original-html')) {
        el.setAttribute('data-original-html', el.innerHTML);
    }
    
    // Restore first to start clean on next type
    el.innerHTML = el.getAttribute('data-original-html');
    
    const lowerQuery = query.toLowerCase();
    const synonyms = [
        ['monogram', '모노그램'],
        ['wordmark', '워드마크']
    ];
    
    let regexPattern = escapeRegExp(query);
    for (const pair of synonyms) {
        if (lowerQuery.includes(pair[0]) || lowerQuery.includes(pair[1])) {
            const termInQuery = lowerQuery.includes(pair[0]) ? pair[0] : pair[1];
            const altTerm = lowerQuery.includes(pair[0]) ? pair[1] : pair[0];
            const queryPattern = lowerQuery.replace(termInQuery, `(?:${escapeRegExp(termInQuery)}|${escapeRegExp(altTerm)})`);
            regexPattern = queryPattern;
            break;
        }
    }
    
    const regex = new RegExp(`(${regexPattern})`, 'gi');
    const walk = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, null, false);
    let node;
    const textNodes = [];
    while (node = walk.nextNode()) {
        textNodes.push(node);
    }
    
    textNodes.forEach(textNode => {
        const parent = textNode.parentNode;
        if (!parent || parent.tagName === 'MARK' || parent.classList.contains('hex-copy-badge')) return;
        
        const content = textNode.nodeValue;
        if (regex.test(content)) {
            // Reset regex lastIndex because test() moves it
            regex.lastIndex = 0;
            
            const fragment = document.createDocumentFragment();
            let lastIndex = 0;
            content.replace(regex, (match, p1, offset) => {
                if (offset > lastIndex) {
                    fragment.appendChild(document.createTextNode(content.substring(lastIndex, offset)));
                }
                const mark = document.createElement('mark');
                mark.textContent = match;
                mark.style.backgroundColor = 'rgba(177, 162, 116, 0.3)'; // Gold accent translucent highlight
                mark.style.color = 'var(--ap-white)';
                mark.style.padding = '0 2px';
                fragment.appendChild(mark);
                lastIndex = offset + match.length;
            });
            if (lastIndex < content.length) {
                fragment.appendChild(document.createTextNode(content.substring(lastIndex)));
            }
            parent.replaceChild(fragment, textNode);
        }
    });
}

function restoreOriginalText(blk) {
    const blockTitleEl = blk.querySelector('.block-title');
    const blockContentEl = blk.querySelector('.text-block-content');
    
    if (blockTitleEl && blockTitleEl.hasAttribute('data-original-html')) {
        blockTitleEl.innerHTML = blockTitleEl.getAttribute('data-original-html');
        blockTitleEl.removeAttribute('data-original-html');
    }
    if (blockContentEl && blockContentEl.hasAttribute('data-original-html')) {
        blockContentEl.innerHTML = blockContentEl.getAttribute('data-original-html');
        blockContentEl.removeAttribute('data-original-html');
    }
}

function escapeRegExp(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function escapeHTML(str) {
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
