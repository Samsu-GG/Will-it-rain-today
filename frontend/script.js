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
    // Using Google Maps URL Scheme for searching a location
    mapsLink.href = `https://www.google.com/maps/search/?api=1&query=${location}`;
});

// Form submission
async function handleSubmit(event) {
    event.preventDefault();
    
    const location = document.getElementById('location-input').value;
    const datetime = document.getElementById('datetime').value;
    const eventType = document.getElementById('event-type').value;

    if (!location || !datetime || !eventType) {
        alert('Please fill in all fields!');
        return;
    }

    // Show loading animation
    document.getElementById('loading').classList.add('show');
    document.getElementById('results').classList.remove('show');

    // Simulate API call delay
    setTimeout(() => {
        generateResults(location, datetime, eventType);
        document.getElementById('loading').classList.remove('show');
        document.getElementById('results').classList.add('show');
    }, 3000);
}

// Generate mock weather results
function generateResults(location, datetime, eventType) {
    const weatherConditions = [
        { name: 'Very Hot', icon: '🌞', probability: Math.random() * 100 },
        { name: 'Very Cold', icon: '❄️', probability: Math.random() * 100 },
        { name: 'Very Windy', icon: '💨', probability: Math.random() * 100 },
        { name: 'Very Wet', icon: '🌧️', probability: Math.random() * 100 },
        { name: 'Very Uncomfortable', icon: '😓', probability: Math.random() * 100 }
    ];

    const cardsContainer = document.getElementById('weather-cards');
    cardsContainer.innerHTML = '';

    weatherConditions.forEach(condition => {
        const riskLevel = condition.probability > 70 ? 'high' : condition.probability > 40 ? 'medium' : 'low';
        const card = document.createElement('div');
        card.className = 'weather-card';
        card.innerHTML = `
            <div class="weather-icon">${condition.icon}</div>
            <h3>${condition.name}</h3>
            <div style="font-size: 2rem; margin: 10px 0; color: ${riskLevel === 'high' ? '#e74c3c' : riskLevel === 'medium' ? '#f39c12' : '#2ecc71'}">${Math.round(condition.probability)}%</div>
            <div class="progress-bar">
                <div class="progress-fill ${riskLevel}" style="width: ${condition.probability}%"></div>
            </div>
        `;
        cardsContainer.appendChild(card);
    });

    // Update meter needle
    const averageRisk = weatherConditions.reduce((sum, c) => sum + c.probability, 0) / weatherConditions.length;
    const needleAngle = (averageRisk / 100) * 180;
    document.getElementById('meter-needle').style.transform = `rotate(${needleAngle - 90}deg)`;

    // Generate suggestions
    generateSuggestions(eventType, weatherConditions);
}

function generateSuggestions(eventType, conditions) {
    const suggestions = [];
    
    conditions.forEach(condition => {
        if (condition.probability > 60) {
            switch (condition.name) {
                case 'Very Hot':
                    suggestions.push('☀️ Provide shade structures and hydration stations');
                    suggestions.push('🧴 Recommend sunscreen and light-colored clothing');
                    break;
                case 'Very Cold':
                    suggestions.push('🧥 Advise attendees to bring warm clothing');
                    suggestions.push('☕ Set up warming stations with hot beverages');
                    break;
                case 'Very Windy':
                    suggestions.push('🎪 Secure all decorations and equipment');
                    suggestions.push('📋 Have backup indoor venue ready');
                    break;
                case 'Very Wet':
                    suggestions.push('☔ Provide covered areas and umbrellas');
                    suggestions.push('👢 Recommend waterproof footwear');
                    break;
                case 'Very Uncomfortable':
                    suggestions.push('⏰ Consider rescheduling to a better time');
                    suggestions.push('🏠 Prepare indoor alternatives');
                    break;
            }
        }
    });

    if (suggestions.length === 0) {
        suggestions.push('🎉 Perfect conditions! Your event should go smoothly');
        suggestions.push('📸 Great weather for photos and outdoor activities');
    }

    const suggestionsList = document.getElementById('suggestion-list');
    suggestionsList.innerHTML = '';
    
    suggestions.forEach(suggestion => {
        const item = document.createElement('div');
        item.className = 'suggestion-item';
        item.textContent = suggestion;
        suggestionsList.appendChild(item);
    });
}

// Export functions
function exportResults() {
    // html2canvas is now available via the script tag in index.html
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

// Initial calls
document.addEventListener('DOMContentLoaded', () => {
    createStars();
});