// script.js - Final with hourly cards + highlight + expand/collapse

const API_BASE_URL = 'http://localhost:5000';

// Stars background
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

// Page switcher
function showPage(pageId) {
    document.querySelectorAll('.page').forEach(page => page.classList.remove('active'));
    document.getElementById(pageId).classList.add('active');
}

// ------------------------------------
// Location Suggestion Feature
// ------------------------------------
document.getElementById('location-input').addEventListener('input', debounce(async (e) => {
    const query = e.target.value.trim();
    const suggestionsBox = document.getElementById('location-suggestions');

    if (query.length < 3) {
        suggestionsBox.classList.remove('visible');
        return;
    }

    try {
        const response = await fetch(`${API_BASE_URL}/api/location/search?query=${encodeURIComponent(query)}`);
        if (!response.ok) throw new Error('Failed to fetch suggestions');
        const suggestions = await response.json();

        suggestionsBox.innerHTML = '';
        if (suggestions.length > 0) {
            suggestions.forEach(item => {
                const suggestionDiv = document.createElement('div');
                suggestionDiv.className = 'suggestion-item-loc';
                suggestionDiv.textContent = item.place_name;
                suggestionDiv.addEventListener('click', () => {
                    document.getElementById('location-input').value = item.place_name;
                    suggestionsBox.classList.remove('visible');
                });
                suggestionsBox.appendChild(suggestionDiv);
            });
            suggestionsBox.classList.add('visible');
        } else {
            suggestionsBox.classList.remove('visible');
        }
    } catch (error) {
        console.error('Error fetching suggestions:', error);
        suggestionsBox.classList.remove('visible');
    }
}, 300));

document.addEventListener('click', (e) => {
    if (!e.target.closest('.form-group')) {
        document.getElementById('location-suggestions').classList.remove('visible');
    }
});

function debounce(func, delay) {
    let timeoutId;
    return function(...args) {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => func.apply(this, args), delay);
    };
}

// ------------------------------------

async function handleSubmit(event) {
    event.preventDefault();

    const location = document.getElementById('location-input').value;
    const datetime = document.getElementById('datetime').value;
    const eventType = document.getElementById('event-type').value;

    if (!location || !datetime || !eventType) {
        alert('Please fill in all fields!');
        return;
    }

    document.getElementById('loading').classList.add('show');
    document.getElementById('results').classList.remove('show');

    try {
        const coordsResponse = await fetch(`${API_BASE_URL}/api/location/coordinates`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ place_name: location })
        });

        if (!coordsResponse.ok) throw new Error('Failed to get coordinates');
        const coordinates = await coordsResponse.json();

        const date = datetime.split('T')[0];
        const weatherUrl = `${API_BASE_URL}/api/weather/hourly?lat=${coordinates.lat}&lon=${coordinates.lon}&date=${date}`;
        const weatherResponse = await fetch(weatherUrl);
        if (!weatherResponse.ok) throw new Error('Failed to get weather data');
        const weatherData = await weatherResponse.json();

        displayWeatherResults(weatherData, datetime, eventType);

    } catch (error) {
        console.error('Error:', error);
        alert('Error: ' + error.message);
        document.getElementById('loading').classList.remove('show');
    }
}

// -----------------------
// Cards rendering
// -----------------------

let expandedCard = null;

function displayWeatherResults(weatherData, datetime, eventType) {
    const cardsContainer = document.getElementById('weather-cards');
    cardsContainer.innerHTML = '';

    const hours = Array.isArray(weatherData.hourly_data) ? weatherData.hourly_data : [];
    if (hours.length === 0) {
        alert('No hourly weather data available');
        return;
    }

    hours.sort((a, b) => new Date(a.time) - new Date(b.time));

    const eventDateTime = new Date(datetime);
    const eventHourUTC = eventDateTime.getUTCHours();

    hours.forEach(h => {
        const isSelected = (new Date(h.time).getUTCHours() === eventHourUTC);
        const card = createHourlyCard(h, isSelected);
        cardsContainer.appendChild(card);
    });

    const selectedHourData = hours.find(h => new Date(h.time).getUTCHours() === eventHourUTC);
    if (selectedHourData && selectedHourData.risk_assessment) {
        generateSuggestions(eventType, selectedHourData.risk_assessment);
    }

    document.getElementById('loading').classList.remove('show');
    document.getElementById('results').classList.add('show');
}

function createHourlyCard(hourlyData, isSelected = false) {
    const risk = hourlyData?.risk_assessment?.overall_risk || 'low';
    const riskPct = risk === 'high' ? 90 : risk === 'medium' ? 60 : 20;
    const localTime = new Date(hourlyData.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    const card = document.createElement('div');
    card.className = 'weather-card' + (isSelected ? ' highlight-hour' : '');
    card.innerHTML = getCompactCardHTML(hourlyData, localTime, risk, riskPct);

    card._data = { data: hourlyData, localTime, risk, riskPct };
    card.addEventListener('click', () => toggleCardExpand(card));

    return card;
}

// Compact card view
function getCompactCardHTML(hourlyData, localTime, risk, riskPct) {
    return `
        <div class="weather-icon">${getConditionIcon(hourlyData.condition)}</div>
        <h3>${localTime}</h3>
        <p style="font-size:1.05rem; color:#00ffff; margin-bottom:8px;">${hourlyData.condition || '—'}</p>
        <div style="margin:8px 0; line-height:1.6;">
            🌡️ ${hourlyData.temperature}°C | 🌧️ ${hourlyData.precipitation}mm | 💨 ${hourlyData.wind_speed}m/s
        </div>
        <div class="progress-bar" title="Overall risk">
            <div class="progress-fill ${risk}" style="width:${riskPct}%"></div>
        </div>
    `;
}

// Expanded card view
function getExpandedCardHTML(hourlyData, localTime, risk, riskPct) {
    return `
        <div class="weather-icon" style="font-size:4rem;">${getConditionIcon(hourlyData.condition)}</div>
        <h2 style="color:#00ffff;">${localTime} — ${hourlyData.condition || '—'}</h2>
        <div style="margin:12px 0; font-size:1.1rem; line-height:1.8;">
            🌡️ Temperature: <strong>${hourlyData.temperature}°C</strong><br>
            🌧️ Precipitation: <strong>${hourlyData.precipitation} mm</strong><br>
            💨 Wind Speed: <strong>${hourlyData.wind_speed} m/s</strong><br>
            💧 Humidity: <strong>${hourlyData.humidity ?? 'N/A'} %</strong><br>
        </div>
        <div class="progress-bar" title="Overall risk">
            <div class="progress-fill ${risk}" style="width:${riskPct}%"></div>
        </div>
        <p style="margin-top:12px;">Risk: <strong>${risk}</strong></p>
        <p style="margin-top:8px; font-size:0.9rem; opacity:0.8;">${hourlyData.risk_assessment?.summary || ''}</p>
    `;
}

// Toggle expand/collapse
function toggleCardExpand(card) {
    const { data, localTime, risk, riskPct } = card._data;

    if (expandedCard && expandedCard !== card) {
        // collapse previously expanded
        const prev = expandedCard._data;
        expandedCard.innerHTML = getCompactCardHTML(prev.data, prev.localTime, prev.risk, prev.riskPct);
        expandedCard.classList.remove('expanded');
        expandedCard = null;
    }

    if (card.classList.contains('expanded')) {
        card.innerHTML = getCompactCardHTML(data, localTime, risk, riskPct);
        card.classList.remove('expanded');
        expandedCard = null;
    } else {
        card.innerHTML = getExpandedCardHTML(data, localTime, risk, riskPct);
        card.classList.add('expanded');
        expandedCard = card;
    }
}

// -----------------------
// Helpers
// -----------------------

function getConditionIcon(condition) {
    if (!condition) return '🌤️';
    const c = condition.toLowerCase();
    if (c.includes('storm')) return '⛈️';
    if (c.includes('rain')) return '🌧️';
    if (c.includes('cloud')) return '☁️';
    if (c.includes('sun')) return '☀️';
    if (c.includes('wind')) return '💨';
    return '🌤️';
}

function generateSuggestions(eventType, riskAssessment) {
    const suggestionsList = document.getElementById('suggestion-list');
    suggestionsList.innerHTML = '';

    const suggestions = [];
    const details = riskAssessment.details;

    if (details.temperature.risk === 'high') {
        if (details.temperature.value > 28) {
            suggestions.push('☀️ Provide shade and hydration stations');
            suggestions.push('🧴 Recommend sunscreen and light clothing');
        } else {
            suggestions.push('🧥 Advise attendees to bring warm clothing');
            suggestions.push('☕ Offer hot beverages');
        }
    }
    if (details.precipitation.risk === 'high') {
        suggestions.push('☔ Provide covered areas and umbrellas');
    }
    if (details.wind.risk === 'high') {
        suggestions.push('🎪 Secure decorations and equipment');
    }
    if (details.humidity && details.humidity.risk === 'high') {
        suggestions.push('💧 Provide water and cooling stations');
    }

    switch(eventType) {
        case 'parade': suggestions.push('🎉 Plan covered viewing areas'); break;
        case 'concert': suggestions.push('🎵 Protect sound equipment'); break;
        case 'picnic': suggestions.push('🧺 Bring waterproof blankets'); break;
        case 'wedding': suggestions.push('💒 Have indoor backup venue'); break;
        case 'sports': suggestions.push('⚽ Check field conditions'); break;
        case 'festival': suggestions.push('🎪 Prepare multiple zones'); break;
        case 'birthday': suggestions.push('🎂 Indoor space as backup'); break;
    }

    if (suggestions.length === 0) {
        suggestions.push('🎉 Perfect conditions! Your event should go smoothly');
    }

    suggestions.forEach(suggestion => {
        const item = document.createElement('div');
        item.className = 'suggestion-item';
        item.textContent = suggestion;
        suggestionsList.appendChild(item);
    });
}

// Export/share
function exportResults() {
    html2canvas(document.getElementById('results')).then(canvas => {
        const link = document.createElement('a');
        link.download = 'weather-report.png';
        link.href = canvas.toDataURL();
        link.click();
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
            alert('Shareable link copied!');
        });
    }
}

// Init
document.addEventListener('DOMContentLoaded', () => {
    createStars();
    const today = new Date().toISOString().slice(0, 16);
    document.getElementById('datetime').min = today;
});
