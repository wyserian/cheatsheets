// ===== Theme =====
// The <head> of every page sets data-theme before first paint (no flash);
// this handles the toggle button and follows the OS theme until the user picks one.
(function () {
    var root = document.documentElement;
    var KEY = 'cheatsheet-theme';
    var media = window.matchMedia ? window.matchMedia('(prefers-color-scheme: light)') : null;

    function saved() {
        try { return localStorage.getItem(KEY); } catch (e) { return null; }
    }

    function systemTheme() {
        return media && media.matches ? 'light' : 'dark';
    }

    function apply(theme) {
        root.setAttribute('data-theme', theme);
        document.querySelectorAll('.theme-toggle').forEach(function (btn) {
            var toLight = theme === 'dark';
            btn.innerHTML = '<i class="bi ' + (toLight ? 'bi-sun' : 'bi-moon-stars') + '" aria-hidden="true"></i>';
            btn.setAttribute('aria-label', toLight ? 'Switch to light theme' : 'Switch to dark theme');
            btn.setAttribute('title', toLight ? 'Light theme' : 'Dark theme');
        });
    }

    apply(root.getAttribute('data-theme') || saved() || systemTheme());

    document.addEventListener('click', function (e) {
        var btn = e.target.closest('.theme-toggle');
        if (!btn) return;
        var next = root.getAttribute('data-theme') === 'light' ? 'dark' : 'light';
        apply(next);
        try { localStorage.setItem(KEY, next); } catch (err) { /* private mode: theme still switches */ }
    });

    if (media && media.addEventListener) {
        media.addEventListener('change', function () {
            if (!saved()) apply(systemTheme());
        });
    }
})();

// ===== Copy Buttons =====
(function () {
    function copyText(text) {
        if (navigator.clipboard && window.isSecureContext) {
            return navigator.clipboard.writeText(text);
        }
        // Fallback for http:// or older browsers
        return new Promise(function (resolve, reject) {
            var area = document.createElement('textarea');
            area.value = text;
            area.setAttribute('readonly', '');
            area.style.position = 'fixed';
            area.style.opacity = '0';
            document.body.appendChild(area);
            area.select();
            var ok = false;
            try { ok = document.execCommand('copy'); } catch (e) { ok = false; }
            document.body.removeChild(area);
            ok ? resolve() : reject();
        });
    }

    function setLabel(btn, icon, label) {
        btn.innerHTML = '<i class="bi ' + icon + '" aria-hidden="true"></i><span>' + label + '</span>';
    }

    document.querySelectorAll('div.code-box, pre.code-box').forEach(function (block) {
        var code = block.querySelector('code');
        if (!code) return;

        var btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'copy-btn';
        btn.setAttribute('aria-label', 'Copy code');
        setLabel(btn, 'bi-clipboard', 'Copy');

        var timer;
        btn.addEventListener('click', function () {
            clearTimeout(timer);
            copyText(code.textContent).then(function () {
                btn.classList.add('copied');
                setLabel(btn, 'bi-check2', 'Copied');
            }, function () {
                setLabel(btn, 'bi-x-lg', 'Press Ctrl+C');
            }).then(function () {
                timer = setTimeout(function () {
                    btn.classList.remove('copied');
                    setLabel(btn, 'bi-clipboard', 'Copy');
                }, 1800);
            });
        });

        block.appendChild(btn);
    });
})();

// ===== Current Section Highlight + Back to Top =====
(function () {
    var links = Array.prototype.slice.call(document.querySelectorAll('.section-list a[href^="#"]'));
    var sections = links.map(function (a) {
        return document.getElementById(a.getAttribute('href').slice(1));
    });
    var toc = document.querySelector('.section-list');
    var wide = window.matchMedia('(min-width: 1100px)');
    var root = document.documentElement;
    var current = null;
    var ticking = false;

    function update() {
        ticking = false;
        root.classList.toggle('scrolled', window.scrollY > 600);
        if (!links.length) return;

        var offset = (parseInt(getComputedStyle(root).getPropertyValue('--top-bar-height'), 10) || 56) + 48;
        var atBottom = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4;
        var index = -1;

        sections.forEach(function (section, i) {
            if (section && section.getBoundingClientRect().top <= offset) index = i;
        });
        if (atBottom) index = sections.length - 1;

        var active = index >= 0 ? links[index] : null;
        if (active === current) return;
        if (current) {
            current.classList.remove('active');
            current.removeAttribute('aria-current');
        }
        current = active;
        if (!current) return;
        current.classList.add('active');
        current.setAttribute('aria-current', 'true');

        // Keep the active item visible inside the sticky sidebar (never scrolls the page)
        if (wide.matches && toc && toc.scrollHeight > toc.clientHeight) {
            var top = current.offsetTop - toc.offsetTop;
            if (top < toc.scrollTop || top > toc.scrollTop + toc.clientHeight - 40) {
                toc.scrollTop = top - toc.clientHeight / 2;
            }
        }
    }

    function onScroll() {
        if (!ticking) {
            ticking = true;
            window.requestAnimationFrame(update);
        }
    }

    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    update();
})();

// ===== Home Page Search =====
(function () {
    var input = document.getElementById('search');
    if (!input) return;

    var cards = Array.prototype.slice.call(document.querySelectorAll('.list-block'));
    var count = document.getElementById('result-count');
    var empty = document.getElementById('no-results');
    var emptyTerm = document.getElementById('no-results-term');
    var clear = document.getElementById('clear-search');
    var total = cards.length;

    cards.forEach(function (card) {
        var name = card.textContent.trim();
        var slug = (card.getAttribute('href') || '').split('/').pop();
        card.dataset.search = (name + ' ' + slug).toLowerCase();
    });

    function filter() {
        var q = input.value.trim().toLowerCase();
        var shown = 0;
        cards.forEach(function (card) {
            var match = !q || card.dataset.search.indexOf(q) !== -1;
            card.hidden = !match;
            if (match) shown++;
        });
        count.textContent = q ? shown + ' of ' + total + ' cheatsheets' : total + ' cheatsheets';
        empty.hidden = shown !== 0;
        if (emptyTerm) emptyTerm.textContent = input.value.trim();
    }

    input.addEventListener('input', filter);

    input.addEventListener('keydown', function (e) {
        if (e.key === 'Escape') {
            input.value = '';
            filter();
        } else if (e.key === 'Enter') {
            var first = cards.filter(function (c) { return !c.hidden; })[0];
            if (first) first.click();
        }
    });

    if (clear) {
        clear.addEventListener('click', function () {
            input.value = '';
            filter();
            input.focus();
        });
    }

    // "/" focuses search, like GitHub and most docs sites
    document.addEventListener('keydown', function (e) {
        var typing = /input|textarea|select/i.test(document.activeElement.tagName);
        if (e.key === '/' && !typing && !e.ctrlKey && !e.metaKey) {
            e.preventDefault();
            input.focus();
        }
    });

    filter();
})();
