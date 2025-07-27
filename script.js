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
      
      document.documentElement.style.setProperty('--vh', `${vh}px`);
      document.documentElement.style.setProperty('--mobile-vh', `${window.innerHeight}px`);
      document.documentElement.style.setProperty('--available-height', `${actualHeight}px`);
      
      // Force a more aggressive approach for mobile browsers
      document.documentElement.style.setProperty('--real-vh', `${actualHeight}px`);
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
          loadingSubtext.textContent = 'Using default location (Bangalore). You can still browse events!';
          
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

    // Add map controls
    map.addControl(new mapboxgl.NavigationControl(), 'bottom-left');

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
    // Event Loading and Display
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
  let currentOpenPopup = null;

      function addMarkersAndListItems(data) {
    const locationList = document.getElementById("location-list");
    locationList.innerHTML = '';

    data.forEach(function (row) {
      if (row.Latitude && row.Longitude) {
        // Add map marker
        const marker = new mapboxgl.Marker()
          .setLngLat([parseFloat(row.Longitude), parseFloat(row.Latitude)])
          .addTo(map);

        // Remove date formatting for static hackspaces

        // Create popup content for hackspaces
        const visitButton = row["Location URL"] ? 
            `<a href="${row["Location URL"]}" target="_blank" class="popup-register-btn">Visit Now</a>` : 
            '';
            
        const popupContent = `
          <div class="glass-popup">
            <h3>${row["Location Name"] || "N/A"}</h3>
            <p>🔧 ${row.Type || "Hackspace"}</p>
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
        
        const listVisitButton = row["Location URL"] ? 
            `<a href="${row["Location URL"]}" target="_blank" class="register-btn" onclick="event.stopPropagation()">Visit</a>` : 
            '';
        
        listItem.innerHTML = `
          <div class="location-details">
              <h3>${row["Location Name"] || "N/A"}</h3>
              <p class="location-type">🔧 ${row.Type || "Hackspace"}</p>
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
            return locationName.includes(lowerCaseSearchTerm) || locationAddress.includes(lowerCaseSearchTerm);
        });
        addMarkersAndListItems(filtered);
    }

    function filterLocationsByArea(areaFilter, searchTerm = '') {
        let filtered = allLocations;
        
        // Apply location filter
        if (locationFilter !== 'all') {
            if (locationFilter === 'bangalore') {
                filtered = filtered.filter(event => {
                    const location = (event['Location'] || '').toLowerCase();
                    return location.includes('bangalore') || 
                           location.includes('koramangala') || 
                           location.includes('anaa infra') ||
                           location.includes('nirguna mandir');
                });
            } else if (locationFilter === 'sanfrancisco') {
                filtered = filtered.filter(event => {
                    const location = (event['Location'] || '').toLowerCase();
                    const isStanFrancisco = location.includes('san francisco') || 
                                          location.includes('sf') || 
                                          location.includes('zo house') || 
                                          location.includes('300 4th st') ||
                                          location.includes('4th street') ||
                                          location.includes('california') ||
                                          location.includes('ca 94107') ||
                                          location.includes('usa');
                    
                    // Exclude Bangalore locations that might contain similar keywords
                    const isBangalore = location.includes('bangalore') || 
                                       location.includes('koramangala') || 
                                       location.includes('anaa infra') ||
                                       location.includes('nirguna mandir');
                    
                    return isStanFrancisco && !isBangalore;
                });
            }
        }
        
        // Apply search filter if search term exists
        if (searchTerm) {
            const lowerCaseSearchTerm = searchTerm.toLowerCase();
            filtered = filtered.filter(event => {
                const eventName = (event['Event Name'] || '').toLowerCase();
                const location = (event['Location'] || '').toLowerCase();
                return eventName.includes(lowerCaseSearchTerm) || location.includes(lowerCaseSearchTerm);
            });
        }
        
        addMarkersAndListItems(filtered);
    }

    // =====================================
    // Static Location Data
    // =====================================

    // Removed calendar parsing functions - no longer needed for static locations

    function loadStaticLocations() {
        try {
            // Static hackspace data for Zo initiative
            const staticLocations = [
                {
                    'Location Name': 'Zo SF',
                    'Host': 'Zo Team',
                    'Date & Time': new Date().toISOString(),
                    'Location': 'San Francisco, CA',
                    'Latitude': 37.781903723962394,
                    'Longitude': -122.40089759537564,
                    'Location URL': null,
                    'Type': 'Hackspace'
                },
                {
                    'Location Name': 'Zo Kora',
                    'Host': 'Zo Team',
                    'Date & Time': new Date().toISOString(),
                    'Location': 'Koramangala, Bangalore',
                    'Latitude': 12.933043207450986,
                    'Longitude': 77.63463845876512,
                    'Location URL': null,
                    'Type': 'Hackspace'
                },
                {
                    'Location Name': 'Zo WF',
                    'Host': 'Zo Team',
                    'Date & Time': new Date().toISOString(),
                    'Location': 'Whitefield, Bangalore',
                    'Latitude': 12.972625067533576,
                    'Longitude': 77.74648576165846,
                    'Location URL': null,
                    'Type': 'Hackspace'
                },
                {
                    'Location Name': 'Lossfunk',
                    'Host': 'Zo Team',
                    'Date & Time': new Date().toISOString(),
                    'Location': 'Bangalore, Karnataka',
                    'Latitude': 12.981365725590802,
                    'Longitude': 77.64077028864327,
                    'Location URL': null,
                    'Type': 'Hackspace'
                },
                {
                    'Location Name': 'Shipyard',
                    'Host': 'Zo Team',
                    'Date & Time': new Date().toISOString(),
                    'Location': 'Bangalore, Karnataka',
                    'Latitude': 12.982406246118158,
                    'Longitude': 77.64026430077156,
                    'Location URL': null,
                    'Type': 'Hackspace'
                },
                {
                    'Location Name': 'The Hub',
                    'Host': 'Zo Team',
                    'Date & Time': new Date().toISOString(),
                    'Location': 'Bangalore, Karnataka',
                    'Latitude': 12.979966981737082,
                    'Longitude': 77.60760484972558,
                    'Location URL': null,
                    'Type': 'Hackspace'
                }
            ];

            // All locations have coordinates, so we can use them directly
            allLocations = staticLocations;
            addMarkersAndListItems(allLocations);

        } catch (error) {
            console.error('Error loading static hackspaces:', error);
            const locationList = document.getElementById("location-list");
            locationList.innerHTML = '<li style="text-align: center; padding: 20px;">Unable to load hackspaces. Please try again later.</li>';
        }
    }

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
        openCalendarView();
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

    // =====================================
    // Calendar View Functions
    // =====================================
    
    let currentCalendarDate = new Date();
    
    function openCalendarView() {
        const calendarOverlay = document.getElementById('calendar-overlay');
        calendarOverlay.style.display = 'flex';
        renderCalendar();
        setupCalendarEventListeners();
    }
    
    function closeCalendarView() {
        const calendarOverlay = document.getElementById('calendar-overlay');
        calendarOverlay.style.display = 'none';
    }
    
    function setupCalendarEventListeners() {
        const closeBtn = document.querySelector('.close-calendar-btn');
        const prevBtn = document.querySelector('.prev-month');
        const nextBtn = document.querySelector('.next-month');
        const overlay = document.getElementById('calendar-overlay');
        
        closeBtn.onclick = closeCalendarView;
        
        overlay.onclick = (e) => {
            if (e.target === overlay) {
                closeCalendarView();
            }
        };
        
        prevBtn.onclick = () => {
            currentCalendarDate.setMonth(currentCalendarDate.getMonth() - 1);
            renderCalendar();
        };
        
        nextBtn.onclick = () => {
            currentCalendarDate.setMonth(currentCalendarDate.getMonth() + 1);
            renderCalendar();
        };
    }
    
    function renderCalendar() {
        const monthNames = [
            'January', 'February', 'March', 'April', 'May', 'June',
            'July', 'August', 'September', 'October', 'November', 'December'
        ];
        
        const currentMonth = document.querySelector('.current-month');
        currentMonth.textContent = `${monthNames[currentCalendarDate.getMonth()]} ${currentCalendarDate.getFullYear()}`;
        
        const calendarDays = document.getElementById('calendar-days');
        calendarDays.innerHTML = '';
        
        const firstDay = new Date(currentCalendarDate.getFullYear(), currentCalendarDate.getMonth(), 1);
        const lastDay = new Date(currentCalendarDate.getFullYear(), currentCalendarDate.getMonth() + 1, 0);
        const startDate = new Date(firstDay);
        startDate.setDate(startDate.getDate() - firstDay.getDay());
        
        // Group events by date
        const eventsByDate = {};
        allLocations.forEach(location => {
            const eventDate = new Date(event['Date & Time']);
            const dateKey = eventDate.toDateString();
            if (!eventsByDate[dateKey]) {
                eventsByDate[dateKey] = [];
            }
            eventsByDate[dateKey].push(event);
        });
        
        // Generate calendar days
        for (let i = 0; i < 42; i++) { // 6 weeks * 7 days
            const date = new Date(startDate);
            date.setDate(startDate.getDate() + i);
            
            const dayElement = document.createElement('div');
            dayElement.className = 'calendar-day';
            
            const isCurrentMonth = date.getMonth() === currentCalendarDate.getMonth();
            const dateKey = date.toDateString();
            const dayEvents = eventsByDate[dateKey] || [];
            
            if (!isCurrentMonth) {
                dayElement.classList.add('other-month');
            }
            
            if (dayEvents.length > 0) {
                dayElement.classList.add('has-events');
            }
            
            const eventItems = dayEvents.slice(0, 3).map(event => {
                const eventName = event['Event Name'];
                const truncatedName = eventName.length > 20 ? eventName.substring(0, 17) + '...' : eventName;
                const eventUrl = event['Event URL'];
                
                if (eventUrl) {
                    return `<a href="${eventUrl}" target="_blank" class="calendar-event-preview clickable">${truncatedName}</a>`;
                } else {
                    return `<div class="calendar-event-preview">${truncatedName}</div>`;
                }
            }).join('');
            
            const moreEventsIndicator = dayEvents.length > 3 ? 
                `<div class="more-events">+${dayEvents.length - 3} more</div>` : '';
            
            dayElement.innerHTML = `
                <div class="day-number">${date.getDate()}</div>
                <div class="day-events-container">
                    ${eventItems}
                    ${moreEventsIndicator}
                </div>
            `;
            
            // Remove click handler since events are now directly clickable
            // dayElement.onclick = () => { ... } - REMOVED
            
            calendarDays.appendChild(dayElement);
        }
    }
  }
}

// Check if DOM is already loaded, otherwise wait for it
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeApp);
} else {
  initializeApp();
}
