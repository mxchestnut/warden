import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from '@google/generative-ai';

// Lazy load API key to allow it to be set by server.ts first
function getApiKey(): string {
  const apiKey = process.env.GEMINI_API_KEY || '';
  if (!apiKey) {
    throw new Error('Gemini API key not configured');
  }
  return apiKey;
}

export async function askGemini(question: string, context?: string): Promise<string> {
  const apiKey = getApiKey();
  const genAI = new GoogleGenerativeAI(apiKey);

  try {
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.0-flash-exp',
      safetySettings: [
        { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
        { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
        { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
        { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
      ],
    });

    const prompt = context
      ? `Context: ${context}\n\nQuestion: ${question}\n\nProvide a concise, helpful answer for a Pathfinder 1st Edition (1e) player or GM. ONLY use information from Pathfinder 1e published by Paizo. Do NOT include D&D 5e, D&D 3.5e, or information from other game systems unless explicitly asked.`
      : `Question: ${question}\n\nProvide a concise, helpful answer for a Pathfinder 1st Edition (1e) player or GM. ONLY use information from Pathfinder 1e published by Paizo. Do NOT include D&D 5e, D&D 3.5e, or information from other game systems unless explicitly asked.`;

    const result = await model.generateContent(prompt);
    const response = result.response;
    return response.text();
  } catch (error) {
    console.error('Error calling Gemini API:', error);
    throw error;
  }
}

export async function summarizeSession(messages: string[]): Promise<string> {
  const apiKey = getApiKey();
  const genAI = new GoogleGenerativeAI(apiKey);

  try {
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.0-flash-exp',
      safetySettings: [
        { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
        { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
        { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
        { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
      ],
    });

    const messagesText = messages.join('\n');
    const prompt = `Summarize this D&D/Pathfinder session in 2-3 paragraphs. Focus on key events, character actions, and story developments:\n\n${messagesText}`;

    const result = await model.generateContent(prompt);
    const response = result.response;
    return response.text();
  } catch (error) {
    console.error('Error summarizing session:', error);
    throw error;
  }
}

export async function learnFromUrl(url: string): Promise<{ question: string; answer: string }[]> {
  const axios = require('axios');
  const cheerio = require('cheerio');

  try {
    console.log(`Learning from URL: ${url}`);
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      },
      timeout: 15000
    });

    const $ = cheerio.load(response.data);
    const entries: { question: string; answer: string }[] = [];

    // d20pfsrd.com specific parsing
    if (url.includes('d20pfsrd.com')) {
      // Get page title as the main topic
      const pageTitle = $('h1').first().text().trim() || $('title').text().split('–')[0].trim();

      // Extract main content from article body
      const mainContent = $('.article-content, .sites-canvas-main, #sites-canvas-main-content').first();

      if (mainContent.length > 0) {
        // Remove scripts, ads, and unwanted elements
        mainContent.find('script, style, .adsbygoogle, [id*="nitropay"], [class*="ad-"], iframe').remove();

        // Convert common HTML elements to text with line breaks
        mainContent.find('h1, h2, h3, h4, h5, h6').after('\n\n');
        mainContent.find('p, div, br').after('\n');
        mainContent.find('li').before('• ').after('\n');

        // Get the full text content, cleaning it up
        let fullText = mainContent.text()
          .split('\n')  // Split into lines
          .map((line: string) => line.trim())  // Trim each line
          .filter((line: string) => line.length > 0)  // Remove empty lines
          .join('\n')  // Rejoin with single newlines
          .replace(/\n{3,}/g, '\n\n')  // Limit to max 2 consecutive newlines
          .replace(/ognCreateVideoAdSpotOutstream\([^)]*\);?/g, '')  // Remove ad scripts
          .replace(/Section 15: Copyright Notice.*$/i, '')  // Remove copyright footer
          .trim();

        // Split into chunks if content is very long (max 2000 chars per entry)
        if (fullText.length > 2000) {
          fullText = fullText.substring(0, 2000) + '...';
        }

        if (fullText.length > 100) {
          entries.push({
            question: `What is ${pageTitle}?`,
            answer: fullText
          });
        }
      }

      // Extract tables only if they contain useful stats (for spells, items, etc.)
      // Skip navigation tables and generic page structure
      $('table').each((_: number, table: any) => {
        const tableText = $(table).text().replace(/\s+/g, ' ').trim();
        // Only include tables with stat-like keywords and reasonable length
        const hasStatKeywords = /\b(level|school|casting time|range|duration|saving throw|spell resistance|components|cost|weight|damage|AC|speed|HD)\b/i.test(tableText);
        if (hasStatKeywords && tableText.length > 100 && tableText.length < 1500) {
          entries.push({
            question: `${pageTitle} (stats)`,
            answer: tableText
          });
        }
      });
    } else {
      // Generic parsing for other sites
      const pageTitle = $('h1').first().text().trim() || $('title').text().trim();
      const paragraphs = $('p').map((_: number, el: any) => $(el).text().trim()).get();
      const content = paragraphs.join('\n\n').substring(0, 2000);

      if (content.length > 100) {
        entries.push({
          question: `What is ${pageTitle}?`,
          answer: content
        });
      }
    }

    console.log(`Extracted ${entries.length} entries from ${url}`);
    return entries;
  } catch (error: any) {
    console.error('Error learning from URL:', error);
    console.error('Error details:', {
      message: error.message,
      code: error.code,
      response: error.response?.status,
      url: url
    });
    return [];
  }
}
