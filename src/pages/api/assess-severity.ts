export const prerender = false;

import type { APIRoute } from 'astro';
import OpenAI from 'openai';

// Initialize OpenAI client with API key from environment
const openai = new OpenAI({
  apiKey: import.meta.env.OPENAI_API_KEY,
});

export const GET: APIRoute = async () => {
    return new Response(
        JSON.stringify({
            message: "API is running. Please use POST to assess severity."
        }),
        {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        }
    );
};

export const POST: APIRoute = async ({ request }) => {
  try {
    // Parse request body
    const body = await request.json();
    const { reason } = body;

    // Validate input
    if (!reason || typeof reason !== 'string' || reason.trim().length === 0) {
      return new Response(
        JSON.stringify({ 
          error: 'Invalid input',
          message: 'Reason for visit is required' 
        }),
        { 
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    // Check if API key is configured
    if (!import.meta.env.OPENAI_API_KEY) {
      console.error('OpenAI API key not configured');
      return new Response(
        JSON.stringify({ 
          error: 'Configuration error',
          message: 'AI service not configured. Defaulting to normal severity.',
          severity: 'normal'
        }),
        { 
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    // Call OpenAI Responses API with gpt-5-nano
    const response = await openai.responses.create({
      model: "gpt-5-nano",
      input: [
        {
          role: "developer",
          content: [
            {
              type: "input_text",
              text: `Assess the severity of the provided symptoms. Respond with a JSON object containing:
- "severity": one of "low", "normal", "high", or "urgent"
- "details": concise reasoning for the severity selection and a brief treatment plan to follow until a medical appointment (maximum 30 words)

If symptoms are empty or invalid, output:
{
  "severity": "unknown",
  "details": "Explanation of why severity can't be assessed."
}

Output Format:
{
  "severity": "low" | "normal" | "high" | "urgent" | "unknown",
  "details": "<string: reasoning and brief treatment plan, max 30 words>"
}

Patient's symptoms: ${reason.trim()}`
            }
          ]
        }
      ],
      text: {
        format: {
          type: "text"
        },
        verbosity: "medium"
      },
      reasoning: {
        effort: "minimal"
      },
      tools: [],
      store: false,
      include: [
        "reasoning.encrypted_content",
        "web_search_call.action.sources"
      ]
    });

    // Extract severity from response
    const severity = extractSeverityFromResponse(response);

    return new Response(
      JSON.stringify({ 
        success: true,
        severity: severity.severity,
        details: severity.details,
        message: `Severity assessed as ${severity.severity}`
      }),
      { 
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    );

  } catch (error: any) {
    console.error('Error assessing severity:', error);
    
    // Return a safe default severity on error
    return new Response(
      JSON.stringify({ 
        error: 'Assessment failed',
        message: 'Failed to assess severity. Defaulting to normal.',
        severity: 'normal',
        details: 'AI service temporarily unavailable. Please proceed with your appointment request.'
      }),
      { 
        status: 200, // Return 200 so the appointment can still be created
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
};

/**
 * Extract severity level from OpenAI Responses API response
 * @param response - OpenAI response object
 * @returns Severity object with severity level and details
 */
function extractSeverityFromResponse(response: any): { 
  severity: 'low' | 'normal' | 'high' | 'urgent', 
  details: string 
} {
  try {
    // Log the response structure for debugging
    console.log('OpenAI Response:', JSON.stringify(response, null, 2));
    
    // Try different response structures
    let responseText = '';
    
    // Check various possible response structures
    // First check for output_text at the top level (gpt-5-nano Responses API)
    if (response.output_text) {
      responseText = response.output_text;
    }
    // Check output array for message type
    else if (response.output && Array.isArray(response.output)) {
      const messageOutput = response.output.find((item: any) => item.type === 'message');
      if (messageOutput?.content?.[0]?.text) {
        responseText = messageOutput.content[0].text;
      }
    }
    // Check other possible structures
    else if (typeof response === 'string') {
      responseText = response;
    } else if (response.output) {
      if (typeof response.output === 'string') {
        responseText = response.output;
      } else if (response.output.text) {
        responseText = response.output.text;
      } else if (response.output.content) {
        responseText = response.output.content;
      }
    } else if (response.text) {
      responseText = response.text;
    } else if (response.content) {
      responseText = response.content;
    } else if (response.choices && response.choices[0]) {
      // Fallback to chat completion format
      responseText = response.choices[0].message?.content || response.choices[0].text || '';
    }
    
    console.log('Extracted text:', responseText);
    
    // Try to parse as JSON
    if (responseText) {
      try {
        const parsed = JSON.parse(responseText);
        
        // Validate severity value
        let severity = parsed.severity?.toLowerCase() || 'normal';
        
        // Map 'medium' to 'normal' and 'unknown' to 'normal'
        if (severity === 'medium' || severity === 'unknown') {
          severity = 'normal';
        }
        
        // Ensure it's a valid severity
        if (!['low', 'normal', 'high', 'urgent'].includes(severity)) {
          severity = 'normal';
        }
        
        return {
          severity: severity as 'low' | 'normal' | 'high' | 'urgent',
          details: parsed.details || 'No additional details provided.'
        };
      } catch (parseError) {
        console.error('Error parsing JSON:', parseError);
      }
    }
    
    // Fallback: try to extract severity from text
    const text = responseText.toLowerCase();
    let severity: 'low' | 'normal' | 'high' | 'urgent' = 'normal';
    
    if (text.includes('urgent')) severity = 'urgent';
    else if (text.includes('high')) severity = 'high';
    else if (text.includes('low')) severity = 'low';
    else severity = 'normal';
    
    return {
      severity,
      details: 'AI assessment completed. Please proceed with your appointment.'
    };
    
  } catch (error) {
    console.error('Error extracting severity:', error);
    return {
      severity: 'normal',
      details: 'Unable to parse AI response. Defaulting to normal severity.'
    };
  }
}

