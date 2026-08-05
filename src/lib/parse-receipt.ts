import type { ReceiptItem } from '@/lib/bill-context';

const GEMINI_API_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY;
const GEMINI_MODEL = 'gemini-flash-latest';

const SYSTEM_PROMPT = `You read photos of restaurant/store receipts and extract structured data.
Return ONLY a JSON object with this exact shape, no prose:
{
  "items": [{ "name": string, "price": number, "quantity": number }],
  "tax": number,
  "tip": number
}
Rules:
- "price" is the line price for that item (unit price times quantity as printed on the receipt), not the per-unit price.
- "quantity" defaults to 1 if not shown.
- If the receipt shows a tip, gratuity, or service charge line (labeled "Tip", "Gratuity", "Service Charge", "Auto-Gratuity", etc.), put that amount in the "tip" field. Do NOT list it as an item.
- If the receipt shows a tax, sales tax, or VAT line, put that amount in the "tax" field. Do NOT list it as an item.
- "tax" and "tip" default to 0 if no such line is present on the receipt.
- Do not include the total/subtotal line as an item.
- Do not include discounts, coupons, or refund lines as items (these show as negative amounts on the receipt).
- Fix obvious OCR issues (misplaced decimals, merged words) using context.
- All monetary values are plain numbers (no currency symbols).`;

const RESPONSE_SCHEMA = {
  type: 'object',
  properties: {
    items: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          price: { type: 'number' },
          quantity: { type: 'number' },
        },
        required: ['name', 'price'],
      },
    },
    tax: { type: 'number' },
    tip: { type: 'number' },
  },
  required: ['items'],
};

export type ParsedReceipt = {
  items: ReceiptItem[];
  tax: number;
  tip: number;
};

/**
 * Validates and normalizes the raw JSON text returned by the model into a
 * ParsedReceipt. Pulled out as a pure function so it can be unit tested
 * without mocking network/image APIs.
 */
export function parseGeminiJson(content: string): ParsedReceipt {
  let parsed: { items?: unknown; tax?: unknown; tip?: unknown };
  try {
    parsed = JSON.parse(content);
  } catch {
    throw new Error('Could not parse the receipt data returned by Gemini.');
  }

  if (!Array.isArray(parsed.items)) {
    throw new Error('Receipt data was missing an items list.');
  }

  const items: ReceiptItem[] = parsed.items
    .map((raw, index) => {
      const item = raw as { name?: unknown; price?: unknown; quantity?: unknown };
      return {
        id: `item-${Date.now()}-${index}`,
        name: typeof item.name === 'string' && item.name.trim() ? item.name.trim() : `Item ${index + 1}`,
        price: typeof item.price === 'number' && Number.isFinite(item.price) ? item.price : 0,
        quantity: typeof item.quantity === 'number' && item.quantity > 0 ? item.quantity : 1,
      };
    })
    .filter((item) => item.price >= 0);

  return {
    items,
    tax: typeof parsed.tax === 'number' && Number.isFinite(parsed.tax) ? parsed.tax : 0,
    tip: typeof parsed.tip === 'number' && Number.isFinite(parsed.tip) ? parsed.tip : 0,
  };
}

async function uriToBase64(uri: string): Promise<{ base64: string; mimeType: string }> {
  const response = await fetch(uri);
  const blob = await response.blob();
  const dataUrl: string = await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Failed to read image data'));
    reader.onload = () => resolve(reader.result as string);
    reader.readAsDataURL(blob);
  });
  const match = dataUrl.match(/^data:(.+);base64,(.*)$/);
  if (!match) {
    throw new Error('Could not encode the receipt image.');
  }
  return { mimeType: match[1], base64: match[2] };
}

export async function parseReceiptImage(imageUri: string): Promise<ParsedReceipt> {
  if (!GEMINI_API_KEY) {
    throw new Error(
      'Missing Gemini API key. Set EXPO_PUBLIC_GEMINI_API_KEY in your .env file and restart the dev server.'
    );
  }

  const { base64, mimeType } = await uriToBase64(imageUri);

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
        contents: [
          {
            role: 'user',
            parts: [
              { text: 'Extract the line items, tax, and tip from this receipt photo.' },
              { inlineData: { mimeType, data: base64 } },
            ],
          },
        ],
        generationConfig: {
          responseMimeType: 'application/json',
          responseSchema: RESPONSE_SCHEMA,
        },
      }),
    }
  );

  if (!response.ok) {
    const errorBody = await response.text().catch(() => '');
    throw new Error(`Gemini request failed (${response.status}): ${errorBody.slice(0, 300)}`);
  }

  const data = await response.json();
  const content = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!content) {
    throw new Error('Gemini returned an empty response.');
  }

  return parseGeminiJson(content);
}
