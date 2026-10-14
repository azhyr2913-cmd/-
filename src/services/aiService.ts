import { GoogleGenAI } from '@google/genai';

export interface AIProductCheckResult {
  isConsistent: boolean;
  confidenceScore: number;
  suggestedCategory?: string;
  suggestedDescription?: string;
  qualityNotes: string[];
  discrepancies: string[];
}

export async function checkProductWithAI(params: {
  title: string;
  description: string;
  categoryName: string;
  price: number;
  condition: string;
}): Promise<AIProductCheckResult> {
  const apiKey = (import.meta as any).env?.VITE_GEMINI_API_KEY || (import.meta as any).env?.GEMINI_API_KEY;

  if (!apiKey) {
    // Offline / Local verification fallback rule
    return runLocalHeuristicCheck(params);
  }

  try {
    const ai = new GoogleGenAI({ apiKey });
    const prompt = `
أنت مستشار ذكاء اصطناعي متخصص في التحقق من المنتجات في منصة "رواق" للتجارة الإلكترونية في اليمن.
قم بتحليل بيانات المنتج التالية:
- العنوان: "${params.title}"
- الوصف: "${params.description}"
- التصنيف المختار: "${params.categoryName}"
- السعر: ${params.price} ريال يمني
- الحالة: ${params.condition === 'new' ? 'جديد' : 'مستعمل'}

المطلوب:
1. هل هناك اتساق وتطابق بين العنوان والوصف والتصنيف؟
2. هل الوصف واضح وجيد للزبائن في اليمن؟
3. اقترح تحسيناً احترافياً للوصف باللغة العربية.
4. اذكر أي ملاحظات أو تناقضات.

أجب بصيغة JSON فقط بهذه الحقول:
{
  "isConsistent": true/false,
  "confidenceScore": 85,
  "suggestedCategory": "اسم التصنيف الأنسب إن وجد",
  "suggestedDescription": "نص الوصف المحسن المقترح",
  "qualityNotes": ["ملاحظة 1", "ملاحظة 2"],
  "discrepancies": ["أي تعارض أو اختلاف"]
}
`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
      },
    });

    const text = response.text?.trim() || '{}';
    const parsed = JSON.parse(text);

    return {
      isConsistent: parsed.isConsistent !== false,
      confidenceScore: parsed.confidenceScore || 90,
      suggestedCategory: parsed.suggestedCategory || params.categoryName,
      suggestedDescription: parsed.suggestedDescription || params.description,
      qualityNotes: Array.isArray(parsed.qualityNotes) ? parsed.qualityNotes : ['البيانات متناسقة وواضحة'],
      discrepancies: Array.isArray(parsed.discrepancies) ? parsed.discrepancies : [],
    };
  } catch (error) {
    console.warn('AI analysis fallback to heuristic:', error);
    return runLocalHeuristicCheck(params);
  }
}

function runLocalHeuristicCheck(params: {
  title: string;
  description: string;
  categoryName: string;
  price: number;
}): AIProductCheckResult {
  const notes: string[] = [];
  const discrepancies: string[] = [];

  if (params.title.length < 5) {
    discrepancies.push('عنوان المنتج قصير جداً؛ يُفضل كتابة اسم المنتج ونوعه بوضوح');
  } else {
    notes.push('العنوان موجز ومباشر');
  }

  if (params.description.length < 20) {
    notes.push('يُنصح بزيارة الوصف لإضافة تفاصيل المقاس أو اللون أو حالة الضمان');
  } else {
    notes.push('وصف المنتج يحتوي على تفاصيل كافية');
  }

  if (params.price <= 0) {
    discrepancies.push('يجب تحديد سعر عادل وأكبر من الصفر');
  }

  const enhancedDescription = `${params.title}\n\nالحالة والمواصفات: ${params.description}\n\n- متاح للطلب والتوصيل المباشر عبر منصة رواق.`;

  return {
    isConsistent: discrepancies.length === 0,
    confidenceScore: discrepancies.length === 0 ? 95 : 70,
    suggestedCategory: params.categoryName,
    suggestedDescription: enhancedDescription,
    qualityNotes: notes,
    discrepancies,
  };
}
