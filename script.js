function initializeApp() {
  // =====================================
  // Configuration and Setup
  // =====================================
  
  function isMobile() {
    return window.innerWidth <= 768;
  }

  // =====================================
  // Mobile Viewport Height Fix
  // =====================================
  
  function setMobileViewportHeight() {
    if (isMobile()) {
      // Calculate actual viewport height accounting for browser UI
      const vh = window.innerHeight * 0.01;
      const actualHeight = window.visualViewport ? window.visualViewport.height : window.innerHeight;
      
      // Be more conservative - subtract extra space for mobile browser UI
      const safeHeight = actualHeight - 60; // Subtract 60px for mobile browser navigation
      
      document.documentElement.style.setProperty('--vh', `${vh}px`);
      document.documentElement.style.setProperty('--mobile-vh', `${window.innerHeight}px`);
      document.documentElement.style.setProperty('--available-height', `${safeHeight}px`);
      document.documentElement.style.setProperty('--real-vh', `${safeHeight}px`);
    }
  }

  // Set initial viewport height
  setMobileViewportHeight();

  // Update on resize and orientation change
  window.addEventListener('resize', setMobileViewportHeight);
  window.addEventListener('orientationchange', () => {
    setTimeout(setMobileViewportHeight, 100); // Small delay for orientation change
  });
  
  // Listen for visual viewport changes (mobile browser address bar)
  if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', setMobileViewportHeight);
  }

  mapboxgl.accessToken = "pk.eyJ1Ijoia3VzaGFsem8iLCJhIjoiY20wcDZtNjUwMDFxNzJpcjYxZjlsN2g3NiJ9.d194ACznKNqKJNfzKyanNQ";

  const initialZoom = isMobile() ? 12.5 : 18.5;
  const defaultCenter = [77.6413, 12.9141]; // Bangalore, Karnataka
  let mapCenter = defaultCenter;
  let userLocationCoords = null;
  let map = null; // Global map variable
  let currentOpenPopup = null; // Track currently open popup

  // =====================================
  // Bottom Navigation Setup
  // =====================================
  
  function initializeBottomNav() {
    const navButtons = document.querySelectorAll('.bottom-nav .nav-btn');
    const locationsContainer = document.getElementById('list-container');
    const locationsButton = document.querySelector('.bottom-nav .nav-btn[data-section="locations"]');
    
    // Locations container starts visible, so Locations button should be active
    let locationsVisible = true;
    
    navButtons.forEach(button => {
      button.addEventListener('click', function() {
        const section = this.getAttribute('data-section');
        
        // Remove active class from all buttons
        navButtons.forEach(btn => btn.classList.remove('active'));
        
        if (section === 'locations') {
          // Toggle locations visibility
          locationsVisible = !locationsVisible;
          
          if (locationsVisible) {
            locationsContainer.style.display = 'flex';
            this.classList.add('active');
          } else {
            locationsContainer.style.display = 'none';
            this.classList.remove('active');
          }
        } else {
          // For Members and Cultures, just add active state (future functionality)
          this.classList.add('active');
          
          // If locations was visible, hide it since we're switching sections
          if (locationsVisible) {
            locationsContainer.style.display = 'none';
            locationsVisible = false;
          }
        }
      });
    });
  }

  // =====================================
  // Geolocation Functions
  // =====================================
  
  function getUserLocation() {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation is not supported by this browser.'));
        return;
      }

      // Update loading message
      const loadingOverlay = document.getElementById("location-loading");
      const loadingText = loadingOverlay.querySelector('p');
      const loadingSubtext = loadingOverlay.querySelector('small');
      
      loadingText.textContent = 'Requesting your location...';
      loadingSubtext.textContent = 'Please allow location access to center the map on your area';

      navigator.geolocation.getCurrentPosition(
        (position) => {
          const userLocation = [
            position.coords.longitude,
            position.coords.latitude
          ];
          loadingText.textContent = 'Location found! Loading map...';
          loadingSubtext.textContent = 'Centering map on your location';
          resolve(userLocation);
        },
        (error) => {
          loadingText.textContent = 'Location access denied';
          loadingSubtext.textContent = 'Using default location (Bangalore). You can still browse locations!';
          
          // Show manual location button
          const manualBtn = document.getElementById('manual-location-btn');
          manualBtn.style.display = 'block';
          manualBtn.onclick = () => {
            manualBtn.style.display = 'none';
            loadingText.textContent = 'Requesting your location...';
            loadingSubtext.textContent = 'Please allow location access to center the map on your area';
            
            setTimeout(() => {
              getUserLocation()
                .then((userLocation) => {
                  mapCenter = userLocation;
                  userLocationCoords = userLocation;
                  loadingOverlay.classList.add('hidden');
                  document.getElementById('map').innerHTML = '';
                  initializeMap();
                })
                .catch(() => {
                  loadingText.textContent = 'Location unavailable';
                  loadingSubtext.textContent = 'Using Bangalore as default location';
                  setTimeout(() => {
                    reject(error);
                  }, 1500);
                });
            }, 500);
          };
          
          setTimeout(() => {
            reject(error);
          }, 1500);
        },
        {
          enableHighAccuracy: true,
          timeout: 15000,
          maximumAge: 600000 // 10 minutes cache
        }
      );
    });
  }

  // =====================================
  // Map Initialization
  // =====================================
  
  // Try to get user location, fallback to default if not available
  const loadingOverlay = document.getElementById("location-loading");
  
  // Simplified loading screen logic - hide after 3 seconds regardless
  setTimeout(() => {
    loadingOverlay.style.display = 'none';
    if (!map) {
      initializeMap();
    }
  }, 3000);
  
  getUserLocation()
    .then((userLocation) => {
      mapCenter = userLocation;
      userLocationCoords = userLocation;
    })
    .catch((error) => {
      mapCenter = defaultCenter;
    })
    .finally(() => {
      // Hide loading screen and initialize map
      loadingOverlay.style.display = 'none';
      if (!map) {
      initializeMap();
      }
    });

  function initializeMap() {
  map = new mapboxgl.Map({
    container: "map",
      center: mapCenter,
    zoom: initialZoom,
      pitch: 60,
      bearing: -30,
  });

  // Remove default navigation controls (zoom buttons)
  // Don't add any navigation controls

  map.on("style.load", () => {
    map.setConfigProperty("basemap", "lightPreset", "night");
    map.setConfigProperty("basemap", "showPointOfInterestLabels", false);
    map.setConfigProperty("basemap", "showPlaceLabels", false);
    map.setConfigProperty("basemap", "showRoadLabels", false);
    map.setConfigProperty("basemap", "showTransitLabels", false);

    // Add 3D building layer
    map.addLayer({
      id: "3d-buildings",
      source: "composite",
      "source-layer": "building",
      filter: ["==", "extrude", "true"],
      type: "fill-extrusion",
      minzoom: 15,
      paint: {
        "fill-extrusion-color": "#aaa",
        "fill-extrusion-height": [
          "interpolate",
          ["linear"],
          ["zoom"],
          15,
          0,
          15.05,
          ["get", "height"],
        ],
        "fill-extrusion-base": [
          "interpolate",
          ["linear"],
          ["zoom"],
          15,
          0,
          15.05,
          ["get", "min_height"],
        ],
        "fill-extrusion-opacity": 0.6,
      },
    });
  });

    // Navigation controls removed to avoid interference with bottom nav bar

    // Add user location marker if available
    if (userLocationCoords) {
      const userMarker = new mapboxgl.Marker({
        color: '#e67e5c',
        scale: 1.5
      })
      .setLngLat(userLocationCoords)
      .addTo(map);

      const userPopup = new mapboxgl.Popup({ offset: 25, closeButton: false })
        .setHTML('<strong>📍 Your Location</strong><br><small>This is where you are</small>');
      
      userMarker.setPopup(userPopup);
      
      // Show popup briefly when map loads
      setTimeout(() => {
        userPopup.addTo(map);
        setTimeout(() => {
          userPopup.remove();
        }, 3000);
      }, 1000);
    }

    // =====================================
    // Static Locations Data
    // =====================================
    
    const staticLocations = [
        {
            'Location Name': 'Zo San Francisco',
            'Host': 'Zo Team',
            'Date & Time': new Date().toISOString(),
            'Location': 'San Francisco, CA',
            'Latitude': 37.781903723962394,
            'Longitude': -122.40089759537564,
            'Location URL': 'https://lu.ma/calendar/cal-3YNnBTToy9fnnjQ',
            'Area': 'sanfrancisco'
        },
        {
            'Location Name': 'Zo Koramangala',
            'Host': 'Zo Team',
            'Date & Time': new Date().toISOString(),
            'Location': 'Koramangala, Bangalore',
            'Latitude': 12.933043207450986,
            'Longitude': 77.63463845876512,
            'Location URL': 'https://lu.ma/calendar/cal-ZVonmjVxLk7F2oM',
            'Area': 'bangalore'
        },
        {
            'Location Name': 'Zo Whitefield',
            'Host': 'Zo Team',
            'Date & Time': new Date().toISOString(),
            'Location': 'Whitefield, Bangalore',
            'Latitude': 12.972625067533576,
            'Longitude': 77.74648576165846,
            'Location URL': 'https://lu.ma/calendar/cal-ZVonmjVxLk7F2oM',
            'Area': 'bangalore'
        },
        {
            'Location Name': 'Lossfunk',
            'Host': 'Community Partner',
            'Date & Time': new Date().toISOString(),
            'Location': 'Bangalore',
            'Latitude': 12.981365725590802,
            'Longitude': 77.64077028864327,
            'Location URL': '#',
            'Area': 'bangalore'
        },
        {
            'Location Name': 'Shipyard',
            'Host': 'Community Partner',
            'Date & Time': new Date().toISOString(),
            'Location': 'Bangalore',
            'Latitude': 12.982406246118158,
            'Longitude': 77.64026430077156,
            'Location URL': '#',
            'Area': 'bangalore'
        },
        {
            'Location Name': 'The Hub',
            'Host': 'Community Partner',
            'Date & Time': new Date().toISOString(),
            'Location': 'Bangalore',
            'Latitude': 12.979966981737082,
            'Longitude': 77.60760484972558,
            'Location URL': '#',
            'Area': 'bangalore'
        }
    ];

    // =====================================
    // Location Loading and Display
    // =====================================
    
    let allLocations = []; // Store all locations to enable filtering

  function formatDateTime(dateTimeString) {
    const date = new Date(dateTimeString);
    const options = {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "numeric",
      minute: "numeric",
      hour12: true,
    };
    return date
      .toLocaleDateString("en-US", options)
      .replace(",", "")
      .replace(" at", "•");
  }

  // Track open popups to manage auto-close behavior
  // currentOpenPopup is now declared at module level

  function addMarkersAndListItems(data) {
    const locationList = document.getElementById("location-list");
    locationList.innerHTML = '';

    // Clear existing markers
    if (map && map.getLayer && map.getLayer('locations')) {
        map.removeLayer('locations');
        map.removeSource('locations');
    }

    data.forEach(function (row) {
      if (row.Latitude && row.Longitude) {
        // Add map marker
        const marker = new mapboxgl.Marker({
            color: row.Area === 'sanfrancisco' ? '#e67e5c' : '#d4a574',
            scale: 1.2
        })
          .setLngLat([parseFloat(row.Longitude), parseFloat(row.Latitude)])
          .addTo(map);

        const formattedDate = new Date(row["Date & Time"]).toLocaleDateString('en-US', {
          weekday: 'short',
          month: 'short', 
          day: 'numeric',
          year: 'numeric'
        });

        // Create popup content
        const visitButton = row["Location URL"] && row["Location URL"] !== '#' ? 
            `<a href="${row["Location URL"]}" target="_blank" class="popup-register-btn">Visit Now</a>` : 
            '';
            
        const popupContent = `
          <div class="glass-popup">
            <h3>${row["Location Name"] || "N/A"}</h3>
            <p>🏢 ${row.Host || "N/A"}</p>
            <p>📍 ${row.Location || "N/A"}</p>
            ${visitButton}
          </div>
        `;

        const popup = new mapboxgl.Popup({
            className: 'glass-popup-container',
            closeButton: true,
            offset: [0, -15], // Reduced offset to prevent logo overlap
            maxWidth: '280px' // Limit popup width
          })
          .setLngLat(marker.getLngLat())
          .setHTML(popupContent);

        marker.setPopup(popup);
        
        // Handle marker click to auto-close previous popups
        marker.on('click', () => {
          if (currentOpenPopup && currentOpenPopup !== popup) {
            currentOpenPopup.remove();
          }
          currentOpenPopup = popup;
          
          popup.on('close', () => {
            if (currentOpenPopup === popup) {
              currentOpenPopup = null;
            }
          });
        });

        // Create list item
        const listItem = document.createElement("li");
        listItem.className = "location-item";
        
        const listVisitButton = row["Location URL"] && row["Location URL"] !== '#' ? 
            `<a href="${row["Location URL"]}" target="_blank" class="register-btn" onclick="event.stopPropagation()">Visit</a>` : 
            '';
        
        listItem.innerHTML = `
          <div class="location-details">
              <h3>${row["Location Name"] || "N/A"}</h3>
              <p class="location-host">🏢 ${row.Host || "N/A"}</p>
              <p class="location-address">📍 ${row.Location || "N/A"}</p>
          </div>
          ${listVisitButton}
        `;
        
        locationList.appendChild(listItem);

        // Add click handler for list item
        listItem.addEventListener("click", function (e) {
          if (e.target.tagName !== "A") {
            // Close any currently open popup
            if (currentOpenPopup) {
              currentOpenPopup.remove();
            }
            
            map.flyTo({
              center: [parseFloat(row.Longitude), parseFloat(row.Latitude)],
              zoom: 18,
            });
            popup.addTo(map);
            
            // Track this popup as the currently open one
            currentOpenPopup = popup;
            
            // Listen for popup close events
            popup.on('close', () => {
              if (currentOpenPopup === popup) {
                currentOpenPopup = null;
              }
            });
          }
        });
      }
    });
  }

    function filterLocations(searchTerm) {
        const lowerCaseSearchTerm = searchTerm.toLowerCase();
        const filtered = allLocations.filter(location => {
            const locationName = (location['Location Name'] || '').toLowerCase();
            const locationAddress = (location['Location'] || '').toLowerCase();
            const locationHost = (location['Host'] || '').toLowerCase();
            return locationName.includes(lowerCaseSearchTerm) || 
                   locationAddress.includes(lowerCaseSearchTerm) ||
                   locationHost.includes(lowerCaseSearchTerm);
        });
        addMarkersAndListItems(filtered);
    }

    function filterLocationsByArea(areaFilter, searchTerm = '') {
        let filtered = allLocations;
        
        // Apply area filter
        if (areaFilter !== 'all') {
            filtered = filtered.filter(location => {
                return location.Area === areaFilter;
            });
        }
        
        // Apply search filter if search term exists
        if (searchTerm) {
            const lowerCaseSearchTerm = searchTerm.toLowerCase();
            filtered = filtered.filter(location => {
                const locationName = (location['Location Name'] || '').toLowerCase();
                const locationAddress = (location['Location'] || '').toLowerCase();
                const locationHost = (location['Host'] || '').toLowerCase();
                return locationName.includes(lowerCaseSearchTerm) || 
                       locationAddress.includes(lowerCaseSearchTerm) ||
                       locationHost.includes(lowerCaseSearchTerm);
            });
        }
        
        addMarkersAndListItems(filtered);
    }

    // =====================================
    // Static Location Loading
    // =====================================
    
    function loadStaticLocations() {
        try {
            allLocations = staticLocations;
            addMarkersAndListItems(allLocations);
            console.log('✅ Static locations loaded successfully!');
        } catch (error) {
            console.error('Error loading static locations:', error);
            const locationList = document.getElementById("location-list");
            locationList.innerHTML = '<li style="text-align: center; padding: 20px;">Unable to load locations. Please try again later.</li>';
        }
    }

    // Load static locations instead of fetching from calendar
    loadStaticLocations();


    // =====================================
    // Search and Filter Logic
    // =====================================

    const searchInput = document.getElementById('search-input');
    searchInput.addEventListener('input', (e) => {
        const activeLocationFilter = document.querySelector('.location-filter-btn.active').dataset.location;
        filterLocationsByArea(activeLocationFilter, e.target.value);
    });

    // Location filter functionality
    const locationFilterBtns = document.querySelectorAll('.location-filter-btn');
    locationFilterBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            // Remove active class from all buttons
            locationFilterBtns.forEach(b => b.classList.remove('active'));
            // Add active class to clicked button
            btn.classList.add('active');
            
            // Get current search term and apply both filters
            const searchTerm = searchInput.value;
            const locationFilter = btn.dataset.location;
            filterLocationsByArea(locationFilter, searchTerm);
        });
    });

    const viewAllBtn = document.querySelector('.view-all-btn');
    viewAllBtn.addEventListener('click', () => {
        // Show all locations and zoom out to see all areas
        filterLocationsByArea('all', '');
        
        // Calculate bounds to fit all locations
        if (allLocations.length > 0) {
            const bounds = new mapboxgl.LngLatBounds();
            allLocations.forEach(location => {
                bounds.extend([location.Longitude, location.Latitude]);
            });
            map.fitBounds(bounds, { padding: 50 });
        }
    });


    // =====================================
    // Responsive View Management
    // =====================================
    
    function setView() {
      const listContainer = document.getElementById("list-container");
      listContainer.style.display = "flex";
      if (map) {
        map.resize();
      }
    }

    setView();
    window.addEventListener("resize", setView);

      // Initialize bottom navigation
  initializeBottomNav();

  // =====================================
  // Supabase Initialization
  // =====================================
  
  // Initialize Supabase connection
  if (typeof window.SupabaseClient !== 'undefined') {
    const supabaseClient = window.SupabaseClient.initialize();
    
    if (supabaseClient) {
      // Test the connection
      window.SupabaseClient.ping().then(success => {
        if (success) {
          console.log('🚀 Supabase integration ready!');
        }
      });
    }
  } else {
    console.warn('Supabase client not available. Make sure supabaseClient.js is loaded.');
  }

    // =====================================
    // Location Overview Functions
    // =====================================
    
    // Calendar view removed since we're showing static locations, not time-based events
    // The "View All" button now shows all locations on the map instead
  }
}

// Check if DOM is already loaded, otherwise wait for it
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeApp);
    } else {
  initializeApp();
        }
