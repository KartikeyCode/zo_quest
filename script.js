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
      document.documentElement.style.setProperty('--vh', `${vh}px`);
      document.documentElement.style.setProperty('--mobile-vh', `${window.innerHeight}px`);
      document.documentElement.style.setProperty('--available-height', `${window.innerHeight}px`);
    }
  }

  // Set initial viewport height
  setMobileViewportHeight();

  // Update on resize and orientation change
  window.addEventListener('resize', setMobileViewportHeight);
  window.addEventListener('orientationchange', () => {
    setTimeout(setMobileViewportHeight, 100); // Small delay for orientation change
  });

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
    
    let allEvents = []; // Store all events to enable filtering

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

  function addMarkersAndListItems(data) {
    const eventList = document.getElementById("event-list");
    eventList.innerHTML = '';

    data.forEach(function (row) {
      if (row.Latitude && row.Longitude) {
        // Add map marker
        const marker = new mapboxgl.Marker()
          .setLngLat([parseFloat(row.Longitude), parseFloat(row.Latitude)])
          .addTo(map);

        const formattedDate = new Date(row["Date & Time"]).toLocaleDateString('en-US', {
          weekday: 'short',
          month: 'short', 
          day: 'numeric',
          year: 'numeric'
        });

        // Create popup content
        const registerButton = row["Event URL"] ? 
            `<a href="${row["Event URL"]}" target="_blank" class="popup-register-btn">Register Now</a>` : 
            '';
            
        const popupContent = `
          <div class="glass-popup">
            <h3>${row["Event Name"] || "N/A"}</h3>
            <p>📅 ${formattedDate}</p>
            <p>📍 ${row.Location || "N/A"}</p>
            ${registerButton}
          </div>
        `;

        const popup = new mapboxgl.Popup({
            className: 'glass-popup-container',
            closeButton: true, // Re-enabling close button for usability
            offset: 25
          })
          .setLngLat(marker.getLngLat())
          .setHTML(popupContent);

        marker.setPopup(popup);

        // Create list item
        const listItem = document.createElement("li");
        listItem.className = "event-item";
        
        const listRegisterButton = row["Event URL"] ? 
            `<a href="${row["Event URL"]}" target="_blank" class="register-btn" onclick="event.stopPropagation()">Register</a>` : 
            '';
        
        listItem.innerHTML = `
          <div class="event-details">
              <h3>${row["Event Name"] || "N/A"}</h3>
              <p class="event-date">📅 ${formattedDate}</p>
              <p class="event-location">📍 ${row.Location || "N/A"}</p>
          </div>
          ${listRegisterButton}
        `;
        
        eventList.appendChild(listItem);

        // Add click handler for list item
        listItem.addEventListener("click", function (e) {
          if (e.target.tagName !== "A") {
            map.flyTo({
              center: [parseFloat(row.Longitude), parseFloat(row.Latitude)],
              zoom: 18,
            });
            popup.addTo(map);
          }
        });
      }
    });
  }

    function filterEvents(searchTerm) {
        const lowerCaseSearchTerm = searchTerm.toLowerCase();
        const filtered = allEvents.filter(event => {
            const eventName = (event['Event Name'] || '').toLowerCase();
            const location = (event['Location'] || '').toLowerCase();
            return eventName.includes(lowerCaseSearchTerm) || location.includes(lowerCaseSearchTerm);
        });
        addMarkersAndListItems(filtered);
    }

    function filterEventsByLocation(locationFilter, searchTerm = '') {
        let filtered = allEvents;
        
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
    // iCalendar Data Fetching and Parsing
    // =====================================
    
    const calendarUrls = [
        'https://api.lu.ma/ics/get?entity=calendar&id=cal-ZVonmjVxLk7F2oM', // Bangalore
        'https://api.lu.ma/ics/get?entity=calendar&id=cal-3YNnBTToy9fnnjQ'  // San Francisco
    ];

    function parseICS(icsData) {
        const events = [];
        const lines = icsData.split(/\r\n|\n|\r/);
        let currentEvent = null;

        lines.forEach(line => {
            if (line.startsWith('BEGIN:VEVENT')) {
                currentEvent = {};
            } else if (line.startsWith('END:VEVENT')) {
                if (currentEvent) {
                    events.push(currentEvent);
                }
                currentEvent = null;
            } else if (currentEvent) {
                const [key, ...valueParts] = line.split(':');
                const value = valueParts.join(':');

                if (key.startsWith('DTSTART')) {
                    currentEvent.start = new Date(value.replace(/(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})/, '$1-$2-$3T$4:$5:$6'));
                } else if (key.startsWith('SUMMARY')) {
                    currentEvent.summary = value;
                } else if (key.startsWith('LOCATION')) {
                    currentEvent.location = value.replace(/\\,/g, ',');
                } else if (key.startsWith('URL')) {
                    currentEvent.url = value;
                } else if (key.startsWith('DESCRIPTION')) {
                    currentEvent.description = value.replace(/\\n/g, '\n');
                    // Check if description contains the real Luma URL
                    const lumaUrlMatch = value.match(/https:\/\/lu\.ma\/([a-zA-Z0-9]+)/);
                    if (lumaUrlMatch) {
                        currentEvent.realLumaUrl = lumaUrlMatch[0];
                    }
                } else if (key.startsWith('UID')) {
                    currentEvent.uid = value;
                    // Extract Luma event ID from UID for URL construction
                    const lumaEventMatch = value.match(/evt-([a-zA-Z0-9]+)/);
                    if (lumaEventMatch) {
                        currentEvent.lumaEventId = lumaEventMatch[1];
                    }
                } else if (key.startsWith('ORGANIZER')) {
                    // Extract organizer/host information
                    const organizerMatch = value.match(/CN=([^;:]+)/);
                    currentEvent.organizer = organizerMatch ? organizerMatch[1] : value;
                } else if (key.startsWith('GEO')) {
                    const [lat, lon] = value.split(';');
                    const parsedLat = parseFloat(lat);
                    const parsedLon = parseFloat(lon);
                    if (!isNaN(parsedLat) && !isNaN(parsedLon)) {
                        currentEvent.geo = { lat: parsedLat, lon: parsedLon };
                    }
                }
            }
        });
        return events;
    }

    async function geocodeLocation(locationName) {
        if (!locationName) return null;
        const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(locationName)}.json?access_token=${mapboxgl.accessToken}`;
        try {
            const response = await fetch(url);
            const data = await response.json();
            if (data.features && data.features.length > 0) {
                return data.features[0].center; // [longitude, latitude]
            }
        } catch (error) {
            console.error('Geocoding error:', error);
        }
        return null;
    }

    async function fetchAndProcessCalendars() {
        try {
            const proxyUrl = 'https://proxy.cors.sh/';
            const apiKey = 'temp_7db057c99de626add346faa324315c4d';

            const responses = await Promise.all(calendarUrls.map(url => 
                fetch(proxyUrl + url, {
                    headers: {
                        'x-cors-api-key': apiKey
                    }
                })
            ));
            const icsDataArray = await Promise.all(responses.map(res => {
                if (!res.ok) {
                    throw new Error(`CORS proxy error: ${res.status} ${res.statusText}`);
                }
                return res.text();
            }));

            let parsedEvents = [];
            calendarUrls.forEach((calendarUrl, index) => {
                const icsData = icsDataArray[index];
                const eventsFromCalendar = parseICS(icsData);
                
                // Extract calendar ID from the URL for constructing event URLs
                const calendarIdMatch = calendarUrl.match(/id=cal-([a-zA-Z0-9]+)/);
                const calendarId = calendarIdMatch ? calendarIdMatch[1] : null;
                
                // Add calendar context to each event
                eventsFromCalendar.forEach(event => {
                    event.calendarId = calendarId;
                    event.calendarUrl = calendarUrl;
                });
                
                parsedEvents = parsedEvents.concat(eventsFromCalendar);
            });

            const now = new Date();
            const futureEvents = parsedEvents.filter(event => event.start >= now);
            
            futureEvents.sort((a, b) => a.start - b.start);
            
            const geocodedEvents = await Promise.all(futureEvents.map(async (e) => {
                let coords = null;
                let displayLocation = e.location;
                
                if (e.geo && e.geo.lat && e.geo.lon && !isNaN(e.geo.lat) && !isNaN(e.geo.lon)) {
                    coords = [e.geo.lon, e.geo.lat];
                }
                else if (e.location && e.location.toLowerCase().includes('zo house')) {
                    coords = [-122.3943, 37.7776];
                    displayLocation = "Zo House, 300 4th St, San Francisco";
                } else if (e.location && (e.location.toLowerCase().includes('@ zo') || e.location.toLowerCase().includes('fifa @ zo'))) {
                    coords = [-122.3943, 37.7776];
                    displayLocation = "Zo House, 300 4th St, San Francisco";
                }
                else if (e.location && !e.location.startsWith('http')) {
                    coords = await geocodeLocation(e.location);
                }
                
                let host = e.organizer || 'TBA';
                if (!e.organizer && e.description) {
                    // Try to extract host from description patterns like "Hosted by X" or "Host: X"
                    const hostMatch = e.description.match(/(?:hosted by|host:|by)\s*([^\n\r]+)/i);
                    if (hostMatch) {
                        host = hostMatch[1].trim();
                    }
                }
                
                // Construct Luma URL - Look for real URL first
                let eventUrl = null;
                
                // Priority 1: Real Luma URL found in description
                if (e.realLumaUrl) {
                    eventUrl = e.realLumaUrl;
                }
                // Priority 2: Direct URL field
                else if (e.url && e.url.includes('lu.ma')) {
                    eventUrl = e.url;
                }
                // Priority 3: Try to construct from UID (backup)
                else if (e.uid) {
                    // Only try this as last resort since it gives wrong URLs
                    const uidPatterns = [
                        /evt-([a-zA-Z0-9]+)/,  // evt-XXXXX pattern
                    ];
                    
                    for (const pattern of uidPatterns) {
                        const match = e.uid.match(pattern);
                        if (match) {
                            const eventId = match[1];
                            eventUrl = `https://lu.ma/evt-${eventId}`;
                            break;
                        }
                    }
                }
                
                // Fallback: if we have calendar ID, link to calendar
                if (!eventUrl && e.calendarId) {
                    eventUrl = `https://lu.ma/calendar/cal-${e.calendarId}`;
                }
                
                return {
                    'Event Name': e.summary || 'Untitled Event',
                    'Host': host,
                    'Date & Time': e.start.toISOString(),
                    'Location': displayLocation || e.location,
                    'Latitude': coords ? coords[1] : null,
                    'Longitude': coords ? coords[0] : null,
                    'Event URL': eventUrl
                };
            }));

            allEvents = geocodedEvents.filter(e => e.Latitude && e.Longitude);
            addMarkersAndListItems(allEvents);

        } catch (error) {
            console.error('Error fetching or parsing calendar data:', error);
            const eventList = document.getElementById("event-list");
            eventList.innerHTML = '<li style="text-align: center; padding: 20px;">Unable to load events. Please try again later.</li>';
        }
    }

    fetchAndProcessCalendars();


    // =====================================
    // Search and Filter Logic
    // =====================================

    const searchInput = document.getElementById('search-input');
    searchInput.addEventListener('input', (e) => {
        const activeLocationFilter = document.querySelector('.location-filter-btn.active').dataset.location;
        filterEventsByLocation(activeLocationFilter, e.target.value);
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
            filterEventsByLocation(locationFilter, searchTerm);
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
        allEvents.forEach(event => {
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
