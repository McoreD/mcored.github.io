
// Configuration
const CRYPTO_IDS = 'bitcoin,solana,avalanche-2,sui';
const CRYPTO_API_URL = `https://api.coingecko.com/api/v3/simple/price?ids=${CRYPTO_IDS}&vs_currencies=usd&include_24hr_change=true`;

// Hacker News API (Fallback or legacy, currently unused)
// const NEWS_API_URL = ...;

// DOM Elements
const cryptoTicker = document.getElementById('crypto-ticker');
const newsFeed = document.getElementById('news-feed');

// Utility: Format Currency
const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);
};

// Utility: Format Percentage
const formatPercentage = (value) => {
    const sign = value >= 0 ? '+' : '';
    return `${sign}${value.toFixed(2)}%`;
};

// Fetch Crypto Prices
async function fetchCryptoPrices() {
    try {
        const response = await fetch(CRYPTO_API_URL);
        if (!response.ok) throw new Error('Failed to fetch crypto prices');
        const data = await response.json();

        // Specific order: BTC, SOL, AVAX, SUI
        const order = ['bitcoin', 'solana', 'avalanche-2', 'sui'];
        const displayNames = {
            'bitcoin': 'BTC',
            'solana': 'SOL',
            'avalanche-2': 'AVAX',
            'sui': 'SUI'
        };

        let tickerHTML = '';
        order.forEach(id => {
            const coin = data[id];
            if (coin) {
                const changeClass = coin.usd_24h_change >= 0 ? 'positive' : 'negative';
                tickerHTML += `
                    <div class="ticker-item">
                        <span class="coin-name">${displayNames[id]}</span>
                        <span class="coin-price">${formatCurrency(coin.usd)}</span>
                        <span class="coin-change ${changeClass}">${formatPercentage(coin.usd_24h_change)}</span>
                    </div>
                `;
            }
        });

        cryptoTicker.innerHTML = tickerHTML;
    } catch (error) {
        console.error('Crypto fetch error:', error);
        cryptoTicker.innerHTML = '<div class="error">System Offline: Crypto Data Unavailable</div>';
    }
}

// Google News RSS via CORS Proxy
// Topics: xAI, Grok, Claude, Gemini, OpenAI, SpaceX, Tesla
const NEWS_RSS_URL = 'https://news.google.com/rss/search?q=xAI+OR+Grok+OR+Claude+AI+OR+Gemini+AI+OR+OpenAI+OR+SpaceX+OR+Tesla+when:7d&hl=en-US&gl=US&ceid=US:en';
const PROXY_URL = 'https://api.allorigins.win/get?url=';

// Fetch Tech News
async function fetchNews() {
    try {
        const response = await fetch(PROXY_URL + encodeURIComponent(NEWS_RSS_URL));
        if (!response.ok) throw new Error('Failed to fetch news proxy');
        
        const data = await response.json();
        if (!data.contents) throw new Error('Empty proxy response');

        // Parse XML
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(data.contents, "text/xml");
        const items = xmlDoc.querySelectorAll("item");

        if (items.length > 0) {
            let newsHTML = '';
            // Limit to 6 items
            const limit = 6;
            
            for (let i = 0; i < Math.min(items.length, limit); i++) {
                const item = items[i];
                const title = item.querySelector("title").textContent;
                const link = item.querySelector("link").textContent;
                const pubDate = new Date(item.querySelector("pubDate").textContent);
                const dateStr = pubDate.toLocaleDateString() + ' ' + pubDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                
                // Extract Source from title if possible (Google News usually formats as "Title - Source")
                let source = "Google News";
                const titleParts = title.split(' - ');
                let displayTitle = title;
                
                if (titleParts.length > 1) {
                    source = titleParts.pop(); // Last part is usually source
                    displayTitle = titleParts.join(' - ');
                }

                newsHTML += `
                    <div class="news-item">
                        <div class="news-meta">
                            <span class="news-source">${source}</span>
                            <span class="news-date">${dateStr}</span>
                        </div>
                        <a href="${link}" target="_blank" class="news-title">${displayTitle}</a>
                    </div>
                `;
            }
            newsFeed.innerHTML = newsHTML;
        } else {
            newsFeed.innerHTML = '<div class="info">No recent updates found for tracked sectors.</div>';
        }
    } catch (error) {
        console.error('News fetch error:', error);
        // Fallback to error message, or could implement HN fallback here
        newsFeed.innerHTML = `<div class="error">Comms Link Severed: ${error.message}</div>`;
    }
}

// Initial Load
document.addEventListener('DOMContentLoaded', () => {
    fetchCryptoPrices();
    fetchNews();

    // Refresh Crypto every 60 seconds
    setInterval(fetchCryptoPrices, 60000);
    
    // Refresh News every 5 minutes
    setInterval(fetchNews, 300000);
});
