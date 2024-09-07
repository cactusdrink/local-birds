document.addEventListener('DOMContentLoaded', function () {
    const apiKey = 'gt2dr36kqnrp'; // Replace with your eBird API key
    const locationApiKey = '48634d9d616d4764960649c55088e72f'; // Replace with your OpenCage API key
    const speciesDiv = document.getElementById('species');
    const locationDiv = document.getElementById('location');
  
    // Function to get location name from coordinates using OpenCage Geocoding API
    async function getLocationNameFromCoords(lat, lng) {
      const response = await fetch(`https://api.opencagedata.com/geocode/v1/json?q=${lat}+${lng}&key=${locationApiKey}`);
  
      if (!response.ok) {
        throw new Error('Failed to fetch location name');
      }
  
      const data = await response.json();
      if (data.results.length === 0) {
        return 'Unknown location';
      }
  
      return data.results[0].formatted;
    }
  
    // Function to fetch bird sightings based on coordinates
    async function fetchBirdSightings(lat, lng) {
      const radius = 50; // Define the radius for the search (e.g., 50 km)
      const response = await fetch(`https://api.ebird.org/v2/data/obs/geo/recent/notable?lat=${lat}&lng=${lng}&radius=${radius}`, {
        headers: {
          'x-ebirdapitoken': apiKey
        }
      });
  
      if (!response.ok) {
        throw new Error('Network response was not ok.');
      }
  
      return response.json();
    }
  
    // Function to calculate distance between two coordinates
    function calculateDistance(lat1, lng1, lat2, lng2) {
      const R = 6371; // Radius of the Earth in km
      const dLat = (lat2 - lat1) * (Math.PI / 180);
      const dLng = (lng2 - lng1) * (Math.PI / 180);
      const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
                Math.sin(dLng / 2) * Math.sin(dLng / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      return R * c; // Distance in km
    }
  
    // Automatically detect the user's coordinates
    navigator.geolocation.getCurrentPosition(async function (position) {
      const { latitude, longitude } = position.coords;
  
      try {
        // Get the named location based on coordinates
        const location = await getLocationNameFromCoords(latitude, longitude);
        locationDiv.innerHTML = `<p></p>`;
  
        // Fetch nearby bird sightings
        const data = await fetchBirdSightings(latitude, longitude);
  
        // Group sightings by species
        const speciesMap = {};
        for (const obs of data) {
          if (!speciesMap[obs.speciesCode]) {
            speciesMap[obs.speciesCode] = {
              ...obs,
              distance: calculateDistance(latitude, longitude, obs.lat, obs.lng)
            };
          }
        }
  
        // Convert the speciesMap to an array and sort by distance
        const sortedData = Object.values(speciesMap).sort((a, b) => a.distance - b.distance);
  
        // Fetch images for the top 3 closest bird species
        const limitedData = sortedData.slice(0, 3); // Limit to 3 closest unique bird species
        const birdItems = await Promise.all(limitedData.map(async obs => {
          return `
            <div class="bird-item">
              <strong>${obs.comName}</strong><br>
              Observed on: ${obs.obsDt}<br>
              Location: ${obs.locName}<br>
              Distance: ${obs.distance.toFixed(2)} km<br>
            </div>
          `;
        }));
  
        // Display data
        if (birdItems.length === 0) {
          speciesDiv.innerHTML = '<p>No recent bird sightings found.</p>';
        } else {
          speciesDiv.innerHTML = `<h2>Recent Bird Sightings near ${location}</h2>` + birdItems.join('');
        }
      } catch (error) {
        speciesDiv.innerHTML = `<p>Error fetching bird species data: ${error.message}</p>`;
      }
    }, function (error) {
      locationDiv.innerHTML = `<p>Error detecting location: ${error.message}</p>`;
    });
  });
  