export const prerender = false;

import type { APIRoute } from 'astro';
import OpenAI from 'openai';
import { createClient } from '@supabase/supabase-js';

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: import.meta.env.OPENAI_API_KEY,
});

// Initialize Supabase client with service role key for admin access
const supabase = createClient(
  import.meta.env.PUBLIC_SUPABASE_URL,
  import.meta.env.SUPABASE_SERVICE_KEY // Service role key for bypassing RLS
);

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const { message, patientId, conversationHistory = [] } = body;

    // Validate input
    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return new Response(
        JSON.stringify({ error: 'Message is required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (!patientId) {
      return new Response(
        JSON.stringify({ error: 'Patient ID is required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Check if API key is configured
    if (!import.meta.env.OPENAI_API_KEY) {
      return new Response(
        JSON.stringify({ error: 'AI service not configured' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Fetch patient's medical context
    const medicalContext = await fetchPatientMedicalContext(patientId);

    // Build system prompt with medical context
    const systemPrompt = buildSystemPrompt(medicalContext);

    // Prepare messages for the chat
    const messages = [
      {
        role: 'developer' as const,
        content: [
          {
            type: 'input_text' as const,
            text: systemPrompt
          }
        ]
      },
      // Add conversation history
      ...conversationHistory.map((msg: any) => ({
        role: msg.role === 'user' ? 'user' as const : 'assistant' as const,
        content: [
          {
            type: msg.role === 'user' ? 'input_text' as const : 'output_text' as const,
            text: msg.content
          }
        ]
      })),
      // Add current user message
      {
        role: 'user' as const,
        content: [
          {
            type: 'input_text' as const,
            text: message
          }
        ]
      }
    ];

    // Create streaming response using OpenAI Responses API
    const stream = await openai.responses.create({
      model: 'gpt-5-nano',
      input: messages,
      text: {
        format: { type: 'text' },
        verbosity: 'medium'
      },
      reasoning: {
        effort: 'minimal'
      },
      stream: true,
      tools: [],
      store: false
    });

    // Create a TransformStream to handle the OpenAI stream
    const encoder = new TextEncoder();
    const readable = new ReadableStream({
      async start(controller) {
        try {
          let fullText = '';
          for await (const chunk of stream) {
            // Extract text from the chunk - gpt-5-nano sends incremental deltas
            let chunkText = '';
            
            // Type assertion for accessing properties
            const anyChunk = chunk as any;
            
            // Check for delta content (streaming format)
            if (anyChunk.type === 'response.output_text.delta') {
              chunkText = anyChunk.delta || '';
            }
            // Check for complete output_text
            else if (anyChunk.output_text) {
              // This might be the full response, send what's new
              if (anyChunk.output_text.length > fullText.length) {
                chunkText = anyChunk.output_text.substring(fullText.length);
              }
            }
            // Check output array format
            else if (anyChunk.output && Array.isArray(anyChunk.output)) {
              for (const item of anyChunk.output) {
                if (item.type === 'message' && item.content) {
                  for (const content of item.content) {
                    if (content.type === 'output_text' && content.text) {
                      if (content.text.length > fullText.length) {
                        chunkText = content.text.substring(fullText.length);
                      }
                    }
                  }
                }
              }
            }
            
            if (chunkText) {
              fullText += chunkText;
              // Send as SSE format
              const data = `data: ${JSON.stringify({ text: chunkText })}\n\n`;
              controller.enqueue(encoder.encode(data));
            }
          }
          
          // Send completion signal
          controller.enqueue(encoder.encode('data: [DONE]\n\n'));
          controller.close();
        } catch (error) {
          console.error('Stream error:', error);
          controller.error(error);
        }
      }
    });

    return new Response(readable, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });

  } catch (error: any) {
    console.error('Error in chat API:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to process chat message', details: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};

/**
 * Fetch patient's medical context from the database
 */
async function fetchPatientMedicalContext(patientId: string) {
  try {
    // Fetch medical history
    const { data: medicalHistory, error: historyError } = await supabase
      .from('medical_history')
      .select('*')
      .eq('patient_id', patientId)
      .order('visit_date', { ascending: false })
      .limit(5);

    if (historyError) {
      console.error('Error fetching medical history:', historyError);
    }

    // Fetch active prescriptions
    const { data: prescriptions, error: prescriptionsError } = await supabase
      .from('prescriptions')
      .select('*')
      .eq('patient_id', patientId)
      .eq('status', 'active')
      .order('prescribed_date', { ascending: false });

    if (prescriptionsError) {
      console.error('Error fetching prescriptions:', prescriptionsError);
    }

    // Fetch recent appointments with medic details
    const { data: appointments, error: appointmentsError } = await supabase
      .from('appointments')
      .select(`
        *,
        medic:profiles!appointments_medic_id_fkey(full_name, department)
      `)
      .eq('patient_id', patientId)
      .order('appointment_date', { ascending: false })
      .limit(3);

    if (appointmentsError) {
      console.error('Error fetching appointments:', appointmentsError);
    }

    return {
      medicalHistory: medicalHistory || [],
      prescriptions: prescriptions || [],
      appointments: appointments || []
    };
  } catch (error) {
    console.error('Error fetching medical context:', error);
    return {
      medicalHistory: [],
      prescriptions: [],
      appointments: []
    };
  }
}

/**
 * Build system prompt with medical context
 */
function buildSystemPrompt(context: any): string {
  let prompt = `You are MediConnect AI, a helpful medical assistant. You provide health information and support to patients.

IMPORTANT GUIDELINES:
- Always be empathetic, professional, and supportive
- Provide CLEAR, CONCISE responses (maximum 3-4 sentences)
- Use simple, everyday language - avoid medical jargon
- NEVER diagnose conditions - always recommend consulting with healthcare providers
- Help patients understand their medical records and prescriptions
- Encourage patients to seek professional medical help for concerning symptoms
- Be direct and to the point - patients want quick, helpful answers

PATIENT'S MEDICAL CONTEXT:
`;

  // Add medical history context
  if (context.medicalHistory && context.medicalHistory.length > 0) {
    prompt += '\nRecent Medical History:\n';
    context.medicalHistory.forEach((record: any, index: number) => {
      prompt += `${index + 1}. Date: ${new Date(record.visit_date).toLocaleDateString()}
   Diagnosis: ${record.diagnosis || 'N/A'}
   Symptoms: ${record.symptoms || 'N/A'}
   Treatment: ${record.treatment || 'N/A'}
   Notes: ${record.notes || 'N/A'}\n\n`;
    });
  } else {
    prompt += '\nNo medical history on file.\n';
  }

  // Add prescriptions context
  if (context.prescriptions && context.prescriptions.length > 0) {
    prompt += '\nActive Prescriptions:\n';
    context.prescriptions.forEach((prescription: any, index: number) => {
      prompt += `${index + 1}. ${prescription.medication_name} - ${prescription.dosage}
   Frequency: ${prescription.frequency}
   Duration: ${prescription.duration || 'Ongoing'}
   Instructions: ${prescription.instructions || 'N/A'}
   Prescribed: ${new Date(prescription.prescribed_date).toLocaleDateString()}\n\n`;
    });
  } else {
    prompt += '\nNo active prescriptions.\n';
  }

  // Add recent appointments
  if (context.appointments && context.appointments.length > 0) {
    prompt += '\nRecent Appointments:\n';
    context.appointments.forEach((appointment: any, index: number) => {
      const medicName = appointment.medic?.full_name || 'Unknown';
      const department = appointment.medic?.department || 'General';
      prompt += `${index + 1}. ${new Date(appointment.appointment_date).toLocaleDateString()} - Dr. ${medicName}
   Department: ${department}
   Status: ${appointment.status}
   Reason: ${appointment.reason || 'N/A'}\n\n`;
    });
  } else {
    prompt += '\nNo recent appointments.\n';
  }

  prompt += `
When the patient asks about their medical information, reference this context.
If asked about specific medications, explain their purpose and remind them to follow their doctor's instructions.
Always maintain patient privacy and confidentiality.`;

  return prompt;
}

/**
 * Extract text from OpenAI stream chunk
 */
function extractTextFromChunk(chunk: any): string | null {
  try {
    // Handle different chunk formats from the Responses API
    if (chunk.output_text) {
      return chunk.output_text;
    }
    
    if (chunk.output && Array.isArray(chunk.output)) {
      for (const item of chunk.output) {
        if (item.type === 'message' && item.content) {
          for (const content of item.content) {
            if (content.type === 'output_text' && content.text) {
              return content.text;
            }
          }
        }
      }
    }

    if (chunk.delta?.content) {
      return chunk.delta.content;
    }

    if (chunk.choices?.[0]?.delta?.content) {
      return chunk.choices[0].delta.content;
    }

    return null;
  } catch (error) {
    console.error('Error extracting text from chunk:', error);
    return null;
  }
}
