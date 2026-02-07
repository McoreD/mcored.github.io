
// Configuration
const CRYPTO_IDS = 'bitcoin,solana,avalanche-2,sui';
const CRYPTO_API_URL = `https://api.coingecko.com/api/v3/simple/price?ids=${CRYPTO_IDS}&vs_currencies=usd&include_24hr_change=true`;

// Hacker News API for Tech News
// Using Algolia Search API for better filtering
const NEWS_KEYWORDS = 'SpaceX OR Tesla OR xAI OR Grok OR Claude OR Gemini OR OpenAI';
const NEWS_API_URL = `https://hn.algolia.com/api/v1/search_by_date?query=${encodeURIComponent(NEWS_KEYWORDS)}&tags=story&hitsPerPage=10`;

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

// Fetch Tech News
async function fetchNews() {
    try {
        const response = await fetch(NEWS_API_URL);
        if (!response.ok) throw new Error('Failed to fetch news');
        const data = await response.json();

        if (data.hits && data.hits.length > 0) {
            let newsHTML = '';
            // Limit to 6 items for layout balance
            const items = data.hits.slice(0, 6);
            
            items.forEach(story => {
                if (!story.title) return; // Skip if no title
                
                const date = new Date(story.created_at).toLocaleDateString();
                // Prioritize external URL, fallback to HN discussion if necessary
                const isExternal = !!story.url;
                const link = story.url || `https://news.ycombinator.com/item?id=${story.objectID}`;
                
                // Extract domain for display if external
                let domain = '';
                if (isExternal) {
                    try {
                        domain = new URL(story.url).hostname.replace('www.', '');
                    } catch (e) {}
                } else {
                    domain = 'news.ycombinator.com';
                }

                newsHTML += `
                    <div class="news-item">
                        <div class="news-meta">
                            <span class="news-source">${domain}</span>
                            <span class="news-date">${date}</span>
                        </div>
                        <a href="${link}" target="_blank" class="news-title">${story.title}</a>
                    </div>
                `;
            });
            newsFeed.innerHTML = newsHTML;
        } else {
            newsFeed.innerHTML = '<div class="info">No recent updates found for tracked sectors.</div>';
        }
    } catch (error) {
        console.error('News fetch error:', error);
        newsFeed.innerHTML = '<div class="error">Comms Link Severed: News Feed Unavailable</div>';
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
