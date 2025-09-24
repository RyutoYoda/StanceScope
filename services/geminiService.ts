import { GoogleGenAI, Type } from "@google/genai";
import type { AnalysisResult } from '../types';

if (!process.env.API_KEY) {
    throw new Error("API_KEY environment variable not set");
}

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const schema = {
  type: Type.OBJECT,
  properties: {
    viewpoints: {
        type: Type.ARRAY,
        description: 'AIがコメント群から特定した、主要な意見や論点のリスト。通常は2〜4個。',
        items: {
            type: Type.STRING
        }
    },
    summary: {
      type: Type.STRING,
      description: 'コメント欄全体の議論や雰囲気についての、中立的な立場からの短い要約。',
    },
    sentiment: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          name: {
            type: Type.STRING,
            description: 'カテゴリー名。「意見1を支持」「意見2を支持」...「中立/その他」のいずれか。数字は特定されたviewpointsのインデックス+1に対応する。',
          },
          count: {
            type: Type.INTEGER,
            description: 'このカテゴリーに分類されたコメントの総数。',
          },
        },
        required: ['name', 'count'],
      },
    },
  },
  required: ['viewpoints', 'summary', 'sentiment'],
};


export const analyzeComments = async (
  comments: string[]
): Promise<AnalysisResult> => {
  const prompt = `
    あなたは、オンラインの議論を分析する専門家です。以下のYouTubeコメント群を分析し、その内容を要約してください。

    あなたのタスクは以下の通りです:
    1.  **主要な論点の特定**: コメント全体を読み、議論の中心となっている主要な意見や論点を複数（2〜4個程度が望ましい）特定し、リストとしてください。
    2.  **コメントの分類**: 特定した論点を基準に、各コメントを以下のカテゴリーに分類してください。
        - 意見1を支持: コメントが、あなたが特定した1つ目の論点に明確に同意・支持する内容。
        - 意見2を支持: コメントが、あなたが特定した2つ目の論点に明確に同意・支持する内容。
        - (特定した論点の数だけ続く...)
        - 中立/その他: コメントがどの論点にも明確に与しない、または全く関係ない内容。
    3.  **結果の集計と要約**:
        - あなたが特定した主要な論点のリスト。
        - コメント欄全体の議論の概要をまとめた、中立的な立場からの短い要約。
        - 上記のカテゴリーに分類されたコメントのそれぞれの総数。

    出力は、提供されたJSONスキーマに厳密に従ってください。
    カテゴリー名（sentiment.name）は、日本語で「${"意見1を支持"}」「${"意見2を支持"}」...「${"中立/その他"}」としてください。

    分析対象のコメントリスト:
    ---
    ${comments.slice(0, 100).join('\n---\n')}
    ---
    `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: schema,
      },
    });
    
    const jsonText = response.text.trim();
    const parsedJson = JSON.parse(jsonText);

    if (!parsedJson.summary || !Array.isArray(parsedJson.sentiment) || !Array.isArray(parsedJson.viewpoints)) {
        throw new Error("AI response is not in the expected format.");
    }
    
    const { sentiment } = parsedJson;

    const sentimentWithSimpleNames = sentiment.map((item: { name: string, count: number }) => {
        const match = item.name.match(/意見(\d+)を支持/);
        if (match) {
            const index = parseInt(match[1], 10) - 1;
            const viewpointLetter = String.fromCharCode(65 + index); // A, B, C...
            return { ...item, name: `意見 ${viewpointLetter}` };
        }
        return item; // "中立/その他" などをそのまま返す
    });

    return { ...parsedJson, sentiment: sentimentWithSimpleNames };

  } catch (error) {
    console.error("Error analyzing comments with Gemini:", error);
    throw new Error("AIによるコメント分析に失敗しました。");
  }
};