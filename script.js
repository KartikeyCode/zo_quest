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
    'Street Food':       { emoji: '🍜', color: '#ffa502' },
    'Market':            { emoji: '🛍️', color: '#ff6348' },
    'Event':             { emoji: '🎉', color: '#e74c3c' },
    'Zostel':            { emoji: '🏠', color: '#1abc9c' },
  };

  var COORDS = {
    'triveni-ghat':                [78.2993118, 30.1037136],
    'shatrughan-ghat':             [78.31159269999999, 30.12294],
    'parmarth-niketan':            [78.3116764, 30.119358899999995],
    'namami-beach':                [78.392285, 30.136227],
    'shivpuri-beach':              [78.3942895, 30.1363955],
    'neem-beach':                  [78.3321201, 30.133328199999998],
    'goa-beach':                   [78.33441719999999, 30.134453899999997],
    'kodiyala':                    [78.5103865, 30.058225599999997],
    'neer-waterfall-5-phases':     [78.3403431, 30.144962899999996],
    'garunchatti-waterfall-3-phases': [78.3545981, 30.1244099],
    'himshaili-waterfall':         [78.32126769999999, 30.116059],
    'patna-waterfall':             [78.3543983, 30.124400100000003],
    '84-kutiya':                   [78.3121592, 30.1127675],
    'rani-temple':                 [78.3302513, 30.123971699999995],
    'balkumar-temple':             [78.3596931, 30.0695305],
    'bhutnath-temple':             [78.318098, 30.116598099999997],
    'garun-chatti-mandir':         [78.3536206, 30.125574999999998],
    'triyamkeshwar-mandir':        [78.33096069999999, 30.126400599999997],
    'neelkanth-mahadev':           [78.340565, 30.081059],
    'vashisht-caves':              [78.4320327, 30.114269799999995],
    'tat-cave':                    [78.3213361, 30.116251199999997],
    'moni-baba-cave':              [78.32188790000001, 30.1022204],
    'kyarki-village':              [78.347427, 30.137144099999997],
    'kunjapuri-mata-mandir':       [78.3142775, 30.1740394],
    'narendra-nagar-view-point':   [78.29032389999999, 30.159974599999998],
    'kunjapuri-':                  [78.3142775, 30.1740394],
    'kodiyala-village':            [78.5103865, 30.058225599999997],
    'mini-gartang-gali':           [78.52185159999999, 30.064295599999998],
    'little-buddha':               [78.3291446, 30.123731899999996],
    'ganga-view-':                 [78.33136789999999, 30.127532499999997],
    'beatles-cafe':                [78.3261357, 30.127050099999995],
    'mount-bistro':                [78.3868258, 30.134132599999997],
    'ram-jhula':                   [78.3141266, 30.1239532],
    'janki-setu':                  [78.3085417, 30.1165093],
    // Zostel nodes
    'zostel-tapovan':              [78.3232438999119, 30.129955351101362],
    'zostel-laxman-jhula':         [78.32791337494515, 30.123124507013824],
    // Event quest locations
    'zostel-lj-checkin':           [78.32791337494515, 30.123124507013824],
    'zostel-lj-vibe':              [78.32791337494515, 30.123124507013824],
    'ganga-kinare-subah':          [78.32862668465614, 30.123785277441403],
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
  var DEBUG_FAKE_LOCATION = false; // Set to true to enable fake location button for testing
  var fakeLocation = null;
  var fakeMode = false;
  var userMarker = null;
  var currentUser = null;
  var userProfile = null;
  var authIsSignUp = true;
  var cameraStream = null;
  var cameraClaimCtx = null;
  var activeSection = 'quests';

  var ZOSTEL_NODES = [
    {
      title: 'Zostel Rishikesh (Tapovan)',
      slug: 'zostel-tapovan',
      lat: 30.129955351101362,
      lng: 78.3232438999119,
      description: 'Your home in the mountains — right in the heart of Tapovan.',
    },
    {
      title: 'Zostel Rishikesh (Laxman Jhula)',
      slug: 'zostel-laxman-jhula',
      lat: 30.123124507013824,
      lng: 78.32791337494515,
      description: 'Steps away from the iconic Laxman Jhula bridge.',
    },
  ];

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

    if (!DEBUG_FAKE_LOCATION) {
      btn.style.display = 'none';
      return;
    }

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

  async function doSignUp(phone, password, username) {
    var result = await sb.auth.signUp({
      email: phone + '@zoquest.app',
      password: password,
      options: { data: { username: username, phone: phone } },
    });
    if (result.error) throw result.error;
    currentUser = result.data.user;
    try {
      await loadProfile();
    } catch (err) {
      // loadProfile throws if username is taken (unique constraint)
      currentUser = null;
      userProfile = null;
      showAuthModal();
      throw err;
    }
    onAuthSuccess();
  }

  async function doSignIn(phone, password) {
    var result = await sb.auth.signInWithPassword({
      email: phone + '@zoquest.app',
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
    document.getElementById('profile-modal').style.display = 'none';
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
      menuBtn.textContent = name;
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
        if (ins.error && ins.error.code === '23505') {
          // Unique constraint violation — username taken
          await sb.auth.signOut();
          currentUser = null;
          throw { message: 'Username already taken' };
        }
        userProfile = ins.data || { id: currentUser.id, username: username, zo_balance: 0 };
      }
    } catch (err) {
      console.error('Profile load error:', err);
      userProfile = { id: currentUser.id, username: 'explorer', zo_balance: 0 };
    }
    updateZoDisplay();
  }

  async function claimQuestReward(reward, slug, quests, selfieUrl) {
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

    // Save claim record for cooldown tracking
    await sb.from('quest_claims').insert({
      user_id: currentUser.id,
      quest_id: quests.map(function (q) { return q.id; }).join(','),
      slug: slug,
      reward: reward,
      selfie_url: selfieUrl || null,
    });

    return true;
  }

  // =============================================
  // Cooldown Check
  // =============================================

  async function checkCooldown(slug, cooldownHours) {
    if (!sb || !currentUser) return { canClaim: true };
    try {
      var result = await sb.from('quest_claims')
        .select('claimed_at')
        .eq('user_id', currentUser.id)
        .eq('slug', slug)
        .order('claimed_at', { ascending: false })
        .limit(1);
      if (!result.data || result.data.length === 0) return { canClaim: true };
      var lastClaim = new Date(result.data[0].claimed_at);
      var cooldownMs = cooldownHours * 60 * 60 * 1000;
      var elapsed = Date.now() - lastClaim.getTime();
      if (elapsed >= cooldownMs) return { canClaim: true };
      return { canClaim: false, remaining: cooldownMs - elapsed };
    } catch (err) {
      console.error('Cooldown check error:', err);
      return { canClaim: true };
    }
  }

  async function checkAndShowClaim(slug, totalReward, quests) {
    var section = currentPopup ? currentPopup.getElement().querySelector('#claim-section') : null;
    if (!section) return;

    if (!currentUser) {
      section.innerHTML = '<button class="claim-btn">📸 Take Photo to Claim ($ZO ' + totalReward + ')</button>';
      section.querySelector('.claim-btn').addEventListener('click', function () {
        showToast('Sign in to claim quests');
      });
      return;
    }

    // Check max_completions (one-time events)
    var maxComp = quests[0].max_completions || 0;
    if (maxComp > 0 && sb && currentUser) {
      try {
        var countResult = await sb.from('quest_claims')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', currentUser.id)
          .eq('slug', slug);
        section = currentPopup ? currentPopup.getElement().querySelector('#claim-section') : null;
        if (!section) return;
        if (countResult.count >= maxComp) {
          section.innerHTML = '<span class="claim-status">Already claimed!</span>';
          section.className = 'popup-claim not-claimable';
          return;
        }
      } catch (err) {
        console.error('Max completions check error:', err);
      }
    }

    var cooldownHours = quests[0].cooldown_hours || 24;
    var cd = await checkCooldown(slug, cooldownHours);

    // Re-check popup still exists (may have closed during async)
    section = currentPopup ? currentPopup.getElement().querySelector('#claim-section') : null;
    if (!section) return;

    if (!cd.canClaim) {
      var hrs = Math.floor(cd.remaining / 3600000);
      var mins = Math.floor((cd.remaining % 3600000) / 60000);
      section.innerHTML = '<span class="claim-status">Cooldown: ' + hrs + 'h ' + mins + 'm remaining</span>';
      section.className = 'popup-claim not-claimable';
    } else {
      section.innerHTML = '<button class="claim-btn">📸 Take Photo to Claim ($ZO ' + totalReward + ')</button>';
      section.querySelector('.claim-btn').addEventListener('click', function () {
        startSelfieClaim(this, slug, totalReward, quests);
      });
    }
  }

  // =============================================
  // Camera Capture & Upload
  // =============================================

  function startSelfieClaim(btn, slug, totalReward, quests) {
    cameraClaimCtx = { btn: btn, slug: slug, totalReward: totalReward, quests: quests };
    openCamera();
  }

  async function openCamera() {
    var video = document.getElementById('camera-video');
    var preview = document.getElementById('camera-preview');
    var confirmBar = document.getElementById('camera-confirm-bar');
    var shutterBar = document.getElementById('camera-shutter-bar');

    // Reset state
    preview.style.display = 'none';
    video.style.display = 'block';
    confirmBar.style.display = 'none';
    shutterBar.style.display = 'flex';

    try {
      cameraStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });
      video.srcObject = cameraStream;
      document.getElementById('camera-modal').style.display = 'flex';
    } catch (err) {
      console.error('Camera error:', err);
      showToast('Camera access denied or not available');
      cameraClaimCtx = null;
    }
  }

  function capturePhoto() {
    var video = document.getElementById('camera-video');
    var canvas = document.getElementById('camera-canvas');
    var preview = document.getElementById('camera-preview');

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d').drawImage(video, 0, 0);

    preview.src = canvas.toDataURL('image/jpeg', 0.85);
    preview.style.display = 'block';
    video.style.display = 'none';

    document.getElementById('camera-shutter-bar').style.display = 'none';
    document.getElementById('camera-confirm-bar').style.display = 'flex';
  }

  function retakePhoto() {
    document.getElementById('camera-preview').style.display = 'none';
    document.getElementById('camera-video').style.display = 'block';
    document.getElementById('camera-shutter-bar').style.display = 'flex';
    document.getElementById('camera-confirm-bar').style.display = 'none';
  }

  async function usePhoto() {
    if (!cameraClaimCtx) return;

    var canvas = document.getElementById('camera-canvas');
    var ctx = cameraClaimCtx;
    cameraClaimCtx = null;

    var blob = await new Promise(function (resolve) {
      canvas.toBlob(resolve, 'image/jpeg', 0.85);
    });

    closeCamera();

    // Update popup claim section
    var section = ctx.btn ? ctx.btn.closest('.popup-claim') : null;
    if (section) {
      section.innerHTML = '<span class="claim-status">Uploading & claiming...</span>';
    }

    var selfieUrl = await uploadSelfie(blob, ctx.slug);
    var success = await claimQuestReward(ctx.totalReward, ctx.slug, ctx.quests, selfieUrl);
    if (success) {
      showToast('Claimed $ZO ' + ctx.totalReward + '!');
      if (currentPopup) { currentPopup.remove(); currentPopup = null; }
    } else {
      if (section && section.parentNode) {
        section.innerHTML = '<button class="claim-btn">📸 Take Photo to Claim ($ZO ' + ctx.totalReward + ')</button>';
        section.querySelector('.claim-btn').addEventListener('click', function () {
          startSelfieClaim(this, ctx.slug, ctx.totalReward, ctx.quests);
        });
      }
    }
  }

  function closeCamera() {
    if (cameraStream) {
      cameraStream.getTracks().forEach(function (track) { track.stop(); });
      cameraStream = null;
    }
    document.getElementById('camera-modal').style.display = 'none';
  }

  function initCameraUI() {
    document.getElementById('camera-shutter-btn').addEventListener('click', capturePhoto);
    document.getElementById('camera-retake-btn').addEventListener('click', retakePhoto);
    document.getElementById('camera-use-btn').addEventListener('click', usePhoto);
    document.getElementById('camera-close-btn').addEventListener('click', function () {
      cameraClaimCtx = null;
      closeCamera();
    });
  }

  async function uploadSelfie(fileOrBlob, slug) {
    if (!sb || !currentUser) return null;
    try {
      var ext = 'jpg';
      if (fileOrBlob.name) {
        ext = fileOrBlob.name.split('.').pop() || 'jpg';
      }
      var path = currentUser.id + '/' + slug + '_' + Date.now() + '.' + ext;
      var result = await sb.storage.from('selfies').upload(path, fileOrBlob, {
        contentType: 'image/jpeg',
      });
      if (result.error) {
        console.error('Selfie upload error:', result.error);
        return null;
      }
      var urlResult = sb.storage.from('selfies').getPublicUrl(path);
      return urlResult.data.publicUrl;
    } catch (err) {
      console.error('Selfie upload failed:', err);
      return null;
    }
  }

  function updateZoDisplay() {
    var el = document.getElementById('zo-balance');
    if (el && userProfile) {
      el.textContent = '$ZO ' + (userProfile.zo_balance || 0);
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
          '<span class="lb-zo">$ZO ' + (e.zo_balance || 0) + '</span>' +
        '</li>';
    }
    list.innerHTML = html;
  }

  // =============================================
  // Profile
  // =============================================

  async function loadUserClaims() {
    if (!sb || !currentUser) return [];
    try {
      var result = await sb.from('quest_claims')
        .select('slug, reward, claimed_at, selfie_url')
        .eq('user_id', currentUser.id)
        .order('claimed_at', { ascending: false })
        .limit(50);
      return result.data || [];
    } catch (err) {
      console.error('Claims load error:', err);
      return [];
    }
  }

  async function loadUserRank() {
    if (!sb || !currentUser) return null;
    try {
      var result = await sb.from('profiles')
        .select('id, zo_balance')
        .order('zo_balance', { ascending: false });
      if (!result.data) return null;
      for (var i = 0; i < result.data.length; i++) {
        if (result.data[i].id === currentUser.id) return i + 1;
      }
      return null;
    } catch (err) {
      console.error('Rank load error:', err);
      return null;
    }
  }

  async function showProfile() {
    var modal = document.getElementById('profile-modal');
    var usernameEl = document.getElementById('profile-username');
    var zoEl = document.getElementById('profile-total-zo');
    var rankEl = document.getElementById('profile-rank');
    var claimsList = document.getElementById('profile-claims-list');

    usernameEl.textContent = (userProfile && userProfile.username) || 'Explorer';
    zoEl.textContent = '$ZO ' + ((userProfile && userProfile.zo_balance) || 0);
    rankEl.textContent = '#-';
    claimsList.innerHTML = '<li class="profile-empty">Loading...</li>';

    modal.style.display = 'flex';

    // Load rank and claims in parallel
    var rankPromise = loadUserRank();
    var claimsPromise = loadUserClaims();

    var rank = await rankPromise;
    rankEl.textContent = rank ? '#' + rank : '#-';

    var claims = await claimsPromise;
    if (claims.length === 0) {
      claimsList.innerHTML = '<li class="profile-empty">No quests claimed yet</li>';
      return;
    }

    var html = '';
    for (var i = 0; i < claims.length; i++) {
      var c = claims[i];
      var title = c.slug;
      for (var j = 0; j < allQuests.length; j++) {
        if (allQuests[j].slug === c.slug) {
          title = allQuests[j].title;
          break;
        }
      }
      var date = new Date(c.claimed_at);
      var dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
      var hasSelfie = c.selfie_url ? true : false;
      var selfieAttr = hasSelfie ? ' data-selfie-url="' + c.selfie_url + '" data-title="' + title.replace(/"/g, '&quot;') + '"' : '';
      var selfieClass = hasSelfie ? ' has-selfie' : '';
      html +=
        '<li class="profile-claim-row' + selfieClass + '"' + selfieAttr + '>' +
          (hasSelfie ? '<span class="profile-claim-photo">📸</span>' : '') +
          '<div class="profile-claim-info">' +
            '<span class="profile-claim-title">' + title + '</span>' +
            '<span class="profile-claim-date">' + dateStr + '</span>' +
          '</div>' +
          '<span class="profile-claim-reward">$ZO ' + c.reward + '</span>' +
        '</li>';
    }
    claimsList.innerHTML = html;

    // Attach click handlers for selfie viewing
    var rows = claimsList.querySelectorAll('.has-selfie');
    for (var k = 0; k < rows.length; k++) {
      rows[k].addEventListener('click', function () {
        openSelfieViewer(this.dataset.title, this.dataset.selfieUrl);
      });
    }
  }

  function initProfileUI() {
    document.getElementById('profile-close').addEventListener('click', function () {
      document.getElementById('profile-modal').style.display = 'none';
    });

    document.getElementById('profile-modal').addEventListener('click', function (e) {
      if (e.target === this) this.style.display = 'none';
    });

    // Rank box opens leaderboard
    document.getElementById('profile-rank-box').addEventListener('click', function () {
      document.getElementById('profile-modal').style.display = 'none';
      showLeaderboard();
    });

    // Logout from profile
    document.getElementById('profile-logout-btn').addEventListener('click', function () {
      document.getElementById('profile-modal').style.display = 'none';
      doSignOut();
    });

    // Selfie viewer close
    document.getElementById('selfie-viewer-close').addEventListener('click', function () {
      document.getElementById('selfie-viewer').style.display = 'none';
    });
    document.getElementById('selfie-viewer').addEventListener('click', function (e) {
      if (e.target === this) this.style.display = 'none';
    });

    // Selfie share button
    document.getElementById('selfie-share-btn').addEventListener('click', function () {
      var title = document.getElementById('selfie-viewer-title').textContent;
      var imgUrl = document.getElementById('selfie-viewer-img').src;
      if (navigator.share) {
        navigator.share({
          title: title + ' — Zo Quest',
          text: 'Check out my quest selfie from ' + title + ' on Zo Quest Rishikesh!',
          url: imgUrl,
        }).catch(function () {});
      } else {
        // Fallback: copy URL
        navigator.clipboard.writeText(imgUrl).then(function () {
          showToast('Link copied!');
        }).catch(function () {
          showToast('Could not share');
        });
      }
    });
  }

  function openSelfieViewer(title, selfieUrl) {
    document.getElementById('selfie-viewer-title').textContent = title;
    document.getElementById('selfie-viewer-img').src = selfieUrl;
    document.getElementById('selfie-viewer').style.display = 'flex';
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
      var phone = document.getElementById('auth-phone').value.trim();
      var password = document.getElementById('auth-password').value;
      var username = document.getElementById('auth-username').value.trim();

      errEl.textContent = '';

      if (!/^\d{10}$/.test(phone)) {
        errEl.textContent = 'Enter a valid 10-digit phone number';
        return;
      }

      submitBtn.disabled = true;
      submitBtn.textContent = 'Please wait...';

      try {
        if (authIsSignUp) {
          if (!username) {
            throw { message: 'Username is required' };
          }
          await doSignUp(phone, password, username);
        } else {
          await doSignIn(phone, password);
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

    // User menu btn opens profile
    document.getElementById('user-menu-btn').addEventListener('click', function () {
      showProfile();
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
    initCameraUI();
    initProfileUI();

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

          // If on nodes tab, open node popup
          if (activeSection === 'nodes') {
            for (var ni = 0; ni < ZOSTEL_NODES.length; ni++) {
              if (ZOSTEL_NODES[ni].slug === slug) {
                openNodePopup(ZOSTEL_NODES[ni]);
                return;
              }
            }
          }

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
          // Parse coordinates from Location column ("lat, lng") or fallback to COORDS
          var coords = null;
          if (r.Location && r.Location.indexOf(',') !== -1) {
            var parts = r.Location.split(',');
            var lat = parseFloat(parts[0].trim());
            var lng = parseFloat(parts[1].trim());
            if (!isNaN(lat) && !isNaN(lng)) coords = [lng, lat];
          }
          if (!coords && r.slug && COORDS[r.slug]) coords = COORDS[r.slug];
          if (!r.slug || !coords || !r.category) continue;
          allQuests.push({
            id: r.id,
            title: r.title,
            description: r.description,
            difficulty: r.difficulty,
            reward: parseInt(r.reward, 10) || 0,
            cooldown_hours: parseInt(r.cooldown_hours, 10) || 24,
            max_completions: parseInt(r.max_completions, 10) || 0,
            category: r.category,
            slug: r.slug,
            lng: coords[0],
            lat: coords[1],
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

    // Move Event to front so it appears right after "All"
    var evIdx = cats.indexOf('Event');
    if (evIdx > 0) { cats.splice(evIdx, 1); cats.unshift('Event'); }

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
      // Close any open popup when switching categories
      if (currentPopup) {
        currentPopup.remove();
        currentPopup = null;
      }
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
            '<span class="quest-reward">$ZO ' + q.reward + '</span>' +
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
      var coords = [group[0].lng, group[0].lat];

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
    var slug = quests[0].slug;
    var totalReward = 0;
    var rows = '';
    for (var i = 0; i < quests.length; i++) {
      var q = quests[i];
      totalReward += q.reward;
      rows +=
        '<div class="popup-quest-row">' +
          '<span class="popup-cat-label">' + q.meta.emoji + ' ' + q.category + '</span>' +
          '<span class="popup-zo">$ZO ' + q.reward + '</span>' +
        '</div>';
    }

    var claimHTML = '';
    var loc = getEffectiveLocation();
    var withinRange = false;
    if (!loc) {
      claimHTML = '<div class="popup-claim no-location"><span class="claim-status">Enable location to claim</span></div>';
    } else {
      var dist = haversineDistance(loc.lat, loc.lng, coords[1], coords[0]);
      if (dist <= 50) {
        withinRange = true;
        claimHTML = '<div class="popup-claim claimable" id="claim-section"><span class="claim-status">Checking...</span></div>';
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

    // If within 50m, async check cooldown then show selfie claim button
    if (withinRange) {
      checkAndShowClaim(slug, totalReward, quests);
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
  // Nodes (Zostel properties)
  // =============================================

  function getNodeEvents(node) {
    return allQuests.filter(function (q) {
      return q.category === 'Event' &&
        Math.abs(q.lat - node.lat) < 0.002 &&
        Math.abs(q.lng - node.lng) < 0.002;
    });
  }

  function renderNodes() {
    var list = document.getElementById('node-list');
    var countEl = document.getElementById('node-count');
    countEl.textContent = ZOSTEL_NODES.length;

    var meta = CATEGORIES['Zostel'];
    var evMeta = CATEGORIES['Event'] || { emoji: '🎉', color: '#e74c3c' };
    var html = '';
    for (var i = 0; i < ZOSTEL_NODES.length; i++) {
      var n = ZOSTEL_NODES[i];
      var events = getNodeEvents(n);
      html +=
        '<li class="quest-card" data-node-idx="' + i + '" style="animation-delay:' + (i * 0.04) + 's">' +
          '<div class="quest-card-cat">' +
            '<span class="cat-tag" style="background:' + meta.color + '22;color:' + meta.color + '">' +
              meta.emoji + ' Zostel' +
            '</span>' +
          '</div>' +
          '<h3 class="quest-card-title">' + n.title + '</h3>' +
          '<span class="quest-card-diff">' + n.description + '</span>';
      if (events.length > 0) {
        html += '<div class="node-events-section">';
        for (var e = 0; e < events.length; e++) {
          html +=
            '<div class="node-event-row">' +
              '<span class="node-event-emoji">' + evMeta.emoji + '</span>' +
              '<span class="node-event-title">' + events[e].title + '</span>' +
              '<span class="quest-reward">$' + events[e].reward + '</span>' +
            '</div>';
        }
        html += '</div>';
      }
      html += '</li>';
    }
    list.innerHTML = html;

    var cards = list.querySelectorAll('.quest-card');
    for (var j = 0; j < cards.length; j++) {
      cards[j].addEventListener('click', function () {
        var idx = parseInt(this.dataset.nodeIdx, 10);
        var node = ZOSTEL_NODES[idx];
        if (!node) return;
        flyToNode(node);
      });
    }
  }

  function renderNodeMarkers() {
    if (!mapReady) return;

    var features = [];
    for (var i = 0; i < ZOSTEL_NODES.length; i++) {
      var n = ZOSTEL_NODES[i];
      features.push({
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [n.lng, n.lat] },
        properties: {
          slug: n.slug,
          category: 'Zostel',
          count: 1,
          title: n.title,
          isNode: true,
        },
      });
    }

    map.getSource('quest-markers').setData({
      type: 'FeatureCollection',
      features: features,
    });
  }

  function flyToNode(node) {
    if (currentPopup) {
      currentPopup.remove();
      currentPopup = null;
    }

    map.flyTo({
      center: [node.lng, node.lat],
      zoom: 15,
      duration: 800,
      essential: true,
    });

    setTimeout(function () {
      openNodePopup(node);
    }, 850);
  }

  function openNodePopup(node) {
    if (currentPopup) {
      currentPopup.remove();
      currentPopup = null;
    }

    var meta = CATEGORIES['Zostel'];
    var evMeta = CATEGORIES['Event'] || { emoji: '🎉', color: '#e74c3c' };
    var events = getNodeEvents(node);
    var html =
      '<div class="quest-popup">' +
        '<div class="popup-location-name">' + node.title + '</div>' +
        '<p class="popup-desc">' + node.description + '</p>' +
        '<div class="popup-quest-row">' +
          '<span class="popup-cat-label">' + meta.emoji + ' Zostel Node</span>' +
        '</div>';

    if (events.length > 0) {
      html += '<div style="margin-top:8px;padding-top:8px;border-top:1px solid rgba(255,255,255,0.08)">' +
        '<div style="font-size:0.72rem;color:rgba(255,255,255,0.5);margin-bottom:6px;text-transform:uppercase;letter-spacing:0.5px">Events here</div>';
      for (var i = 0; i < events.length; i++) {
        html +=
          '<div class="popup-quest-row">' +
            '<span class="popup-cat-label">' + evMeta.emoji + ' ' + events[i].title + '</span>' +
            '<span class="popup-zo">$' + events[i].reward + '</span>' +
          '</div>';
      }
      html += '</div>';
    }

    html += '</div>';

    currentPopup = new mapboxgl.Popup({
      closeButton: true,
      offset: 20,
      maxWidth: '280px',
      className: 'quest-popup-container',
    })
      .setLngLat([node.lng, node.lat])
      .setHTML(html)
      .addTo(map);
  }

  // =============================================
  // Bottom Navigation
  // =============================================

  function initNav() {
    var btns = document.querySelectorAll('.bottom-nav .nav-btn');
    for (var i = 0; i < btns.length; i++) {
      btns[i].addEventListener('click', function () {
        var section = this.dataset.section;
        if (section === 'leaderboard') {
          showLeaderboard();
          return;
        }

        // Update active tab
        var all = document.querySelectorAll('.bottom-nav .nav-btn');
        for (var j = 0; j < all.length; j++) all[j].classList.remove('active');
        this.classList.add('active');

        activeSection = section;

        if (section === 'quests') {
          document.getElementById('quest-panel').style.display = 'flex';
          document.getElementById('category-filters').style.display = 'flex';
          document.getElementById('nodes-panel').style.display = 'none';
          renderMarkers(filteredQuests);
        } else if (section === 'nodes') {
          document.getElementById('quest-panel').style.display = 'none';
          document.getElementById('category-filters').style.display = 'none';
          document.getElementById('nodes-panel').style.display = 'flex';
          renderNodes();
          renderNodeMarkers();
        }
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
