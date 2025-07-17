# Zo House Events Map

This project is a fully interactive, real-time events map that displays upcoming events from multiple calendars on a 3D map interface. It's designed to be mobile-friendly and provides a seamless user experience for discovering and exploring events.

## Features

- **Interactive 3D Map**: Built with Mapbox GL JS, featuring a custom night-mode style with 3D buildings.
- **Live Event Data**: Fetches and parses iCalendar (.ics) feeds from multiple sources in real-time.
- **Geolocation**: Automatically centers the map on the user's location with a fallback to a default city.
- **Event Discovery**: Users can browse events through a list, map markers, or a full-screen calendar view.
- **Responsive Design**: Optimized for both desktop and mobile, with a custom mobile layout featuring a horizontal-scrolling event carousel.
- **Glassmorphism UI**: Modern, translucent "glass" effect on UI elements like popups and overlays.
- **Search and Filtering**: Instantly search for events by name or location.

## Technologies Used

- **Frontend**: HTML, CSS, JavaScript (no frameworks)
- **Mapping**: [Mapbox GL JS](https://docs.mapbox.com/mapbox-gl-js/api/)
- **Calendar Parsing**: Custom iCalendar (.ics) parser
- **CORS Proxy**: Utilizes a proxy to handle Cross-Origin Resource Sharing issues with calendar feeds.
- **Geocoding**: [Mapbox Geocoding API](https://docs.mapbox.com/api/search/geocoding/)

## How It Works

The application fetches event data from specified iCalendar URLs, parses the data to extract key details, and then geocodes the event locations to place markers on the map. The UI is dynamically updated to reflect the current and upcoming events, providing an intuitive and visually rich experience for users. 