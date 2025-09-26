import { GoogleGenAI, Type } from "@google/genai";

const apiKey = process.env.GEMINI_API_KEY;
let ai: GoogleGenAI | null = null;
if (apiKey) {
  ai = new GoogleGenAI({ apiKey });
}

// 性格診断の型定義
export interface PersonalityType {
  type: string;
  count: number;
  percentage: number;
  characteristics: string[];
  examples: string[];
}

export interface PersonalityAnalysis {
  personalityDistribution: PersonalityType[];
  groupDynamics: string;
  conflictPotential: number;
  recommendations: string[];
}

// Agent Tools定義
const personalityTools = [
  {
    name: "analyze_personality_types",
    description: "コメントを性格タイプ別に分類し、各タイプの特徴を分析する",
    parameters: {
      type: "object",
      properties: {
        comments: {
          type: "array",
          items: { type: "string" },
          description: "分析対象のコメント一覧"
        },
        focus_type: {
          type: "string",
          enum: ["basic", "detailed", "interaction"],
          description: "分析の詳細度"
        }
      },
      required: ["comments"]
    }
  },
  {
    name: "predict_interaction_patterns",
    description: "性格タイプ間の相互作用パターンを予測する",
    parameters: {
      type: "object",
      properties: {
        personality_mix: {
          type: "array",
          items: { type: "string" },
          description: "存在する性格タイプのリスト"
        },
        context: {
          type: "string",
          description: "議論の文脈・トピック"
        }
      },
      required: ["personality_mix"]
    }
  },
  {
    name: "generate_moderation_strategy",
    description: "性格タイプの組み合わせに基づいた最適なモデレーション戦略を生成",
    parameters: {
      type: "object",
      properties: {
        dominant_types: {
          type: "array",
          items: { type: "string" },
          description: "支配的な性格タイプ"
        },
        conflict_level: {
          type: "number",
          minimum: 0,
          maximum: 10,
          description: "対立レベル(0-10)"
        }
      },
      required: ["dominant_types", "conflict_level"]
    }
  }
];

// Tool実装
const executePersonalityTool = async (toolName: string, args: any): Promise<any> => {
  if (!ai) {
    throw new Error("Gemini APIが設定されていません");
  }

  switch (toolName) {
    case "analyze_personality_types":
      return await analyzePersonalityTypes(args.comments, args.focus_type || "basic");
    
    case "predict_interaction_patterns":
      return await predictInteractionPatterns(args.personality_mix, args.context);
    
    case "generate_moderation_strategy":
      return await generateModerationStrategy(args.dominant_types, args.conflict_level);
    
    default:
      throw new Error(`未知のツール: ${toolName}`);
  }
};

const analyzePersonalityTypes = async (comments: string[], focusType: string): Promise<PersonalityAnalysis> => {
  const schema = {
    type: Type.OBJECT,
    properties: {
      personalityDistribution: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            type: { type: Type.STRING, description: "性格タイプ名" },
            count: { type: Type.INTEGER, description: "該当するコメント数" },
            percentage: { type: Type.NUMBER, description: "全体に占める割合" },
            characteristics: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "このタイプの特徴"
            },
            examples: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "実際のコメント例（一部改変可）"
            }
          },
          required: ["type", "count", "percentage", "characteristics", "examples"]
        }
      },
      groupDynamics: {
        type: Type.STRING,
        description: "グループ全体の相互作用の特徴"
      },
      conflictPotential: {
        type: Type.INTEGER,
        description: "対立発生の可能性(0-10)",
        minimum: 0,
        maximum: 10
      },
      recommendations: {
        type: Type.ARRAY,
        items: { type: Type.STRING },
        description: "建設的な議論のための推奨事項"
      }
    },
    required: ["personalityDistribution", "groupDynamics", "conflictPotential", "recommendations"]
  };

  const prompt = `
  あなたは心理学とオンラインコミュニティ分析の専門家です。
  以下のYouTubeコメントを分析し、コメント者の性格タイプを分類してください。

  性格タイプ分類（参考）:
  - 理論派: データや根拠を重視、論理的思考
  - 感情派: 感情的な表現が多い、共感重視
  - 平和主義者: 仲裁や妥協案を提示
  - 煽り屋: 論争を激化させたがる、挑発的
  - 専門家: 詳しい知識を披露、権威的
  - 傍観者: 他人の意見をまとめるだけ、受動的
  - 懐疑派: 批判的思考、反論が多い
  - 支持者: 肯定的、賛同の表現が多い

  コメント:
  ${comments.slice(0, 100).join('\n---\n')}

  分析の詳細度: ${focusType}
  `;

  const response = await ai.models.generateContent({
    model: "gemini-2.0-flash",
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: schema,
    },
  });

  const result = JSON.parse(response.text.trim());
  return result as PersonalityAnalysis;
};

const predictInteractionPatterns = async (personalityMix: string[], context?: string): Promise<string> => {
  const prompt = `
  以下の性格タイプが混在するコメント欄で、どのような相互作用が起こりやすいか分析してください：
  
  存在する性格タイプ: ${personalityMix.join(', ')}
  議論の文脈: ${context || '一般的な議論'}
  
  分析してください:
  1. 協調的な関係になりやすい組み合わせ
  2. 対立しやすい組み合わせ  
  3. 議論の発展パターンの予測
  4. 注意すべき火種
  5. 建設的な方向に導く方法
  `;

  const response = await ai.models.generateContent({
    model: "gemini-2.0-flash",
    contents: prompt,
  });

  return response.text;
};

const generateModerationStrategy = async (dominantTypes: string[], conflictLevel: number): Promise<string> => {
  const prompt = `
  以下の条件でのコメント欄モデレーション戦略を提案してください：
  
  支配的な性格タイプ: ${dominantTypes.join(', ')}
  現在の対立レベル: ${conflictLevel}/10
  
  提案してください:
  1. この性格構成に最適なモデレーション方針
  2. 各タイプへの具体的なアプローチ方法
  3. エスカレーション防止策
  4. 建設的な議論を促進する介入方法
  5. 危険サインの早期発見方法
  `;

  const response = await ai.models.generateContent({
    model: "gemini-2.0-flash",
    contents: prompt,
  });

  return response.text;
};

// メインのAgent関数
export const runPersonalityAnalysisAgent = async (
  comments: string[],
  videoTitle?: string
): Promise<{
  analysis: PersonalityAnalysis;
  interactions: string;
  strategy: string;
}> => {
  console.log('PersonalityAgent: Starting analysis', {
    hasAI: !!ai,
    apiKey: !!apiKey,
    commentsLength: comments.length,
    videoTitle
  });

  if (!ai) {
    console.error('PersonalityAgent: AI not initialized, apiKey:', !!apiKey);
    throw new Error("Gemini APIキーが設定されていません");
  }

  const prompt = `
  あなたはコメント欄性格診断の専門エージェントです。
  以下のコメントを分析し、必要なツールを呼び出して包括的な性格診断レポートを作成してください。

  動画タイトル: ${videoTitle || '不明'}
  コメント数: ${comments.length}件
  
  実行してください:
  1. まず基本的な性格タイプ分析を行う
  2. 性格タイプ間の相互作用パターンを予測する  
  3. この組み合わせに最適なモデレーション戦略を生成する

  利用可能なツール:
  - analyze_personality_types: 性格タイプ分類
  - predict_interaction_patterns: 相互作用分析
  - generate_moderation_strategy: モデレーション戦略
  `;

  console.log('PersonalityAgent: Calling Gemini API...');
  const response = await ai.models.generateContent({
    model: "gemini-2.0-flash",
    contents: prompt,
    tools: { function_declarations: personalityTools },
  });

  console.log('PersonalityAgent: API response received', {
    hasCandidates: !!response.candidates,
    candidatesLength: response.candidates?.length,
    hasContent: !!response.candidates?.[0]?.content,
    hasParts: !!response.candidates?.[0]?.content?.parts,
    partsLength: response.candidates?.[0]?.content?.parts?.length
  });

  // Function Callの処理
  let analysis: PersonalityAnalysis | null = null;
  let interactions = "";
  let strategy = "";

  if (response.candidates?.[0]?.content?.parts) {
    console.log('PersonalityAgent: Processing function calls...');
    for (const part of response.candidates[0].content.parts) {
      if (part.functionCall) {
        console.log('PersonalityAgent: Executing function:', part.functionCall.name);
        try {
          const result = await executePersonalityTool(
            part.functionCall.name,
            part.functionCall.args
          );
          console.log('PersonalityAgent: Function result:', part.functionCall.name, !!result);

          switch (part.functionCall.name) {
            case "analyze_personality_types":
              analysis = result;
              break;
            case "predict_interaction_patterns":
              interactions = result;
              break;
            case "generate_moderation_strategy":
              strategy = result;
              break;
          }
        } catch (err) {
          console.error('PersonalityAgent: Function execution failed:', part.functionCall.name, err);
        }
      }
    }
  } else {
    console.log('PersonalityAgent: No function calls found in response');
  }

  // 基本分析が実行されなかった場合のフォールバック
  if (!analysis) {
    analysis = await analyzePersonalityTypes(comments, "basic");
  }

  // 相互作用分析が実行されなかった場合のフォールバック
  if (!interactions && analysis) {
    const personalityTypes = analysis.personalityDistribution.map(p => p.type);
    interactions = await predictInteractionPatterns(personalityTypes, videoTitle);
  }

  // モデレーション戦略が実行されなかった場合のフォールバック
  if (!strategy && analysis) {
    const dominantTypes = analysis.personalityDistribution
      .filter(p => p.percentage > 15)
      .map(p => p.type);
    strategy = await generateModerationStrategy(dominantTypes, analysis.conflictPotential);
  }

  console.log('PersonalityAgent: Final result', {
    hasAnalysis: !!analysis,
    hasInteractions: !!interactions,
    hasStrategy: !!strategy
  });

  return {
    analysis: analysis!,
    interactions,
    strategy
  };
};