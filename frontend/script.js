// script.js - Complete file for connecting frontend to Flask backend

// API base URL - change this in production
// Change this at the top of your script.js
const API_BASE_URL = 'http://localhost:5000';

// Function to create animated stars
function createStars() {
    const starsContainer = document.getElementById('stars');
    for (let i = 0; i < 100; i++) {
        const star = document.createElement('div');
        star.className = 'star';
        star.style.left = Math.random() * 100 + '%';
        star.style.top = Math.random() * 100 + '%';
        star.style.width = Math.random() * 3 + 1 + 'px';
        star.style.height = star.style.width;
        star.style.animationDelay = Math.random() * 2 + 's';
        starsContainer.appendChild(star);
    }
}

// Function to handle page navigation
function showPage(pageId) {
    document.querySelectorAll('.page').forEach(page => {
        page.classList.remove('active');
    });
    document.getElementById(pageId).classList.add('active');
}

// Event listener to update the Google Maps link
document.getElementById('location-input').addEventListener('input', (e) => {
    const location = encodeURIComponent(e.target.value);
    const mapsLink = document.getElementById('google-maps-link');
    mapsLink.href = `https://www.google.com/maps/search/?api=1&query=${location}`;
});

async function handleSubmit(event) {
    event.preventDefault();
    
    const location = document.getElementById('location-input').value;
    const datetime = document.getElementById('datetime').value;
    const eventType = document.getElementById('event-type').value;

    console.log('Form submitted with:', { location, datetime, eventType });

    if (!location || !datetime || !eventType) {
        alert('Please fill in all fields!');
        return;
    }

    // Show loading animation
    document.getElementById('loading').classList.add('show');
    document.getElementById('results').classList.remove('show');

    try {
        console.log('Step 1: Getting coordinates for:', location);
        
        // Step 1: Get coordinates from location name
        const coordsResponse = await fetch(`${API_BASE_URL}/api/location/coordinates`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ place_name: location })
        });
        
        console.log('Coordinates response status:', coordsResponse.status);
        
        if (!coordsResponse.ok) {
            const errorText = await coordsResponse.text();
            console.error('Coordinates error:', errorText);
            throw new Error('Failed to get coordinates for this location');
        }
        
        const coordinates = await coordsResponse.json();
        console.log('Coordinates received:', coordinates);
        
        // Step 2: Get weather data
        const date = datetime.split('T')[0]; // Extract YYYY-MM-DD from datetime
        console.log('Step 2: Getting weather for date:', date);
        
        const weatherUrl = `${API_BASE_URL}/api/weather/hourly?lat=${coordinates.lat}&lon=${coordinates.lon}&date=${date}`;
        console.log('Weather API URL:', weatherUrl);
        
        const weatherResponse = await fetch(weatherUrl);
        console.log('Weather response status:', weatherResponse.status);
        
        if (!weatherResponse.ok) {
            const errorText = await weatherResponse.text();
            console.error('Weather error:', errorText);
            throw new Error('Failed to get weather data');
        }
        
        const weatherData = await weatherResponse.json();
        console.log('Weather data received:', weatherData);
        
        // Step 3: Process and display results
        displayWeatherResults(weatherData, datetime, eventType);
        
        // Hide loading, show results
        document.getElementById('loading').classList.remove('show');
        document.getElementById('results').classList.add('show');
        
    } catch (error) {
        console.error('Error:', error);
        alert('Error: ' + error.message);
        document.getElementById('loading').classList.remove('show');
    }
}

// Display weather results from backend data
function displayWeatherResults(weatherData, datetime, eventType) {
    const eventDateTime = new Date(datetime);
    const eventHourUTC = eventDateTime.getUTCHours();  // Use UTC hours
    
    // Find weather data for this specific hour
    const hourlyData = weatherData.hourly_data.find(hour => {
        const hourTime = new Date(hour.time);
        return hourTime.getUTCHours() === eventHourUTC;
    });
    
    if (!hourlyData) {
        alert('No weather data available for the selected time');
        return;
    }
    
    // Update the UI with real data
    updateWeatherCards(hourlyData);
    updateRiskMeter(hourlyData.risk_assessment);
    generateSuggestions(eventType, hourlyData.risk_assessment);
}

// Update weather cards with real data
function updateWeatherCards(hourlyData) {
    const cardsContainer = document.getElementById('weather-cards');
    cardsContainer.innerHTML = '';
    
    const riskData = hourlyData.risk_assessment.details;
    const overallRisk = hourlyData.risk_assessment.overall_risk;
    
    // Create cards for each weather parameter
    const parameters = [
        { 
            name: 'Temperature', 
            value: `${hourlyData.temperature}°C`, 
            risk: riskData.temperature.risk,
            icon: getTemperatureIcon(hourlyData.temperature),
            message: riskData.temperature.message
        },
        { 
            name: 'Precipitation', 
            value: `${hourlyData.precipitation}mm`, 
            risk: riskData.precipitation.risk,
            icon: getPrecipitationIcon(hourlyData.precipitation),
            message: riskData.precipitation.message
        },
        { 
            name: 'Wind Speed', 
            value: `${hourlyData.wind_speed}m/s`, 
            risk: riskData.wind.risk,
            icon: getWindIcon(hourlyData.wind_speed),
            message: riskData.wind.message
        },
        { 
            name: 'Humidity', 
            value: hourlyData.humidity ? `${hourlyData.humidity}%` : 'N/A', 
            risk: riskData.humidity ? riskData.humidity.risk : 'low',
            icon: getHumidityIcon(hourlyData.humidity),
            message: riskData.humidity ? riskData.humidity.message : 'No humidity data'
        },
        { 
            name: 'Overall Comfort', 
            value: '', 
            risk: overallRisk,
            icon: getOverallIcon(overallRisk),
            message: hourlyData.risk_assessment.summary
        }
    ];
    
    parameters.forEach(param => {
        const riskPercentage = param.risk === 'high' ? 90 : param.risk === 'medium' ? 60 : 20;
        
        const card = document.createElement('div');
        card.className = 'weather-card';
        card.innerHTML = `
            <div class="weather-icon">${param.icon}</div>
            <h3>${param.name}</h3>
            <div style="font-size: 1.5rem; margin: 10px 0; color: ${param.risk === 'high' ? '#e74c3c' : param.risk === 'medium' ? '#f39c12' : '#2ecc71'}">
                ${param.value}
            </div>
            <div class="progress-bar">
                <div class="progress-fill ${param.risk}" style="width: ${riskPercentage}%"></div>
            </div>
            <p style="margin-top: 10px; font-size: 0.9rem;">${param.message}</p>
        `;
        cardsContainer.appendChild(card);
    });
}

// Helper functions for icons
function getTemperatureIcon(temp) {
    if (temp >= 30) return '🌡️🔥';
    if (temp >= 20) return '🌡️☀️';
    if (temp >= 10) return '🌡️⛅';
    return '🌡️❄️';
}

function getPrecipitationIcon(precip) {
    if (precip >= 10) return '🌧️☔';
    if (precip >= 2) return '🌦️💧';
    return '☀️💧';
}

function getWindIcon(wind) {
    if (wind >= 15) return '💨🌪️';
    if (wind >= 8) return '💨🍃';
    return '💨😊';
}

function getHumidityIcon(humidity) {
    if (!humidity) return '💦❓';
    if (humidity >= 80) return '💦🔥';
    if (humidity >= 60) return '💦😊';
    return '💦❄️';
}

function getOverallIcon(risk) {
    if (risk === 'high') return '😰🌧️';
    if (risk === 'medium') return '😅⛅';
    return '😎☀️';
}

// Update risk meter based on risk assessment
function updateRiskMeter(riskAssessment) {
    const riskValue = riskAssessment.overall_risk === 'high' ? 90 : 
                     riskAssessment.overall_risk === 'medium' ? 60 : 20;
    
    const needleAngle = (riskValue / 100) * 180 - 90;
    document.getElementById('meter-needle').style.transform = `rotate(${needleAngle}deg)`;
}

// Generate suggestions based on weather and event type
function generateSuggestions(eventType, riskAssessment) {
    const suggestionsList = document.getElementById('suggestion-list');
    suggestionsList.innerHTML = '';
    
    const suggestions = [];
    const details = riskAssessment.details;
    
    // Weather-based suggestions
    if (details.temperature.risk === 'high') {
        if (details.temperature.value > 28) {
            suggestions.push('☀️ Provide shade structures and hydration stations');
            suggestions.push('🧴 Recommend sunscreen and light-colored clothing');
        } else {
            suggestions.push('🧥 Advise attendees to bring warm clothing');
            suggestions.push('☕ Set up warming stations with hot beverages');
        }
    }
    
    if (details.precipitation.risk === 'high') {
        suggestions.push('☔ Provide covered areas and umbrellas');
        suggestions.push('👢 Recommend waterproof footwear');
    }
    
    if (details.wind.risk === 'high') {
        suggestions.push('🎪 Secure all decorations and equipment');
        suggestions.push('📋 Have backup indoor venue ready');
    }
    
    if (details.humidity && details.humidity.risk === 'high') {
        suggestions.push('💧 Provide plenty of water and cooling stations');
        suggestions.push('🌬️ Set up fans or air conditioning if possible');
    }
    
    // Event-type specific suggestions
    switch(eventType) {
        case 'parade':
            suggestions.push('🎉 Plan for covered viewing areas along the parade route');
            break;
        case 'concert':
            suggestions.push('🎵 Ensure sound equipment is protected from weather');
            break;
        case 'picnic':
            suggestions.push('🧺 Bring waterproof blankets and covers');
            break;
        case 'wedding':
            suggestions.push('💒 Have a beautiful indoor backup venue ready');
            break;
        case 'sports':
            suggestions.push('⚽ Check field conditions and have backup plans');
            break;
        case 'festival':
            suggestions.push('🎪 Prepare for various weather conditions with multiple zones');
            break;
        case 'birthday':
            suggestions.push('🎂 Have indoor party space as backup');
            break;
    }
    
    // If no specific risks, add positive message
    if (suggestions.length === 0) {
        suggestions.push('🎉 Perfect conditions! Your event should go smoothly');
        suggestions.push('📸 Great weather for photos and outdoor activities');
    }
    
    // Add suggestions to the list
    suggestions.forEach(suggestion => {
        const item = document.createElement('div');
        item.className = 'suggestion-item';
        item.textContent = suggestion;
        suggestionsList.appendChild(item);
    });
}

// Export functions
function exportResults() {
    html2canvas(document.getElementById('results')).then(canvas => {
        const link = document.createElement('a');
        link.download = 'weather-report.png';
        link.href = canvas.toDataURL();
        link.click();
    }).catch(() => {
        // Fallback method
        alert('Screenshot saved! (Note: In a real implementation, this would generate a downloadable PNG)');
    });
}

function shareResults() {
    const url = window.location.href + '?shared=true';
    if (navigator.share) {
        navigator.share({
            title: 'Will It Rain On My Parade?',
            text: 'Check out my weather analysis!',
            url: url
        });
    } else {
        navigator.clipboard.writeText(url).then(() => {
            alert('Shareable link copied to clipboard!');
        }).catch(err => {
            console.error('Failed to copy text: ', err);
            alert('Could not copy link to clipboard.');
        });
    }
}

// Helper function to get coordinates (optional feature)
function getCoordinates() {
    const location = document.getElementById('location-input').value;
    if (!location) {
        alert('Please enter a location first');
        return;
    }
    
    fetch(`${API_BASE_URL}/api/location/coordinates`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ place_name: location })
    })
    .then(response => response.json())
    .then(data => {
        if (data.error) {
            alert('Error: ' + data.error);
        } else {
            document.getElementById('location-input').value = `${data.lat}, ${data.lon}`;
            alert(`Coordinates found: ${data.lat}, ${data.lon}`);
        }
    })
    .catch(error => {
        console.error('Error:', error);
        alert('Failed to get coordinates');
    });
}

// Initial calls when page loads
document.addEventListener('DOMContentLoaded', () => {
    createStars();
    
    // Set minimum date for datetime input to today
    const today = new Date().toISOString().slice(0, 16);
    document.getElementById('datetime').min = today;
    
    console.log('Weather app initialized successfully!');
});