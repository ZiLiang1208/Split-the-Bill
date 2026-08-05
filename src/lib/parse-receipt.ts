import type { DiscountMode, ReceiptItem } from '@/lib/bill-context';

const GEMINI_API_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY;

// Google grants free-tier quota per model, as an entirely separate daily
// bucket per model (confirmed against the live API — dated model IDs like
// gemini-2.0-flash return a hard "limit: 0" on this kind of key, while the
// "-latest" aliases are the ones actually provisioned). Falling back to a
// second "-latest" model on a 429 means one model's quota running out
// doesn't stop receipt scanning — it just quietly uses the other bucket.
const PRIMARY_MODEL = 'gemini-flash-latest';
const FALLBACK_MODEL = 'gemini-flash-lite-latest';

const SYSTEM_PROMPT = `You read photos of restaurant/store receipts and extract structured data.
Return ONLY a JSON object with this exact shape, no prose:
{
  "items": [{ "name": string, "price": number, "quantity": number }],
  "tax": number,
  "tip": number,
  "discount": number,
  "discountPercent": number
}
Rules:
- "price" is the line price for that item (unit price times quantity as printed on the receipt), not the per-unit price.
- "quantity" defaults to 1 if not shown.
- If the receipt shows a tip, gratuity, or service charge line (labeled "Tip", "Gratuity", "Service Charge", "Auto-Gratuity", etc.), put that amount in the "tip" field. Do NOT list it as an item.
- If the receipt shows a tax, sales tax, or VAT line, put that amount in the "tax" field. Do NOT list it as an item.
- If the receipt shows a discount, coupon, promo, or comp line (these usually appear as a negative amount such as "-20.00"), put its positive/absolute value in the "discount" field. Do NOT list it as an item.
- If that discount line is expressed as a percentage (e.g. "10% off", "(10%)", "Promo 15%"), also put the percentage number in "discountPercent" (use 10 for 10%). If a percentage is shown but no dollar amount, compute the dollar value from the items subtotal and put it in "discount".
- If there is no discount at all, set both "discount" and "discountPercent" to 0.
- Sum multiple discount lines into a single "discount" total; only set "discountPercent" if a single percentage governs the whole discount.
- Do not include the total/subtotal line as an item.
- Fix obvious OCR issues (misplaced decimals, merged words) using context.
- All monetary values are plain, non-negative numbers (no currency symbols, no minus signs, no parentheses).
- ALWAYS include every field in the response, using 0 when a value is absent.`;

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
        required: ['name', 'price', 'quantity'],
      },
    },
    tax: { type: 'number' },
    tip: { type: 'number' },
    discount: { type: 'number' },
    discountPercent: { type: 'number' },
  },
  // Every field must be required: Gemini omits optional fields entirely, which
  // silently dropped the discount (and could drop tax/tip) from the result.
  required: ['items', 'tax', 'tip', 'discount', 'discountPercent'],
};

export type ParsedReceipt = {
  items: ReceiptItem[];
  tax: number;
  tip: number;
  discount: number;
  discountMode: DiscountMode;
};

function toFiniteNumber(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}

/**
 * Validates and normalizes the raw JSON text returned by the model into a
 * ParsedReceipt. Pulled out as a pure function so it can be unit tested
 * without mocking network/image APIs.
 */
export function parseGeminiJson(content: string): ParsedReceipt {
  let parsed: {
    items?: unknown;
    tax?: unknown;
    tip?: unknown;
    discount?: unknown;
    discountPercent?: unknown;
  };
  try {
    parsed = JSON.parse(content);
  } catch {
    throw new Error('Could not parse the receipt data returned by Gemini.');
  }

  if (!Array.isArray(parsed.items)) {
    throw new Error('Receipt data was missing an items list.');
  }

  const allItems: ReceiptItem[] = parsed.items.map((raw, index) => {
    const item = raw as { name?: unknown; price?: unknown; quantity?: unknown };
    return {
      id: `item-${Date.now()}-${index}`,
      name: typeof item.name === 'string' && item.name.trim() ? item.name.trim() : `Item ${index + 1}`,
      price: toFiniteNumber(item.price),
      quantity: typeof item.quantity === 'number' && item.quantity > 0 ? item.quantity : 1,
    };
  });

  // The model should put discounts in the "discount" field rather than the
  // items list, but as a backstop, fold any negative-price item it still
  // produces into the discount total instead of just dropping the value.
  const items = allItems.filter((item) => item.price >= 0);
  const strayNegativeTotal = allItems
    .filter((item) => item.price < 0)
    .reduce((sum, item) => sum + Math.abs(item.price), 0);

  const discountAmount = Math.abs(toFiniteNumber(parsed.discount)) + strayNegativeTotal;
  const discountPercent = Math.abs(toFiniteNumber(parsed.discountPercent));

  // A percentage on the receipt is the more faithful representation (it keeps
  // working if items are later edited), so prefer it when one was found. Only
  // trust a sane percentage; otherwise fall back to the flat amount.
  const usePercent = discountPercent > 0 && discountPercent <= 100 && strayNegativeTotal === 0;

  return {
    items,
    tax: toFiniteNumber(parsed.tax),
    tip: toFiniteNumber(parsed.tip),
    discount: usePercent ? discountPercent : discountAmount,
    discountMode: usePercent ? 'percent' : 'amount',
  };
}

export class GeminiRequestError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = 'GeminiRequestError';
    this.status = status;
  }
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

async function callGeminiModel(model: string, base64: string, mimeType: string): Promise<string> {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
        contents: [
          {
            role: 'user',
            parts: [
              {
                text: 'Extract the line items, tax, tip, and any discount (flat amount or percentage) from this receipt photo.',
              },
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
    throw new GeminiRequestError(
      `Gemini request failed (${response.status}): ${errorBody.slice(0, 300)}`,
      response.status
    );
  }

  const data = await response.json();
  const content = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!content) {
    throw new GeminiRequestError('Gemini returned an empty response.', response.status);
  }
  return content;
}

export function isRateLimited(error: unknown): boolean {
  return error instanceof GeminiRequestError && error.status === 429;
}

export async function parseReceiptImage(imageUri: string): Promise<ParsedReceipt> {
  if (!GEMINI_API_KEY) {
    throw new Error(
      'Missing Gemini API key. Set EXPO_PUBLIC_GEMINI_API_KEY in your .env file and restart the dev server.'
    );
  }

  const { base64, mimeType } = await uriToBase64(imageUri);

  let content: string;
  try {
    content = await callGeminiModel(PRIMARY_MODEL, base64, mimeType);
  } catch (primaryError) {
    if (!isRateLimited(primaryError)) throw primaryError;

    try {
      content = await callGeminiModel(FALLBACK_MODEL, base64, mimeType);
    } catch (fallbackError) {
      if (isRateLimited(fallbackError)) {
        throw new Error(
          "You've hit Gemini's free daily limit on both models. It resets in about 24 hours, or you can add billing to your Google AI Studio project for a much higher limit (Gemini Flash is very cheap per request). Check your exact usage at aistudio.google.com/rate-limit."
        );
      }
      throw fallbackError;
    }
  }

  return parseGeminiJson(content);
}
