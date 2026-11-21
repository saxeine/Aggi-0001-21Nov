/**
 * Pure prompt-building logic for the tool suite.
 *
 * Extracted from App.tsx so the tool prompt catalog is unit-testable and the
 * App component only wires the results (plus podcast post-processing).
 */
import type { VoiceSettings } from '../types';

export interface ToolPromptResult {
  prompt: string;
  isPodcast: boolean;
}

/**
 * Build the generation prompt for a tool. Returns the prompt plus whether the
 * output is a podcast script (which gets Markdown handling + TTS post-processing).
 */
export function buildToolPrompt(toolId: string, payload: any, voiceSettings: VoiceSettings): ToolPromptResult {
  let prompt = "";
  let isPodcast = false;

  switch (toolId) {
    case 'text_summarizer': {
      const action = payload?.action || 'summarize';
      const lang = payload?.lang || 'swedish';

      let instruction = '';
      if (action === 'summarize') {
        instruction = `Provide a comprehensive summary of the provided text.`;
      } else if (action === 'translate') {
        instruction = `Translate the provided text into ${lang}.`;
      } else if (action === 'summarize_translate') {
        instruction = `Provide a comprehensive summary of the provided text, and translate the summary into ${lang}.`;
      }

      prompt = `Act as a professional linguist and analyst.

TASK: ${instruction}

Format the output as a clean, readable HTML document. Use Tailwind CSS for styling. Include clear headings and well-structured paragraphs or bullet points where appropriate.`;
      break;
    }
    case 'youtube_transcript': {
      const duration = payload?.duration || 'All';
      prompt = `Please generate a detailed transcript for the provided source.

             Target Duration to transcribe: ${duration} minutes.

             If the source is a YouTube link, use your search capabilities to find the transcript or summarize the video content in detail.
             If the source is a video or audio file, analyze the media and provide a detailed transcript.

             Format the output as a clean, readable HTML document with timestamps (e.g., [00:00]) and speaker labels if possible. Use Tailwind CSS for styling.`;
      break;
    }
    case 'data_table': {
      const userInstructions = payload?.instructions || "Extract all key numerical data and entities mentioned.";
      const targetLang = payload?.language || "English";
      prompt = `Act as a professional Data Architect. Your task is to extract structured information from the provided sources and present it in an analysis-ready Data Table.

USER EXTRACTION REQUIREMENTS: "${userInstructions}"
OUTPUT LANGUAGE: "${targetLang}"

CRITICAL REQUIREMENTS:
1. Identify all relevant rows and columns based on the requirements.
2. Ensure data is normalized (consistent date formats, units, and naming).
3. If information is missing for a cell, leave it blank or use "N/A".
4. FORMAT: Return a self-contained HTML document with an interactive, responsive table styled with Tailwind CSS.
5. EXPORT FEATURE: YOU MUST include a fixed header with a button that has id="downloadBtn" and text "DOWNLOAD CSV".
6. JAVASCRIPT: YOU MUST include a <script> block with a function named "downloadCSV" that is called when the button is clicked. Use this exact logic for the CSV generation:
   function downloadCSV() {
     const table = document.querySelector('table');
     let csv = [];
     for (let i = 0; i < table.rows.length; i++) {
       let row = [], cols = table.rows[i].cells;
       for (let j = 0; j < cols.length; j++) {
         let data = cols[j].innerText.replace(/(\\r\\n|\\n|\\r)/gm, '').replace(/(\\s\\s)/gm, ' ');
         data = data.replace(/"/g, '""');
         row.push('"' + data + '"');
       }
       csv.push(row.join(','));
     }
     const csvContent = csv.join('\\n');
     const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
     const link = document.createElement('a');
     const url = URL.createObjectURL(blob);
     link.setAttribute('href', url);
     link.setAttribute('download', 'extracted_data.csv');
     link.style.visibility = 'hidden';
     document.body.appendChild(link);
     link.click();
     document.body.removeChild(link);
   }
   document.getElementById('downloadBtn').addEventListener('click', downloadCSV);

STYLE: Use a professional, modern layout. Header row should be distinct. Use zebra-striping for rows.`;
      break;
    }
    case 'podcast_2': {
      prompt = `Create a detailed script for a 2-person Podcast (${voiceSettings.hostLabel} and ${voiceSettings.expertLabel}) discussing these sources.

             HOST (${voiceSettings.hostLabel}): ${voiceSettings.hostBio || 'A charismatic and engaging host.'}
             EXPERT (${voiceSettings.expertLabel}): ${voiceSettings.expertBio || 'A knowledgeable subject matter expert.'}

             Use a conversational, engaging tone. Target Length: ${voiceSettings.length || 'Medium (3-5 min)'}. Format the output as a Markdown script. Use **${voiceSettings.hostLabel}:** and **${voiceSettings.expertLabel}:** to denote speakers.`;
      isPodcast = true;
      break;
    }
    case 'podcast_1': {
      prompt = `Create a detailed script for a Single-Host Podcast reporting on these sources.

             HOST (${voiceSettings.hostLabel}): ${voiceSettings.hostBio || 'A charismatic and engaging host.'}

             The host '${voiceSettings.hostLabel}' is reporting directly to the audience. Use an engaging, storytelling tone. Target Length: ${voiceSettings.length || 'Medium (3-5 min)'}. Format the output as a Markdown script. Use **${voiceSettings.hostLabel}:** to denote the speaker.`;
      isPodcast = true;
      break;
    }
    case 'podcast_3': {
      prompt = `Create a detailed script for a 3-person Roundtable Podcast (${voiceSettings.hostLabel}, ${voiceSettings.expertLabel}, and ${voiceSettings.guestLabel}).

             HOST (${voiceSettings.hostLabel}): ${voiceSettings.hostBio || 'A charismatic and engaging host.'}
             EXPERT (${voiceSettings.expertLabel}): ${voiceSettings.expertBio || 'A knowledgeable subject matter expert.'}
             GUEST (${voiceSettings.guestLabel}): ${voiceSettings.guestBio || 'A special guest with a unique perspective.'}

             It should be a lively, multi-perspective discussion. Target Length: ${voiceSettings.length || 'Medium (3-5 min)'}. Format the output as a Markdown script. Use **${voiceSettings.hostLabel}:**, **${voiceSettings.expertLabel}:**, and **${voiceSettings.guestLabel}:** to denote speakers.`;
      isPodcast = true;
      break;
    }
    case 'faq':
      prompt = "Analyze the sources and generate a comprehensive FAQ (Frequently Asked Questions). Include at least 10 questions. Format the output as a stylish HTML document with an accordion-like or clear Q&A structure using <details> and <summary> tags if possible, or clear headings.";
      break;
    case 'study_guide':
      prompt = "Create a structured Study Guide based on the selected content. Include Key Terms, Core Concepts, a Summary, and a short Quiz at the end. Format as a professional HTML document with clear sections and styling.";
      break;
    case 'timeline':
      prompt = "Extract all key dates and events from the sources and construct a chronological Timeline. Format this as a vertical HTML timeline with stylish CSS.";
      break;
    case 'briefing':
      prompt = "Write a formal Executive Briefing Document summarizing the key information, risks, opportunities, and strategic insights. Format as a professional HTML document.";
      break;
    case 'social_generator':
      prompt = `Act as a world-class Social Media Strategist. Based on the provided sources, generate a comprehensive Social Media Suite.

             OUTPUT REQUIREMENTS:
             1. **LinkedIn Post**: Professional, thought-leadership style, includes 3-5 relevant hashtags.
             2. **X (Twitter) Thread**: 5-7 engaging tweets that summarize key points and encourage discussion.
             3. **Instagram Caption**: Visual-first storytelling, punchy, includes emojis and hashtags.

             FORMAT: Return a clean, beautifully styled HTML document using Tailwind CSS. Use distinct sections for each platform.`;
      break;
    case 'quiz_creator':
      prompt = `Act as an Instructional Designer. Create an interactive Assessment based on the provided sources.

             OUTPUT REQUIREMENTS:
             1. **5 Multiple Choice Questions**: With clear explanations for the correct answers.
             2. **5 Flashcards**: Term on front, definition/context on back.
             3. **1 Short Essay Prompt**: For deep reflection.

             FORMAT: Return a self-contained HTML document. Use Tailwind CSS to make it look like a modern learning interface.`;
      break;
    case 'crypto_analyst': {
      const targetCrypto = payload?.crypto || 'XRP';
      prompt = `Act as an expert cryptocurrency day-trading assistant and technical analyst. Provide a highly granular, intraday technical analysis and scalp-trading blueprint for ${targetCrypto} based on the 4-hour (4H) chart frame. Use a professional, scannable, and practical tone. All monetary values and calculations must be expressed in Swedish Krona (SEK).

SYSTEM INSTRUCTION: You MUST use Google Search to find the CURRENT LIVE DATA for:
- Current ${targetCrypto} Price in SEK (or calculate from USD using current exchange rate)
- Current USD/SEK Exchange Rate
- Recent 4H technical indicators for ${targetCrypto}

Use a Target Scalp Profit goal of 756 SEK for the calculations.

Structure your dashboard with:
1. **📉 Technical Blueprint:** Entry/Exit levels.
2. **📈 Capital Requirements Matrix (in SEK):**
| Target Price Move | ${targetCrypto} Tokens Needed | Total Position Value | Spot (1x Leverage) | 5x Leverage Margin | 10x Leverage Margin | 20x Leverage Margin |

IMPORTANT: Format the entire response as a professional, dark-themed HTML dashboard. Include a <title>Crypto Day-Trading Analysis</title> tag. Use Tailwind CSS for a modern "Trading Terminal" look with emerald and rose accents.
Return ONLY the HTML code. Do not include any Markdown formatting like \`\`\`html.`;
      break;
    }
    case 'exec_briefing':
      prompt = `Act as a Chief of Staff. Prepare a high-level Executive Briefing based on the provided sources.

             OUTPUT REQUIREMENTS:
             1. **Executive Summary**: 3 sentences maximum.
             2. **Key Strategic Insights**: 3-5 bullet points.
             3. **Critical Risks & Opportunities**: A balanced view.
             4. **Recommended Next Steps**: Clear, actionable items.

             FORMAT: Return a professional, "one-pager" style HTML document. Use a clean, corporate aesthetic with Tailwind CSS.`;
      break;
    case 'brainstormer':
      prompt = `Act as a Creative Director and Futurist. Your task is to generate 10 "Wild Ideas" or unconventional perspectives based on the provided sources.

             OUTPUT REQUIREMENTS:
             - Push the boundaries of the current topic.
             - Think about "What if?" scenarios.
             - Connect the topic to unrelated industries or future technologies.

             FORMAT: Return a vibrant, energetic HTML document using Tailwind CSS. Use a bento-grid style layout for the ideas.`;
      break;
    case 'email_drafter':
      prompt = `Act as a Communications Expert. Draft 3 different email versions based on the provided sources:
             1. **Professional**: Formal and direct.
             2. **Persuasive**: Focused on a specific call to action or "sell".
             3. **Casual/Internal**: Friendly and conversational.

             FORMAT: Return a clean HTML document with Tailwind CSS. Use clear labels for each version and include subject lines.`;
      break;
    case 'marketing_copy':
      prompt = `Act as a Direct Response Copywriter. Generate high-converting marketing copy based on the provided sources.

             OUTPUT REQUIREMENTS:
             1. **3 Catchy Headlines**: Using different psychological triggers.
             2. **AIDA Framework Copy**: Attention, Interest, Desire, Action.
             3. **Short Ad Copy**: For Google or Meta ads.

             FORMAT: Return a professional HTML document with Tailwind CSS. Use bold typography for headlines.`;
      break;
    case 'swot_analysis':
      prompt = `Act as a Strategic Consultant. Perform a detailed SWOT Analysis based on the provided sources.

             OUTPUT REQUIREMENTS:
             - **Strengths**: Internal positive attributes.
             - **Weaknesses**: Internal negative attributes.
             - **Opportunities**: External positive factors.
             - **Threats**: External negative factors.

             FORMAT: Return a clean HTML document with a 2x2 grid layout using Tailwind CSS. Use distinct colors for each quadrant.`;
      break;
    case 'code_explainer':
      prompt = `Act as a Senior Software Engineer. Explain the provided code or technical concepts in simple, plain English.

             OUTPUT REQUIREMENTS:
             1. **High-Level Overview**: What does this do?
             2. **Step-by-Step Breakdown**: Explain the logic.
             3. **Key Concepts**: Define any technical terms used.

             FORMAT: Return a clean HTML document with Tailwind CSS. Use code blocks for any code references.`;
      break;
    case 'ebook_generator':
      prompt = `Act as an expert Author and Editor. Based on the selected sources, generate a detailed structural outline for an E-Book, and then draft the first full chapter. Format the output as a professional, deeply-styled HTML document with a cover page layout, Table of Contents, and Chapter 1 content. Use beautiful, modern typography via Tailwind CSS.`;
      break;
    case 'image_generator':
      prompt = `Act as an expert AI Prompt Engineer. Based on the selected sources, generate 5 highly detailed, creative, and evocative prompts that could be used in Midjourney or DALL-E to generate images representing the core concepts. Describe the lighting, camera angle, style, and mood for each. Format as a beautifully styled HTML grid interface.`;
      break;
    case 'spreadsheet_creator':
      prompt = `Act as a Data Analyst. Based on the sources, create a structured spreadsheet layout (columns and rows) containing the key qualitative and quantitative data. Provide it as a beautifully styled HTML table, and suggest 3 Excel/Google Sheets formulas that would be useful for this dataset.`;
      break;
    case 'video_script_writer':
      prompt = `Act as a professional Video Producer. Create a detailed A/V (Audio/Visual) Script based on the provided sources. Include timestamps, specific visual directions, B-roll suggestions, and full narration/voiceover text. Format as a professional split-column HTML script using Tailwind CSS suitable for production.`;
      break;
    case 'website_builder':
      prompt = `Act as a UX/UI Designer and Front-End Developer. Based on the source material, design the layout and write the copy for a high-converting landing page. Output a complete, self-contained HTML document using Tailwind CSS. Include a Hero section, Features/Benefits, and a Call-to-Action. Do not include external dependencies other than Tailwind.`;
      break;
    case 'prompt_builder': {
      const paramsText = buildBuilderParamsText(payload);
      prompt = `Act as an AI Specialist. Analyze the provided ${payload?.isIndependent && !payload?.builderSessionId && !payload?.includeSessionData ? 'topic/instructions' : 'sources'} and create 3 advanced, highly-detailed "System Prompts" or custom instructions that a user could feed into an LLM to interact with this specific knowledge domain. Format output as a stylish HTML document with copyable code blocks and explanations.

${payload?.instruction ? `\nUSER SPECIFIC INSTRUCTIONS:\n${payload.instruction}\n` : ''}${paramsText}`;
      break;
    }
    case 'content_builder': {
      const paramsText = buildBuilderParamsText(payload);
      prompt = `Act as an expert Full-Stack Developer and Web Designer. Create a comprehensive, fully functional website code based on the ${payload?.isIndependent && !payload?.builderSessionId && !payload?.includeSessionData ? 'topic/instructions' : 'sources'}. The website MUST feature a top navigation bar with exactly 5 page buttons (Home, About, Services/Products, Content/Gallery, Contact) that use JavaScript to switch between 5 distinct, beautifully styled page views within the single HTML file. Build and launch this with extremely stylish, modern styling using Tailwind CSS. Include a hero section and rich content. Output a complete, self-contained HTML document starting with <!DOCTYPE html>.

${payload?.instruction ? `\nUSER SPECIFIC INSTRUCTIONS:\n${payload.instruction}\n` : ''}${paramsText}`;
      break;
    }
    default:
      prompt = "Analyze the content.";
  }

  // If the user configured more than one speaker and pressed report, only the
  // speaker in position one (host) is used — regardless of the selected format.
  if (isPodcast && payload?.hostOnly) {
    prompt = `Create a detailed script for a Single-Host Podcast reporting on these sources.

             HOST (${voiceSettings.hostLabel}): ${voiceSettings.hostBio || 'A charismatic and engaging host.'}

             The host '${voiceSettings.hostLabel}' is reporting directly to the audience. Use an engaging, storytelling tone. Target Length: ${voiceSettings.length || 'Medium (3-5 min)'}. Format the output as a Markdown script. Use **${voiceSettings.hostLabel}:** to denote the speaker.`;
  }

  if (isPodcast) {
    prompt += `\n\nLANGUAGE: ${voiceSettings.language || 'English'}\n\nIMPORTANT: Return ONLY the raw Markdown content. Do not include \`\`\`markdown wrappers.`;
  } else {
    prompt += " IMPORTANT: Return ONLY the raw HTML code starting with <!DOCTYPE html>. Ensure it is self-contained with internal CSS.";
  }

  return { prompt, isPodcast };
}

function buildBuilderParamsText(payload: any): string {
  const additionalParams = [
    payload?.productType ? `- Product Type: ${payload.productType}` : '',
    payload?.niche ? `- Niche/Topic: ${payload.niche}` : '',
    payload?.skillLevel ? `- Skill Level: ${payload.skillLevel}` : '',
    payload?.primaryGoal ? `- Primary Goal: ${payload.primaryGoal}` : '',
    payload?.sellingPlatform ? `- Selling Platform: ${payload.sellingPlatform}` : '',
    payload?.colorScheme ? `- Color Scheme: ${payload.colorScheme}` : '',
    payload?.promotionStrategy ? `- Promotion Strategy: ${payload.promotionStrategy}` : ''
  ].filter(Boolean).join('\n');
  return additionalParams ? `\n\nADVANCED CONFIGURATION OPTIONS:\n${additionalParams}\n` : '';
}
