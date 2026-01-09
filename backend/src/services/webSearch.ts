import axios from 'axios';
import * as cheerio from 'cheerio';

/**
 * Performs a simple Google search and extracts the first snippet
 * Note: This is a basic implementation. For production, consider using Google Custom Search API
 */
export async function searchGoogle(query: string): Promise<{ title: string; snippet: string; url: string } | null> {
  try {
    console.log(`Attempting Google search for: "${query}"`);
    const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(query)}`;
    const response = await axios.get(searchUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Accept-Encoding': 'gzip, deflate',
        'DNT': '1',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1'
      },
      timeout: 10000
    });

    const $ = cheerio.load(response.data);

    // Try multiple selectors for search results
    let firstResult = $('.g').first();
    if (firstResult.length === 0) {
      firstResult = $('div[data-sokoban-container]').first();
    }
    if (firstResult.length === 0) {
      firstResult = $('[class*="result"]').first();
    }

    if (firstResult.length > 0) {
      const title = firstResult.find('h3').first().text() || firstResult.find('[class*="title"]').first().text();
      const snippet = firstResult.find('.VwiC3b, .IsZvec, [class*="snippet"], .st').first().text();
      const url = firstResult.find('a').first().attr('href') || '';

      console.log(`Google search result found - Title: ${title.substring(0, 50)}, Snippet length: ${snippet.length}`);

      if (title && snippet && snippet.length > 30) {
        return { title, snippet, url };
      } else {
        console.log('Google result incomplete - title or snippet missing/too short');
      }
    } else {
      console.log('No Google search results found in page');
    }

    return null;
  } catch (error: any) {
    console.error('Google search error:', error.message);
    return null;
  }
}
