(function () {
  'use strict';

  // =============================================
  // Configuration
  // =============================================

  mapboxgl.accessToken =
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

  // Approximate [lng, lat] for each quest slug in Rishikesh
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

  // =============================================
  // Marker Image Generator (canvas → addImage for GPU rendering)
  // =============================================

  function createMarkerImage(emoji, color) {
    var size = 64; // 2x for retina — displayed at 32px with pixelRatio: 2
    var canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    var ctx = canvas.getContext('2d');

    // Circle background
    ctx.beginPath();
    ctx.arc(size / 2, size / 2, size / 2 - 4, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();

    // White border
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.85)';
    ctx.lineWidth = 3;
    ctx.stroke();

    // Emoji
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
    initMap();
    loadQuests();
    initNav();
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

    // Disable heavy stuff for performance
    map.dragRotate.disable();
    map.touchZoomRotate.disableRotation();
    map.touchPitch.disable();

    map.on('load', function () {
      map.setConfigProperty('basemap', 'lightPreset', 'night');
      map.setConfigProperty('basemap', 'showPointOfInterestLabels', false);
      map.setConfigProperty('basemap', 'showPlaceLabels', false);
      map.setConfigProperty('basemap', 'showRoadLabels', false);
      map.setConfigProperty('basemap', 'showTransitLabels', false);

      // Register marker images for each category (canvas → GPU texture)
      var categories = Object.keys(CATEGORIES);
      for (var i = 0; i < categories.length; i++) {
        var cat = categories[i];
        var meta = CATEGORIES[cat];
        map.addImage('marker-' + cat, createMarkerImage(meta.emoji, meta.color), { pixelRatio: 2 });
      }
      map.addImage('marker-default', createMarkerImage('📍', '#ff6b35'), { pixelRatio: 2 });

      // GeoJSON source — updated by renderMarkers()
      map.addSource('quest-markers', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] },
      });

      // Main marker icons (GPU-rendered, no DOM jitter)
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

      // Badge background circle for grouped locations
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

      // Badge count text
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

      // Click: open popup on marker, close on empty area
      map.on('click', function (e) {
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

      // Pointer cursor on hover
      map.on('mouseenter', 'quest-markers-layer', function () {
        map.getCanvas().style.cursor = 'pointer';
      });
      map.on('mouseleave', 'quest-markers-layer', function () {
        map.getCanvas().style.cursor = '';
      });

      mapReady = true;

      // Render quests that loaded before the map was ready
      if (pendingRender) {
        renderMarkers(pendingRender);
        pendingRender = null;
      }

      hideLoading();
    });

    // Fallback: hide loading after 4s even if map is slow
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
            '<span class="quest-reward">⚡ ' + q.reward + ' ZO</span>' +
          '</div>' +
          '<h3 class="quest-card-title">' + q.title + '</h3>' +
          '<span class="quest-card-diff">' + q.difficulty + '</span>' +
        '</li>';
    }
    list.innerHTML = html;

    // Attach click handlers
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
    // Buffer data if map layers aren't ready yet
    if (!mapReady) {
      pendingRender = quests;
      return;
    }

    // Group by slug (one marker per physical location)
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

    // Update GeoJSON source — Mapbox handles the GPU re-render
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
    var rows = '';
    for (var i = 0; i < quests.length; i++) {
      var q = quests[i];
      rows +=
        '<div class="popup-quest-row">' +
          '<span class="popup-cat-label">' + q.meta.emoji + ' ' + q.category + '</span>' +
          '<span class="popup-zo">⚡ ' + q.reward + ' ZO</span>' +
        '</div>';
    }

    var html =
      '<div class="quest-popup">' +
        '<div class="popup-location-name">' + locationName + '</div>' +
        '<p class="popup-desc">' + quests[0].description + '</p>' +
        rows +
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
