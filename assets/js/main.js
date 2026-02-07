
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
// Fetching a larger batch to categorize client-side
const NEWS_RSS_URL = 'https://news.google.com/rss/search?q=xAI+OR+Grok+OR+Claude+AI+OR+Gemini+AI+OR+OpenAI+OR+SpaceX+OR+Tesla+when:7d&hl=en-US&gl=US&ceid=US:en';
const PROXY_URL = 'https://api.allorigins.win/get?url=';

// Categories Configuration
const CATEGORIES = {
    'OpenAI': ['OpenAI', 'ChatGPT', 'Sam Altman', 'O1'],
    'Anthropic': ['Anthropic', 'Claude'],
    'Gemini': ['Gemini', 'Google DeepMind', 'Google AI'],
    'xAI': ['xAI', 'Grok', 'Elon Musk'],
    'Tesla': ['Tesla', 'Cybertruck', 'Optimus'],
    'SpaceX': ['SpaceX', 'Starship', 'Falcon']
};

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
        const items = Array.from(xmlDoc.querySelectorAll("item"));

        if (items.length > 0) {
            // Bucket items
            const bucketedNews = {
                'OpenAI': [],
                'Anthropic': [],
                'Gemini': [],
                'xAI': [],
                'Tesla': [],
                'SpaceX': [],
                'Other': [] 
            };

            items.forEach(item => {
                const title = item.querySelector("title").textContent;
                const link = item.querySelector("link").textContent;
                const pubDate = new Date(item.querySelector("pubDate").textContent);
                const dateStr = pubDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
                
                // Clean title
                const titleParts = title.split(' - ');
                let source = "Google News";
                let displayTitle = title;
                if (titleParts.length > 1) {
                    source = titleParts.pop();
                    displayTitle = titleParts.join(' - ');
                }

                const newsItem = { title: displayTitle, link, date: dateStr, source };

                // Categorize
                let assigned = false;
                for (const [category, keywords] of Object.entries(CATEGORIES)) {
                    if (keywords.some(k => title.includes(k) || title.includes(k.toLowerCase()))) {
                        // Limit per category to 5 items
                        if (bucketedNews[category].length < 5) {
                            bucketedNews[category].push(newsItem);
                        }
                        assigned = true;
                        break; // Stop after first match
                    }
                }
            });

            // Render
            let fullHTML = '';
            
            // Define display order
            const displayOrder = ['OpenAI', 'Anthropic', 'Gemini', 'xAI', 'Tesla', 'SpaceX'];

            displayOrder.forEach(cat => {
                const stories = bucketedNews[cat];
                if (stories.length === 0) return;

                let catHTML = `
                <div class="news-category">
                    <h3 class="category-title">${cat}</h3>
                    <div class="category-list">
                `;
                
                stories.forEach(story => {
                    catHTML += `
                        <div class="news-minimize-item">
                            <a href="${story.link}" target="_blank" class="news-link">${story.title}</a>
                            <span class="news-meta-mini">${story.source} • ${story.date}</span>
                        </div>
                    `;
                });

                catHTML += `</div></div>`;
                fullHTML += catHTML;
            });
            
            // Check if fullHTML is empty (no categories matched)
            if (!fullHTML) {
                 fullHTML = '<div class="info">No specific category updates found.</div>';
            }

            newsFeed.innerHTML = fullHTML;
            
        } else {
            newsFeed.innerHTML = '<div class="info">No recent updates found.</div>';
        }
    } catch (error) {
        console.error('News fetch error:', error);
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
