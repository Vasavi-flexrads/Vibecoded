// This file should be saved as 'extract-info.js'
// inside a folder named 'netlify/functions'
exports.handler = async (event, context) => {
    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405,
            body: JSON.stringify({ error: 'Method Not Allowed' })
        };
    }

    try {
        const { base64ImageData } = JSON.parse(event.body);
        
        const prompt = "Extract the Patient Name, Accession ID, and Modality/Study from the image. If there are multiple records, extract all of them. The Accession ID can be a combination of letters and numbers. Provide the output as a JSON array of objects, where each object has the keys 'patientName', 'accessionID', 'modalityStudy'.";
        
        const payload = {
            contents: [
                {
                    role: "user",
                    parts: [
                        { text: prompt },
                        {
                            inlineData: {
                                mimeType: "image/jpeg",
                                data: base64ImageData
                            }
                        }
                    ],
                }
            ],
            generationConfig: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: "ARRAY",
                    items: {
                        type: "OBJECT",
                        properties: {
                            "patientName": { "type": "STRING" },
                            "accessionID": { "type": "STRING" },
                            "modalityStudy": { "type": "STRING" }
                        },
                        "propertyOrdering": ["patientName", "accessionID", "modalityStudy"]
                    }
                }
            }
        };

        // Retrieve the API key from a secure environment variable
        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
            return {
                statusCode: 500,
                body: JSON.stringify({ error: 'API key not configured.' })
            };
        }

        const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent?key=${apiKey}`;
        
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            const errorText = await response.text();
            return {
                statusCode: response.status,
                body: JSON.stringify({ error: `API request failed: ${errorText}` })
            };
        }

        const result = await response.json();
        const jsonText = result.candidates[0].content.parts[0].text;
        const extractedDataArray = JSON.parse(jsonText);

        return {
            statusCode: 200,
            body: JSON.stringify(extractedDataArray)
        };
    } catch (error) {
        console.error('Function error:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: `Server error: ${error.message}` })
        };
    }
};
