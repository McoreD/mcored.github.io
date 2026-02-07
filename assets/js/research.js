
// Configuration
const REPO_OWNER = 'McoreD';
const REPO_NAME = 'mcored.github.io';
const REPO_PATH = 'research';

// DOM Elements
const fileList = document.getElementById('file-list');

// Fetch Research Files
async function fetchResearchFiles() {
    try {
        const response = await fetch(`https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${REPO_PATH}`);
        
        if (!response.ok) {
             if (response.status === 403) throw new Error('Access Denied: Rate Limit Exceeded');
             throw new Error(`Data Retrieval Failed: ${response.status}`);
        }
        
        const data = await response.json();
        
        // Filter for HTML files, excluding index.html
        const htmlFiles = data.filter(file => file.name.endsWith('.html') && file.name.toLowerCase() !== 'index.html');

        // Sort files by name descending (newest items first assuming numbering scheme)
        htmlFiles.sort((a, b) => b.name.localeCompare(a.name));

        if (htmlFiles.length === 0) {
            fileList.innerHTML = '<div class="info">No archives found in current sector.</div>';
            return;
        }

        let listHTML = '';
        htmlFiles.forEach(file => {
            // Format name
            let displayName = file.name.replace('.html', '').replace(/[_-]/g, ' ');
            displayName = displayName.replace(/\b\w/g, c => c.toUpperCase());

            listHTML += `
                <div class="file-item">
                    <div class="file-icon">📄</div>
                    <div class="file-info">
                        <a href="${file.name}" class="file-link">${displayName}</a>
                        <span class="file-meta">SIZE: ${(file.size / 1024).toFixed(2)} KB</span>
                    </div>
                </div>
            `;
        });

        fileList.innerHTML = listHTML;

    } catch (error) {
        console.error('Research fetch error:', error);
        fileList.innerHTML = `<div class="error">ARCHIVE ACCESS ERROR: ${error.message}</div>`;
    }
}

// Initial Load
document.addEventListener('DOMContentLoaded', () => {
    fetchResearchFiles();
});
