(function () {
  'use strict';

  // =============================================
  // Configuration (loaded from config.js)
  // =============================================
  var cfg = window.APP_CONFIG || {};
  var SUPABASE_URL = cfg.SUPABASE_URL || 'YOUR_SUPABASE_URL';
  var SUPABASE_ANON_KEY = cfg.SUPABASE_ANON_KEY || 'YOUR_SUPABASE_ANON_KEY';
  var sb = null; // initialized in init()

  mapboxgl.accessToken = cfg.MAPBOX_TOKEN ||
    'pk.eyJ1Ijoia3VzaGFsem8iLCJhIjoiY20wcDZtNjUwMDFxNzJpcjYxZjlsN2g3NiJ9.d194ACznKNqKJNfzKyanNQ';

  var RISHIKESH_CENTER = [78.32, 30.12];
  var MAP_BOUNDS = [
    [78.05, 29.90],
    [78.60, 30.35],
  ];

  var CATEGORIES = {
    'Ganga Arti':        { emoji: '🪔', color: '#ff6b35' },
    'Beaches':           { emoji: '🏖️', color: '#4ecdc4' },
    'Waterfalls':        { emoji: '💧', color: '#45b7d1' },
    'Ashram':            { emoji: '🙏', color: '#f0c040' },
    'Temple':            { emoji: '🛕', color: '#e74c3c' },
    'Cave':              { emoji: '🦇', color: '#9b59b6' },
    'Sunset View Point': { emoji: '🌅', color: '#f39c12' },
    'Day Tour':          { emoji: '🚶', color: '#2ecc71' },
    'Cafes':             { emoji: '☕', color: '#e67e5c' },
    'Adventure':         { emoji: '🪂', color: '#ff4757' },
    'Street Food':       { emoji: '🍜', color: '#ffa502' },
    'Market':            { emoji: '🛍️', color: '#ff6348' },
  };

  var COORDS = {
    'triveni-ghat':                [78.2935, 30.1040],
    'shatrughan-ghat':             [78.2948, 30.1025],
    'parmarth-niketan':            [78.3070, 30.1215],
    'namami-beach':                [78.3010, 30.1150],
    'shivpuri-beach':              [78.3840, 30.1480],
    'neem-beach':                  [78.3030, 30.1170],
    'goa-beach':                   [78.3160, 30.1260],
    'kodiyala':                    [78.3960, 30.1670],
    'neer-waterfall-5-phases':     [78.3150, 30.1190],
    'garunchatti-waterfall-3-phases': [78.2820, 30.1005],
    'himshaili-waterfall':         [78.2750, 30.1080],
    'secret-waterfall':            [78.2770, 30.1045],
    'patna-waterfall':             [78.2640, 30.0940],
    'bahubali-waterfall':          [78.2680, 30.0970],
    '84-kutiya':                   [78.3060, 30.1243],
    'rani-temple':                 [78.2920, 30.1100],
    'balkumar-temple':             [78.2900, 30.1050],
    'bhutnath-temple':             [78.2890, 30.1030],
    'garun-chatti-mandir':         [78.2810, 30.1010],
    'triyamkeshwar-mandir':        [78.2870, 30.1060],
    'neelkanth-mahadev':           [78.3578, 30.1440],
    'vashisht-caves':              [78.3100, 30.1200],
    'jhil-mil-cave':               [78.3200, 30.1250],
    'tat-cave':                    [78.3150, 30.1300],
    'moni-baba-cave':              [78.3180, 30.1280],
    'kyarki-village':              [78.2800, 30.1400],
    'kunjapuri-mata-mandir':       [78.3296, 30.1479],
    'narendra-nagar-view-point':   [78.2920, 30.1640],
    'kunjapuri-':                  [78.3300, 30.1485],
    'kodiyala-village':            [78.3965, 30.1675],
    'mini-gartang-gali':           [78.3300, 30.1350],
    'amma-ki-rasoi':               [78.2945, 30.1105],
    'little-buddha':               [78.3075, 30.1218],
    'ganga-view-':                 [78.2955, 30.1135],
    'beatles-cafe':                [78.3125, 30.1255],
    'mount-bistro':                [78.2985, 30.1165],
    'rafting':                     [78.3850, 30.1500],
    'bunjee-jumping':              [78.3860, 30.1555],
    'gaint-swing':                 [78.3870, 30.1545],
    'flying-fox':                  [78.3865, 30.1548],
    'ram-jhula':                   [78.3094, 30.1213],
    'janki-setu':                  [78.3058, 30.1180],
  };

  // =============================================
  // State
  // =============================================

  var map = null;
  var allQuests = [];
  var filteredQuests = [];
  var currentPopup = null;
  var activeCategory = 'all';
  var mapReady = false;
  var pendingRender = null;
  var userLocation = null;
  var fakeLocation = null;
  var fakeMode = false;
  var userMarker = null;
  var currentUser = null;
  var userProfile = null;
  var authIsSignUp = true;

  // =============================================
  // Geolocation Utilities
  // =============================================

  function getEffectiveLocation() {
    return fakeLocation || userLocation;
  }

  function haversineDistance(lat1, lon1, lat2, lon2) {
    var R = 6371000;
    var dLat = (lat2 - lat1) * Math.PI / 180;
    var dLon = (lon2 - lon1) * Math.PI / 180;
    var a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  function updateUserMarker() {
    var loc = getEffectiveLocation();
    if (!loc || !map) return;

    if (!userMarker) {
      var el = document.createElement('div');
      el.className = 'user-location-dot';
      el.innerHTML = '<div class="user-dot-ping"></div><div class="user-dot-core"></div>';
      userMarker = new mapboxgl.Marker({ element: el })
        .setLngLat([loc.lng, loc.lat])
        .addTo(map);
    } else {
      userMarker.setLngLat([loc.lng, loc.lat]);
    }
  }

  function initGeolocation() {
    if (!navigator.geolocation) return;
    navigator.geolocation.watchPosition(
      function (pos) {
        userLocation = { lng: pos.coords.longitude, lat: pos.coords.latitude };
        updateUserMarker();
      },
      function (err) { console.warn('Geolocation:', err.message); },
      { enableHighAccuracy: true, maximumAge: 10000, timeout: 15000 }
    );
  }

  function initFakeLocation() {
    var btn = document.getElementById('fake-location-btn');
    if (!btn) return;

    btn.addEventListener('click', function () {
      fakeMode = !fakeMode;
      btn.classList.toggle('active', fakeMode);
      showToast(fakeMode ? 'Tap map to set fake location' : 'Fake location off');
    });
  }

  // =============================================
  // Supabase Auth
  // =============================================

  async function checkAuth() {
    if (!sb) return;
    try {
      var result = await sb.auth.getSession();
      if (result.data.session) {
        currentUser = result.data.session.user;
        await loadProfile();
        onAuthSuccess();
      } else {
        showAuthModal();
      }
    } catch (err) {
      console.error('Auth check failed:', err);
      showAuthModal();
    }
  }

  async function doSignUp(email, password, username) {
    var result = await sb.auth.signUp({
      email: email,
      password: password,
      options: { data: { username: username } },
    });
    if (result.error) throw result.error;
    currentUser = result.data.user;
    await loadProfile();
    onAuthSuccess();
  }

  async function doSignIn(email, password) {
    var result = await sb.auth.signInWithPassword({
      email: email,
      password: password,
    });
    if (result.error) throw result.error;
    currentUser = result.data.user;
    await loadProfile();
    onAuthSuccess();
  }

  async function doSignOut() {
    await sb.auth.signOut();
    currentUser = null;
    userProfile = null;
    document.getElementById('zo-balance-area').style.display = 'none';
    document.getElementById('user-menu-btn').style.display = 'none';
    showAuthModal();
  }

  function onAuthSuccess() {
    hideAuthModal();
    updateZoDisplay();
    var balArea = document.getElementById('zo-balance-area');
    if (balArea) balArea.style.display = 'flex';
    var menuBtn = document.getElementById('user-menu-btn');
    if (menuBtn) {
      menuBtn.style.display = 'flex';
      var name = (userProfile && userProfile.username) ||
        (currentUser && currentUser.user_metadata && currentUser.user_metadata.username) ||
        'User';
      menuBtn.textContent = name + ' (Sign Out)';
    }
  }

  // =============================================
  // Supabase Profile & ZO Balance
  // =============================================

  async function loadProfile() {
    if (!currentUser || !sb) return;
    try {
      var result = await sb.from('profiles')
        .select('*')
        .eq('id', currentUser.id)
        .single();
      if (result.data) {
        userProfile = result.data;
      } else {
        // Profile doesn't exist yet (trigger may not have fired), create it
        var username = (currentUser.user_metadata && currentUser.user_metadata.username) || 'explorer';
        var ins = await sb.from('profiles')
          .insert({ id: currentUser.id, username: username, zo_balance: 0 })
          .select()
          .single();
        userProfile = ins.data || { id: currentUser.id, username: username, zo_balance: 0 };
      }
    } catch (err) {
      console.error('Profile load error:', err);
      userProfile = { id: currentUser.id, username: 'explorer', zo_balance: 0 };
    }
    updateZoDisplay();
  }

  async function claimQuestReward(reward) {
    if (!currentUser || !userProfile || !sb) {
      showToast('Sign in to claim quests');
      return false;
    }
    var newBalance = (userProfile.zo_balance || 0) + reward;
    var result = await sb.from('profiles')
      .update({ zo_balance: newBalance })
      .eq('id', currentUser.id);
    if (result.error) {
      showToast('Claim failed: ' + result.error.message);
      return false;
    }
    userProfile.zo_balance = newBalance;
    updateZoDisplay();
    return true;
  }

  function updateZoDisplay() {
    var el = document.getElementById('zo-balance');
    if (el && userProfile) {
      el.textContent = '$' + (userProfile.zo_balance || 0);
    }
  }

  // =============================================
  // Leaderboard
  // =============================================

  async function loadLeaderboard() {
    if (!sb) return [];
    try {
      var result = await sb.from('profiles')
        .select('username, zo_balance')
        .order('zo_balance', { ascending: false })
        .limit(20);
      return result.data || [];
    } catch (err) {
      console.error('Leaderboard error:', err);
      return [];
    }
  }

  async function showLeaderboard() {
    var modal = document.getElementById('leaderboard-modal');
    var list = document.getElementById('leaderboard-list');
    list.innerHTML = '<li class="lb-empty">Loading...</li>';
    modal.style.display = 'flex';

    var entries = await loadLeaderboard();
    if (entries.length === 0) {
      list.innerHTML = '<li class="lb-empty">No players yet. Claim a quest to be first!</li>';
      return;
    }

    var myName = userProfile ? userProfile.username : '';
    var html = '';
    for (var i = 0; i < entries.length; i++) {
      var e = entries[i];
      var isMe = e.username === myName;
      html +=
        '<li class="lb-row' + (isMe ? ' is-me' : '') + '">' +
          '<span class="lb-rank">' + (i + 1) + '</span>' +
          '<span class="lb-name">' + (e.username || 'Anonymous') + '</span>' +
          '<span class="lb-zo">$' + (e.zo_balance || 0) + '</span>' +
        '</li>';
    }
    list.innerHTML = html;
  }

  // =============================================
  // Auth Modal UI
  // =============================================

  function showAuthModal() {
    document.getElementById('auth-modal').style.display = 'flex';
    setAuthMode(true);
  }

  function hideAuthModal() {
    document.getElementById('auth-modal').style.display = 'none';
    document.getElementById('auth-error').textContent = '';
  }

  function setAuthMode(isSignUp) {
    authIsSignUp = isSignUp;
    document.getElementById('auth-modal-title').textContent = isSignUp ? 'Sign Up' : 'Log In';
    document.getElementById('auth-submit-btn').textContent = isSignUp ? 'Sign Up' : 'Log In';
    document.getElementById('username-field').style.display = isSignUp ? 'block' : 'none';
    document.getElementById('auth-toggle-link').textContent = isSignUp ? 'Log In' : 'Sign Up';
    document.querySelector('.auth-toggle').innerHTML = isSignUp
      ? 'Already have an account? <a href="#" id="auth-toggle-link">Log In</a>'
      : 'Don\'t have an account? <a href="#" id="auth-toggle-link">Sign Up</a>';
    // Re-attach toggle link handler
    document.getElementById('auth-toggle-link').addEventListener('click', function (e) {
      e.preventDefault();
      setAuthMode(!authIsSignUp);
    });
  }

  function initAuthUI() {
    var form = document.getElementById('auth-form');
    form.addEventListener('submit', async function (e) {
      e.preventDefault();
      var errEl = document.getElementById('auth-error');
      var submitBtn = document.getElementById('auth-submit-btn');
      var email = document.getElementById('auth-email').value.trim();
      var password = document.getElementById('auth-password').value;
      var username = document.getElementById('auth-username').value.trim();

      errEl.textContent = '';
      submitBtn.disabled = true;
      submitBtn.textContent = 'Please wait...';

      try {
        if (authIsSignUp) {
          if (!username) {
            throw { message: 'Username is required' };
          }
          await doSignUp(email, password, username);
        } else {
          await doSignIn(email, password);
        }
      } catch (err) {
        errEl.textContent = err.message || 'Something went wrong';
      } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = authIsSignUp ? 'Sign Up' : 'Log In';
      }
    });

    // Toggle link
    document.getElementById('auth-toggle-link').addEventListener('click', function (e) {
      e.preventDefault();
      setAuthMode(!authIsSignUp);
    });

    // Sign out button
    document.getElementById('user-menu-btn').addEventListener('click', function () {
      doSignOut();
    });

    // Leaderboard close
    document.getElementById('leaderboard-close').addEventListener('click', function () {
      document.getElementById('leaderboard-modal').style.display = 'none';
    });

    // Close leaderboard on overlay click
    document.getElementById('leaderboard-modal').addEventListener('click', function (e) {
      if (e.target === this) this.style.display = 'none';
    });
  }

  // =============================================
  // Marker Image Generator (canvas → addImage for GPU rendering)
  // =============================================

  function createMarkerImage(emoji, color) {
    var size = 64;
    var canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    var ctx = canvas.getContext('2d');

    ctx.beginPath();
    ctx.arc(size / 2, size / 2, size / 2 - 4, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.85)';
    ctx.lineWidth = 3;
    ctx.stroke();

    ctx.font = '26px "Segoe UI Emoji", "Apple Color Emoji", "Noto Color Emoji", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(emoji, size / 2, size / 2 + 1);

    return ctx.getImageData(0, 0, size, size);
  }

  // =============================================
  // CSV Parser (handles quoted fields & escaped quotes)
  // =============================================

  function parseCSVRow(row) {
    var fields = [];
    var current = '';
    var inQuotes = false;
    for (var i = 0; i < row.length; i++) {
      var ch = row[i];
      if (inQuotes) {
        if (ch === '"') {
          if (row[i + 1] === '"') {
            current += '"';
            i++;
          } else {
            inQuotes = false;
          }
        } else {
          current += ch;
        }
      } else {
        if (ch === '"') {
          inQuotes = true;
        } else if (ch === ',') {
          fields.push(current);
          current = '';
        } else {
          current += ch;
        }
      }
    }
    fields.push(current);
    return fields;
  }

  function parseCSV(text) {
    var lines = text.split('\n').filter(function (l) {
      return l.trim().length > 0;
    });
    var headers = parseCSVRow(lines[0]);
    var results = [];
    for (var i = 1; i < lines.length; i++) {
      var values = parseCSVRow(lines[i]);
      var obj = {};
      for (var j = 0; j < headers.length; j++) {
        obj[headers[j].trim()] = (values[j] || '').trim();
      }
      results.push(obj);
    }
    return results;
  }

  // =============================================
  // Initialization
  // =============================================

  document.addEventListener('DOMContentLoaded', init);

  function init() {
    // Init Supabase client
    if (window.supabase && SUPABASE_URL !== 'YOUR_SUPABASE_URL') {
      sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    }

    initMap();
    loadQuests();
    initNav();
    initGeolocation();
    initFakeLocation();
    initAuthUI();

    // Check auth — show auth modal if Supabase is configured
    if (sb) {
      checkAuth();
    } else if (SUPABASE_URL === 'YOUR_SUPABASE_URL') {
      // Supabase not configured — skip auth entirely, let users browse freely
      console.warn('Supabase not configured. Auth disabled.');
    } else {
      // Config exists but client failed to create
      showAuthModal();
    }
  }

  // =============================================
  // Map
  // =============================================

  function initMap() {
    var isMobile = window.innerWidth <= 768;

    map = new mapboxgl.Map({
      container: 'map',
      center: RISHIKESH_CENTER,
      zoom: isMobile ? 11.5 : 12.5,
      minZoom: 10,
      maxZoom: 17,
      maxBounds: MAP_BOUNDS,
      pitch: 0,
      bearing: 0,
      attributionControl: false,
      fadeDuration: 0,
    });

    map.dragRotate.disable();
    map.touchZoomRotate.disableRotation();
    map.touchPitch.disable();

    map.on('load', function () {
      map.setConfigProperty('basemap', 'lightPreset', 'night');
      map.setConfigProperty('basemap', 'showPointOfInterestLabels', false);
      map.setConfigProperty('basemap', 'showPlaceLabels', false);
      map.setConfigProperty('basemap', 'showRoadLabels', false);
      map.setConfigProperty('basemap', 'showTransitLabels', false);

      var categories = Object.keys(CATEGORIES);
      for (var i = 0; i < categories.length; i++) {
        var cat = categories[i];
        var meta = CATEGORIES[cat];
        map.addImage('marker-' + cat, createMarkerImage(meta.emoji, meta.color), { pixelRatio: 2 });
      }
      map.addImage('marker-default', createMarkerImage('📍', '#ff6b35'), { pixelRatio: 2 });

      map.addSource('quest-markers', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] },
      });

      map.addLayer({
        id: 'quest-markers-layer',
        type: 'symbol',
        source: 'quest-markers',
        layout: {
          'icon-image': ['coalesce',
            ['image', ['concat', 'marker-', ['get', 'category']]],
            ['image', 'marker-default']
          ],
          'icon-size': 1,
          'icon-allow-overlap': true,
          'icon-ignore-placement': true,
          'icon-anchor': 'center',
        },
      });

      map.addLayer({
        id: 'quest-badge-bg',
        type: 'circle',
        source: 'quest-markers',
        filter: ['>', ['get', 'count'], 1],
        paint: {
          'circle-radius': 8,
          'circle-color': '#ff6b35',
          'circle-stroke-width': 1.5,
          'circle-stroke-color': '#0a0a0a',
          'circle-translate': [10, -10],
        },
      });

      map.addLayer({
        id: 'quest-badge-text',
        type: 'symbol',
        source: 'quest-markers',
        filter: ['>', ['get', 'count'], 1],
        layout: {
          'text-field': ['to-string', ['get', 'count']],
          'text-size': 9,
          'text-allow-overlap': true,
          'text-ignore-placement': true,
          'text-font': ['DIN Pro Bold', 'Arial Unicode MS Bold'],
        },
        paint: {
          'text-color': '#ffffff',
          'text-translate': [10, -10],
        },
      });

      map.on('click', function (e) {
        if (fakeMode) {
          fakeLocation = { lng: e.lngLat.lng, lat: e.lngLat.lat };
          updateUserMarker();
          showToast('Fake location set');
          return;
        }
        var features = map.queryRenderedFeatures(e.point, {
          layers: ['quest-markers-layer', 'quest-badge-bg'],
        });
        if (features.length > 0) {
          var slug = features[0].properties.slug;
          var coords = features[0].geometry.coordinates.slice();
          var group = filteredQuests.filter(function (q) {
            return q.slug === slug;
          });
          if (group.length) openPopup(coords, group);
        } else if (currentPopup) {
          currentPopup.remove();
          currentPopup = null;
        }
      });

      map.on('mouseenter', 'quest-markers-layer', function () {
        map.getCanvas().style.cursor = 'pointer';
      });
      map.on('mouseleave', 'quest-markers-layer', function () {
        map.getCanvas().style.cursor = '';
      });

      mapReady = true;

      if (pendingRender) {
        renderMarkers(pendingRender);
        pendingRender = null;
      }

      hideLoading();
    });

    setTimeout(hideLoading, 4000);
  }

  function hideLoading() {
    var el = document.getElementById('loading-screen');
    if (!el || el.classList.contains('hidden')) return;
    el.classList.add('hidden');
    setTimeout(function () {
      el.style.display = 'none';
    }, 600);
  }

  // =============================================
  // Load & Parse Quests from CSV
  // =============================================

  function loadQuests() {
    fetch('rishikesh_quests.csv')
      .then(function (resp) {
        return resp.text();
      })
      .then(function (text) {
        var rows = parseCSV(text);

        allQuests = [];
        for (var i = 0; i < rows.length; i++) {
          var r = rows[i];
          if (!r.slug || !COORDS[r.slug] || !r.category) continue;
          allQuests.push({
            id: r.id,
            title: r.title,
            description: r.description,
            difficulty: r.difficulty,
            reward: parseInt(r.reward, 10) || 0,
            category: r.category,
            slug: r.slug,
            lng: COORDS[r.slug][0],
            lat: COORDS[r.slug][1],
            meta: CATEGORIES[r.category] || { emoji: '📍', color: '#ff6b35' },
          });
        }

        filteredQuests = allQuests;
        renderCategoryFilters();
        renderQuests(filteredQuests);
        renderMarkers(filteredQuests);
      })
      .catch(function (err) {
        console.error('Failed to load quests:', err);
      });
  }

  // =============================================
  // Category Filters
  // =============================================

  function renderCategoryFilters() {
    var container = document.getElementById('category-filters');
    var seen = {};
    var cats = [];
    for (var i = 0; i < allQuests.length; i++) {
      var c = allQuests[i].category;
      if (!seen[c]) {
        seen[c] = true;
        cats.push(c);
      }
    }

    var html = '<button class="cat-btn active" data-category="all">All</button>';
    for (var j = 0; j < cats.length; j++) {
      var m = CATEGORIES[cats[j]] || {};
      html +=
        '<button class="cat-btn" data-category="' +
        cats[j] +
        '">' +
        (m.emoji || '') +
        ' ' +
        cats[j] +
        '</button>';
    }
    container.innerHTML = html;

    container.addEventListener('click', function (e) {
      var btn = e.target.closest('.cat-btn');
      if (!btn) return;
      var all = container.querySelectorAll('.cat-btn');
      for (var k = 0; k < all.length; k++) all[k].classList.remove('active');
      btn.classList.add('active');
      activeCategory = btn.dataset.category;
      filterAndRender();
    });
  }

  function filterAndRender() {
    if (activeCategory === 'all') {
      filteredQuests = allQuests;
    } else {
      filteredQuests = allQuests.filter(function (q) {
        return q.category === activeCategory;
      });
    }
    renderQuests(filteredQuests);
    renderMarkers(filteredQuests);
  }

  // =============================================
  // Quest List (horizontal cards)
  // =============================================

  function renderQuests(quests) {
    var list = document.getElementById('quest-list');
    var countEl = document.getElementById('quest-count');
    countEl.textContent = quests.length;

    var html = '';
    for (var i = 0; i < quests.length; i++) {
      var q = quests[i];
      html +=
        '<li class="quest-card" data-idx="' + i + '" style="animation-delay:' + (i * 0.04) + 's">' +
          '<div class="quest-card-cat">' +
            '<span class="cat-tag" style="background:' + q.meta.color + '22;color:' + q.meta.color + '">' +
              q.meta.emoji + ' ' + q.category +
            '</span>' +
            '<span class="quest-reward">$' + q.reward + '</span>' +
          '</div>' +
          '<h3 class="quest-card-title">' + q.title + '</h3>' +
          '<span class="quest-card-diff">' + q.difficulty + '</span>' +
        '</li>';
    }
    list.innerHTML = html;

    var cards = list.querySelectorAll('.quest-card');
    for (var j = 0; j < cards.length; j++) {
      cards[j].addEventListener('click', onCardClick);
    }
  }

  function onCardClick() {
    var idx = parseInt(this.dataset.idx, 10);
    var quest = filteredQuests[idx];
    if (!quest) return;
    flyToQuest(quest);
  }

  // =============================================
  // Map Markers (grouped by slug = physical location)
  // =============================================

  function renderMarkers(quests) {
    if (!mapReady) {
      pendingRender = quests;
      return;
    }

    var groups = {};
    for (var j = 0; j < quests.length; j++) {
      var q = quests[j];
      if (!groups[q.slug]) groups[q.slug] = [];
      groups[q.slug].push(q);
    }

    var features = [];
    var slugs = Object.keys(groups);
    for (var k = 0; k < slugs.length; k++) {
      var slug = slugs[k];
      var group = groups[slug];
      var coords = COORDS[slug];
      if (!coords) continue;

      features.push({
        type: 'Feature',
        geometry: { type: 'Point', coordinates: coords },
        properties: {
          slug: slug,
          category: group[0].category,
          count: group.length,
          title: group[0].title,
        },
      });
    }

    map.getSource('quest-markers').setData({
      type: 'FeatureCollection',
      features: features,
    });
  }

  // =============================================
  // Map Popups
  // =============================================

  function openPopup(coords, quests) {
    if (currentPopup) {
      currentPopup.remove();
      currentPopup = null;
    }

    var locationName = quests[0].title;
    var totalReward = 0;
    var rows = '';
    for (var i = 0; i < quests.length; i++) {
      var q = quests[i];
      totalReward += q.reward;
      rows +=
        '<div class="popup-quest-row">' +
          '<span class="popup-cat-label">' + q.meta.emoji + ' ' + q.category + '</span>' +
          '<span class="popup-zo">$' + q.reward + '</span>' +
        '</div>';
    }

    var claimHTML = '';
    var loc = getEffectiveLocation();
    if (!loc) {
      claimHTML = '<div class="popup-claim no-location"><span class="claim-status">Enable location to claim</span></div>';
    } else {
      var dist = haversineDistance(loc.lat, loc.lng, coords[1], coords[0]);
      if (dist <= 50) {
        claimHTML = '<div class="popup-claim claimable"><button class="claim-btn" data-reward="' + totalReward + '">Claim Quest ($' + totalReward + ')</button></div>';
      } else {
        var distStr = dist < 1000 ? Math.round(dist) + 'm' : (dist / 1000).toFixed(1) + 'km';
        claimHTML = '<div class="popup-claim not-claimable"><span class="claim-status">' + distStr + ' away — get within 50m</span></div>';
      }
    }

    var html =
      '<div class="quest-popup">' +
        '<div class="popup-location-name">' + locationName + '</div>' +
        '<p class="popup-desc">' + quests[0].description + '</p>' +
        rows +
        claimHTML +
      '</div>';

    currentPopup = new mapboxgl.Popup({
      closeButton: true,
      offset: 20,
      maxWidth: '280px',
      className: 'quest-popup-container',
    })
      .setLngLat(coords)
      .setHTML(html)
      .addTo(map);

    var claimBtn = currentPopup.getElement().querySelector('.claim-btn');
    if (claimBtn) {
      claimBtn.addEventListener('click', async function () {
        var reward = parseInt(this.dataset.reward, 10) || 0;
        if (!currentUser) {
          showToast('Sign in to claim quests');
          return;
        }
        this.disabled = true;
        this.textContent = 'Claiming...';
        var success = await claimQuestReward(reward);
        if (success) {
          showToast('Claimed $' + reward + ' ZO!');
          if (currentPopup) {
            currentPopup.remove();
            currentPopup = null;
          }
        } else {
          this.disabled = false;
          this.textContent = 'Claim Quest ($' + reward + ')';
        }
      });
    }
  }

  function flyToQuest(quest) {
    if (currentPopup) {
      currentPopup.remove();
      currentPopup = null;
    }

    map.flyTo({
      center: [quest.lng, quest.lat],
      zoom: 15,
      duration: 800,
      essential: true,
    });

    var sameSlug = filteredQuests.filter(function (q) {
      return q.slug === quest.slug;
    });

    setTimeout(function () {
      openPopup([quest.lng, quest.lat], sameSlug);
    }, 850);
  }

  // =============================================
  // Bottom Navigation
  // =============================================

  function initNav() {
    var btns = document.querySelectorAll('.bottom-nav .nav-btn');
    for (var i = 0; i < btns.length; i++) {
      btns[i].addEventListener('click', function () {
        var section = this.dataset.section;
        if (section === 'events') {
          showToast('Events — Coming Soon!');
          return;
        }
        if (section === 'leaderboard') {
          showLeaderboard();
          return;
        }
        var all = document.querySelectorAll('.bottom-nav .nav-btn');
        for (var j = 0; j < all.length; j++) all[j].classList.remove('active');
        this.classList.add('active');
      });
    }
  }

  function showToast(msg) {
    var el = document.getElementById('toast');
    el.textContent = msg;
    el.classList.add('show');
    setTimeout(function () {
      el.classList.remove('show');
    }, 2000);
  }
})();
