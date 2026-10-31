
import { MediaItem, MindMapNode } from '../types';
import { generateResponse } from './gemini';

export const expandMindMapNode = async (sources: MediaItem[], nodeLabel: string): Promise<MindMapNode[]> => {
    const prompt = `Based on the provided sources, expand on the topic "${nodeLabel}". 
    Identify 3-5 sub-topics or key concepts related to "${nodeLabel}".
    Return strictly a JSON array of objects. Format:
    [
      { "id": "uuid-placeholder", "label": "Sub Topic 1", "summary": "Brief explanation" },
      { "id": "uuid-placeholder", "label": "Sub Topic 2", "summary": "Brief explanation" }
    ]
    Do not use markdown formatting.`;

    try {
        // Using generateResponse helper which handles API calls and context
        const result = await generateResponse(prompt, [], sources);
        let text = result.text;
        text = text.replace(/```json/g, '').replace(/```/g, '').trim();
        
        // Basic JSON extraction if AI wraps it in text
        const jsonStart = text.indexOf('[');
        const jsonEnd = text.lastIndexOf(']');
        if (jsonStart !== -1 && jsonEnd !== -1) {
            text = text.substring(jsonStart, jsonEnd + 1);
        }

        const nodes = JSON.parse(text);
        
        // Enrich with IDs if missing
        return nodes.map((n: any) => ({
            id: n.id && n.id !== 'uuid-placeholder' ? n.id : crypto.randomUUID(),
            label: n.label,
            summary: n.summary,
            children: []
        }));

    } catch (e) {
        console.error("Failed to expand mind map node", e);
        return [];
    }
};

export const fetchNodeDescription = async (sources: MediaItem[], nodeLabel: string): Promise<string> => {
    const prompt = `Provide a concise (2-3 sentences) definition or summary of the concept "${nodeLabel}" based on the context of the provided sources.`;
    
    try {
        const result = await generateResponse(prompt, [], sources);
        return result.text;
    } catch (e) {
        console.error("Failed to fetch node description", e);
        return "Definition unavailable.";
    }
};
